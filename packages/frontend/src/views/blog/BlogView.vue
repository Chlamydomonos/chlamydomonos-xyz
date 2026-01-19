<template>
    <div class="banner-container">
        <div class="banner">
            <VolumetricCloud
                :width="bannerWidth"
                :height="bannerHeight"
                :camera-angle-x="0"
                :camera-angle-y="0.05"
                :light-intensity="1 - darkness"
                :sky-color-top="bannerColor"
                :sky-color-bottom="bannerColor"
            />
        </div>
        <div class="banner-title title-font">Chlamyd<ChLogo />monos<ChBlue>的博客</ChBlue></div>
    </div>
    <div ref="blogHeaderRef" class="blog-header">
        <div class="left-element">
            <div style="margin-left: 0.5rem; font-size: 1.5rem">
                <RouterLink class="no-visited main-link" to="/"><ChLogo /><ChBlue>.xyz</ChBlue></RouterLink>
            </div>
            <div style="margin-left: 0.2rem; font-size: 1.5rem">|</div>
            <div class="link-container current-link">
                <RouterLink class="no-visited" to="/blog">首页</RouterLink>
            </div>
            <div class="link-container">
                <RouterLink class="no-visited" to="/blog/about">关于</RouterLink>
            </div>
            <div class="link-container">
                <RouterLink class="no-visited" to="/blog/archive">归档</RouterLink>
            </div>
            <div class="link-container">
                <RouterLink class="no-visited" to="/blog/categories">分类</RouterLink>
            </div>
            <div class="link-container">
                <RouterLink class="no-visited" to="/blog/tags">标签</RouterLink>
            </div>
        </div>
        <div class="right-element">
            <ThemeSwitch />
            <div style="margin: 0 0.2rem"></div>
        </div>
    </div>
    <ElRow style="margin-top: 1rem">
        <ElCol style="padding: 0.5rem" :xs="0" :sm="2" :md="2" :lg="2" :xl="2"></ElCol>
        <ElCol style="padding: 0.5rem" :xs="24" :sm="15" :md="15" :lg="15" :xl="15">
            <ElCard ref="mainCardRef" class="main-card" :body-style="{ paddingBottom: '4px' }">
                <div class="main-card-header">这里本来应该是博客的副标题，但是我还没想好</div>
                <ElSkeleton :loading="pageCountLoading" :throttle="100">
                    <div class="head-page-selector-container">
                        <PageSelector v-if="!pageCountLoading" :current="page" :total="pageCount" @jump="jumpToPage" />
                    </div>
                    <ElSkeleton :loading="pageManifestLoading" :throttle="100">
                        <PostCard v-for="(manifest, index) in posts" :manifest :key="index" />
                    </ElSkeleton>
                    <PageSelector v-if="!pageCountLoading" :current="page" :total="pageCount" @jump="jumpToPage" />
                </ElSkeleton>
            </ElCard>
        </ElCol>
        <ElCol style="padding: 0.5rem" :xs="0" :sm="5" :md="5" :lg="5" :xl="5">
            <div ref="authorCardRef">
                <AuthorCard @animation="updateDynamicCardPosition" />
            </div>
            <ElCard class="dynamic-card" :style="dynamicCardStyle" :body-style="{ height: '100%' }">
                <ElScrollbar><BlogMeta /></ElScrollbar>
            </ElCard>
        </ElCol>
        <ElCol style="padding: 0.5rem" :xs="0" :sm="2" :md="2" :lg="2" :xl="2"></ElCol>
    </ElRow>
    <BlogFooter />
</template>

<script lang="ts" setup>
import AuthorCard from '@/components/blog/AuthorCard.vue';
import BlogFooter from '@/components/blog/BlogFooter.vue';
import BlogMeta from '@/components/blog/BlogMeta.vue';
import PageSelector from '@/components/blog/PageSelector.vue';
import PostCard from '@/components/blog/PostCard.vue';
import VolumetricCloud from '@/components/blog/VolumetricCloud.vue';
import ChBlue from '@/components/common/ChBlue.vue';
import ChLogo from '@/components/common/ChLogo.vue';
import ThemeSwitch from '@/components/common/ThemeSwitch.vue';
import { blogAxios } from '@/lib/blog/blog-axios';
import { eventEmitter } from '@/lib/event-emitter';
import { useTitle } from '@/lib/use-title';
import router from '@/router';
import { useThemeStore } from '@/stores/theme';
import type { IndexPageManifest, IndexManifest, PostManifest } from 'common-lib/blog/manifest';
import { ElCard, ElCol, ElRow, ElScrollbar, ElSkeleton } from 'element-plus';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const authorCardRef = ref<HTMLElement | null>(null);
const mainCardRef = ref<InstanceType<typeof ElCard> | null>(null);
const blogHeaderRef = ref<HTMLElement | null>(null);

const dynamicCardStyle = ref({
    position: 'sticky',
    top: '0px',
    height: '0px',
});

