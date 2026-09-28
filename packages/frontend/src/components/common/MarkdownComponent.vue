<template>
    <div>
        <ElSkeleton :rows="skeletonRows" :throttle="startTime" :loading="loading">
            <template #default>
                <div ref="textContainer" class="markdown-text"></div>
                <!-- 宏子组件：通过 Teleport 注入上方 v-html 生成的占位元素中 -->
                <component
                    v-for="instance in macroComponents"
                    :key="instance.key"
                    :is="instance.component"
                    v-bind="instance.props"
                />
            </template>
        </ElSkeleton>
    </div>
</template>

<script lang="ts" setup>
import { ElSkeleton } from 'element-plus';
import { nextTick, onMounted, ref, shallowRef, watch, type Component } from 'vue';
import { storeToRefs } from 'pinia';
import { parseMarkdownFrontMatter } from 'common-lib/markdown-front-matter';
import kramedRaw from 'kramed';
import axios from 'axios';
import hljs from 'highlight.js';
import { preprocessMarkdown } from '@/lib/preprocess-markdown';
import { useThemeStore } from '@/stores/theme';
import { getMacroComponentRegistrations } from '@/lib/markdown-macro-components';
import {
    resetMermaidPlaceholders,
    renderMermaidCode,
    renderMermaidBlocks,
    rerenderMermaidOnThemeChange,
} from '@/lib/markdown-mermaid';
import { protectMathFormulas, restoreMathFormulas, typesetMath } from '@/lib/markdown-mathjax';
import { escapeHtml } from '@/lib/markdown-html';

// @types/kramed有问题，只能这样解决
const kramed = kramedRaw as unknown as import('kramed').KramedStatic;

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

// ===== 宏子组件 =====
// 宏（如 video）展开时只生成占位元素（此时无法得知 markdown 文档的 URL），
// 并通过 registerMacroComponent 注册对应的子组件。
// 渲染完成后在这里按注册表统一扫描占位元素、解析 props，
// 并通过 Teleport 将子组件注入占位元素中。
// 子组件是本组件的子组件：innerHTML 赋值后占位元素已同步存在于 DOM 中，
// 先填充 macroComponents 数组，再 await nextTick() 等待一帧，Teleport 即可找到目标元素。
// 子组件随组件树自动卸载，无需手动管理实例。
interface MacroComponentInstance {
    key: string;
    component: Component;
    props: Record<string, unknown>;
}

const macroComponents = shallowRef<MacroComponentInstance[]>([]);
let macroComponentSeq = 0;

const mountMacroComponents = async () => {
    const registrations = getMacroComponentRegistrations();
    if (registrations.length === 0) {
        macroComponents.value = [];
        return;
    }

    // shallowRef 下逐个 push 不触发响应式，先在本地构建完整数组再一次性赋值
    const instances: MacroComponentInstance[] = [];

    for (const registration of registrations) {
        const placeholders = textContainer.value?.querySelectorAll<HTMLElement>(`.${registration.placeholderClass}`);
        if (!placeholders) {
            continue;
        }
        for (const el of placeholders) {
            const parsedProps = registration.parseProps(el);
            if (!parsedProps) {
                continue;
            }
            instances.push({
                key: `${registration.macroName}-${macroComponentSeq++}`,
                component: registration.component,
                // placeholderId 由机制统一附加：子组件通过 Teleport 注入自己的占位元素
                props: { ...parsedProps, placeholderId: el.id },
            });
        }
    }

    macroComponents.value = instances;

    // 等待一帧，让 Teleport 的目标占位元素先完成渲染，再实例化子组件
    await nextTick();
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

    // 代码块处理：mermaid 写法交给 markdown-mermaid 模块输出占位容器，
    // 在 render() 流程末尾异步渲染 SVG 替换；其余语言走原有 highlight.js 高亮逻辑。
    const originalCode = renderer.code ?? (() => '');
    renderer.code = (code, languageParam) => {
        const mermaidHtml = renderMermaidCode(code, languageParam);
        if (mermaidHtml !== null) {
            return mermaidHtml;
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
        resetMermaidPlaceholders();

        parsed.text = await preprocessMarkdown(parsed.text);

        // 若没有显式 more 标记，则补充一个，让 MathJax/kramed 配合生成 #more 锚点
        parsed.text = ensureMoreMarker(parsed.text);

        // 保护数学公式
        const { textWithPlaceholders, mathPlaceholders } = protectMathFormulas(parsed.text);

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
            // data-markdown-url 供宏子组件解析相对路径（与图片相同的规则）
            textContainer.value.setAttribute('data-markdown-url', props.url ?? '');
            textContainer.value.innerHTML = html;
        }

        // MathJax 排版
        await typesetMath(textContainer.value, mathPlaceholders);

        // MathJax 完成后再渲染 mermaid：mermaid 源码可能含 $ 符号，
        // 必须避开 MathJax 的 typeset，故在它之后处理占位节点
        await renderMermaidBlocks();

        // 最后挂载宏子组件：占位元素已随 innerHTML 写入 DOM，
        // 按注册表解析 props 后，通过 Teleport 注入子组件
        await mountMacroComponents();

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
watch(isDark, rerenderMermaidOnThemeChange);
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
        display: block;
        margin-left: auto;
        margin-right: auto;
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

    table {
        border-collapse: collapse;
        width: fit-content;
        max-width: 100%;
        margin: 1em auto;
        overflow-x: auto;
        display: block;

        thead {
            background-color: var(--el-fill-color-light);
        }

        th,
        td {
            border: 1px solid var(--el-border-color);
            padding: 0.5em 0.75em;
            text-align: left;
        }

        th {
            font-weight: 600;
        }

        tbody tr:nth-child(even) {
            background-color: var(--el-fill-color-lighter);
        }

        tbody tr:hover {
            background-color: var(--el-fill-color);
        }
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
