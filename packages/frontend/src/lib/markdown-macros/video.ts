import VideoPlayer from '@/components/common/VideoPlayer.vue';
import { createMacroPlaceholder, registerMacroComponent } from '@/lib/markdown-macro-components';

export const name = 'video';

/**
 * video 宏：在 markdown 中插入视频。
 *
 * 语法：{{video::"路径"[,"loop"]}}
 * - 路径：视频文件路径，解析规则与图片相同（相对于 markdown 文档的 URL 解析，
 *   在 MarkdownComponent 渲染占位元素时完成）。
 * - 第二个参数为 "loop" 时，视频设置为循环播放：
 *   页面载入时不自动播放，点击播放后自动循环；
 *   不设为循环播放时，点击播放后只播放一次。
 *
 * 宏展开发生在 kramed 解析之前，此时无法得知 markdown 文档的 URL，
 * 因此这里只生成占位元素（参数通过 data-macro-* 属性携带），
 * 并注册 VideoPlayer 子组件；MarkdownComponent 在渲染完成后按注册表
 * 统一扫描占位元素、解析路径并通过 Teleport 注入播放器。
 */
export const expand = (path: string, mode?: string) => {
    const loop = mode === 'loop';
    return createMacroPlaceholder(name, { path, loop });
};

// ===== 子组件注册 =====
// 占位元素上携带的 data-macro-* 属性：
// - data-macro-path：宏参数中的原始视频路径（未解析）
// - data-macro-loop：是否循环播放
// MarkdownComponent 实例化子组件前会调用 parseProps，
// 在这里按与图片相同的规则解析路径（以 markdown 文档 URL 为基准，
// 该 URL 由 MarkdownComponent 写入 .markdown-text 的 data-markdown-url 属性）。
registerMacroComponent({
    macroName: name,
    placeholderClass: 'macro-placeholder-video',
    component: VideoPlayer,
    parseProps: (el) => {
        const rawPath = el.getAttribute('data-macro-path');
        if (rawPath === null) {
            return null;
        }
        const markdownUrl = el.closest('.markdown-text')?.getAttribute('data-markdown-url') ?? undefined;
        const sourceUrl = new URL(markdownUrl ?? '', window.location.origin);
        return {
            src: new URL(rawPath, sourceUrl.href).href,
            loop: el.getAttribute('data-macro-loop') === 'true',
        };
    },
});
