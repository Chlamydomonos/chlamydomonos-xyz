<template>
    <div class="meta-post-card-outer-frame">
        <div v-if="post.cover" class="cover-container">
            <img :src="coverSrc" />
        </div>
        <div v-else ref="mandelbrotContainer" class="cover-container">
            <MandelbrotSet :seed="post.id" :width="mandelbrotWidth" :height="mandelbrotWidth" :colors />
        </div>
        <div class="separator"></div>
        <div class="title">
            <RouterLink :to="`/blog/posts/${post.id}`">{{ post.title }}</RouterLink>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useThemeStore } from '@/stores/theme';
import type { PostManifest } from 'common-lib/blog/manifest';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import MandelbrotSet from './MandelbrotSet.vue';

const props = defineProps({
    post: {
        type: {} as () => PostManifest,
        required: true,
    },
});

const coverSrc = computed(() => {
    if (!props.post.cover) {
        return '';
    }
    const markdownPath = `/sites/blog/posts/${props.post.path}`;
    const url = new URL(markdownPath, window.location.origin);
    const imageUrl = new URL(props.post.cover, url.href);
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

const { isDark } = storeToRefs(useThemeStore());
const colors = computed(() => {
    if (isDark.value) {
        return [
            { r: 200, g: 220, b: 240 },
            { r: 16, g: 24, b: 32 },
        ];
    }
    return [
        { r: 16, g: 24, b: 32 },
        { r: 200, g: 220, b: 240 },
    ];
});
</script>

<style lang="scss" scoped>
.meta-post-card-outer-frame {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 4px;

    &:not(:last-child) {
        border-bottom: 1px solid var(--el-border-color);
    }
}

.cover-container {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    overflow: hidden;
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.separator {
    width: 1px;
    height: 32px;
    margin: 0 0.5rem;
    background: linear-gradient(
        0deg,
        rgba(0, 0, 0, 0) 0%,
        var(--el-text-color-primary) 20%,
        var(--el-text-color-primary) 80%,
        rgba(0, 0, 0, 0) 100%
    );
}

.title {
    font-size: 1.2rem;
    font-weight: bold;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    a {
        color: var(--el-text-color-regular);
        text-decoration: none;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        &:hover {
            color: var(--el-text-color-primary);
        }
    }
}
</style>
