import { parseMarkdownFrontMatter } from 'common-lib/markdown-front-matter';
import type { Manifest } from 'common-lib/tavern-cards/manifest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { rimraf } from 'rimraf';

const publicDir = path.resolve(__dirname, '..', '..', 'frontend', 'public');
const tavernCardsDir = path.resolve(publicDir, 'sites', 'tavern-cards');
const documentsDir = path.resolve(tavernCardsDir, 'documents');
const generatedDir = path.resolve(publicDir, 'generated', 'sites', 'tavern-cards');

// 递归扫描目录下的所有markdown文件
function scanMarkdownFiles(dir: string): string[] {
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
}

// 解析图片路径，处理相对路径和绝对路径
function resolveImagePath(imagePath: string, markdownDir: string): string | null {
    if (imagePath.startsWith('/')) {
        // 绝对路径，"/"代表public目录
        return path.join(publicDir, imagePath.substring(1));
    } else {
        // 相对路径
        return path.resolve(markdownDir, imagePath);
    }
}

// 检查图片是否在tavernCardsDir下且为png文件
function isValidCardImage(imagePath: string): boolean {
    if (!imagePath.endsWith('.png')) {
        return false;
    }

    const normalizedImagePath = path.resolve(imagePath);
    const normalizedTavernCardsDir = path.resolve(tavernCardsDir);

    return normalizedImagePath.startsWith(normalizedTavernCardsDir) && fs.existsSync(normalizedImagePath);
}

// 生成缩小版本和大版本的webp图片
async function generateThumbnails(originalPath: string): Promise<{ smallPath: string | null; bigPath: string | null }> {
    try {
        // 计算相对于tavernCardsDir的路径
        const relativePath = path.relative(tavernCardsDir, originalPath);
        const parsedPath = path.parse(relativePath);
        const smallWebpPath = path.join(parsedPath.dir, parsedPath.name + '.webp');
        const bigWebpPath = path.join(parsedPath.dir, parsedPath.name + '.big.webp');
        const smallOutputPath = path.join(generatedDir, smallWebpPath);
        const bigOutputPath = path.join(generatedDir, bigWebpPath);

        // 确保输出目录存在
        const outputDir = path.dirname(smallOutputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 生成缩小版本
        await sharp(originalPath)
            .resize(200, null, {
                withoutEnlargement: true,
                fit: 'inside',
            })
            .webp()
            .toFile(smallOutputPath);

        // 生成大版本（不缩放）
        await sharp(originalPath).webp().toFile(bigOutputPath);

        // 返回相对于public目录的路径
        const smallPath = '/generated/sites/tavern-cards/' + smallWebpPath.replace(/\\/g, '/');
        const bigPath = '/generated/sites/tavern-cards/' + bigWebpPath.replace(/\\/g, '/');

        return { smallPath, bigPath };
    } catch (error) {
        console.error(`Failed to generate thumbnails for ${originalPath}:`, error);
        return { smallPath: null, bigPath: null };
    }
}

// 主函数
export async function generateTavernCardsManifest(): Promise<void> {
    // 删除已存在的生成目录
    if (fs.existsSync(generatedDir)) {
        await rimraf(generatedDir);
        console.log('Cleaned existing generated directory');
    }

    const manifest: Manifest = {};
    const markdownFiles = scanMarkdownFiles(documentsDir);

    console.log(`Found ${markdownFiles.length} markdown files`);

    for (const markdownPath of markdownFiles) {
        try {
            const content = fs.readFileSync(markdownPath, 'utf-8');
            const { frontMatter } = parseMarkdownFrontMatter(content);

            // 获取文件名（不含.md扩展名）
            const fileName = path.basename(markdownPath, '.md');

            // 获取相对于public目录的路径
            const relativePath = path.relative(publicDir, markdownPath).replace(/\\/g, '/');
            const filePath = '/' + relativePath;

            // 获取title，默认为'Untitled'
            const title = frontMatter?.title || 'Untitled';

            let coverPath: string | null = null;
            let postCoverPath: string | null = null;

            // 检查是否有card项（向后兼容）
            if (frontMatter?.card) {
                const markdownDir = path.dirname(markdownPath);
                const resolvedImagePath = resolveImagePath(frontMatter.card, markdownDir);

                if (resolvedImagePath && isValidCardImage(resolvedImagePath)) {
                    const { smallPath, bigPath } = await generateThumbnails(resolvedImagePath);
                    coverPath = smallPath;
                    postCoverPath = bigPath;
                }
            }

            // 检查是否有cover项（用于生成缩小的封面）
            if (frontMatter?.cover) {
                const markdownDir = path.dirname(markdownPath);
                const resolvedImagePath = resolveImagePath(frontMatter.cover, markdownDir);

                if (resolvedImagePath && isValidCardImage(resolvedImagePath)) {
                    const { smallPath } = await generateThumbnails(resolvedImagePath);
                    coverPath = smallPath;
                }
            }

            // 检查是否有postCover项（直接用作postCoverPath）
            if (frontMatter?.postCover) {
                const markdownDir = path.dirname(markdownPath);
                const resolvedImagePath = resolveImagePath(frontMatter.postCover, markdownDir);

                if (resolvedImagePath && isValidCardImage(resolvedImagePath)) {
                    postCoverPath = resolvedImagePath.startsWith(publicDir)
                        ? '/' + path.relative(publicDir, resolvedImagePath).replace(/\\/g, '/')
                        : resolvedImagePath;
                }
            }

            manifest[fileName] = {
                path: filePath,
                coverPath,
                postCoverPath,
                title,
            };

            console.log(`Processed: ${fileName}`);
        } catch (error) {
            console.error(`Failed to process ${markdownPath}:`, error);
        }
    }

    // 确保生成目录存在
    if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
    }

    // 写入manifest.json
    const manifestPath = path.join(generatedDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`Generated manifest.json with ${Object.keys(manifest).length} entries`);
}

// 如果直接运行此文件，执行生成函数
if (require.main === module) {
    generateTavernCardsManifest().catch(console.error);
}
