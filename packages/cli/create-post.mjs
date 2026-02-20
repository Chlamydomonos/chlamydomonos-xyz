import { stringify } from 'yaml';
import { program } from 'commander';
import path from 'path';
import fs from 'fs';

const basePath =
    process.env.SOURCE_WORK_DIR || path.resolve(import.meta.dirname, '..', 'frontend', 'public', 'sites', 'blog');

program
    .option('-f, --file <fileName>', '要创建的文件名')
    .option('-t, --title [title]', '文章标题', '未命名')
    .parse(process.argv);
const opts = program.opts();
const relativePath = opts.file;
const absolutePath = path.resolve(basePath, relativePath);
const dirName = path.dirname(absolutePath);
if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
}

const obj = {
    createdAt: new Date().getTime(),
    title: opts.title,
};

const template = `---\n${stringify(obj)}---`;
fs.writeFileSync(absolutePath, template, { encoding: 'utf-8' });
