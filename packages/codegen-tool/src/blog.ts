import fs from 'fs';
import path from 'path';
import { parseMarkdownFrontMatter } from 'common-lib/markdown-front-matter';
import type {
    FrontMatter,
    PostManifest,
    PostDate,
    IndexManifest,
    IndexPageManifest,
    ArchiveManifest,
    ArchiveYearManifest,
    ArchiveMonthManifest,
    ArchiveDayManifest,
    ArchivePageManifest,
    CategoriesManifest,
    CategoryManifest,
    CategoryPageManifest,
    TagsManifest,
    TagManifest,
    TagPageManifest,
} from 'common-lib/blog/manifest';
import { rimraf } from 'rimraf';

const publicDir = path.resolve(__dirname, '..', '..', 'frontend', 'public');
const blogDir = path.resolve(publicDir, 'sites', 'blog');
const postsDir = path.resolve(blogDir, 'posts');
const generatedDir = path.resolve(publicDir, 'generated', 'sites', 'blog');

const POSTS_PER_PAGE = 10;

type PostManifestWithTimestamp = PostManifest & { createTimestamp: number };

const sortPostsByDate = (posts: PostManifestWithTimestamp[]): PostManifestWithTimestamp[] => {
    return posts.sort((a, b) => b.createTimestamp - a.createTimestamp);
};

const formatDate = (date: Date): PostDate => {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return { year, month, day };
};

const extractSummary = (text: string): string => {
    const moreMarkerIndex = text.indexOf('<!-- more -->');
    if (moreMarkerIndex !== -1) {
        return text.substring(0, moreMarkerIndex).trim();
    }

    // 提取前3个段落
    const paragraphs: string[] = [];
    const sections = text.split(/\n\s*\n/);

    for (const section of sections) {
        const trimmed = section.trim();
        if (trimmed && !trimmed.startsWith('```')) {
            paragraphs.push(trimmed);
            if (paragraphs.length >= 3) break;
        }
    }

    return paragraphs.join('\n\n');
};

const extractCover = (text: string, frontMatterCover?: string): string | undefined => {
    if (frontMatterCover) {
        return frontMatterCover;
    }

    // 查找第一个图片标签 ![...](...)
    const imgRegex = /!\[.*?\]\((.*?)\)/;
    const match = text.match(imgRegex);
    return match ? match[1] : undefined;
};

const hashPosts = (posts: PostManifestWithTimestamp[]): number => {
    const str = posts.map((p) => p.id).join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
};

const seededRandom = (seed: number): number => {
    let s = (seed + 0x6d2b79f5) | 0;
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
};

const getRandomCover = (posts: PostManifestWithTimestamp[]): string | undefined => {
    const postsWithCover = posts.filter((p) => p.cover);
    if (postsWithCover.length === 0) {
        return undefined;
    }
    const seed = hashPosts(postsWithCover);
    const randomIndex = Math.floor(seededRandom(seed) * postsWithCover.length);
    const selected = postsWithCover[randomIndex];
    const cover = selected.cover!;

    // 如果是绝对 URL（http(s):// 或 //）或以 / 开头，直接返回
    if (/^(https?:)?\/\//.test(cover) || cover.startsWith('/')) {
        return cover;
    }

    // 否则将相对路径解析为相对于 sites/blog/posts 的路径
    const postDir = path.posix.dirname(selected.path);
    const resolved =
        postDir === '.'
            ? path.posix.join('/sites', 'blog', 'posts', cover)
            : path.posix.join('/sites', 'blog', 'posts', postDir, cover);

    return resolved;
};

const ensureDir = async (dir: string) => {
    if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
    }
};

const writeJson = async (filePath: string, data: any) => {
    await ensureDir(path.dirname(filePath));
    // 如果是PostManifestWithTimestamp，移除createTimestamp字段
    let dataToWrite = data;
    if (data && typeof data === 'object' && 'createTimestamp' in data) {
        const { createTimestamp, ...rest } = data;
        dataToWrite = rest;
    }
    await fs.promises.writeFile(filePath, JSON.stringify(dataToWrite, null, 2), 'utf-8');
};

const scanMarkdownFiles = (dir: string) => {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            files.push(...scanMarkdownFiles(fullPath));
        } else if (item.isFile() && path.extname(item.name) === '.md') {
            files.push(fullPath);
        }
    }

    return files;
};

