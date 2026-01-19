import { onMounted, watch } from 'vue';

export const useTitle = (title: string | (() => string), ...toWatch: any[]) => {
    const updateTitle = () => {
        if (typeof title == 'string') {
            document.title = title;
        } else {
            document.title = title();
        }
    };
    onMounted(updateTitle);

    for (const item of toWatch) {
        watch(item, updateTitle);
    }
};
