<template>
    <BlogBaseLayout header-current="tag">
        <template #header>
            <span class="title-font" style="font-size: 1.8rem">{{ tag }} - 标签</span>
        </template>
        <template #default>
            <ElBreadcrumb separator="/">
                <ElBreadcrumbItem to="/blog/tags">标签</ElBreadcrumbItem>
                <ElBreadcrumbItem>{{ tag }}</ElBreadcrumbItem>
            </ElBreadcrumb>
            <ElSkeleton :loading="pageCountLoading" :throttle="100">
                <template v-if="pageCount > 0">
                    <div class="cards-container">
                        <ElSkeleton :loading="pageLoading" :throttle="100">
                            <SmallPostCard v-for="post in posts" :key="post" :id="post" />
                        </ElSkeleton>
                    </div>
                    <PageSelector :total="pageCount" :current="page" @jump="jump" />
                </template>
            </ElSkeleton>
        </template>
    </BlogBaseLayout>
</template>

<script lang="ts" setup>
import BlogBaseLayout from '@/components/blog/BlogBaseLayout.vue';
import PageSelector from '@/components/blog/PageSelector.vue';
import SmallPostCard from '@/components/blog/SmallPostCard.vue';
import { blogAxios } from '@/lib/blog/blog-axios';
import { useTitle } from '@/lib/use-title';
import router from '@/router';
import type { TagPageManifest, TagManifest } from 'common-lib/blog/manifest';
import { ElBreadcrumb, ElBreadcrumbItem, ElSkeleton } from 'element-plus';
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{
    tag: string;
    page: number;
}>();

useTitle(() => `${props.tag} | Chlamydomonos的博客`, props);

const pageCountLoading = ref(true);
const pageCount = ref(0);
const pageLoading = ref(true);
const posts = ref<string[]>([]);

const loadPageCount = async () => {
    pageCountLoading.value = true;
    try {
        pageCount.value = (await blogAxios.get<TagManifest>(`/tags/${props.tag}.json`)).data.pages;
        pageCountLoading.value = false;
        await loadPage();
    } catch (e) {
        console.error(e);
        await router.replace('/blog/tag-not-found');
    }
};

onMounted(loadPageCount);
watch(() => props.tag, loadPageCount);

const loadPage = async () => {
    pageLoading.value = true;
    try {
        posts.value = (await blogAxios.get<TagPageManifest>(`/tags/${props.tag}/${props.page}.json`)).data.posts;
        pageLoading.value = false;
    } catch (e) {
        console.error(e);
        await router.replace('/blog/tag-not-found');
    }
};

const jump = async (target: number) => {
    await router.push(`/blog/tag/${props.tag}/${target}`);
};
</script>

<style lang="scss" scoped>
.cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, 150px);
    grid-gap: 20px;
    margin: 1rem 0;

    @media (max-width: 768px) {
        justify-content: center;
        justify-items: center;
    }
}
</style>
