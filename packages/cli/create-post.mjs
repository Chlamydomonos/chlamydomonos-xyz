import { stringify } from 'yaml';
import { program } from 'commander';
import path from 'path';
import fs from 'fs';

const template = `---\n${stringify({ createdAt: new Date().getTime() })}\n---`;
const basePath =
    process.env.SOURCE_WORK_DIR || path.resolve(import.meta.dirname, '..', 'frontend', 'public', 'sites', 'blog');

program.option('-f, --file <fileName>', '要创建的文件名').parse(process.argv);
const relativePath = program.file;
const absolutePath = path.resolve(basePath, relativePath);
const dirName = path.dirname(absolutePath);
if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
}

fs.writeFileSync(absolutePath, template, { encoding: 'utf-8' });
