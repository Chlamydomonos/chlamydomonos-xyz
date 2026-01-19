<template>
    <SiteHeader><div class="header-title title-font">哈希语&ensp;·&emsp;文档</div></SiteHeader>
</template>

<script lang="ts" setup>
import SiteHeader from '@/components/common/SiteHeader.vue';

const props = defineProps({
    path: {
        type: Object as () => string[],
        required: true,
    },
});
</script>

<style lang="scss" scoped></style>
