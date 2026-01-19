<template>
    <main class="title-font" style="font-size: 8vw">
        <span>4</span><ChLogo custom="0" /><span>4 </span><ChBlue>NOT FOUND</ChBlue>
    </main>
    <div class="back-container">
        <ElLink href="/" underline="always">返回首页</ElLink>
        <ElLink @click="router.back" underline="always">返回上一页</ElLink>
    </div>
    <ThemeSwitch class="main-theme-switch" />
</template>

<script setup lang="ts">
import ChBlue from '@/components/common/ChBlue.vue';
import ChLogo from '@/components/common/ChLogo.vue';
import ThemeSwitch from '@/components/common/ThemeSwitch.vue';
import { useTitle } from '@/lib/use-title';
import router from '@/router';
import { ElLink } from 'element-plus';

useTitle('404 - 页面未找到 | Chlamydomonos.xyz');
</script>

<style lang="scss" scoped>
main {
    width: 100vw;
    text-align: center;
    margin-top: 10vh;
}

.back-container {
    margin: 0 20vw;
    margin-top: 10vh;
    display: flex;
    justify-content: center;
    gap: 2rem;

    a {
        font-size: 1.2rem;
    }
}

.main-theme-switch {
    position: fixed;
    top: 8px;
    right: 12px;
}
</style>
