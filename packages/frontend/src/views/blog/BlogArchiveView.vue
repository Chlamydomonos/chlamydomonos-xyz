<template>
    <BlogBaseLayout header-current="archive">
        <template #header>
            <span class="title-font title">{{ title }}</span>
        </template>
        <template #default>
            <div class="breadcrumb-container">
                <ElBreadcrumb separator="/" v-if="date.year">
                    <ElBreadcrumbItem to="/blog/archive">归档</ElBreadcrumbItem>
                    <ElBreadcrumbItem :to="date.month ? `/blog/archive/${date.year}` : undefined">
                        {{ date.year }}
                    </ElBreadcrumbItem>
                    <ElBreadcrumbItem
                        v-if="date.month"
                        :to="date.day ? `/blog/archive/${date.year}/${date.month}` : undefined"
                    >
                        {{ date.month }}
                    </ElBreadcrumbItem>
                    <ElBreadcrumbItem v-if="date.day">{{ date.day }}</ElBreadcrumbItem>
                </ElBreadcrumb>
            </div>
            <ElSkeleton :loading :throttle="100">
                <ArchivePage
                    v-if="date.day && pageCount"
                    :year="date.year"
                    :month="date.month"
                    :day="date.day"
                    :page-count
                    :page
                />
                <div class="cards-container" v-else-if="date.month">
                    <ArchiveCard v-for="day in days" :key="day" level="day" :date="{ ...date, day }" />
                </div>
                <div class="cards-container" v-else-if="date.year">
                    <ArchiveCard
                        v-for="month in months"
                        :key="month"
                        level="month"
                        :date="{ year: date.year, month, day: undefined }"
                    />
                </div>
                <div class="cards-container" v-else>
                    <ArchiveCard
                        v-for="year in years"
                        :key="year"
                        level="year"
                        :date="{ year, month: undefined, day: undefined }"
                    />
                </div>
            </ElSkeleton>
        </template>
    </BlogBaseLayout>
</template>

<script lang="ts" setup>
import ArchiveCard from '@/components/blog/ArchiveCard.vue';
import ArchivePage from '@/components/blog/ArchivePage.vue';
import BlogBaseLayout from '@/components/blog/BlogBaseLayout.vue';
import { blogAxios } from '@/lib/blog/blog-axios';
import { useTitle } from '@/lib/use-title';
import router from '@/router';
import type {
    ArchiveYearManifest,
    ArchiveMonthManifest,
    ArchiveManifest,
    ArchiveDayManifest,
} from 'common-lib/blog/manifest';
import { ElBreadcrumb, ElBreadcrumbItem, ElSkeleton } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';

type ArchiveDate =
    | { year?: string; month: undefined; day: undefined }
    | { year: string; month: string; day: undefined }
    | { year: string; month: string; day: string };

const props = defineProps<{ date: ArchiveDate; page?: number }>();

const title = computed(() => {
    if (props.date.day) {
        return `归档 | ${props.date.year}-${props.date.month}-${props.date.day}`;
    }
    if (props.date.month) {
        return `归档 | ${props.date.year}-${props.date.month}`;
    }
    if (props.date.year) {
        return `归档 | ${props.date.year}`;
    }
    return '归档';
});

const loading = ref(true);
const years = ref<string[]>([]);
const months = ref<string[]>([]);
const days = ref<string[]>([]);
const pageCount = ref(0);

const load = async () => {
    loading.value = true;
    try {
        if (props.date.day) {
            const path = `/archive/${props.date.year}/${props.date.month}/${props.date.day}.json`;
            const data = (await blogAxios.get<ArchiveDayManifest>(path)).data;
            pageCount.value = data.pages;
            loading.value = false;
        } else if (props.date.month) {
            const path = `/archive/${props.date.year}/${props.date.month}.json`;
            const data = (await blogAxios.get<ArchiveMonthManifest>(path)).data;
            days.value = data.days;
            loading.value = false;
        } else if (props.date.year) {
            const path = `/archive/${props.date.year}.json`;
            const data = (await blogAxios.get<ArchiveYearManifest>(path)).data;
            months.value = data.months;
            loading.value = false;
        } else {
            const data = (await blogAxios.get<ArchiveManifest>('/archive.json')).data;
            years.value = data.years;
            loading.value = false;
        }
    } catch (e) {
        console.error(e);
        await router.replace('/archive/notfound');
    }
};

onMounted(load);

watch(() => props.date, load);

useTitle(
    () => `${title.value.replace('|', ' - ')} | Chlamydomonos的博客`,
    () => props.date
);
</script>

<style lang="scss" scoped>
.title {
    font-size: 2rem;
}

.main-container {
    width: 80vw;
    margin: 2rem auto;

    @media (max-width: 768px) {
        width: calc(100vw - 4rem);
    }
}

.cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, 150px);
    grid-gap: 20px;

    @media (max-width: 768px) {
        justify-content: center;
        justify-items: center;
    }
}

.breadcrumb-container {
    margin: 0.5rem 0;
}
</style>
