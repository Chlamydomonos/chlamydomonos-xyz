// markdown 渲染流程中的 MathJax 处理：
// 在 kramed 解析前保护数学公式（替换为占位注释），解析后恢复，
// 并在 DOM 挂载后调用 MathJax 排版。

import { loadMathjax } from '@/lib/load-mathjax';

export interface MathProtection {
    /** 替换为占位注释后的文本，供 kramed 处理 */
    textWithPlaceholders: string;
    /** 占位注释对应的原始公式 */
    mathPlaceholders: string[];
}

/** 保护数学公式不被 kramed 处理 */
export const protectMathFormulas = (text: string): MathProtection => {
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

/** 恢复数学公式 */
export const restoreMathFormulas = (html: string, mathPlaceholders: string[]) => {
    return html.replace(/<!--MATH-(BLOCK|INLINE)-(\d+)-->/g, (_match, _type, index) => {
        return mathPlaceholders[parseInt(index)];
    });
};

/** 若存在公式，加载 MathJax 并对容器排版 */
export const typesetMath = async (container: HTMLElement | undefined, mathPlaceholders: string[]) => {
    if (mathPlaceholders.length === 0) {
        return;
    }

    await loadMathjax();

    if ((window as any).MathJax && (window as any).MathJax.typesetClear) {
        (window as any).MathJax.typesetClear();
    }

    if ((window as any).MathJax && (window as any).MathJax.typesetPromise && container) {
        await (window as any).MathJax.typesetPromise([container]);
    }
};
