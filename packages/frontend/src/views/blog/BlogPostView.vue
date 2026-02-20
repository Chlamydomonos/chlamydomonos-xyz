<template>
    <BlogBaseLayout>
        <template #header>
            <span class="post-header-title title-font" :style="{ opacity: headerOpacity }">{{ postTitle }}</span>
        </template>
        <template #default>
            <ElCard class="main-card" :body-style="{ padding: loading ? '1rem' : '0' }">
                <ElSkeleton :loading :throttle="100">
                    <template v-if="data">
                        <div class="cover-wrapper">
                            <div ref="coverContainer">
                                <img :src="coverSrc" v-if="data.cover" />
                                <MandelbrotSet :seed="data.id" :colors v-else :width="mandelbrotWidth" />
                            </div>
                            <div class="post-title title-font" id="main-title" ref="mainTitle">{{ postTitle }}</div>
                        </div>
                        <div class="tags-container">
                            <BlogTag v-for="tag in data.tags" :key="tag" :name="tag" />
                        </div>
                        <div class="category-container">
                            <ElBreadcrumb separator="/">
                                <ElBreadcrumbItem
                                    v-for="category in data.category.map((_, i) => data!.category.slice(0, i + 1))"
                                    :key="category[category.length - 1]"
                                    :to="`/blog/categories/${category.join('/')}`"
                                >
                                    {{ category[category.length - 1] }}
                                </ElBreadcrumbItem>
                                <ElBreadcrumbItem>
                                    <div class="simple-title">{{ postTitle }}</div>
                                </ElBreadcrumbItem>
                            </ElBreadcrumb>
                        </div>
                        <div class="times-container">
                            创建时间：{{ data.createDate.year }}/{{ data.createDate.month }}/{{ data.createDate.day }}
                            <br />
                            上次更新：{{ data.updateDate.year }}/{{ data.updateDate.month }}/{{ data.updateDate.day }}
                            <hr />
                        </div>
                        <div class="content-container">
                            <MarkdownComponent
                                :url="`/sites/blog/posts/${data.path}`"
                                @headings="gatherHeadings"
                                @finish-load="onFinishLoad"
                            />
                        </div>
                        <div class="comment-container">
                            <Giscus
                                id="comments"
                                repo="Chlamydomonos/blog-comments"
                                repo-id="MDEwOlJlcG9zaXRvcnkzNjM2MjM1Njk="
                                category="Announcements"
                                category-id="DIC_kwDOFax0kc4C0mlf"
                                mapping="specific"
                                :term="id"
                                strict="0"
                                reactions-enabled="1"
                                emit-metadata="0"
                                input-position="top"
                                :theme="isDark ? 'dark' : 'light'"
                                lang="zh-CN"
                            />
                        </div>
                    </template>
                </ElSkeleton>
            </ElCard>
        </template>
        <template #dynamicCard>
            <div class="links-container">
                <a class="link-h0" href="#main-title">{{ postTitle }}</a>
            </div>
            <div class="chain-container" v-if="data?.prev || data?.next">
                <RouterLink class="no-visited no-underline" v-if="data.prev" :to="`/blog/posts/${data.prev}`">
                    <FontAwesomeIcon :icon="faAngleLeft" />上一篇
                </RouterLink>
                <RouterLink class="no-visited no-underline" v-if="data.next" :to="`/blog/posts/${data.next}`">
                    下一篇<FontAwesomeIcon :icon="faAngleRight" />
                </RouterLink>
            </div>
            <div class="links-container">
                <template v-if="headings.length > 0">
                    <a
                        v-for="heading in headings"
                        :key="heading.id"
                        :href="`#${heading.id}`"
                        :class="`link-h${heading.level}`"
                    >
                        {{ heading.content }}
                    </a>
                </template>
                <template v-else>暂无标题</template>
            </div>
        </template>
    </BlogBaseLayout>
</template>

<script lang="ts" setup>
import BlogBaseLayout from '@/components/blog/BlogBaseLayout.vue';
import BlogTag from '@/components/blog/BlogTag.vue';
import MandelbrotSet from '@/components/blog/MandelbrotSet.vue';
import MarkdownComponent from '@/components/common/MarkdownComponent.vue';
import { blogAxios } from '@/lib/blog/blog-axios';
import { useMandelbrotColors } from '@/lib/blog/mandelbrot-colors';
import { useTitle } from '@/lib/use-title';
import router from '@/router';
import type { PostManifest } from 'common-lib/blog/manifest';
import { ElBreadcrumb, ElBreadcrumbItem, ElCard, ElSkeleton } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Giscus from '@giscus/vue';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '@/stores/theme';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';

const props = defineProps<{ id: string }>();

const loading = ref(true);
const data = ref<PostManifest>();

const route = useRoute();

const load = async () => {
    loading.value = true;
    try {
        data.value = (await blogAxios.get<PostManifest>(`/posts/${props.id}.json`)).data;
        loading.value = false;
    } catch (e) {
        console.error(e);
        await router.replace('/post-not-found');
    }
};

