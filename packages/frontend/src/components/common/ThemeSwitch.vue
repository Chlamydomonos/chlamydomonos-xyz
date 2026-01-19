<template>
    <ElSwitch v-model="isDark" class="theme-switch" @change="updateTheme">
        <template #active-action>
            <FontAwesomeIcon :icon="faMoon" class="moon" />
        </template>
        <template #inactive-action>
            <FontAwesomeIcon :icon="faSun" class="sun" />
        </template>
    </ElSwitch>
</template>

<script lang="ts" setup>
import { ElSwitch } from 'element-plus';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-regular-svg-icons';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '@/stores/theme';
import { onMounted } from 'vue';

const { isDark } = storeToRefs(useThemeStore());

const updateTheme = () => {
    const htmlElem = document.querySelector('html');
    if (!htmlElem) {
        return;
    }
    if (isDark.value) {
        htmlElem.classList.add('dark');
    } else {
        htmlElem.classList.remove('dark');
    }
};

onMounted(updateTheme);
</script>

<style lang="scss" scoped>
.theme-switch {
    --el-switch-on-color: #8090a0;
    --el-switch-off-color: #8090a0;
    .moon {
        color: var(--el-border-color);
    }
    .sun {
        color: var(--el-text-color-regular);
    }
}
</style>
