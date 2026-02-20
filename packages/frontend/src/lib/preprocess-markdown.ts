import { type MarkdownMacro, expandMacros } from 'common-lib/markdown-macro';

class MacroPreprocessor {
    static INSTANCE = new MacroPreprocessor();
    private macros: Record<string, MarkdownMacro> = {};
    private initialized = false;
    private constructor() {}
    async run(text: string) {
        if (this.initialized == false) {
            const macroList = (await Promise.all(
                Object.entries(import.meta.glob('@/lib/markdown-macros/*.ts')).map((m) => m[1]()),
            )) as MarkdownMacro[];
            for (const macro of macroList) {
                this.macros[macro.name] = macro;
            }
        }

        return await expandMacros(text, this.macros);
    }
}

export const preprocessMarkdown = async (text: string) => {
    return await MacroPreprocessor.INSTANCE.run(text);
};
