<template>
    <BlogBaseLayout header-current="about">
        <template #header>
            <span class="title-font title">关于Chlamydomonos的博客</span>
        </template>
        <template #default>
            <MarkdownComponent url="/sites/blog/about.md" />
        </template>
    </BlogBaseLayout>
</template>

<script lang="ts" setup>
import BlogBaseLayout from '@/components/blog/BlogBaseLayout.vue';
import MarkdownComponent from '@/components/common/MarkdownComponent.vue';
import { useTitle } from '@/lib/use-title';

useTitle('关于Chlamydomonos的博客 | Chlamydomonos.xyz');
</script>

<style lang="scss" scoped>
.title {
    font-size: 2rem;
}

.main-frame {
    max-width: 800px;
    padding: 2rem;
    margin: 0 auto;
}
</style>
