<template>
    <BlogHeader :current="headerCurrent" ref="blogHeaderObj">
        <slot name="header"></slot>
    </BlogHeader>
    <ElRow style="margin-top: 1rem">
        <ElCol style="padding: 0.5rem" :xs="0" :sm="2" :md="2" :lg="2" :xl="2" />
        <ElCol style="padding: 0.5rem" :xs="24" :sm="15" :md="15" :lg="15" :xl="15">
            <div ref="mainCard">
                <slot></slot>
            </div>
        </ElCol>
        <ElCol style="padding: 0.5rem" :xs="0" :sm="5" :md="5" :lg="5" :xl="5">
            <div ref="authorCard">
                <AuthorCard @animation="updateDynamicCardPosition" />
            </div>
            <ElCard class="dynamic-card" :style="dynamicCardStyle" :body-style="{ height: '100%' }">
                <ElScrollbar>
                    <slot name="dynamicCard">
                        <BlogMeta />
                    </slot>
                </ElScrollbar>
            </ElCard>
        </ElCol>
        <ElCol style="padding: 0.5rem" :xs="0" :sm="2" :md="2" :lg="2" :xl="2" />
    </ElRow>
    <BlogFooter ref="blogFooterObj" />
</template>

<script lang="ts" setup>
import { ElCard, ElCol, ElRow, ElScrollbar } from 'element-plus';
import BlogFooter from './BlogFooter.vue';
import BlogHeader from './BlogHeader.vue';
import AuthorCard from './AuthorCard.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { eventEmitter } from '@/lib/event-emitter';
import BlogMeta from './BlogMeta.vue';

defineProps<{
    headerCurrent?: InstanceType<typeof BlogHeader>['current'];
}>();

const blogHeaderObj = ref<InstanceType<typeof BlogHeader>>();
const blogHeader = computed(() => blogHeaderObj.value?.headerRef);
const authorCard = ref<HTMLDivElement>();
const blogFooterObj = ref<InstanceType<typeof BlogFooter>>();
const blogFooter = computed(() => blogFooterObj.value?.footer);
const mainCard = ref<HTMLDivElement>();

const dynamicCardStyle = ref<Record<string, string>>({
    position: 'sticky',
    top: '0px',
    height: '0px',
});

const updateDynamicCardPosition = () => {
    if (!blogHeader.value || !authorCard.value || !blogFooter.value || !mainCard.value) {
        return;
    }

    const blogHeaderRect = blogHeader.value.getBoundingClientRect();
    const authorCardRect = authorCard.value.getBoundingClientRect();
    const blogFooterRect = blogFooter.value.getBoundingClientRect();
    const mainCardRect = mainCard.value.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    const maxBottom = Math.max(authorCardRect.bottom, blogHeaderRect.bottom);

    if (
        authorCardRect.bottom >= 0 &&
        authorCardRect.bottom < blogFooterRect.top - 32 &&
        blogFooterRect.bottom <= windowHeight
    ) {
        dynamicCardStyle.value = {
            marginTop: '32px',
            height: `${blogFooterRect.top - maxBottom - 80}px`,
        };
        return;
    }

    const targetBottom = Math.min(windowHeight - 16, mainCardRect.bottom);
    dynamicCardStyle.value = {
        position: 'sticky',
        top: `${maxBottom + 32}px`,
        height: `${targetBottom - maxBottom - 32}px`,
    };
};

onMounted(() => {
    eventEmitter.on('scroll', updateDynamicCardPosition);
    window.addEventListener('resize', updateDynamicCardPosition);
    setTimeout(updateDynamicCardPosition, 100);
});

onBeforeUnmount(() => {
    eventEmitter.off('scroll', updateDynamicCardPosition);
    window.removeEventListener('resize', updateDynamicCardPosition);
});
</script>

<style lang="scss" scoped>
.dynamic-card {
    border: none;
    border-radius: 4px;
    transition: none;
    --el-card-padding: 0;
}
</style>
