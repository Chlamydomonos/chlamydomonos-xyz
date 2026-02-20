export interface MarkdownMacro {
    name: string;
    expand(...args: string[]): string | Promise<string>;
}

/**
 * 异步替换函数类型定义
 * 模拟 String.prototype.replace 的回调签名: (match, p1, p2, ..., offset, string)
 */
type AsyncReplacer = (match: string, ...args: any[]) => Promise<string>;

/**
 * 异步替换字符串中的匹配项
 *
 * @param str - 原始字符串
 * @param regex - 正则表达式 (必须包含 global /g 标志，否则 matchAll 行为可能不符合预期)
 * @param asyncFn - 异步替换回调函数
 */
const replaceAsync = async (str: string, regex: RegExp, asyncFn: AsyncReplacer): Promise<string> => {
    // 1. 获取所有匹配项
    const matches = Array.from(str.matchAll(regex));

    // 如果没有匹配项，直接返回原字符串
    if (matches.length === 0) {
        return str;
    }

    // 2. 并行执行所有异步替换操作
    const promises = matches.map((match) => {
        // 构造参数数组，以匹配标准 replace 回调的参数列表:
        // [matchedString, capture1, capture2, ..., index, input]
        const args = [...match, match.index, match.input || str];

        // 调用异步函数
        return asyncFn.apply(undefined, args as [string, ...any[]]);
    });

    // 等待所有 Promise 完成
    const replacements = await Promise.all(promises);

    // 3. 重新组装字符串
    let result = '';
    let lastIndex = 0;

    matches.forEach((match, i) => {
        const matchIndex = match.index!; // matchAll 结果中 index 必定存在
        const matchStr = match[0];

        // 拼接上一个匹配项结束位置到当前匹配项开始位置之间的文本
        result += str.slice(lastIndex, matchIndex);

        // 拼接异步替换后的文本
        result += replacements[i];

        // 更新游标位置
        lastIndex = matchIndex + matchStr.length;
    });

    // 拼接剩余的文本
    result += str.slice(lastIndex);

    return result;
};

export const expandMacros = (markdown: string, macros: Record<string, MarkdownMacro>) =>
    replaceAsync(
        markdown,
        /\{\{([A-Za-z][A-Za-z0-9]*)::((?:"(?:[^"]|\\")*",)*"(?:[^"]|\\")*")\}\}/g,
        async (substring, ...args) => {
            const macroName: string = args[0];
            if (!(macroName in macros)) {
                return substring;
            }

            const macroArgsRaw: string = args[1];
            const macroArgsMatch = macroArgsRaw.matchAll(/"((?:[^"]|\\")*)"/g);
            let macroArgs: string[] = [];
            for (const match of macroArgsMatch) {
                macroArgs.push(match[1]);
            }

            return await macros[macroName].expand(...macroArgs);
        },
    );
