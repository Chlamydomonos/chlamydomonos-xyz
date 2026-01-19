<template>
    <header class="blog-header" :style="headerStyle" ref="headerRef">
        <div class="header-left" ref="headerLeftRef">
            <RouterLink to="/blog">Blog</RouterLink>
            <span class="divider">|</span>
            <RouterLink to="/"><ChLogo ch-char /><ChBlue>.xyz</ChBlue></RouterLink>
            <RouterLink to="/blog" class="mobile-blog-link"><ChLogo ch-char /></RouterLink>
        </div>
        <div class="header-center" ref="headerCenterRef" :style="centerStyle">
            <slot></slot>
        </div>
        <div class="header-right" ref="headerRightRef">
            <RouterLink to="/blog" :class="current == 'home' ? 'current' : ''">首页</RouterLink>
            <RouterLink to="/blog/about" :class="current == 'about' ? 'current' : ''">关于</RouterLink>
            <RouterLink to="/blog/archive" :class="current == 'archive' ? 'current' : ''">归档</RouterLink>
            <RouterLink to="/blog/categories" :class="current == 'category' ? 'current' : ''">分类</RouterLink>
            <RouterLink to="/blog/tags" :class="current == 'tag' ? 'current' : ''">标签</RouterLink>
            <ThemeSwitch />
        </div>
    </header>
</template>

<script lang="ts" setup>
import ChBlue from '../common/ChBlue.vue';
import ChLogo from '../common/ChLogo.vue';
import ThemeSwitch from '../common/ThemeSwitch.vue';
import { eventEmitter, type MainScrollEvent } from '@/lib/event-emitter';
import { computed, onBeforeUnmount, onMounted, ref, nextTick, type StyleValue } from 'vue';

const scrollPercent = ref(0);
const hasScrollBar = ref(false);
const headerRef = ref<HTMLElement>();
const headerLeftRef = ref<HTMLElement>();
const headerRightRef = ref<HTMLElement>();
const centerWidths = ref({ left: 0, right: 0, header: 0 });

const onScroll = (param: MainScrollEvent) => {
    scrollPercent.value = param.percent;
    hasScrollBar.value = param.hasScrollBar;
};

const updateCenterWidths = () => {
    if (headerRef.value && headerLeftRef.value && headerRightRef.value) {
        centerWidths.value = {
            left: headerLeftRef.value.offsetWidth,
            right: headerRightRef.value.offsetWidth,
            header: headerRef.value.offsetWidth - 40, // 减去左右padding
        };
    }
};

onMounted(() => {
    eventEmitter.on('scroll', onScroll);

    nextTick(() => {
        updateCenterWidths();
        window.addEventListener('resize', updateCenterWidths);
    });
});

onBeforeUnmount(() => {
    eventEmitter.off('scroll', onScroll);
    window.removeEventListener('resize', updateCenterWidths);
});

const headerStyle = computed<StyleValue>(() => {
    if (!hasScrollBar.value) {
        return {
            backgroundColor: 'var(--blog-header-background)',
            borderColor: 'var(--blog-header-border)',
        };
    }

    const headerRate = 80 / window.innerHeight;

    const gradStart = 20 * (1 - scrollPercent.value / headerRate);
    const gradEnd = 5 * (1 - scrollPercent.value / headerRate);
    return {
        background: `linear-gradient(to right, var(--blog-header-background) 0%, var(--blog-header-background) calc(100% - ${gradStart}px), transparent calc(100% - ${gradEnd}px))`,
        borderBottomColor: 'transparent',
        borderImage: `linear-gradient(to right, var(--blog-header-border) 0%, var(--blog-header-border) calc(100% - ${gradStart}px), transparent calc(100% - ${gradEnd}px)) 1`,
    };
});

const centerStyle = computed<StyleValue>(() => {
    const { left, right, header } = centerWidths.value;
    if (!header) return {};

    const maxSideWidth = Math.max(left, right);
    const availableWidth = header - 2 * maxSideWidth - 32; // 32px为安全间距

    return {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${Math.max(availableWidth, 100)}px`,
        textAlign: 'center',
        overflow: 'hidden',
    };
});

defineProps({
    current: {
        type: String as () => 'home' | 'about' | 'archive' | 'category' | 'tag',
    },
});

defineExpose({ headerRef });
</script>

<style lang="scss" scoped>
.blog-header {
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
    --blog-header-background: var(--site-header-background);
    --blog-header-border: var(--el-border-color);
}

.header-left {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;

    a {
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

    .divider {
        color: var(--el-text-color-regular);
    }

    .mobile-blog-link {
        display: none;
    }

    @media (max-width: 768px) {
        gap: 0;

        > :not(.mobile-blog-link) {
            display: none;
        }

        .mobile-blog-link {
            display: flex;
            align-items: center;
            font-size: 24px;
        }
    }
}

.header-center {
    /* 样式通过 Vue 的 centerStyle 动态设置 */
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 768px) {
        max-width: calc(100vw - 120px) !important;
    }
}

.header-right {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 16px;

    a {
        text-decoration: none;
        color: var(--el-text-color-primary);
        transition: opacity 0.2s ease;
        font-size: 14px;

        &:hover {
            opacity: 0.8;
        }

        &:visited {
            color: var(--el-text-color-primary);
        }

        &.current {
            text-decoration: underline;
        }
    }

    @media (max-width: 768px) {
        gap: 8px;

        a {
            display: none;
        }
    }
}
</style>
