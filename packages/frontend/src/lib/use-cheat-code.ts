import { onMounted, onUnmounted, ref } from 'vue';

export const useCheatCode = (code: string | (() => string), callback: () => void, timeout: number = 2000) => {
    let codeGetter: () => string;
    if (typeof code == 'string') {
        codeGetter = () => code;
    } else {
        codeGetter = code;
    }

    const buffer = ref('');
    let resetTimer: number | undefined = undefined;
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key.length == 1) {
            buffer.value += event.key.toLowerCase();
        }

        if (resetTimer) {
            clearTimeout(resetTimer);
        }
        resetTimer = setTimeout(() => {
            buffer.value = '';
        }, timeout);

        if (buffer.value.endsWith(codeGetter().toLowerCase())) {
            callback();
            buffer.value = '';
            clearTimeout(resetTimer);
        }
    };

    onMounted(() => {
        window.addEventListener('keydown', onKeyDown);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', onKeyDown);
        clearTimeout(resetTimer);
    });
};
