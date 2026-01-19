<template>
    <canvas ref="canvasRef" :width="width" :height="height" class="mandelbrot-canvas" />
</template>

<script setup lang="ts">
import { MandelbrotRenderer, type RGB } from '@/lib/blog/mandelbrot-renderer';
import { ref, computed, watch, onMounted } from 'vue';

interface Props {
    width?: number;
    height?: number;
    colors?: RGB[];
    seed?: string;
    iterations?: number;
}

const props = withDefaults(defineProps<Props>(), {
    width: 800,
    colors: () => [],
    seed: 'default',
    iterations: 1000,
});

const height = computed<number>(() => props.height ?? Math.round((props.width * 9) / 16));

const canvasRef = ref<HTMLCanvasElement | null>(null);

// 全局渲染队列管理
class RenderQueue {
    private static instance: RenderQueue | null = null;
    private queue: (() => void)[] = [];
    private isProcessing = false;

    static getInstance(): RenderQueue {
        if (!this.instance) {
            this.instance = new RenderQueue();
        }
        return this.instance;
    }

    addToQueue(renderFn: () => void) {
        this.queue.push(renderFn);
        this.processQueue();
    }

    removeFromQueue(renderFn: () => void) {
        const index = this.queue.indexOf(renderFn);
        if (index > -1) {
            this.queue.splice(index, 1);
        }
    }

    private processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        setTimeout(() => {
            if (this.queue.length > 0) {
                const renderFn = this.queue.shift()!;
                renderFn();
            }
            this.isProcessing = false;
            if (this.queue.length > 0) {
                this.processQueue();
            }
        }, 20);
    }
}

const renderQueue = RenderQueue.getInstance();

const render = () => {
    if (!canvasRef.value) return;
    MandelbrotRenderer.getInstance().render(canvasRef.value, {
        colorScheme: props.colors,
        iterations: props.iterations,
        seed: props.seed,
    });
};

const scheduleRender = () => {
    renderQueue.addToQueue(render);
};

onMounted(() => scheduleRender());

watch(props, scheduleRender);
</script>

<style scoped>
.mandelbrot-canvas {
    display: block;
}
</style>
