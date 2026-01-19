<template>
    <RouterView v-slot="{ Component }">
        <LoadingWindowWrapper ref="loading">
            <MainElement><component :is="Component" /></MainElement>
        </LoadingWindowWrapper>
    </RouterView>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useThemeStore } from './stores/theme';
import LoadingWindowWrapper from './components/common/LoadingWindowWrapper.vue';
import MainElement from './components/main/MainElement.vue';
import chlamydomonosLogo from '@/assets/images/chlamydomonos.png';
import { preloadImages } from './lib/preload-images';

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

const loading = ref<InstanceType<typeof LoadingWindowWrapper>>();

onMounted(() => {
    updateTheme();

    document.fonts.ready.then(async () => {
        await preloadImages(chlamydomonosLogo);
        loading.value!.load();
    });
});
</script>
