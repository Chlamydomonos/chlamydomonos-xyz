// 宏子组件注册机制。
//
// 部分宏（如 video）需要在 markdown 渲染完成后向生成的 HTML 中注入 Vue 子组件
// （通过 Teleport 注入占位元素）。宏展开发生在 kramed 解析之前，此时无法得知
// markdown 文档的 URL，因此宏只生成占位元素，并在本模块注册对应的子组件；
// MarkdownComponent 在渲染完成后按注册表统一扫描占位元素并实例化子组件。

import type { Component } from 'vue';

/** 占位元素上携带宏参数的 data 属性前缀 */
export const MACRO_COMPONENT_DATA_PREFIX = 'data-macro-';

export interface MacroComponentRegistration {
    /** 宏名，与 MarkdownMacro.name 一致 */
    macroName: string;
    /** 占位元素的 class，用于 MarkdownComponent 扫描 DOM */
    placeholderClass: string;
    /** 要实例化的 Vue 子组件 */
    component: Component;
    /**
     * 从占位元素中解析传给子组件的 props。
     * 返回 null 表示跳过该占位元素。
     * 注意：placeholderId 无需在此返回，挂载机制会自动附加占位元素的 id，
     * 子组件通过 Teleport :to="`#${placeholderId}`" 注入占位元素。
     */
    parseProps: (el: Element) => Record<string, unknown> | null;
}

const registrations: MacroComponentRegistration[] = [];

/**
 * 注册宏子组件。宏模块在模块顶层调用，MarkdownComponent 通过
 * import.meta.glob 加载所有宏模块时即完成注册。
 */
export const registerMacroComponent = (registration: MacroComponentRegistration) => {
    registrations.push(registration);
};

export const getMacroComponentRegistrations = () => registrations;

/**
 * 从占位元素中读取所有 data-macro-* 属性，作为子组件 props。
 * 例如 data-macro-src="..." 会变成 prop { macroSrc: "..." }（驼峰化）。
 */
export const parseMacroDataProps = (el: Element): Record<string, unknown> => {
    const props: Record<string, unknown> = {};
    for (const attr of Array.from(el.attributes)) {
        if (!attr.name.startsWith(MACRO_COMPONENT_DATA_PREFIX)) {
            continue;
        }
        // data-macro-foo-bar -> macroFooBar
        const camel = attr.name
            .slice(MACRO_COMPONENT_DATA_PREFIX.length)
            .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        props[camel] = attr.value;
    }
    return props;
};

/**
 * 生成宏占位元素 HTML。
 * 占位元素本身不渲染内容（由 Teleport 注入的子组件填充），
 * 参数通过 data-macro-* 属性携带。
 */
export const createMacroPlaceholder = (macroName: string, props: Record<string, unknown>): string => {
    const id = `macro-placeholder-${macroName}-${placeholderSeq++}`;
    const attrs = Object.entries(props)
        .map(([key, value]) => {
            const attrName = `${MACRO_COMPONENT_DATA_PREFIX}${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
            return ` ${attrName}="${escapeAttr(String(value))}"`;
        })
        .join('');
    return `<div id="${id}" class="macro-placeholder macro-placeholder-${macroName}"${attrs}></div>`;
};

let placeholderSeq = 0;

const escapeAttr = (text: string) => {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};
