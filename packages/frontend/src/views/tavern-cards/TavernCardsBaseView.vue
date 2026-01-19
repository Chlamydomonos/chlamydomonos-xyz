<template>
    <LoadingWindowWrapper ref="loading">
        <div>
            <RouterView />
        </div>
    </LoadingWindowWrapper>
</template>

<script lang="ts" setup>
import LoadingWindowWrapper from '@/components/common/LoadingWindowWrapper.vue';
import { useManifestStore } from '@/stores/tavern-cards/manifest';
import axios from 'axios';
import { onMounted, ref } from 'vue';

const loading = ref<InstanceType<typeof LoadingWindowWrapper>>();
const store = useManifestStore();

onMounted(async () => {
    store.manifest = (await axios.get('/generated/sites/tavern-cards/manifest.json')).data;
    loading.value!.load();
});
</script>
