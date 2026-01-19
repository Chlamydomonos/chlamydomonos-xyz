<template>
    <div class="outer-frame">
        <div class="title">最近文章</div>
        <hr />
        <ElSkeleton :loading="recentPostsLoading" :throttle="100">
            <div>
                <MetaPostCard v-if="recentPosts.length > 0" :post="recentPosts[0]" />
                <div v-else>暂无</div>
                <MetaPostCard v-if="recentPosts.length > 1" :post="recentPosts[1]" />
                <MetaPostCard v-if="recentPosts.length > 2" :post="recentPosts[2]" />
            </div>
            <ElCollapse v-if="recentPosts.length > 3" expand-icon-position="left">
                <ElCollapseItem title="更多">
                    <div>
                        <MetaPostCard v-for="id in recentPosts.length - 3" :key="id" :post="recentPosts[id + 2]" />
                    </div>
                    <ElLink underline="always" href="/blog">查看更多...</ElLink>
                </ElCollapseItem>
            </ElCollapse>
            <ElLink underline="always" href="/blog" v-else>查看更多...</ElLink>
        </ElSkeleton>
        <div class="title">分类</div>
        <hr />
        <ElSkeleton :loading="categoriesLoading" :throttle="100">
            <template v-if="categories">
                <div>
                    <div class="category-container" v-if="categories.length > 0">
                        <ElLink :href="`/blog/categories/${categories[0]}`">
                            <FontAwesomeIcon :icon="faFolder" />&ensp;{{ categories[0] }}
                        </ElLink>
                    </div>
                    <div class="category-container" v-if="categories.length > 1">
                        <ElLink :href="`/blog/categories/${categories[1]}`">
                            <FontAwesomeIcon :icon="faFolder" />&ensp;{{ categories[1] }}
                        </ElLink>
                    </div>
                    <div class="category-container" v-if="categories.length > 2">
                        <ElLink :href="`/blog/categories/${categories[2]}`">
                            <FontAwesomeIcon :icon="faFolder" />&ensp;{{ categories[2] }}
                        </ElLink>
                    </div>
                </div>
                <ElCollapse v-if="categories.length > 3" expand-icon-position="left">
                    <ElCollapseItem title="更多">
                        <div>
                            <div class="category-container" v-for="id in categories.length - 3" :key="id">
                                <ElLink :href="`/blog/categories/${categories[id + 2]}`">
                                    <FontAwesomeIcon :icon="faFolder" />&ensp;{{ categories[id + 2] }}
                                </ElLink>
                            </div>
                        </div>
                        <ElLink underline="always" href="/blog/categories"> 查看更多... </ElLink>
                    </ElCollapseItem>
                </ElCollapse>
                <ElLink underline="always" href="/blog/categories" v-else> 查看更多... </ElLink>
            </template>
        </ElSkeleton>
        <div class="title">标签</div>
        <hr />
        <ElSkeleton :loading="tagsLoading" :throttle="100">
            <template v-if="tags">
                <div class="tags-container" v-if="tags.length > 0">
                    <BlogTag v-for="id in Math.min(10, tags.length)" :key="id" :name="tags[id - 1]" />
                </div>
                <ElCollapse v-if="tags.length > 10">
                    <ElCollapseItem title="更多">
                        <div class="tags-container">
                            <BlogTag v-for="id in tags.length - 10" :key="id + 9" :name="tags[id + 9]" />
                        </div>
                        <ElLink underline="always" href="/blog/tags"> 查看更多... </ElLink>
                    </ElCollapseItem>
                </ElCollapse>
                <ElLink underline="always" href="/blog/tags" v-else> 查看更多... </ElLink>
            </template>
            <div class="none" v-else>暂无</div>
        </ElSkeleton>
    </div>
</template>

<script lang="ts" setup>
import { blogAxios } from '@/lib/blog/blog-axios';
import type { TagsManifest, CategoriesManifest, PostManifest, IndexPageManifest } from 'common-lib/blog/manifest';
import { ElCollapse, ElCollapseItem, ElLink, ElSkeleton, ElTag } from 'element-plus';
import { onMounted, ref } from 'vue';
import MetaPostCard from './MetaPostCard.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faFolder } from '@fortawesome/free-regular-svg-icons';
import router from '@/router';
import BlogTag from './BlogTag.vue';

const recentPosts = ref<PostManifest[]>([]);
const recentPostsLoading = ref(true);

const categories = ref<string[]>();
const categoriesLoading = ref(true);

const tags = ref<string[]>();
const tagsLoading = ref(true);

onMounted(async () => {
    await Promise.all([
        (async () => {
            recentPostsLoading.value = true;
            const posts = (await blogAxios.get<IndexPageManifest>('/index/1.json')).data;
            recentPosts.value = await Promise.all(
                posts.posts.map((name) =>
                    (async () => (await blogAxios.get<PostManifest>(`/posts/${name}.json`)).data)()
                )
            );
            recentPostsLoading.value = false;
        })(),
        (async () => {
            categoriesLoading.value = true;
            categories.value = (await blogAxios.get<CategoriesManifest>('/categories.json')).data.topCategories;
            categoriesLoading.value = false;
        })(),
        (async () => {
            tagsLoading.value = true;
            tags.value = (await blogAxios.get<TagsManifest>('/tags.json')).data.tags;
            tagsLoading.value = false;
        })(),
    ]);
});
</script>

<style lang="scss" scoped>
.outer-frame {
    padding: 0.5rem;
}

.title {
    font-weight: bold;
    font-size: 1.2rem;
    margin: 0.5rem 0;
}

hr {
    border: none;
    height: 1px;
    background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0) 0%,
        var(--el-text-color-primary) 10%,
        var(--el-text-color-primary) 90%,
        rgba(0, 0, 0, 0) 100%
    );
    margin: 0.5rem 0;
}

.category-container {
    padding: 0.25rem 0;
    &:not(:last-child) {
        border-bottom: 1px solid var(--el-border-color);
    }
}

.none {
    font-size: 0.8rem;
    line-height: 1.5rem;
    color: var(--el-color-info);
}

.tags-container {
    text-wrap: wrap;
}
</style>
