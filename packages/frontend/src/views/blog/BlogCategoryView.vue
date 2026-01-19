<template>
    <BlogBaseLayout header-current="category">
        <template #header>
            <span class="header-title title-font">{{ title }}</span>
        </template>
        <template #default>
            <ElCard class="children-card">
                <ElCollapse expand-icon-position="left" class="children-container" v-model="activeNames">
                    <ElCollapseItem :title="categories.length == 0 ? '分类' : '子类'" name="1">
                        <div class="children-wrapper">
                            <ElBreadcrumb separator="/" v-if="categories.length > 0">
                                <ElBreadcrumbItem to="/blog/categories">分类</ElBreadcrumbItem>
                                <ElBreadcrumbItem
                                    v-for="category in categories.map((_, i) => categories.slice(0, i + 1))"
                                    :key="category[category.length - 1]"
                                    :to="`/blog/categories/${category.join('/')}`"
                                >
                                    {{ category[category.length - 1] }}
                                </ElBreadcrumbItem>
                            </ElBreadcrumb>
                            <ElSkeleton :loading="childrenLoading" :throttle="100">
                                <div class="children-links-container" v-if="children.length > 0">
                                    <RouterLink
                                        v-for="child in children"
                                        :key="child"
                                        :to="`/blog/categories/${categories.join('/')}${
                                            categories.length == 0 ? '' : '/'
                                        }${child}`"
                                        class="no-underline no-visited"
                                    >
                                        <FontAwesomeIcon :icon="faFolder" />&ensp;{{ child }}
                                    </RouterLink>
                                </div>
                                <div class="children-links-container" v-else>暂无子类</div>
                            </ElSkeleton>
                        </div>
                    </ElCollapseItem>
                </ElCollapse>
            </ElCard>
            <div class="page-container" :style="{ padding: pageLoading ? '1rem' : '1rem 0 0 0' }">
                <ElSkeleton v-if="pageCount > 0" :loading="pageLoading" :throttle="100">
                    <div class="cards-container">
                        <SmallPostCard v-for="post in posts" :key="post" :id="post" />
                    </div>
                    <PageSelector :current="page" :total="pageCount" style="margin: 1rem 0" @jump="jumpToPage" />
                </ElSkeleton>
            </div>
        </template>
        <template #dynamicCard>
            <div class="dynamic-card-title">全部分类</div>
            <ElTree :data="tree" :props="{ children: 'children', label: 'name' }" lazy :load="loadNode">
                <template #default="{ node }">
                    <RouterLink class="tree-link no-underline no-visited" :to="`/blog/categories/${buildPath(node)}`">
                        <FontAwesomeIcon :icon="faFolder" />&ensp;{{ node.label }}
                    </RouterLink>
                </template>
            </ElTree>
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
import { faFolder } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import type { CategoriesManifest, CategoryManifest, CategoryPageManifest } from 'common-lib/blog/manifest';
import {
    ElBreadcrumb,
    ElBreadcrumbItem,
    ElCard,
    ElCollapse,
    ElCollapseItem,
    ElSkeleton,
    ElTree,
    type LoadFunction,
} from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
const props = defineProps<{
    categories: string[];
    page: number;
}>();

const title = computed(() => {
    if (props.categories.length == 0) {
        return '分类';
    }
    return `分类 - ${props.categories[props.categories.length - 1]}`;
});

useTitle(
    () => `${title.value} | Chlamydomonos的博客`,
    () => props.categories
);

const childrenLoading = ref(true);
const children = ref<string[]>([]);
const pageCount = ref(0);

const loadChildren = async () => {
    childrenLoading.value = true;
    try {
        if (props.categories.length == 0) {
            const data = (await blogAxios.get<CategoriesManifest>('/categories.json')).data;
            pageCount.value = 0;
            children.value = data.topCategories;
        } else {
            const path = `/categories/${props.categories.join('/')}.json`;
            const data = (await blogAxios.get<CategoryManifest>(path)).data;
            pageCount.value = data.pages;
            children.value = data.children;
        }
        childrenLoading.value = false;
        await loadPage();
    } catch (e) {
        console.error(e);
        await router.replace('/blog/category-not-found');
    }
};

onMounted(loadChildren);
watch(() => props.categories, loadChildren);

const pageLoading = ref(true);
const posts = ref<string[]>([]);

const loadPage = async () => {
    if (props.categories.length == 0 || pageCount.value == 0) {
        return;
    }
    pageLoading.value = true;
    try {
        const path = `/categories/${props.categories.join('/')}/${props.page}.json`;
        posts.value = (await blogAxios.get<CategoryPageManifest>(path)).data.posts;
        pageLoading.value = false;
    } catch (e) {
        console.error(e);
        await router.replace('/blog/category-not-found');
    }
};

watch(() => props.page, loadPage);

const activeNames = ref(['1']);

const jumpToPage = async (target: number) => {
    await router.push(
        `/blog/categories/${props.categories.join('/')}${props.categories.length == 0 ? '' : '/'}${target}`
    );
};

interface TreeData {
    name: string;
    children: TreeData[];
}

const tree = ref<TreeData[]>([]);

const buildPath = (node: LoadFunction extends (node: infer R, ...args: any[]) => any ? R : never) => {
    let path = (node.data as TreeData).name;
    let current = node;
    while (current.parent && current.parent.data?.name) {
        path = `${(current.parent.data as TreeData).name}/${path}`;
        current = current.parent;
    }
    return path;
};

const loadNode: LoadFunction = (node, resolve, reject) => {
    const path = buildPath(node);

    (async () => {
        try {
            const data = (await blogAxios.get<CategoryManifest>(`/categories/${path}.json`)).data;
            resolve(data.children.map((name) => ({ name, children: [] })));
        } catch (e) {
            reject();
        }
    })();
};

const loadInitialNode = async () => {
    try {
        // 加载根节点数据
        const rootData = (await blogAxios.get<CategoriesManifest>('/categories.json')).data;

        if (props.categories.length === 0) {
            // 如果当前在根分类页面，只需要显示顶级分类
            tree.value = rootData.topCategories.map((name) => ({ name, children: [] }));
        } else {
            // 需要构建到当前分类的完整路径
            let currentPath = '';
            let currentTree: TreeData[] = rootData.topCategories.map((name) => ({ name, children: [] }));
            tree.value = currentTree;

            // 逐级加载和展开分类树
            for (let i = 0; i < props.categories.length; i++) {
                const categoryName = props.categories[i];
                currentPath = currentPath ? `${currentPath}/${categoryName}` : categoryName;

                // 找到当前分类节点
                const currentNode = currentTree.find((node) => node.name === categoryName);
                if (currentNode) {
                    // 加载该分类的子分类数据
                    const categoryData = (await blogAxios.get<CategoryManifest>(`/categories/${currentPath}.json`))
                        .data;
                    currentNode.children = categoryData.children.map((name) => ({ name, children: [] }));
                    currentTree = currentNode.children;
                }
            }
        }
    } catch (e) {
        console.error('Failed to load initial tree data:', e);
        tree.value = [];
    }
};

onMounted(loadInitialNode);
watch(() => props.categories, loadInitialNode);
</script>

<style lang="scss" scoped>
.header-title {
    font-size: 1.8rem;
}

.children-card {
    border: none;
    --el-card-padding: 0.5rem;
}

.children-container {
    --el-collapse-border-color: none;
    --el-collapse-header-height: 1rem;
}

.children-wrapper {
    padding: 0.5rem;
}

.children-links-container {
    padding-top: 0.5rem;
    a {
        color: var(--el-text-color-regular);
        font-size: 1rem;
        line-height: 1.5rem;
        width: 100%;
        display: block;
        padding: 0.25rem;
        border-top: 1px solid var(--el-border-color);
        &:hover {
            color: var(--el-text-color-primary);
        }
        &:last-child {
            border-bottom: 1px solid var(--el-border-color);
        }
    }
}

.cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, 150px);
    grid-gap: 20px;

    @media (max-width: 768px) {
        justify-content: center;
        justify-items: center;
    }
}

.dynamic-card-title {
    padding: 1rem;
    font-weight: bold;
    font-size: 1.5rem;
    border-bottom: 1px solid var(--el-border-color);
}

.tree-link {
    color: var(--el-text-color-regular);
    &:hover {
        color: var(--el-text-color-primary);
    }
}
</style>

<style lang="scss">
.children-card .el-collapse-item__content {
    padding-bottom: 0;
}
</style>
