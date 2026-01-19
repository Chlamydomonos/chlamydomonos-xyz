<template>
    <SiteHeader>
        <div class="header-title title-font" :style="{ opacity: titleOpacity }">{{ manifest![name].title }}</div>
    </SiteHeader>
    <div class="home-link-container">
        <RouterLink to="/">Chlamydomonos.xyz</RouterLink>
        &nbsp;/&nbsp;
        <RouterLink to="/tavern-cards">角色卡发布页</RouterLink>
        &nbsp;/&nbsp;
        {{ manifest![name].title }}
    </div>
    <main>
        <div class="image-container" :style="{ backgroundImage: `url(${manifest![name].postCoverPath})` }"></div>
        <div class="page-title title-font" ref="pageTitle">{{ manifest![name].title }}</div>
        <div class="version" :style="{ '--title-height': `${titleHeight}px` }">
            {{ version ? `v${version}` : '-' }}
        </div>
        <div class="text">
            <ElButton @click="downloadCard" :loading="!documentLoaded" :disabled="!cardUrl"> 下载角色卡 </ElButton>
            <MarkdownComponent :url="manifest![name].path" @frontMatter="onDocumentLoad" />
        </div>
    </main>
</template>

<script lang="ts" setup>
import SiteHeader from '@/components/common/SiteHeader.vue';
import { useManifestStore } from '@/stores/tavern-cards/manifest';
import { storeToRefs } from 'pinia';
import MarkdownComponent from '@/components/common/MarkdownComponent.vue';
import { RouterLink } from 'vue-router';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ElButton } from 'element-plus';
import { eventEmitter } from '@/lib/event-emitter';
import { useTitle } from '@/lib/use-title';

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
});

const { manifest } = storeToRefs(useManifestStore());

const documentLoaded = ref(false);
const cardUrl = ref<URL>();
const version = ref<string>();
const onDocumentLoad = (frontMatter: Record<string, any> | undefined) => {
    documentLoaded.value = true;
    if (frontMatter) {
        if (typeof frontMatter.card == 'string') {
            cardUrl.value = new URL(
                frontMatter.card,
                new URL(manifest.value![props.name].path, window.location.origin).href
            );
        }
        if (typeof frontMatter.version == 'string') {
            version.value = frontMatter.version;
        }
    }
};

const downloadCard = () => {
    if (!cardUrl.value) {
        console.error('角色卡URL未找到');
        return;
    }

    const link = document.createElement('a');
    link.href = cardUrl.value.href;

    let fileBaseName = manifest.value![props.name].title;
    if (version.value) {
        fileBaseName += `-v${version.value}`;
    }

    const fileName = `${fileBaseName}.png`;

    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const pageTitle = ref<HTMLDivElement>();
const titleHeight = ref(0);
const titleOpacity = ref(0);

const handleTitle = () => {
    const clientRect = pageTitle.value!.getBoundingClientRect();
    titleHeight.value = clientRect.height;
    if (clientRect.top > 60) {
        titleOpacity.value = 0;
    } else if (clientRect.bottom > 60) {
        titleOpacity.value = 1 - (clientRect.bottom - 60) / titleHeight.value;
    } else {
        titleOpacity.value = 1;
    }
};

onMounted(() => {
    handleTitle();
    eventEmitter.on('scroll', handleTitle);
});

onBeforeUnmount(() => {
    eventEmitter.off('scroll', handleTitle);
});

useTitle(() => `${manifest.value?.[props.name].title ?? 'Error'} | Chlamydomonos.xyz`);
</script>

<style lang="scss" scoped>
.home-link-container {
    margin: 0 auto;
    margin-top: 3rem;
    max-width: calc(min(800px, 100vw - 4rem));
}

main {
    margin: 4px auto;
    margin-bottom: 3rem;
    max-width: calc(min(800px, 100vw - 4rem));
    background-color: var(--el-bg-color-overlay);
    border-radius: 10px;
    overflow: hidden;
    position: relative;
}

.image-container {
    width: 100%;
    aspect-ratio: 16 / 9;
    background-size: cover;
}

.page-title {
    font-size: 4rem;
    padding: 1rem;
    position: relative;
    top: -4rem;
    text-align: center;
    background-color: rgba($color: white, $alpha: 0.5);

    .dark & {
        background-color: rgba($color: black, $alpha: 0.5);
    }
}

.version {
    color: var(--el-text-color-secondary);
    font-size: small;
    position: absolute;
    inset-inline-start: 0;
    inset-block-start: calc(min(800px, 100vw - 4rem) / 16 * 9 + var(--title-height) - 3.8rem);
    width: calc(100% - 0.5rem);
    padding-right: 0.5rem;
    text-align: right;
}

.text {
    padding: 0 1rem;
}
</style>
