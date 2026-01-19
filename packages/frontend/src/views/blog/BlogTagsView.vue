<template>
    <BlogBaseLayout header-current="tag">
        <template #header>
            <span class="title-font" style="font-size: 1.8rem">标签 | Chlamydomonos的博客</span>
        </template>
        <template #default>
            <ElCard class="main-card">
                <h1>全部标签</h1>
                <hr />
                <ElSkeleton :loading :throttle="100">
                    <div v-for="letter in sortedLetters" :key="letter" class="tag-group">
                        <h3 class="letter-header">{{ letter }}</h3>
                        <div class="tags-container">
                            <BlogTag v-for="tag in data[letter]" :key="tag" :name="tag" />
                        </div>
                    </div>
                    <div v-if="sortedLetters.length === 0" class="empty-state">
                        <p>暂无标签</p>
                    </div>
                </ElSkeleton>
            </ElCard>
        </template>
    </BlogBaseLayout>
</template>

<script lang="ts" setup>
import BlogBaseLayout from '@/components/blog/BlogBaseLayout.vue';
import BlogTag from '@/components/blog/BlogTag.vue';
import { blogAxios } from '@/lib/blog/blog-axios';
import { useTitle } from '@/lib/use-title';
import type { TagsManifest } from 'common-lib/blog/manifest';
import { ElCard, ElSkeleton } from 'element-plus';
import { computed, onMounted, ref } from 'vue';

useTitle('标签 | Chlamydomonos的博客');

const loading = ref(true);
const data = ref<Record<string, string[]>>({});

// 计算按字母顺序排列的首字母
const sortedLetters = computed(() => {
    const letters = Object.keys(data.value);
    return letters.sort((a, b) => {
        // # 排在最后
        if (a === '#' && b !== '#') return 1;
        if (b === '#' && a !== '#') return -1;
        // 数字排在字母前面
        if (/[0-9]/.test(a) && /[A-Z]/.test(b)) return -1;
        if (/[A-Z]/.test(a) && /[0-9]/.test(b)) return 1;
        // 其他情况按字典顺序排序
        return a.localeCompare(b);
    });
});

const load = async () => {
    loading.value = true;
    data.value = {};
    try {
        const [{ data: tagsData }, { default: pinyin }] = await Promise.all([
            blogAxios.get<TagsManifest>('/tags.json'),
            import('pinyin'),
        ]);
        for (const tag of tagsData.tags) {
            const first = tag[0];
            let firstLatin = pinyin(first, { style: 'FIRST_LETTER' })[0][0].toUpperCase();
            if (!/[A-Z0-9]/.test(firstLatin)) {
                firstLatin = '#';
            }
            if (!data.value[firstLatin]) {
                data.value[firstLatin] = [];
            }
            data.value[firstLatin].push(tag);
        }
        loading.value = false;
    } catch (e) {
        console.error(e);
    }
};

onMounted(load);
</script>

<style lang="scss" scoped>
.main-card {
    border: none;
    --el-card-padding: 1rem;
}

.tag-group {
    margin-bottom: 2rem;

    &:last-child {
        margin-bottom: 0;
    }
}

.letter-header {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--el-text-color-primary);
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--el-border-color-light);
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.empty-state {
    text-align: center;
    color: var(--el-text-color-secondary);
    font-size: 1.1rem;
    padding: 2rem 0;
}
</style>
