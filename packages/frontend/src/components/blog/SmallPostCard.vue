<template>
    <ElCard class="small-post-card" :body-style="loading ? { padding: '1rem' } : { padding: 0 }">
        <ElSkeleton :loading :throttle="100">
            <template v-if="manifest">
                <img v-if="manifest.cover" :src="coverSrc" class="post-cover" />
                <MandelbrotSet v-else :seed="id" :width="150" :height="100" :colors />
                <div class="title-container">
                    <ElScrollbar>
                        <RouterLink class="no-visited no-underline" :to="`/blog/posts/${id}`">
                            <h3>{{ manifest.title }}</h3>
                        </RouterLink>
                    </ElScrollbar>
                </div>
            </template>
        </ElSkeleton>
    </ElCard>
</template>

<script lang="ts" setup>
import type { PostManifest } from 'common-lib/blog/manifest';
import { ElCard, ElScrollbar, ElSkeleton } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import MandelbrotSet from './MandelbrotSet.vue';
import { useMandelbrotColors } from '@/lib/blog/mandelbrot-colors';
import { blogAxios } from '@/lib/blog/blog-axios';
const props = defineProps({
    id: {
        type: String,
        required: true,
    },
});

const colors = useMandelbrotColors();

const loading = ref(true);
const manifest = ref<PostManifest>();

const load = async () => {
    loading.value = true;
    manifest.value = (await blogAxios.get<PostManifest>(`/posts/${props.id}.json`)).data;
    loading.value = false;
};

onMounted(load);

const coverSrc = computed(() => {
    if (!manifest.value?.cover) {
        return '';
    }
    const markdownPath = `/sites/blog/posts/${manifest.value.path}`;
    const url = new URL(markdownPath, window.location.origin);
    const imageUrl = new URL(manifest.value.cover, url.href);
    return imageUrl.href;
});
</script>

<style lang="scss" scoped>
.small-post-card {
    width: 150px;
    height: 200px;
}

.post-cover {
    width: 150px;
    height: 100px;
    object-fit: cover;
}

.title-container {
    text-align: center;
    height: 100px;
    a {
        color: var(--el-text-color-regular);
        &:hover {
            color: var(--el-text-color-primary);
        }
    }
}
</style>