const onFinishLoad = () => {
    if (route.hash && route.hash != '') {
        document.getElementById(route.hash.slice(1))?.scrollIntoView();
    }
};

onMounted(load);

watch(props, load);

const postTitle = computed(() => {
    if (!loading.value && data.value) {
        return data.value.title;
    }
    return '';
});

useTitle(() => `${postTitle.value} | Chlamydomonos的博客`, props, loading, data);

const colors = useMandelbrotColors();

const coverContainer = ref<HTMLDivElement>();
const mandelbrotWidth = ref(0);
const resizeMandelbrotSet = () => {
    if (coverContainer.value) {
        mandelbrotWidth.value = coverContainer.value.offsetWidth;
    }
};

onMounted(() => {
    resizeMandelbrotSet();
    window.addEventListener('resize', resizeMandelbrotSet);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeMandelbrotSet);
});

watch(coverContainer, resizeMandelbrotSet);

const headings = ref<{ level: number; id: string; content: string }[]>([]);

const gatherHeadings = (input: { level: number; id: string; content: string }[]) => {
    headings.value = input;
};

const mainTitle = ref<HTMLDivElement>();

const headerOpacity = ref(1);

const observer = ref<IntersectionObserver>();

const setupTitleObserver = () => {
    if (!mainTitle.value) return;

    if (observer.value) {
        observer.value.disconnect();
    }

    observer.value = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                // intersectionRatio 从 0（完全不可见）到 1（完全可见）
                // opacity 应该从 1（不可见）到 0（可见），所以用 1 - ratio
                headerOpacity.value = 1 - entry.intersectionRatio;
            });
        },
        {
            threshold: Array.from({ length: 101 }, (_, i) => i / 100),
        },
    );

    observer.value.observe(mainTitle.value);
};

onBeforeUnmount(() => {
    observer.value?.disconnect();
});

watch(mainTitle, setupTitleObserver, { immediate: true });

const { isDark } = storeToRefs(useThemeStore());

const coverSrc = computed(() => {
    if (!data.value?.cover) {
        return '';
    }
    const markdownPath = `/sites/blog/posts/${data.value.path}`;
    const url = new URL(markdownPath, window.location.origin);
    const imageUrl = new URL(data.value.cover, url.href);
    return imageUrl.href;
});
</script>

<style lang="scss" scoped>
.post-header-title {
    font-size: 1.8rem;
}

.main-card {
    border: none;
    * {
        scroll-margin-top: 4rem;
    }
}

.cover-wrapper {
    position: relative;
    display: block;
    width: 100%;
    img {
        width: 100%;
    }
}

.cover-wrapper img {
    display: block;
}

.post-title {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 2.5rem;
    background-color: var(--blog-home-header-background);
    padding: 4px;
}

.tags-container {
    padding: 6px 2px 2px 6px;
    background-color: var(--blog-home-header-background);
}

.category-container {
    padding: 8px;
}

.simple-title {
    max-width: 5rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}

.times-container {
    padding: 8px;
    color: var(--el-text-color-secondary);
    font-size: small;

    hr {
        border: none;
        height: 1px;
        background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0) 0%,
            var(--el-text-color-secondary) 10%,
            var(--el-text-color-secondary) 90%,
            rgba(0, 0, 0, 0) 100%
        );
        margin: 1rem 0 0.5rem;
    }
}

.content-container {
    margin: 4px;
    padding: 4px;
    border-radius: 4px;
    background-color: var(--el-color-info-light-9);
}

.links-container {
    padding: 1rem;
    a {
        display: block;
        color: var(--el-text-color-regular);
        text-decoration: none;
        font-weight: bold;
        line-height: 2rem;

        &:visited {
            color: var(--el-text-color-regular);
        }

        &:hover {
            color: var(--el-text-color-primary);
        }
    }

    .link-h0 {
        font-size: 1.5rem;
    }

    .link-h1 {
        font-size: 1.3rem;
        padding-left: 0.5rem;
    }

    .link-h2 {
        font-size: 1.2rem;
        padding-left: 1rem;
    }

    .link-h3 {
        font-size: 1.1rem;
        padding-left: 1.5rem;
    }

    .link-h4 {
        font-size: 1rem;
        padding-left: 2rem;
    }

    .link-h5 {
        font-size: 0.9rem;
        padding-left: 2.5rem;
    }

    .link-h6 {
        font-size: 0.8rem;
        padding-left: 3rem;
    }

    &:first-child {
        border-bottom: 1px solid var(--el-border-color);
    }
}

.comment-container {
    padding: 4px;
    margin: 1rem 4px 4px 4px;
    border-radius: 4px;
    border: 1px solid var(--el-border-color);
}

.chain-container {
    display: flex;
    border-top: 1px solid var(--el-border-color);
    border-bottom: 1px solid var(--el-border-color);
    a {
        text-align: center;
        line-height: 2em;
        padding: 0.5em;
        flex-grow: 1;
        color: var(--el-text-color-regular);
        &:not(:last-child) {
            border-right: 1px solid var(--el-border-color);
        }
        &:hover {
            color: var(--el-text-color-primary);
        }
    }
}
</style>
