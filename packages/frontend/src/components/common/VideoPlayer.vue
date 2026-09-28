<template>
    <Teleport :to="`#${placeholderId}`">
        <div class="video-player">
            <video ref="videoRef" class="video-element" :src="src" controls preload="metadata" @play="onPlay"></video>
        </div>
    </Teleport>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
    /** 占位元素的 id，Teleport 的目标 */
    placeholderId: {
        type: String,
        required: true,
    },
    /** 解析后的视频 URL */
    src: {
        type: String,
        required: true,
    },
    /** 是否循环播放：页面载入时不自动播放；点击播放后，循环播放的视频自动循环，否则只播放一次 */
    loop: {
        type: Boolean,
        default: false,
    },
});

const videoRef = ref<HTMLVideoElement>();

// 不使用 autoplay：任何视频在页面载入时均不自动播放。
// 循环行为在用户点击播放后设置：loop 为 true 时设置 loop 属性自动循环，
// 否则保持 loop=false，播放一次结束后停在末尾。
const onPlay = () => {
    const video = videoRef.value;
    if (!video) {
        return;
    }
    video.loop = props.loop;
};
</script>

<style lang="scss" scoped>
.video-player {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 1em 0;
}

.video-element {
    max-width: 100%;
    border-radius: 4px;
}
</style>
