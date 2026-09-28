// 共享的 HTML 转义工具。

/** 转义 HTML 特殊字符，用于把源码安全放进占位元素中 */
export const escapeHtml = (text: string) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
