import { fileURLToPath, URL } from 'node:url';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve as pathResolve } from 'node:path';
import { createReadStream, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

import { cloudflare } from '@cloudflare/vite-plugin';

// MathJax 是按「CDN 风格」的多文件组件发布的（startup.js / loader.js / output/chtml 字体 / sre 等），
// 没有 ESM 入口适合直接 import; 我们把它整个包目录映射到 /mathjax/ URL 下，
// 这样 `script.src = 'mathjax/tex-chtml.js'` 在 dev 和 build 产物中都能命中。
const require = createRequire(import.meta.url);
const mathjaxDir = pathResolve(require.resolve('mathjax/package.json'), '..');
const MATHJAX_URL_PREFIX = '/mathjax/';

const mimeTypes: Record<string, string> = {
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.cjs': 'text/javascript',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
};

function mathjaxStaticPlugin(): Plugin {
    return {
        name: 'mathjax-static',
        // dev: 把 /mathjax/* 请求直接从 node_modules 中读取
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? '';
                if (!url.startsWith(MATHJAX_URL_PREFIX)) return next();
                const rel = url.slice(MATHJAX_URL_PREFIX.length).split('?')[0];
                const filePath = join(mathjaxDir, decodeURIComponent(rel));
                if (!filePath.startsWith(mathjaxDir) || !existsSync(filePath)) {
                    return next();
                }
                const stat = statSync(filePath);
                if (!stat.isFile()) return next();
                res.setHeader('Content-Type', mimeTypes[extname(filePath)] ?? 'application/octet-stream');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                createReadStream(filePath).pipe(res);
            });
        },
        configurePreviewServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? '';
                if (!url.startsWith(MATHJAX_URL_PREFIX)) return next();
                const rel = url.slice(MATHJAX_URL_PREFIX.length).split('?')[0];
                const filePath = join(mathjaxDir, decodeURIComponent(rel));
                if (!filePath.startsWith(mathjaxDir) || !existsSync(filePath)) {
                    return next();
                }
                const stat = statSync(filePath);
                if (!stat.isFile()) return next();
                res.setHeader('Content-Type', mimeTypes[extname(filePath)] ?? 'application/octet-stream');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                createReadStream(filePath).pipe(res);
            });
        },
        // build: 把整个 mathjax 目录作为静态资源打包到 dist/client/mathjax/
        async generateBundle() {
            const allFiles: string[] = [];
            const walk = (dir: string) => {
                for (const entry of readdirSync(dir, { withFileTypes: true })) {
                    const full = join(dir, entry.name);
                    if (entry.isDirectory()) {
                        walk(full);
                    } else if (entry.isFile()) {
                        allFiles.push(full);
                    }
                }
            };
            walk(mathjaxDir);
            for (const abs of allFiles) {
                const rel = abs.slice(mathjaxDir.length).replace(/\\/g, '/').replace(/^\//, '');
                this.emitFile({
                    type: 'asset',
                    fileName: `mathjax/${rel}`,
                    source: readFileSync(abs),
                });
            }
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue(), vueDevTools(), cloudflare(), mathjaxStaticPlugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        rollupOptions: {
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
});
