// markdown 渲染流程中的 mermaid 处理：
// kramed renderer 拦截 ```mermaid 代码块生成占位容器，
// 渲染完成后用 mermaid 异步渲染 SVG 替换；主题切换时局部重渲染。

import hljs from 'highlight.js';
import { useThemeStore } from '@/stores/theme';
import { escapeHtml } from '@/lib/markdown-html';

type MermaidModule = typeof import('mermaid');

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
        console.error('[markdown-mermaid] 加载 mermaid 失败', e);
        mermaidLoadFailed = true;
        return null;
    }
};

const currentMermaidTheme = () => {
    return useThemeStore().isDark ? 'dark' : 'default';
};

// 初始化（若已初始化过同主题则跳过）。mermaid 全局只能 initialize 一次，
// 因此用 startOnLoad:false + 维护 lastTheme 决定是否需要重新渲染
let lastMermaidTheme: string | null = null;
const ensureMermaidInitialized = (mod: MermaidModule) => {
    const theme = currentMermaidTheme();
    if (lastMermaidTheme === null || lastMermaidTheme !== theme) {
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

/** 每次渲染开始时重置占位 id 队列 */
export const resetMermaidPlaceholders = () => {
    pendingMermaidIds = [];
};

/**
 * kramed renderer 的 code 钩子：拦截 mermaid 写法，输出占位容器并登记 id，
 * 在渲染流程末尾通过 renderMermaidBlocks 用 mermaid 异步渲染 SVG 替换。
 * 返回 null 表示不是 mermaid，走原有 highlight.js 高亮逻辑。
 */
export const renderMermaidCode = (code: string, languageParam: string | undefined): string | null => {
    // 规范化语言标签（去除首尾空白、小写），用于稳定匹配 'mermaid'
    const language = (languageParam ?? '').trim().toLowerCase();
    if (language !== 'mermaid') {
        return null;
    }
    // 内部缓存本轮的 id，便于后续 renderMermaidBlocks 收集
    const id = `mermaid-placeholder-${mermaidRenderSeq}-${pendingMermaidIds.length}`;
    pendingMermaidIds.push(id);
    // 用 <pre><code> 包裹保留文本，renderMermaidBlocks 会读取 textContent
    // 加 hidden 属性避免闪烁，挂载后即刻替换为 SVG
    return `<pre id="${id}" class="mermaid-placeholder" aria-hidden="true"><code>${escapeHtml(code)}</code></pre>`;
};

/** 扫描 DOM 中所有占位容器并异步渲染。失败时回退为 hljs 高亮的原始代码 */
export const renderMermaidBlocks = async () => {
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
                console.error(`[markdown-mermaid] mermaid 渲染失败 (id=${id})`, e);
                el.outerHTML = `<pre class="mermaid-error"><code class="hljs">${highlightMermaidFallback(code)}</code></pre>`;
            }
        }),
    );
};

/** 主题切换时，仅对已挂载的 mermaid SVG 容器做局部重渲染，避免整篇重跑 kramed+MathJax */
export const rerenderMermaidOnThemeChange = async () => {
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
            console.error('[markdown-mermaid] 主题切换 mermaid 重渲染失败', e);
        }
    });
};
