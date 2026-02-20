export interface MarkdownMacro {
    name: string;
    expand(...args: string[]): string;
}

export const expandMacros = (markdown: string, macros: Record<string, MarkdownMacro>) =>
    markdown.replace(
        /\{\{([A-Za-z][A-Za-z0-9]*)::((?:"(?:[^"]|\\")*",)*"(?:[^"]|\\")*")\}\}/g,
        (substring, ...args) => {
            const macroName: string = args[1];
            if (!(macroName in macros)) {
                return substring;
            }

            const macroArgsRaw: string = args[2];
            const macroArgsMatch = macroArgsRaw.matchAll(/"((?:[^"]|\\")*)"/g);
            let macroArgs: string[] = [];
            for (const match of macroArgsMatch) {
                macroArgs.push(match[1]);
            }

            return macros[macroName].expand(...macroArgs);
        },
    );
