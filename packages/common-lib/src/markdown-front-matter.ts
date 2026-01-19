import yaml from 'yaml';

export type ParsedMarkdown<T extends Record<string, any> = Record<string, any>> = {
    frontMatter?: T;
    text: string;
};

export const parseMarkdownFrontMatter = <T extends Record<string, any> = Record<string, any>>(
    markdown: string
): ParsedMarkdown<T> => {
    const trimmedMarkdown = markdown.trim().replace(/\r\n/g, '\n');

    if (!trimmedMarkdown.startsWith('---')) {
        return { text: markdown };
    }

    const lines = trimmedMarkdown.split('\n');
    let frontMatterEndIndex = -1;

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            frontMatterEndIndex = i;
            break;
        }
    }

    if (frontMatterEndIndex === -1) {
        return { text: markdown };
    }

    try {
        const frontMatterContent = lines.slice(1, frontMatterEndIndex).join('\n');
        const frontMatter = yaml.parse(frontMatterContent);
        const remainingText = lines.slice(frontMatterEndIndex + 1).join('\n');

        return {
            frontMatter: frontMatter || {},
            text: remainingText,
        };
    } catch (error) {
        console.warn('Failed to parse front matter YAML:', error);
        return { text: markdown };
    }
};