const main = async () => {
    // 删除已存在的生成目录
    if (fs.existsSync(generatedDir)) {
        await rimraf(generatedDir);
        console.log('Cleaned existing generated directory');
    }

    const markdownFiles = scanMarkdownFiles(postsDir);

    console.log(`Found ${markdownFiles.length} markdown files`);

    const markdownFilesData = await Promise.all(
        markdownFiles.map(async (name) => {
            const stat = await fs.promises.stat(name);
            const content = await fs.promises.readFile(name, { encoding: 'utf-8' });
            return {
                name,
                content,
                meta: {
                    createTime: stat.birthtime,
                    updateTime: stat.mtime,
                },
            };
        }),
    );

    // 生成所有 PostManifest
    const postManifests: PostManifestWithTimestamp[] = markdownFilesData.map((fileData) => {
        const { frontMatter, text } = parseMarkdownFrontMatter<FrontMatter>(fileData.content);

        const relativePath = path.relative(postsDir, fileData.name);
        const fileName = path.basename(fileData.name, '.md');

        const createDate = formatDate(
            frontMatter?.createdAt ? new Date(frontMatter.createdAt) : fileData.meta.createTime,
        );
        const updateDate = formatDate(fileData.meta.updateTime);

        const id = `${createDate.year}/${createDate.month}/${createDate.day}/${fileName}`;

        const category = frontMatter?.category ? frontMatter.category.split('/').filter((c) => c.trim()) : ['未分类'];

        const tags = frontMatter?.tags ?? [];
        const summary = extractSummary(text);
        const cover = extractCover(text, frontMatter?.cover);

        return {
            id,
            path: relativePath.replace(/\\/g, '/'),
            title: frontMatter?.title ?? fileName,
            category,
            tags,
            summary,
            cover,
            createDate,
            updateDate,
            createTimestamp: frontMatter?.createdAt ?? fileData.meta.createTime.getTime(),
        };
    });

    // 按创建时间倒序排序
    postManifests.sort((a, b) => b.createTimestamp - a.createTimestamp);

    console.log(`Generated ${postManifests.length} post manifests`);

    // 生成 posts 目录下的文件
    for (const post of postManifests) {
        const postPath = path.join(generatedDir, 'posts', `${post.id}.json`);
        await writeJson(postPath, post);
    }
    console.log('Generated post manifest files');

    // 生成 index 相关文件
    const indexPages = Math.ceil(postManifests.length / POSTS_PER_PAGE);
    await writeJson(path.join(generatedDir, 'index.json'), { pages: indexPages } as IndexManifest);

    for (let i = 0; i < indexPages; i++) {
        const start = i * POSTS_PER_PAGE;
        const end = Math.min(start + POSTS_PER_PAGE, postManifests.length);
        const posts = postManifests.slice(start, end).map((p) => p.id);
        await writeJson(path.join(generatedDir, 'index', `${i + 1}.json`), { posts } as IndexPageManifest);
    }
    console.log('Generated index files');

    // 生成 archive 相关文件
    const archiveMap = new Map<string, Map<string, Map<string, PostManifestWithTimestamp[]>>>();

    for (const post of postManifests) {
        const { year, month, day } = post.createDate;

        if (!archiveMap.has(year)) {
            archiveMap.set(year, new Map());
        }
        const yearMap = archiveMap.get(year)!;

        if (!yearMap.has(month)) {
            yearMap.set(month, new Map());
        }
        const monthMap = yearMap.get(month)!;

        if (!monthMap.has(day)) {
            monthMap.set(day, []);
        }
        monthMap.get(day)!.push(post);
    }

    const years = Array.from(archiveMap.keys()).sort((a, b) => b.localeCompare(a));
    await writeJson(path.join(generatedDir, 'archive.json'), { years } as ArchiveManifest);

    for (const year of years) {
        const yearMap = archiveMap.get(year)!;
        const months = Array.from(yearMap.keys()).sort((a, b) => b.localeCompare(a));
        const yearPosts = Array.from(yearMap.values()).flatMap((monthMap) => Array.from(monthMap.values()).flat());
        const cover = getRandomCover(yearPosts);
        await writeJson(path.join(generatedDir, 'archive', `${year}.json`), { months, cover } as ArchiveYearManifest);

        for (const month of months) {
            const monthMap = yearMap.get(month)!;
            const days = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));
            const monthPosts = Array.from(monthMap.values()).flat();
            const monthCover = getRandomCover(monthPosts);
            await writeJson(path.join(generatedDir, 'archive', year, `${month}.json`), {
                days,
                cover: monthCover,
            } as ArchiveMonthManifest);

            for (const day of days) {
                const dayPosts = sortPostsByDate(monthMap.get(day)!);
                const dayPages = Math.ceil(dayPosts.length / POSTS_PER_PAGE);
                const dayCover = getRandomCover(dayPosts);
                await writeJson(path.join(generatedDir, 'archive', year, month, `${day}.json`), {
                    pages: dayPages,
                    cover: dayCover,
                } as ArchiveDayManifest);

                for (let i = 0; i < dayPages; i++) {
                    const start = i * POSTS_PER_PAGE;
                    const end = Math.min(start + POSTS_PER_PAGE, dayPosts.length);
                    const posts = dayPosts.slice(start, end).map((p) => p.id);
                    await writeJson(path.join(generatedDir, 'archive', year, month, day, `${i + 1}.json`), {
                        posts,
                    } as ArchivePageManifest);
                }
            }
        }
    }
    console.log('Generated archive files');

    // 生成 categories 相关文件
    const categoryTree = new Map<string, { posts: PostManifestWithTimestamp[]; children: Set<string> }>();

    const addCategory = (categoryPath: string[], post: PostManifestWithTimestamp) => {
        for (let i = 0; i < categoryPath.length; i++) {
            const path = categoryPath.slice(0, i + 1).join('/');
            if (!categoryTree.has(path)) {
                categoryTree.set(path, { posts: [], children: new Set() });
            }

            // 只在最深层的分类中添加文章，不包含子分类的文章
            if (i === categoryPath.length - 1) {
                categoryTree.get(path)!.posts.push(post);
            }

            if (i > 0) {
                const parentPath = categoryPath.slice(0, i).join('/');
                const childName = categoryPath[i];
                categoryTree.get(parentPath)!.children.add(childName);
            }
        }
    };

    for (const post of postManifests) {
        addCategory(post.category, post);
    }

    const topCategories = Array.from(new Set(postManifests.map((p) => p.category[0]))).sort();
    await writeJson(path.join(generatedDir, 'categories.json'), { topCategories } as CategoriesManifest);

    for (const [categoryPath, data] of categoryTree.entries()) {
        const children = Array.from(data.children).sort();
        const sortedPosts = sortPostsByDate(data.posts);
        const pages = Math.ceil(sortedPosts.length / POSTS_PER_PAGE);
        await writeJson(path.join(generatedDir, 'categories', `${categoryPath}.json`), {
            children,
            pages,
        } as CategoryManifest);

        for (let i = 0; i < pages; i++) {
            const start = i * POSTS_PER_PAGE;
            const end = Math.min(start + POSTS_PER_PAGE, sortedPosts.length);
            const posts = sortedPosts.slice(start, end).map((p) => p.id);
            await writeJson(path.join(generatedDir, 'categories', categoryPath, `${i + 1}.json`), {
                posts,
            } as CategoryPageManifest);
        }
    }
    console.log('Generated category files');

    // 生成 tags 相关文件
    const tagMap = new Map<string, PostManifestWithTimestamp[]>();

    for (const post of postManifests) {
        for (const tag of post.tags) {
            if (!tagMap.has(tag)) {
                tagMap.set(tag, []);
            }
            tagMap.get(tag)!.push(post);
        }
    }

    const tags = Array.from(tagMap.keys()).sort();
    await writeJson(path.join(generatedDir, 'tags.json'), { tags } as TagsManifest);

    for (const [tag, tagPosts] of tagMap.entries()) {
        const sortedTagPosts = sortPostsByDate(tagPosts);
        const pages = Math.ceil(sortedTagPosts.length / POSTS_PER_PAGE);
        await writeJson(path.join(generatedDir, 'tags', `${tag}.json`), { pages } as TagManifest);

        for (let i = 0; i < pages; i++) {
            const start = i * POSTS_PER_PAGE;
            const end = Math.min(start + POSTS_PER_PAGE, sortedTagPosts.length);
            const posts = sortedTagPosts.slice(start, end).map((p) => p.id);
            await writeJson(path.join(generatedDir, 'tags', tag, `${i + 1}.json`), { posts } as TagPageManifest);
        }
    }
    console.log('Generated tag files');

    console.log('All manifest files generated successfully!');
};

if (require.main == module) {
    main().catch(console.error);
}
