<template>
    <SiteHeader><div class="header-title title-font">Chlamydomonos的角色卡发布页</div></SiteHeader>
    <MarkdownComponent class="page-text" :url="indexUrl" />
    <div class="cards-container">
        <ElCard
            class="document-card"
            v-for="(document, name) in manifest"
            v-bind:key="name"
            :style="cardStyle(document.coverPath)"
            :body-style="{ width: '100%', height: 'calc(100% - 200px)', padding: 0, paddingTop: '200px' }"
        >
            <ElScrollbar height="100px" noresize>
                <RouterLink class="title no-visited" :to="`/tavern-cards/${name}`">
                    {{ document.title }}
                </RouterLink>
            </ElScrollbar>
        </ElCard>
    </div>
</template>

<script lang="ts" setup>
import { ElCard, ElScrollbar } from 'element-plus';
import { useManifestStore } from '@/stores/tavern-cards/manifest';
import type { StyleValue } from 'vue';
import SiteHeader from '@/components/common/SiteHeader.vue';
import { useTitle } from '@/lib/use-title';
import { storeToRefs } from 'pinia';
import MarkdownComponent from '@/components/common/MarkdownComponent.vue';
import indexUrl from '/sites/tavern-cards/index.md?url';

const { manifest } = storeToRefs(useManifestStore());

useTitle('Chlamydomonos的角色卡发布页 | Chlamydomonos.xyz');

const cardStyle = (coverPath: string | null): StyleValue => {
    if (!coverPath) {
        return {};
    }
    return {
        backgroundImage: `url(${coverPath})`,
    };
};
</script>

<style lang="scss" scoped>
.page-text {
    padding: 0 20px;
}

.cards-container {
    display: grid;
    padding: 20px;
    grid-template-columns: repeat(auto-fit, 200px);
    justify-content: space-between;
    grid-gap: 20px;

    @media (max-width: 600px) {
        grid-template-columns: 1fr;
        justify-content: center;
        justify-items: center;
    }
}

.document-card {
    width: 200px;
    height: 300px;
    flex-shrink: 0;
}

.title {
    display: block;
    padding-top: 24px;
    color: var(--el-text-color-primary);
    text-decoration: none;
    text-align: center;
    font-size: 24px;
    font-weight: bold;
    min-height: 76px;

    background-color: rgba($color: white, $alpha: 0.5);

    &:hover {
        background-color: rgba($color: white, $alpha: 0.7);
    }

    .dark & {
        background-color: rgba($color: black, $alpha: 0.5);
    }

    .dark &:hover {
        background-color: rgba($color: black, $alpha: 0.7);
    }
}
</style>
