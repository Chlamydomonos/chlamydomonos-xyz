import { useThemeStore } from '@/stores/theme';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

export const useMandelbrotColors = () => {
    const { isDark } = storeToRefs(useThemeStore());
    return computed(() => {
        if (isDark.value) {
            return [
                { r: 200, g: 220, b: 240 },
                { r: 16, g: 24, b: 32 },
            ];
        }
        return [
            { r: 16, g: 24, b: 32 },
            { r: 200, g: 220, b: 240 },
        ];
    });
};
