export const name = 'novelLanguage';

const splitByPunctuation = (text: string): string[] => {
    // 如果输入为空，返回空数组
    if (!text) return [];

    // 正则表达式解释：
    // \p{P} 匹配任何 Unicode 标点符号字符 (Punctuation)
    // + 表示匹配一次或多次
    // [^\p{P}] 表示匹配任何 非 标点符号的字符
    // u 标志 (flag) 是必须的，用于启用 Unicode 模式
    // g 标志用于全局匹配

    // 逻辑：匹配【一连串的标点】或者【一连串的非标点】
    const regex = /([\p{P}]+)|([^\p{P}]+)/gu;

    // 使用 match 方法提取所有匹配项
    const matches = text.match(regex);

    return matches || [];
};

interface Alphabet {
    length: number;
    get(id: number): string;
}

const genRandomLength = (str: string) => {
    // 1. 初始化种子：使用 FNV-1a 哈希算法将字符串转换为 32 位整数
    // 我们将输入的 length 也加入哈希计算，这样 ("test", 5) 和 ("test", 6) 会产生完全不同的序列
    let seed = 0x811c9dc5;

    // 先混合长度，保证不同长度请求产生不同的随机流起点
    seed ^= length;
    seed = Math.imul(seed, 0x01000193);
    for (let i = 0; i < str.length; i++) {
        seed ^= str.charCodeAt(i);
        // 使用 Math.imul 确保 32 位整数乘法溢出表现一致
        seed = Math.imul(seed, 0x01000193);
    }
    // 2. 自定义随机函数 (Mulberry32 算法)
    // 该函数会闭包使用上面的 seed 变量作为内部状态
    const nextRandom = (): number => {
        seed += 0x6d2b79f5;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const factor = 0.75 + nextRandom() * 0.5;
    return Math.ceil(factor * str.length);
};

const generateDeterministicBase64 = (
    str: string,
    length: number,
    alphabet: string | Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
) => {
    if (length <= 0) {
        throw new Error('Length must be a positive integer.');
    }
    // 1. 初始化种子：使用 FNV-1a 哈希算法将字符串转换为 32 位整数
    // 我们将输入的 length 也加入哈希计算，这样 ("test", 5) 和 ("test", 6) 会产生完全不同的序列
    let seed = 0x811c9dc5;

    // 先混合长度，保证不同长度请求产生不同的随机流起点
    seed ^= length;
    seed = Math.imul(seed, 0x01000193);
    for (let i = 0; i < str.length; i++) {
        seed ^= str.charCodeAt(i);
        // 使用 Math.imul 确保 32 位整数乘法溢出表现一致
        seed = Math.imul(seed, 0x01000193);
    }
    // 2. 自定义随机函数 (Mulberry32 算法)
    // 该函数会闭包使用上面的 seed 变量作为内部状态
    const nextRandom = (): number => {
        seed += 0x6d2b79f5;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // 3. 生成字符串
    let result = '';
    for (let i = 0; i < length; i++) {
        // 获取 0 到 1 之间的随机数
        const randomVal = nextRandom();
        // 映射到 Base64 字符集索引 (0-63)
        const index = Math.floor(randomVal * alphabet.length);
        if (typeof alphabet == 'string') {
            result += alphabet[index];
        } else {
            result += alphabet.get(index);
        }
    }
    return result;
};

const langDict = {
    normal: '#dd8700',
    ancient: '#a27b3e',
    original: '#5893dc',
    high: '#b443d4',
    natural: '#52a858',
} as Record<string, string>;

const alphabets = {
    original: '⌖⌗⌧⌬⎔⎊⎉⎈⍂⍃⍄⍇⍓⍔⍕⍖⫷⫸⫶⫵⩫⩬⩭⩮⊏⊐⊓⊔⨀⨁⨂⨳',
    high: {
        length: 2147483648,
        get(id: number) {
            return `0x${id.toString(16).padStart(8, '0')}`;
        },
    },
    natural: 'ƺƔƕƾɷɸɹɺɿʀʁʂʇʈʉʊʏʐʑʒʗʘʙʚʟʠʡʢʧʨʩʪ',
} as Record<string, string | Alphabet>;

export const expand = async (lang: string, showTranslation: string, ...groups: string[]) => {
    if (!(lang in langDict)) {
        return `<span>${groups.join(' ')}</span>`;
    }
    if (showTranslation == 'false') {
        return `<span style="color: ${langDict[lang]}">${groups.join(' ')}</span>`;
    }

    if (showTranslation == 'auto') {
        groups = groups.map(splitByPunctuation).flat();
    }

    const base64Groups = groups.map((g) => ({
        original: g,
        base64: (() => {
            if (!(lang in alphabets)) {
                return g;
            }

            if (/^[\p{P}\s+<=>^`|~$\uFF5E]*$/u.test(g)) {
                return g;
            }

            const randomLength = genRandomLength(g);

            return generateDeterministicBase64(g, randomLength, alphabets[lang]);
        })(),
    }));
    return base64Groups
        .map(
            (g) =>
                `<ruby style="color: ${langDict[lang]}; line-height: 1.8em">${g.base64}<rp>(</rp><rt style="font-size: 0.6em">${g.original}</rt><rp>)</rp></ruby>`,
        )
        .join('');
};
