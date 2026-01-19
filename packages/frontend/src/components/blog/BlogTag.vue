<template>
    <RouterLink class="blog-tag no-visited" :to="`/blog/tag/${name}`">{{ name }}</RouterLink>
</template>

<script lang="ts" setup>
defineProps({
    name: {
        type: String,
        required: true,
    },
});
</script>

<style lang="scss" scoped>
.blog-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--el-text-color-regular);
    color: var(--el-text-color-regular);
    text-decoration: none;
    font-size: 14px;
    height: 16px;
    border-radius: 9px;
    line-height: 14px;
    padding: 0 0.75em;
    margin-right: 6px;
    margin-bottom: 6px;
    cursor: pointer;
    &:hover {
        border: 2px solid var(--el-text-color-primary);
        color: var(--el-text-color-primary);
    }
}
</style>
