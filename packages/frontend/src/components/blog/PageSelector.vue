<template>
    <div class="main-frame">
        <ElLink class="button-link" underline="never" :disabled="current == 1" @click="emit('jump', 1)">
            <FontAwesomeIcon :icon="faAnglesLeft" />
        </ElLink>
        <ElLink class="button-link" underline="never" :disabled="current == 1" @click="emit('jump', current - 1)">
            <FontAwesomeIcon :icon="faAngleLeft" />
        </ElLink>
        <div class="middle-element">
            <ElInputNumber size="small" :min="1" :max="total" :controls="false" v-model="target" />
            <div>&ensp;/&ensp;{{ total }}&ensp;</div>
            <ElLink class="button-link" underline="always" :disabled="target == current" @click="emit('jump', target)">
                跳转
            </ElLink>
        </div>
        <ElLink class="button-link" underline="never" :disabled="current == total" @click="emit('jump', current + 1)">
            <FontAwesomeIcon :icon="faAngleRight" />
        </ElLink>
        <ElLink class="button-link" underline="never" :disabled="current == total" @click="emit('jump', total)">
            <FontAwesomeIcon :icon="faAnglesRight" />
        </ElLink>
    </div>
</template>

<script lang="ts" setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { ElInputNumber, ElLink } from 'element-plus';
import { faAngleLeft, faAngleRight, faAnglesLeft, faAnglesRight } from '@fortawesome/free-solid-svg-icons';
import { ref, watch } from 'vue';

const props = defineProps({
    current: {
        type: Number,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
});

const target = ref(props.current);

watch(
    () => props.current,
    () => {
        target.value = props.current;
    }
);

const emit = defineEmits<{
    jump: [page: number];
}>();
</script>

<style lang="scss" scoped>
.main-frame {
    display: flex;
    align-items: center;
    justify-content: center;
}

.middle-element {
    display: flex;
    align-items: center;
    margin: 0 0.5rem;
}

.button-link {
    margin: 0 0.25rem;
}
</style>
