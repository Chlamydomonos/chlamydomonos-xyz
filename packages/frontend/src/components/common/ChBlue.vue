<template>
    <span><slot></slot></span>
</template>

<style lang="scss" scoped>
@use '@/assets/colors.scss' as colors;

span {
    color: colors.$ch-blue;
}
</style>
