<template>
    <main class="title-font main-title">
        <div>Haʃø</div>
        <div class="separator"><ChBlue>&nbsp;——&nbsp;</ChBlue></div>
        <div>哈希语</div>
    </main>
    <div class="title-font home-link" style="font-size: 3vw">
        <RouterLink class="no-visited" to="/">
            <span>Chlamyd</span><ChLogo /><span>monos</span><ChBlue>.xyz</ChBlue>
        </RouterLink>
    </div>
    <div class="buttons-container">
        <ElButton @click="toDoc">哈希语文档</ElButton>
        <div style="width: 4vw"></div>
        <ElButton @click="toDict">哈希语词典</ElButton>
    </div>
    <ThemeSwitch class="main-theme-switch" />
</template>

<script lang="ts" setup>
import ChBlue from '@/components/common/ChBlue.vue';
import ChLogo from '@/components/common/ChLogo.vue';
import ThemeSwitch from '@/components/common/ThemeSwitch.vue';
import { useTitle } from '@/lib/use-title';
import { ElButton } from 'element-plus';

useTitle('哈希语 | Chlamydomonos.xyz');

const toDict = () => {
    window.location.href = 'https://hash-dict.chlamydomonos.xyz';
};

const toDoc = () => {
    window.location.href = 'https://hash-lang-doc.chlamydomonos.xyz';
};
</script>

<style lang="scss" scoped>
.main-title {
    margin-top: 4vh;
    font-weight: bold;
    font-size: 8vw;
    display: flex;
    align-items: center;
    justify-content: center;

    .separator {
        align-self: baseline;
        padding-top: 0.2vw;
    }
}

.home-link {
    margin-left: 65vw;
    margin-top: 1vh;
    a {
        text-decoration: none;
        color: var(--el-text-color-regular);
        &:hover {
            color: var(--el-text-color-primary);
        }
    }
}

.main-theme-switch {
    position: fixed;
    top: 8px;
    right: 12px;
}

.buttons-container {
    display: flex;
    margin-top: 10vh;
    justify-content: center;
}
</style>
