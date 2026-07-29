<template>
    <div>
        <ElSkeleton :rows="skeletonRows" :throttle="startTime" :loading="loading">
            <template #default>
                <div ref="textContainer" class="markdown-text"></div>
            </template>
        </ElSkeleton>
    </div>
</template>

<script lang="ts" setup>
import { ElSkeleton } from 'element-plus';
import { nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { parseMarkdownFrontMatter } from 'common-lib/markdown-front-matter';
import kramedRaw from 'kramed';
import axios from 'axios';
import hljs from 'highlight.js';
import { preprocessMarkdown } from '@/lib/preprocess-markdown';
import { useThemeStore } from '@/stores/theme';
import { loadMathjax } from '@/lib/load-mathjax';

// @types/kramed有问题，只能这样解决
const kramed = kramedRaw as unknown as import('kramed').KramedStatic;

type MermaidModule = typeof import('mermaid');

const props = defineProps({
    text: { type: String },
    url: { type: String },
    skeletonRows: {
        type: Number,
        default: 3,
    },
    startTime: {
        type: Number,
        default: 200,
    },
});

const loading = ref(true);
const textContainer = ref<HTMLDivElement>();

const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);

const emit = defineEmits<{
    frontMatter: [frontMatter: Record<string, any> | undefined];
    headings: [headings: { level: number; id: string; content: string }[]];
    finishLoad: [];
}>();

// ===== Mermaid =====
// 动态加载的 mermaid 模块，与 MathJax 一样懒加载，避免污染主 bundle
let mermaidModule: MermaidModule | null = null;
let mermaidLoadFailed = false;
// 每次渲染使用递增的 id 前缀，避免多篇文档/多次渲染发生 id 冲突
let mermaidRenderSeq = 0;
// 经 kramed 处理后，所有 mermaid 占位容器的 id 列表，供 renderMermaidBlocks 使用
let pendingMermaidIds: string[] = [];

const loadMermaid = async (): Promise<MermaidModule | null> => {
    if (mermaidModule) return mermaidModule;
    if (mermaidLoadFailed) return null;
    try {
        mermaidModule = await import('mermaid');
        return mermaidModule;
    } catch (e) {
        console.error('[MarkdownComponent] 加载 mermaid 失败', e);
        mermaidLoadFailed = true;
        return null;
    }
};

const currentMermaidTheme = () => {
    return themeStore.isDark ? 'dark' : 'default';
};

// 初始化（若已初始化过同主题则跳过）。mermaid 全局只能 initialize 一次，
// 因此用 startOnLoad:false + 维护 lastTheme 决定是否需要重新渲染
let lastMermaidTheme: string | null = null;
const ensureMermaidInitialized = (mod: MermaidModule) => {
    const theme = currentMermaidTheme();
    if (lastMermaidTheme === null) {
        mod.default.initialize({
            startOnLoad: false,
            theme,
            securityLevel: 'loose',
            fontFamily: 'inherit',
        });
        lastMermaidTheme = theme;
    } else if (lastMermaidTheme !== theme) {
        // mermaid.initialize 在 v10+ 后要求传入 force-static generation，重新设置主题
        mod.default.initialize({
            startOnLoad: false,
            theme,
            securityLevel: 'loose',
            fontFamily: 'inherit',
        });
        lastMermaidTheme = theme;
    }
};

// 用 hljs 安全地高亮 mermaid 源码；mermaid 不是 hljs 内置语言时回退为纯文本转义
const highlightMermaidFallback = (code: string) => {
    try {
        return hljs.highlight(code, { language: 'mermaid' }).value;
    } catch {
        return escapeHtml(code);
    }
};

