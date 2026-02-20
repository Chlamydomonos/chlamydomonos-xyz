<template>
    <ElCard class="archive-card">
        <img v-if="cover" :src="cover" class="archive-cover" />
        <MandelbrotSet v-else :seed="id" :width="150" :height="150" :colors />
        <div class="archive-card-body">
            <RouterLink :to="`/blog/archive/${id}`" class="no-visited">
                <template v-if="level == 'year'">
                    <span class="archive-title">{{ date.year }}</span>
                </template>
                <template v-else-if="level == 'month'">
                    <small>{{ date.year }}&ensp;/&ensp;</small>
                    <span class="archive-title">{{ date.month }}</span>
                </template>
                <template v-else>
                    <small>{{ date.year }}&ensp;/&ensp;{{ date.month }}&ensp;/&ensp;</small>
                    <span class="archive-title">{{ date.day }}</span>
                </template>
            </RouterLink>
        </div>
    </ElCard>
</template>

<script lang="ts" setup>
import { ElCard } from 'element-plus';
import MandelbrotSet from './MandelbrotSet.vue';
import { useMandelbrotColors } from '@/lib/blog/mandelbrot-colors';
import { computed, onMounted, ref } from 'vue';
import { blogAxios } from '@/lib/blog/blog-axios';

type Props =
    | {
          level: 'year';
          date: { year: string; month: undefined; day: undefined };
      }
    | {
          level: 'month';
          date: { year: string; month: string; day: undefined };
      }
    | {
          level: 'day';
          date: { year: string; month: string; day: string };
      };

const props = defineProps<Props>();

const colors = useMandelbrotColors();

const id = computed(() => {
    if (props.level == 'year') {
        return `${props.date.year}`;
    } else if (props.level == 'month') {
        return `${props.date.year}/${props.date.month}`;
    } else {
        return `${props.date.year}/${props.date.month}/${props.date.day}`;
    }
});

const cover = ref<string>();

const load = async () => {
    try {
        const data = (await blogAxios.get<{ cover?: string }>(`/archive/${id.value}.json`)).data;
        if (data.cover) {
            cover.value = data.cover;
        }
    } catch (e) {
        console.error(e);
    }
};

onMounted(load);
</script>

<style lang="scss" scoped>
.archive-card {
    --el-card-padding: 0;
    width: 150px;
    height: 200px;

    a {
        color: var(--el-text-color-regular);
        text-decoration: none;
        &:hover {
            color: var(--el-text-color-primary);
        }
    }
}

.archive-cover {
    width: 150px;
    height: 150px;
    object-fit: cover;
}

.archive-card-body {
    padding: 0.5rem;
    text-align: center;

    small {
        color: var(--el-text-color-secondary);
    }
}

.archive-title {
    font-size: 1.5rem;
    font-weight: bold;
}
</style>
