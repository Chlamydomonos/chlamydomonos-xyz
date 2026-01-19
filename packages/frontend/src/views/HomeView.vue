<template>
    <main class="title-font" style="font-size: 8vw">
        <span>Chlamyd</span><ChLogo /><span>monos</span><ChBlue>.xyz</ChBlue>
    </main>
    <div class="links-container">
        <RouterLink class="no-visited" to="/tavern-cards">角色卡发布页</RouterLink>
        <RouterLink class="no-visited" to="/hash-lang">哈希语</RouterLink>
        <RouterLink class="no-visited" to="/blog"><ChLogo ch-char />的博客</RouterLink>
    </div>
    <ThemeSwitch class="main-theme-switch" />
</template>

<script setup lang="ts">
import ChBlue from '@/components/common/ChBlue.vue';
import ChLogo from '@/components/common/ChLogo.vue';
import ThemeSwitch from '@/components/common/ThemeSwitch.vue';
import { useTitle } from '@/lib/use-title';

useTitle('Chlamydomonos.xyz');
</script>

<style lang="scss" scoped>
main {
    width: 100vw;
    text-align: center;
    margin-top: 10vh;
}

.links-container {
    margin: 0 20vw;
    margin-top: 10vh;
    display: grid;
    grid-template-columns: repeat(auto-fit, 160px);
    justify-content: space-between;
    grid-gap: 20px;

    a {
        display: block;
        padding: 0.2rem;
        text-align: center;
        color: var(--site-link-color);
        text-decoration: none;
        border-bottom: 1px solid;
        border-image: linear-gradient(
                to right,
                transparent 5%,
                var(--site-link-color) 40%,
                var(--site-link-color) 60%,
                transparent 95%
            )
            1;
        --site-link-color: var(--el-text-color-regular);
        &:hover {
            --site-link-color: var(--el-text-color-primary);
        }
    }
}

.main-theme-switch {
    position: fixed;
    top: 8px;
    right: 12px;
}
</style>
