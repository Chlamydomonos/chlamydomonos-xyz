<template>
    <ElCard
        ref="cardRef"
        class="author-card"
        :class="{ compact: isCompact, animating: isAnimating }"
        @click="toggleMode"
    >
        <div v-if="isCompact" class="compact-content">
            <div class="avatar-small"></div>
            <div class="name-small title-font">Chlamyd<ChLogo />monos</div>
        </div>
        <template v-else>
            <div class="avatar"></div>
            <div class="name title-font">Chlamyd<ChLogo />monos</div>
            <div class="quote">Xia'd tschilhib'sgn</div>
            <hr />
            <div class="icons-container">
                <a href="https://space.bilibili.com/349550325" class="no-visited" @click.stop>
                    <FontAwesomeIcon :icon="faBilibili" />
                </a>
                <a href="https://github.com/Chlamydomonos" class="no-visited" @click.stop>
                    <FontAwesomeIcon :icon="faGithub" />
                </a>
            </div>
        </template>
    </ElCard>
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { ElCard } from 'element-plus';
import ChLogo from '../common/ChLogo.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faBilibili, faGithub } from '@fortawesome/free-brands-svg-icons';

const isCompact = ref(false);
const isAnimating = ref(false);
const cardRef = ref<InstanceType<typeof ElCard>>();

const emit = defineEmits<{
    animation: [progress: number];
}>();

const animateHeight = (startHeight: number, endHeight: number, duration: number) => {
    const startTime = performance.now();
    const card = cardRef.value?.$el as HTMLElement;

    if (!card) return;

    const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 ease-in-out 缓动函数
        const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentHeight = startHeight + (endHeight - startHeight) * easeProgress;
        card.style.height = `${currentHeight}px`;

        emit('animation', progress);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            card.style.height = '';
            isAnimating.value = false;
        }
    };

    requestAnimationFrame(animate);
};

const toggleMode = async () => {
    if (isAnimating.value) return;

    const card = cardRef.value?.$el as HTMLElement;
    if (!card) return;

    isAnimating.value = true;

    // 获取当前高度
    const startHeight = card.offsetHeight;

    // 切换模式
    isCompact.value = !isCompact.value;

    // 等待 DOM 更新
    await nextTick();

    // 临时移除 transition 以获取目标高度
    card.style.transition = 'none';
    card.style.height = 'auto';
    const endHeight = card.offsetHeight;
    card.style.height = `${startHeight}px`;

    // 恢复 transition 并开始动画
    card.style.transition = '';

    // 开始高度动画
    animateHeight(startHeight, endHeight, 300);
};
</script>

<style lang="scss" scoped>
.author-card {
    border: none;
    border-radius: 4px;
    --el-card-padding: 4px;
    cursor: pointer;
    transition: box-shadow 0.3s ease;
    overflow: hidden;

    &:hover {
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    }

    &.compact {
        --el-card-padding: 8px;
    }

    &.animating {
        pointer-events: none;
    }
}

.compact-content {
    display: flex;
    align-items: center;
    gap: 1vw;
    justify-content: center;
}

.avatar-small {
    width: 3vw;
    height: 3vw;
    background-image: url('@/assets/images/avatar-small.png');
    background-size: contain;
    border-radius: 50%;
    flex-shrink: 0;
}

.name-small {
    font-size: 1.8vw;
    white-space: nowrap;
}

.avatar {
    width: 60%;
    margin: 1rem auto;
    aspect-ratio: 1;
    background-image: url('@/assets/images/avatar-small.png');
    background-size: contain;
    border-radius: 50%;
}

.name {
    text-align: center;
    font-size: 2.5vw;
    margin: 1rem auto;
    margin-bottom: 0.25rem;
}

.quote {
    color: var(--el-text-color-secondary);
    text-align: right;
    margin-top: 0.25rem;
    margin-bottom: 1rem;
    margin-right: 1vw;
}

hr {
    border: none;
    height: 1px;
    background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0) 0%,
        var(--el-text-color-primary) 10%,
        var(--el-text-color-primary) 90%,
        rgba(0, 0, 0, 0) 100%
    );
    margin: 0 0.4vw;
}

.icons-container {
    margin: 1rem auto;
    font-size: 2vw;
    text-align: center;
    a {
        color: var(--el-text-color-regular);
        text-decoration: none;
        &:hover {
            color: var(--el-text-color-primary);
        }
        margin: 0 1vw;
    }
}
</style>
