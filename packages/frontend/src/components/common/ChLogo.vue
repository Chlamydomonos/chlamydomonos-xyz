<template>
    <span>
        <div v-if="custom">{{ custom }}</div>
        <div v-else-if="chChar">ɤ</div>
        <div v-else-if="capital">O</div>
        <div v-else>o</div>
    </span>
</template>

<script lang="ts" setup>
defineProps({
    capital: {
        type: Boolean,
        default: false,
    },
    chChar: {
        type: Boolean,
        default: false,
    },
    custom: {
        type: String,
    },
});
</script>

<style lang="scss" scoped>
span {
    display: inline-block;
    width: 0.64em;
    overflow: visible;
}

div {
    width: 1em;
    height: 1em;
    display: inline-block;
    position: relative;
    top: 0.1em;
    left: -0.18em;
    background-image: url('@/assets/images/chlamydomonos.png');
    background-size: contain;
    color: rgba(0, 0, 0, 0);
    &::selection {
        color: rgba(0, 0, 0, 0);
    }
}
</style>
