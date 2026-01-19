<template>
    <ElSkeleton :loading :throttle="100">
        <div class="cards-container">
            <SmallPostCard v-for="id in posts" :key="id" :id />
        </div>
    </ElSkeleton>
    <PageSelector :current="page" :total="pageCount" @jump="jump" />
</template>

<script lang="ts" setup>
import { blogAxios } from '@/lib/blog/blog-axios';
import router from '@/router';
import type { ArchivePageManifest } from 'common-lib/blog/manifest';
import { onMounted, ref, watch } from 'vue';
import PageSelector from './PageSelector.vue';
import { ElSkeleton } from 'element-plus';
import SmallPostCard from './SmallPostCard.vue';

const props = defineProps({
    year: {
        type: String,
        required: true,
    },
    month: {
        type: String,
        required: true,
    },
    day: {
        type: String,
        required: true,
    },
    pageCount: {
        type: Number,
        required: true,
    },
    page: {
        type: Number,
        default: 1,
    },
});

const loading = ref(true);
const posts = ref<string[]>([]);

const load = async () => {
    if (props.page > props.pageCount) {
        await router.replace('/archive/notfound');
        return;
    }
    loading.value = true;

    const path = `/archive/${props.year}/${props.month}/${props.day}/${props.page}.json`;
    try {
        const data = (await blogAxios.get<ArchivePageManifest>(path)).data;
        posts.value = data.posts;
        loading.value = false;
    } catch (e) {
        console.error(e);
        await router.replace('/archive/notfound');
    }
};

onMounted(load);
watch(props, load);

const jump = async (target: number) => {
    await router.push(`/blog/archive/${props.year}/${props.month}/${props.day}/${target}`);
};
</script>

<style lang="scss" scoped>
.cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, 150px);
    grid-gap: 20px;
    margin-bottom: 1rem;

    @media (max-width: 768px) {
        justify-content: center;
        justify-items: center;
    }
}
</style>
