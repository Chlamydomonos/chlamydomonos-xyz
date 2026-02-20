<template>
    <div>
        <ElSkeleton :rows="skeletonRows" :throttle="startTime" :loading="loading">
            <template #default>
                <div class="markdown-text" v-html="htmlText"></div>
            </template>
        </ElSkeleton>
    </div>
</template>

<script lang="ts" setup>
import { ElSkeleton } from 'element-plus';
import { onMounted, ref, watch } from 'vue';
import { parseMarkdownFrontMatter } from 'common-lib/markdown-front-matter';
import kramedRaw from 'kramed';
import axios from 'axios';
import hljs from 'highlight.js';
import { preprocessMarkdown } from '@/lib/preprocess-markdown';

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
const htmlText = ref('');

const emit = defineEmits<{
    frontMatter: [frontMatter: Record<string, any> | undefined];
    headings: [headings: { level: number; id: string; content: string }[]];
    finishLoad: [];
}>();

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

// 创建 kramed renderer
const createRenderer = (isTextMode: boolean) => {
    const renderer = new kramed.Renderer();

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
            const result = hljs.highlight(code, { language });
            return result.value;
        },
    };

    return renderer;
};

const render = async () => {
    const errorHtml = '<span style="color: red">Error</span>';

    if (!(window as any).MathJax) {
        (window as any).MathJax = {
            tex: {
                inlineMath: { '[+]': [['$', '$']] },
            },
        };
    }

    // @ts-expect-error MathJax没有类型注释
    await import('mathjax/tex-chtml.js');

    try {
        (window as any).MathJax.typesetClear();

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
            htmlText.value = errorHtml;
            loading.value = false;
            return;
        }

        // 发送frontMatter事件
        emit('frontMatter', parsed.frontMatter);

        parsed.text = await preprocessMarkdown(parsed.text);

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

        htmlText.value = html;
        loading.value = false;
        await (window as any).MathJax.typesetPromise();
        emit('finishLoad');
    } catch (e) {
        console.error(e);
        htmlText.value = errorHtml;
        loading.value = false;
    }
};

onMounted(render);

watch(props, render);
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

        code {
            background-color: #010510;
        }
    }
}
</style>
