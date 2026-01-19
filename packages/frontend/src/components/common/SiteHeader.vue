<template>
    <header class="site-header" :style="headerStyle">
        <div class="header-left">
            <RouterLink to="/" class="site-title title-font no-visited">
                <span>Chlamyd</span><ChLogo /><span>monos</span><ChBlue>.xyz</ChBlue>
            </RouterLink>
        </div>

        <div class="header-center">
            <slot></slot>
        </div>

        <div class="header-right">
            <ThemeSwitch />
        </div>
    </header>
</template>

<script lang="ts" setup>
import ChBlue from '@/components/common/ChBlue.vue';
import ChLogo from '@/components/common/ChLogo.vue';
import ThemeSwitch from '@/components/common/ThemeSwitch.vue';
import { eventEmitter, type MainScrollEvent } from '@/lib/event-emitter';
import { computed, onBeforeUnmount, onMounted, ref, type StyleValue } from 'vue';

const scrollPercent = ref(0);
const hasScrollBar = ref(false);

const onScroll = (param: MainScrollEvent) => {
    scrollPercent.value = param.percent;
    hasScrollBar.value = param.hasScrollBar;
};

onMounted(() => {
    eventEmitter.on('scroll', onScroll);
});

onBeforeUnmount(() => {
    eventEmitter.off('scroll', onScroll);
});

const headerStyle = computed<StyleValue>(() => {
    if (!hasScrollBar.value) {
        return {
            backgroundColor: 'var(--site-header-background)',
            borderColor: 'var(--site-header-border)',
        };
    }

    const headerRate = 80 / window.innerHeight;

    const gradStart = 20 * (1 - scrollPercent.value / headerRate);
    const gradEnd = 5 * (1 - scrollPercent.value / headerRate);
    return {
        background: `linear-gradient(to right, var(--site-header-background) 0%, var(--site-header-background) calc(100% - ${gradStart}px), transparent calc(100% - ${gradEnd}px))`,
        borderBottomColor: 'transparent',
        borderImage: `linear-gradient(to right, var(--site-header-border) 0%, var(--site-header-border) calc(100% - ${gradStart}px), transparent calc(100% - ${gradEnd}px)) 1`,
    };
});
</script>

<style lang="scss" scoped>
.site-header {
    width: 100%;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    box-sizing: border-box;
    border-bottom: 1px solid;
    position: sticky;
    top: 0;
    z-index: 100;
    --site-header-border: var(--el-border-color);
}

.header-left {
    flex: 0 0 200px;
    display: flex;
    align-items: center;

    @media (max-width: 640px) {
        display: none;
    }
}

.header-center {
    flex: 1 1 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
    overflow: hidden;

    @media (max-width: 640px) {
        max-width: calc(100vw - 40px);
    }
}

.header-right {
    flex: 0 0 200px;
    display: flex;
    justify-content: flex-end;
    align-items: center;

    @media (max-width: 640px) {
        display: none;
    }
}

.site-title {
    font-size: 22px;
    text-decoration: none;
    color: var(--el-text-color-primary);
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.8;
    }

    &:visited {
        color: var(--el-text-color-primary);
    }
}
</style>

<style lang="scss">
.header-title {
    font-size: 20px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 100%;
}
</style>