// 扫描 DOM 中所有占位容器并异步渲染。失败时回退为 hljs 高亮的原始代码
const renderMermaidBlocks = async () => {
    const ids = pendingMermaidIds;
    pendingMermaidIds = [];
    if (ids.length === 0) return;

    const mod = await loadMermaid();
    if (!mod) {
        // 降级：用 hljs 渲染原始代码
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el) {
                const raw = el.textContent ?? '';
                el.outerHTML = `<pre><code class="hljs">${highlightMermaidFallback(raw)}</code></pre>`;
            }
        }
        return;
    }

    ensureMermaidInitialized(mod);

    const base = `mmd-${mermaidRenderSeq++}`;
    await Promise.all(
        ids.map(async (id, idx) => {
            const el = document.getElementById(id);
            if (!el) return;
            const code = el.textContent ?? '';
            try {
                const { svg } = await mod.default.render(`${base}-${idx}`, code);
                // 把原始 mermaid 源码存入 data 属性，供主题切换时局部重渲染使用
                const wrapper = document.createElement('div');
                wrapper.className = 'mermaid-svg-wrapper';
                wrapper.setAttribute('data-mermaid-code', code);
                wrapper.innerHTML = svg;
                el.replaceWith(wrapper);
            } catch (e) {
                console.error(`[MarkdownComponent] mermaid 渲染失败 (id=${id})`, e);
                el.outerHTML = `<pre class="mermaid-error"><code class="hljs">${highlightMermaidFallback(code)}</code></pre>`;
            }
        }),
    );
};

// 保护数学公式不被 kramed 处理
const protectMathFormulas = (text: string) => {
    const mathPlaceholders: string[] = [];
    let textWithPlaceholders = text;

    // 先替换块级公式 $$...$$
    textWithPlaceholders = textWithPlaceholders.replace(/\$\$[\s\S]+?\$\$/g, (match) => {
        const index = mathPlaceholders.length;
        mathPlaceholders.push(match);
        return `<!--MATH-BLOCK-${index}-->`;
    });

    // 再替换行内公式 $...$
    textWithPlaceholders = textWithPlaceholders.replace(/\$[^\$\n]+?\$/g, (match) => {
        const index = mathPlaceholders.length;
        mathPlaceholders.push(match);
        return `<!--MATH-INLINE-${index}-->`;
    });

    return { textWithPlaceholders, mathPlaceholders };
};

// 恢复数学公式
const restoreMathFormulas = (html: string, mathPlaceholders: string[]) => {
    return html.replace(/<!--MATH-(BLOCK|INLINE)-(\d+)-->/g, (_match, _type, index) => {
        return mathPlaceholders[parseInt(index)];
    });
};

// 转义 HTML 特殊字符，用于把 mermaid 源码安全放进占位 <pre><code> 中
const escapeHtml = (text: string) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// 从HTML中提取所有具有id的标题
const extractHeadings = (html: string) => {
    const headings: { level: number; id: string; content: string }[] = [];
    const headingRegex = /<h([1-6])\s+[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/g;
    let match: RegExpExecArray | null = null;
    while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1]);
        const id = match[2];
        // 移除HTML标签，获取纯文本内容
        const content = match[3].replace(/<[^>]*>/g, '');
        headings.push({ level, id, content });
    }
    return headings;
};

// 如果markdown中没有 <!-- more --> 注释，则在前三个可显示段落后插入id=more的占位注释，
// 与 codegen-tool/src/blog.ts 中 extractSummary 的段落判定保持一致
const ensureMoreMarker = (text: string) => {
    if (text.indexOf('<!-- more -->') !== -1) {
        return text;
    }

    const paragraphs: string[] = [];
    const sections = text.split(/\n\s*\n/);

    for (const section of sections) {
        const trimmed = section.trim();
        if (trimmed && !trimmed.startsWith('```')) {
            paragraphs.push(trimmed);
            if (paragraphs.length >= 3) break;
        }
    }

    if (paragraphs.length < 3) {
        return text;
    }

    // 在第 3 个段落之后插入 more 标记，查找该段落的结尾位置
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const lastParagraphIndex = text.lastIndexOf(lastParagraph);
    if (lastParagraphIndex === -1) {
        return text;
    }
    const insertPos = lastParagraphIndex + lastParagraph.length;

    return `${text.slice(0, insertPos)}\n\n<!-- more -->\n${text.slice(insertPos)}`;
};

