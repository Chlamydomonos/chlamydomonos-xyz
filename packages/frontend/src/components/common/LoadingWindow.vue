<template>
    <div class="outer-frame">
        <div class="row" v-for="(row, i) in bitmap" :key="i">
            <div class="item" v-for="flag in row" :key="flag" :style="calcStyle(flag)"></div>
        </div>
        <div class="loading-text">Loading...</div>
    </div>
</template>

<script lang="ts" setup>
const bitmap = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
];

class PRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed & 0xffffffff;
    }

    next(): number {
        const a = 1664525;
        const c = 1013904223;
        const m = 2 ** 32;

        this.state = (a * this.state + c) % m;

        return this.state & 0xff;
    }
}

const prng = new PRNG(0);

const calcStyle = (flag: number) => {
    if (flag) {
        return {
            backgroundColor: 'var(--color)',
            outlineColor: 'var(--border-color)',
            animationName: 'shine-anim',
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationDelay: `${prng.next() * 4}ms`,
        };
    } else {
        return {
            outlineColor: 'rgba(0, 0, 0, 0)',
        };
    }
};
</script>

<style lang="scss" scoped>
@use '@/assets/colors.scss' as colors;
.outer-frame {
    width: calc(min(32rem, 64vw, 64vh));
    height: calc(min(38rem, 76vw, 76vh));
    position: fixed;
    top: calc(50vh - min(20rem, 40vw, 40vh));
    left: calc(50vw - min(16rem, 32vw, 32vh));
    --color: #{colors.$ch-green};
    --border-color: #{rgba(colors.$ch-green, 0.5)};
}

.row {
    display: flex;
}

.item {
    width: calc(min(2rem, 4vw, 4vh) - 10px);
    height: calc(min(2rem, 4vw, 4vh) - 10px);
    border-radius: 1px;
    outline: 4px solid;
    margin: 5px;
}

.loading-text {
    text-align: center;
    font-size: calc(min(4rem, 8vw, 8vh));
    font-weight: bold;
    color: var(--color);
    -webkit-text-stroke: 6px var(--border-color);
    animation: shine-anim 4s;
    animation-iteration-count: infinite;
}
</style>

<style>
@keyframes shine-anim {
    0% {
        opacity: 1;
    }

    50% {
        opacity: 0.2;
    }

    100% {
        opacity: 1;
    }
}
</style>
