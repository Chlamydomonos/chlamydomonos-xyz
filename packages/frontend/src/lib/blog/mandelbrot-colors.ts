import { useThemeStore } from '@/stores/theme';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import type { RGB } from '@/lib/blog/mandelbrot-renderer';

export interface MandelbrotColorScheme {
    colors: RGB[];
    insideColor: RGB;
}

export const useMandelbrotColors = () => {
    const { isDark } = storeToRefs(useThemeStore());
    return computed<MandelbrotColorScheme>(() => {
        if (isDark.value) {
            return {
                colors: [
                    { r: 16, g: 24, b: 32 },
                    { r: 200, g: 220, b: 240 },
                ],
                insideColor: { r: 0, g: 0, b: 0 },
            };
        }
        return {
            colors: [
                { r: 200, g: 220, b: 240 },
                { r: 16, g: 24, b: 32 },
            ],
            insideColor: { r: 255, g: 255, b: 255 },
        };
    });
};
