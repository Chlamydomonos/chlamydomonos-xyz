<template>
    <ElScrollbar class="main-frame" @scroll="handleScroll">
        <div class="main-elem" ref="mainElem">
            <slot></slot>
        </div>
        <GameOfLife />
    </ElScrollbar>
</template>

<script lang="ts" setup>
import { eventEmitter } from '@/lib/event-emitter';
import { ElScrollbar } from 'element-plus';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import GameOfLife from '../common/GameOfLife.vue';

const mainElem = ref<HTMLDivElement>();
const currentScroll = ref(0);
const hasScrollBar = ref(false);

const handleScroll = (param: { scrollTop: number }) => {
    currentScroll.value = param.scrollTop;
    eventEmitter.emit('scroll', {
        value: param.scrollTop,
        percent: param.scrollTop / mainElem.value!.offsetHeight,
        hasScrollBar: hasScrollBar.value,
    });
};

const handleResize = () => {
    const mainHeight = mainElem.value!.offsetHeight;
    hasScrollBar.value = mainHeight > window.innerHeight;
    eventEmitter.emit('scroll', {
        value: currentScroll.value,
        percent: currentScroll.value / mainHeight,
        hasScrollBar: hasScrollBar.value,
    });
};
const resizeObserver = new ResizeObserver(handleResize);

onMounted(() => {
    handleResize();
    resizeObserver.observe(mainElem.value!);
});

onBeforeUnmount(() => {
    resizeObserver.unobserve(mainElem.value!);
});
</script>

<style lang="scss" scoped>
.main-frame {
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
}

.main-elem {
    display: flow-root;
    min-width: 100vw;
    min-height: 100vh;
}
</style>