// 创建 kramed renderer
const createRenderer = (isTextMode: boolean) => {
    const renderer = new kramed.Renderer();

    // 代码块处理：intercept mermaid 写法，输出占位容器并登记 id，
    // 在 render() 流程末尾通过 renderMermaidBlocks 用 mermaid 异步渲染 SVG 替换。
    // 其余语言走原有 highlight.js 高亮逻辑。
    const originalCode = renderer.code ?? (() => '');
    renderer.code = (code, languageParam) => {
        // 规范化语言标签（去除首尾空白、小写），用于稳定匹配 'mermaid'
        const language = (languageParam ?? '').trim().toLowerCase();
        if (language === 'mermaid') {
            // 内部缓存本轮的 id，便于后续 renderMermaidBlocks 收集
            const id = `mermaid-placeholder-${mermaidRenderSeq}-${pendingMermaidIds.length}`;
            pendingMermaidIds.push(id);
            // 用 <pre><code> 包裹保留文本，renderMermaidBlocks 会读取 textContent
            // 加 hidden 属性避免闪烁，挂载后即刻替换为 SVG
            return `<pre id="${id}" class="mermaid-placeholder" aria-hidden="true"><code>${escapeHtml(code)}</code></pre>`;
        }
        return originalCode.call(renderer, code, languageParam);
    };

    // 图片处理：text模式下忽略图片，url模式下处理相对路径
    renderer.image = (href, _title, text) => {
        if (isTextMode) {
            return ''; // 在text模式下忽略所有图片
        }
        const sourceUrl = new URL(props.url!, window.location.origin);
        const imageUrl = new URL(href, sourceUrl.href);
        return `<img src="${imageUrl.href}" alt="${text}">`;
    };

    // HTML处理：<!-- more -->标记转换
    renderer.html = (html) => {
        if (html.trim() === '<!-- more -->') {
            return '<span id="more"></span>';
        }
        return html;
    };

    // 代码高亮配置
    (renderer as any).options = {
        langPrefix: '',
        highlight: (code: string, language: string) => {
            // 未指定语言，或 highlight.js 未注册该语言时，作为纯文本渲染，
            // 避免 hljs.highlight 抛出 "Unknown language" 错误
            if (!language || !hljs.getLanguage(language)) {
                return escapeHtml(code);
            }
            const result = hljs.highlight(code, { language });
            return result.value;
        },
    };

    return renderer;
};

