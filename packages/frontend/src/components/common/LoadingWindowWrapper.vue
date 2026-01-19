<template>
    <Transition name="fade">
        <slot v-if="loading && !started" name="before-loading">
            <div></div>
        </slot>
        <LoadingWindow v-else-if="loading" />
        <slot v-else></slot>
    </Transition>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import LoadingWindow from './LoadingWindow.vue';

const props = defineProps({
    startTime: {
        type: Number,
        default: 200,
    },
});

const started = ref(false);
const loading = ref(true);

const load = () => {
    loading.value = false;
};

defineExpose({
    load,
});

onMounted(() => {
    started.value = false;
    setTimeout(() => {
        started.value = true;
    }, props.startTime);
});
</script>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