const updateDynamicCardPosition = () => {
    if (!authorCardRef.value || !mainCardRef.value || !blogHeaderRef.value) {
        return;
    }

    const authorCardRect = authorCardRef.value.getBoundingClientRect();
    const mainCardRect = (mainCardRef.value.$el as HTMLElement).getBoundingClientRect();
    const blogHeaderRect = blogHeaderRef.value.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // 计算上边缘
    let topPosition: number;
    const authorCardBottomVisible = authorCardRect.bottom > blogHeaderRect.bottom;

    if (authorCardBottomVisible) {
        // AuthorCard下边缘可见，距离其下边缘2rem
        topPosition = authorCardRect.bottom + 32; // 2rem = 32px
    } else {
        // 距离blog-header下边缘2rem
        topPosition = blogHeaderRect.bottom + 32;
    }

    // 计算下边缘
    let bottomPosition: number;
    const mainCardBottomVisible = mainCardRect.bottom > 0 && mainCardRect.bottom < windowHeight;
    const mainCardBottomDistance = windowHeight - mainCardRect.bottom;

    if (mainCardBottomVisible && mainCardBottomDistance > 16) {
        // 1rem = 16px
        // main-card下边缘可见且距离屏幕底部大于1rem，与其对齐
        bottomPosition = mainCardRect.bottom;
    } else {
        // 下边缘距离屏幕底部1rem
        bottomPosition = windowHeight - 16;
    }

    // 计算高度
    const height = Math.max(0, bottomPosition - topPosition);

    // 计算sticky的top值（相对于视口顶部）
    const stickyTop = topPosition;

    dynamicCardStyle.value = {
        position: 'sticky',
        top: `${stickyTop}px`,
        height: `${height}px`,
    };
};

const bannerWidth = ref(0);
const bannerHeight = ref(0);

const onResize = () => {
    bannerWidth.value = window.innerWidth;

    if (bannerWidth.value >= 800) {
        bannerHeight.value = Math.floor(bannerWidth.value / 8);
    } else {
        bannerHeight.value = Math.floor(bannerWidth.value / 4);
    }
};

onMounted(() => {
    onResize();
    eventEmitter.on('scroll', onResize);
    eventEmitter.on('scroll', updateDynamicCardPosition);
    window.addEventListener('resize', updateDynamicCardPosition);
    // 延迟执行以确保DOM已渲染
    setTimeout(updateDynamicCardPosition, 100);
});

onBeforeUnmount(() => {
    eventEmitter.off('scroll', onResize);
    eventEmitter.off('scroll', updateDynamicCardPosition);
    window.removeEventListener('resize', updateDynamicCardPosition);
});

const { darkness } = storeToRefs(useThemeStore());
const bannerColor = computed((): [number, number, number] => {
    const d = darkness.value;
    return [0 * d + 0.2 * (1 - d), 0.02 * d + 0.4 * (1 - d), 0.1 * d + 0.6 * (1 - d)];
});

const props = defineProps({
    page: {
        type: Number,
        required: true,
    },
});

const pageCountLoading = ref(true);
const pageCount = ref(0);

const pageManifestLoading = ref(true);
const pageManifest = ref<string[]>([]);

const posts = ref<({ loading: false; manifest: PostManifest } | { loading: true })[]>([]);

const load = async () => {
    pageManifestLoading.value = true;
    pageManifest.value = [];
    posts.value = [];

    if (pageCountLoading.value) {
        const pageCountData = (await blogAxios.get<IndexManifest>('/index.json')).data;
        pageCount.value = pageCountData.pages;
        if (props.page > pageCount.value) {
            await router.replace('/blog/notfound');
        }
        pageCountLoading.value = false;
    }

    const pageManifestData = (await blogAxios.get<IndexPageManifest>(`/index/${props.page}.json`)).data;
    pageManifest.value = pageManifestData.posts;
    posts.value = pageManifest.value.map(() => ({ loading: true }));
    pageManifestLoading.value = false;

    await Promise.all(
        pageManifest.value.map(async (v, i) => {
            const postData = (await blogAxios.get<PostManifest>(`/posts/${v}.json`)).data;
            posts.value[i] = { loading: false, manifest: postData };
        })
    );
};

onMounted(load);
watch(() => props.page, load);

useTitle('Chlamydomonos的博客 | Chlamydomonos.xyz');

const jumpToPage = async (page: number) => {
    await router.push(`/blog/${page}`);
};
</script>

<style lang="scss" scoped>
.banner-container {
    position: relative;
    width: 100%;
}

.banner {
    width: 100%;
}

.banner-title {
    position: absolute;
    top: 40%;
    width: 100vw;
    text-align: center;
    transform: translate(0, -50%);
    z-index: 1;
    font-size: 6vw;
}

.blog-header {
    position: sticky;
    top: 0;
    width: 100%;
    height: 32px;
    background-color: var(--blog-home-header-background);
    margin-top: -32px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;

    a {
        color: var(--el-text-color-regular);
        text-decoration: none;
        cursor: pointer;
        &:hover {
            color: var(--el-text-color-primary);
        }
    }

    .link-container {
        margin: 0 0.25rem;
    }

    .current-link a {
        color: var(--el-text-color-primary);
        text-decoration: underline;
        &:hover {
            opacity: 0.8;
        }
    }

    .left-element {
        display: flex;
        flex: 0 0 300px;
        align-items: center;
    }

    .right-element {
        display: flex;
        flex: 0 1 300px;
        align-items: center;
        justify-content: flex-end;
    }
}

.main-card {
    border: none;
    border-radius: 4px;
    --el-card-padding: 0;
}

.dynamic-card {
    border: none;
    border-radius: 4px;
    transition: none;
    --el-card-padding: 0;
}

.main-card-header {
    background-color: var(--site-header-background);
    padding: 0.5rem;
    color: var(--el-text-color-secondary);
    border-bottom: 1px solid var(--el-border-color);
    .dark & {
        border-bottom: none;
    }
}

.main-link:hover {
    opacity: 0.8;
}

.head-page-selector-container {
    padding-top: 1rem;
}
</style>
