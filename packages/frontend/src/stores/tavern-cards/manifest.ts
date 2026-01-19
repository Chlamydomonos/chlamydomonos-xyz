import type { Manifest } from 'common-lib/tavern-cards/manifest';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useManifestStore = defineStore('tavern-cards-manifest', () => {
    const manifest = ref<Manifest>();
    return { manifest };
});
