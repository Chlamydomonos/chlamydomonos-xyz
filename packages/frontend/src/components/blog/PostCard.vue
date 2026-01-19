<template>
    <ElCard class="post-card" :body-style="manifest.loading ? { padding: '1rem' } : { padding: 0 }">
        <ElSkeleton :loading="manifest.loading" :throttle="100">
            <template v-if="!manifest.loading">
                <div v-if="manifest.manifest.cover" class="cover-container">
                    <img :src="coverSrc" />
                    <div class="post-title title-font">
                        <RouterLink :to="`/blog/posts/${manifest.manifest.id}`">
                            {{ manifest.manifest.title }}
                        </RouterLink>
                    </div>
                </div>
                <div v-else ref="mandelbrotContainer" class="cover-container">
                    <MandelbrotSet :seed="manifest.manifest.id" :width="mandelbrotWidth" :colors />
                    <div class="post-title title-font">
                        <RouterLink :to="`/blog/posts/${manifest.manifest.id}`">
                            {{ manifest.manifest.title }}
                        </RouterLink>
                    </div>
                </div>
                <div class="tags-container" v-if="manifest.manifest.tags.length > 0">
                    <BlogTag v-for="tag in manifest.manifest.tags" :key="tag" :name="tag" />
                </div>
                <div class="markdown-container">
                    <MarkdownComponent :text="manifest.manifest.summary" />
                </div>
                <div class="more-button-container">
                    <ElLink underline="always" @click="router.push(`/blog/posts/${manifest.manifest.id}#more`)">
                        阅读全文
                    </ElLink>
                </div>
            </template>
        </ElSkeleton>
    </ElCard>
</template>

<script lang="ts" setup>
import type { PostManifest } from 'common-lib/blog/manifest';
import { ElCard, ElLink, ElSkeleton } from 'element-plus';
import MarkdownComponent from '../common/MarkdownComponent.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import MandelbrotSet from './MandelbrotSet.vue';
import router from '@/router';
import { useMandelbrotColors } from '@/lib/blog/mandelbrot-colors';
import BlogTag from './BlogTag.vue';

const props = defineProps({
    manifest: {
        type: {} as () => { loading: false; manifest: PostManifest } | { loading: true },
        required: true,
    },
});

const coverSrc = computed(() => {
    if (props.manifest.loading || !props.manifest.manifest.cover) {
        return '';
    }
    const markdownPath = `/sites/blog/posts/${props.manifest.manifest.path}`;
    const url = new URL(markdownPath, window.location.origin);
    const imageUrl = new URL(props.manifest.manifest.cover, url.href);
    return imageUrl.href;
});

const mandelbrotContainer = ref<HTMLDivElement>();
const mandelbrotWidth = ref(0);

const updateMandelbrotSize = () => {
    const container = mandelbrotContainer.value;
    if (!container) {
        return;
    }
    mandelbrotWidth.value = container.offsetWidth;
};

const containerObserver = new ResizeObserver(updateMandelbrotSize);

watch(mandelbrotContainer, () => {
    updateMandelbrotSize();
    if (mandelbrotContainer.value) {
        containerObserver.observe(mandelbrotContainer.value);
    }
});

onBeforeUnmount(() => {
    if (mandelbrotContainer.value) {
        containerObserver.unobserve(mandelbrotContainer.value);
    }
});

const colors = useMandelbrotColors();
</script>

<style lang="scss" scoped>
.post-card {
    box-shadow: none;
    border-radius: 4px;
    margin: 1rem;
}

.cover-container {
    width: 100%;
    aspect-ratio: 16 / 9;
    position: relative;
    img {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
    }
}

.post-title {
    background-color: var(--blog-home-header-background);
    font-size: 2.5rem;
    text-align: center;
    padding: 0.1rem;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1;
    line-height: 1.2;
    word-wrap: break-word;
    overflow-wrap: break-word;
    a {
        color: var(--el-text-color-regular);
        text-decoration: none;
        &:hover {
            color: var(--el-text-color-primary);
        }
    }
}

.markdown-container {
    margin: 1rem;
}

.more-button-container {
    text-align: center;
    margin: 1rem;
}

.tags-container {
    padding: 0.25rem;
}
</style>
