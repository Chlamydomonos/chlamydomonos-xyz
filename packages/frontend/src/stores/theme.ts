import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore(
    'theme',
    () => {
        const isDark = ref(false);
        const darkness = ref(isDark.value ? 1 : 0);

        watch(isDark, (newValue) => {
            const startValue = darkness.value;
            const endValue = newValue ? 1 : 0;
            const duration = 200; // 0.2秒
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                darkness.value = startValue + (endValue - startValue) * progress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        });

        return { isDark, darkness };
    },
    {
        persist: {
            storage: localStorage,
        },
    }
);
