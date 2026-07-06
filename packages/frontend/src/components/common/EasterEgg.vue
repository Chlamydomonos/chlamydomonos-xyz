<template>
    <slot v-if="show"></slot>
</template>

<script lang="ts" setup>
import { useCheatCode } from '@/lib/use-cheat-code';
import { ref } from 'vue';

const show = ref(false);

const props = defineProps({
    cheatCode: {
        type: String,
        required: true,
    },
});

useCheatCode(
    () => props.cheatCode,
    () => {
        show.value = true;
    },
);
</script>
