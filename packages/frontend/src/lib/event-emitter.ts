import mitt from 'mitt';

export interface MainScrollEvent {
    value: number;
    percent: number;
    hasScrollBar: boolean;
}

export const eventEmitter = mitt<{
    scroll: MainScrollEvent;
}>();
