<template>
    <div class="footer" ref="footer">
        Chlamyd<ChLogo />monos的博客
        <br />
        Powered by <a href="https://cn.vuejs.org/">Vue</a>
        <br />
        Components by <a href="https://element-plus.org/zh-CN/">Element Plus</a>, icons by
        <a href="https://fa6.dashgame.com/">Font Awesome</a>
        <br />
        Markdown parser by <a href="https://github.com/GitbookIO/kramed">Kramed</a>, code highlighting by
        <a href="https://highlightjs.org/">Highlight.js</a>, math renderer by
        <a href="https://www.mathjax.org/">MathJax</a>
        <br />
        所有文章遵守<a href="https://creativecommons.org/licenses/by-nc/4.0/"> CC BY-NC 4.0 </a>
        <img class="cc-logo" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" />
        <img class="cc-logo" src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" />
        <img class="cc-logo" src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" />
        协议
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import ChLogo from '../common/ChLogo.vue';

const footer = ref<HTMLDivElement>();
defineExpose({ footer });
</script>

<style lang="scss" scoped>
.footer {
    background-color: var(--site-header-background);
    border-top: 1px solid var(--el-border-color);
    padding: 1rem;
    margin-top: 2rem;
    text-align: center;
    position: sticky;
    top: 100vh;
}

.cc-logo {
    vertical-align: middle;
    max-width: 1em;
    max-height: 1em;
    margin-left: 0.2em;
}
</style>