const render = async () => {
    const errorHtml = '<span style="color: red">Error</span>';

    try {
        let markdownText: string;
        let parsed: { text: string; frontMatter?: Record<string, any> };

        // 获取markdown文本
        if (props.text) {
            // 使用直接传入的text
            parsed = parseMarkdownFrontMatter(props.text);
            markdownText = props.text;
        } else if (props.url) {
            // 从URL获取markdown文本
            markdownText = (await axios.get(props.url, { headers: { 'Content-Type': 'text/plain' } })).data;
            parsed = parseMarkdownFrontMatter(markdownText);
        } else {
            loading.value = false;
            await nextTick();
            if (textContainer.value) {
                textContainer.value.innerHTML = errorHtml;
            }

            return;
        }

        // 发送frontMatter事件
        emit('frontMatter', parsed.frontMatter);

        // 每次渲染都重置 mermaid 占位 id 队列
        pendingMermaidIds = [];

        parsed.text = await preprocessMarkdown(parsed.text);

        // 若没有显式 more 标记，则补充一个，让 MathJax/kramed 配合生成 #more 锚点
        parsed.text = ensureMoreMarker(parsed.text);

        // 保护数学公式
        const { textWithPlaceholders, mathPlaceholders } = protectMathFormulas(parsed.text);

        if (mathPlaceholders.length > 0) {
            await loadMathjax();
        }

        if ((window as any).MathJax && (window as any).MathJax.typesetClear) {
            (window as any).MathJax.typesetClear();
        }

        // 创建renderer
        const renderer = createRenderer(!!props.text);

        // 使用 kramed 处理
        let html = kramed(textWithPlaceholders, { renderer });

        // 恢复数学公式
        html = restoreMathFormulas(html, mathPlaceholders);

        // 提取标题
        const headings = extractHeadings(html);
        emit('headings', headings);

        loading.value = false;
        await nextTick();

        if (textContainer.value) {
            textContainer.value.innerHTML = html;
        }

        if ((window as any).MathJax && (window as any).MathJax.typesetPromise && mathPlaceholders.length > 0) {
            await (window as any).MathJax.typesetPromise([textContainer.value]);
        }

        // MathJax 完成后再渲染 mermaid：mermaid 源码可能含 $ 符号，
        // 必须避开 MathJax 的 typeset，故在它之后处理占位节点
        await renderMermaidBlocks();
        emit('finishLoad');
    } catch (e) {
        console.error(e);
        loading.value = false;
        await nextTick();
        if (textContainer.value) {
            textContainer.value.innerHTML = errorHtml;
        }
    }
};

onMounted(render);

watch(props, render);

// 主题切换时，仅对已挂载的 mermaid SVG 容器做局部重渲染，避免整篇重跑 kramed+MathJax
watch(isDark, async () => {
    const wrappers = document.querySelectorAll<HTMLElement>('.mermaid-svg-wrapper');
    if (wrappers.length === 0) return;

    const mod = await loadMermaid();
    if (!mod) return;
    ensureMermaidInitialized(mod);

    const base = `mmd-theme-${mermaidRenderSeq++}`;
    wrappers.forEach(async (el, idx) => {
        const code = el.getAttribute('data-mermaid-code') ?? '';
        if (!code) return;
        try {
            const { svg } = await mod.default.render(`${base}-${idx}`, code);
            el.innerHTML = svg;
        } catch (e) {
            console.error('[MarkdownComponent] 主题切换 mermaid 重渲染失败', e);
        }
    });
});
</script>

<style lang="scss">
@use '@/assets/fonts.scss' as fonts;
@use 'highlight.js/scss/github-dark.scss' as *;

.markdown-text {
    img.cc-logo {
        vertical-align: middle;
        max-width: 1em;
        max-height: 1em;
        margin-left: 0.2em;
    }

    .mermaid-svg-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 1em 0;
        overflow-x: auto;

        svg {
            max-width: 100%;
            height: auto;
        }
    }

    .mermaid-placeholder {
        display: none;
    }

    .mermaid-error {
        border: 1px dashed red;
    }

    img {
        border-radius: 4px;
        max-width: 100%;
    }

    code {
        padding: 0 2px;
        margin: 0 2px;
        background-color: var(--el-bg-color);
        border-radius: 2px;
    }

    small {
        color: gray;
    }

    hr {
        border: none;
        height: 1px;
        background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(128, 128, 128, 1) 10%,
            rgba(128, 128, 128, 1) 90%,
            rgba(0, 0, 0, 0) 100%
        );
    }

    blockquote {
        border-left: 4px solid gray;
        margin-left: 0;
        padding-left: 1em;
        color: var(--el-text-color-secondary);
    }

    pre {
        font-family: fonts.$monospace;
        color: #e0e0e0;
        background-color: #010510;
        padding: 0.25rem;
        border-radius: 4px;
        // 单行过长时显示水平滚动条，避免溢出
        overflow-x: auto;
        white-space: pre;

        code {
            background-color: #010510;
            // 让 code 撑满 pre 后再触发滚动而不是换行
            white-space: pre;
            display: block;
        }
    }
}
</style>
