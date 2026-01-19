// mandelbrot-renderer.ts

/**
 * RGB 颜色类型
 */
interface RGB {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
}

/**
 * 渲染选项
 */
interface RenderOptions {
    colorScheme: RGB[]; // 配色方案
    seed: string; // 随机种子
    iterations: number; // 迭代次数
}

/**
 * 基于种子的伪随机数生成器 (Mulberry32)
 */
class SeededRandom {
    private state: number;

    constructor(seed: string) {
        this.state = this.hashString(seed);
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash) || 1;
    }

    next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    int(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }
}

/**
 * 曼德勃罗集渲染器单例类
 */
class MandelbrotRenderer {
    private static instance: MandelbrotRenderer | null = null;

    private readonly SIZE = 1024;
    private offscreenCanvas: OffscreenCanvas;
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private program: WebGLProgram;
    private uniforms: {
        resolution: WebGLUniformLocation | null;
        center: WebGLUniformLocation | null;
        zoom: WebGLUniformLocation | null;
        maxIterations: WebGLUniformLocation | null;
        colorPalette: WebGLUniformLocation | null;
        paletteSize: WebGLUniformLocation | null;
    };

    private readonly vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    // 修复：使用循环遍历替代动态索引
    private readonly fragmentShaderSource = `
        precision highp float;

        uniform vec2 u_resolution;
        uniform vec2 u_center;
        uniform float u_zoom;
        uniform int u_maxIterations;
        uniform vec3 u_colorPalette[32];
        uniform int u_paletteSize;

        // 通过循环获取调色板颜色（避免动态索引）
        vec3 getPaletteColor(int index) {
            vec3 color = vec3(0.0);
            for (int i = 0; i < 32; i++) {
                if (i == index) {
                    color = u_colorPalette[i];
                    break;
                }
            }
            return color;
        }

        vec3 getColor(float t) {
            if (u_paletteSize <= 1) {
                return getPaletteColor(0);
            }

            t = fract(t);
            float scaledT = t * float(u_paletteSize - 1);
            int index = int(floor(scaledT));
            float frac = fract(scaledT);

            // 计算下一个索引（循环）
            int nextIndex = index + 1;
            if (nextIndex >= u_paletteSize) {
                nextIndex = 0;
            }

            // 通过函数获取颜色
            vec3 color1 = getPaletteColor(index);
            vec3 color2 = getPaletteColor(nextIndex);

            return mix(color1, color2, frac);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
            vec2 c = uv / u_zoom + u_center;

            vec2 z = vec2(0.0);
            int iterations = 0;

            for (int i = 0; i < 2000; i++) {
                if (i >= u_maxIterations) break;

                float x = z.x * z.x - z.y * z.y + c.x;
                float y = 2.0 * z.x * z.y + c.y;
                z = vec2(x, y);

                if (dot(z, z) > 256.0) break;
                iterations++;
            }

            if (iterations >= u_maxIterations) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
                float log_zn = log(dot(z, z)) / 2.0;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                float smooth_iter = float(iterations) + 1.0 - nu;
                float t = smooth_iter / float(u_maxIterations);
                vec3 color = getColor(sqrt(t) * 3.0);
                gl_FragColor = vec4(color, 1.0);
            }
        }
    `;

    private constructor() {
        this.offscreenCanvas = new OffscreenCanvas(this.SIZE, this.SIZE);

        const gl = this.offscreenCanvas.getContext('webgl2') || this.offscreenCanvas.getContext('webgl');

        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this.gl = gl;

        this.program = this.createProgram();
        this.setupVertexBuffer();

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            center: gl.getUniformLocation(this.program, 'u_center'),
            zoom: gl.getUniformLocation(this.program, 'u_zoom'),
            maxIterations: gl.getUniformLocation(this.program, 'u_maxIterations'),
            colorPalette: gl.getUniformLocation(this.program, 'u_colorPalette'),
            paletteSize: gl.getUniformLocation(this.program, 'u_paletteSize'),
        };
    }

    public static getInstance(): MandelbrotRenderer {
        if (!MandelbrotRenderer.instance) {
            MandelbrotRenderer.instance = new MandelbrotRenderer();
        }
        return MandelbrotRenderer.instance;
    }

    private createShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type);

        if (!shader) {
            throw new Error('Failed to create shader');
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${info}`);
        }

        return shader;
    }

    private createProgram(): WebGLProgram {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource);

        const program = gl.createProgram();
        if (!program) {
            throw new Error('Failed to create program');
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Program linking error: ${info}`);
        }

        return program;
    }

    private setupVertexBuffer(): void {
        const gl = this.gl;
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    private getIterations(cx: number, cy: number, maxIter: number): number {
        let zx = 0,
            zy = 0;
        for (let i = 0; i < maxIter; i++) {
            const zx2 = zx * zx,
                zy2 = zy * zy;
            if (zx2 + zy2 > 4) return i;
            zy = 2 * zx * zy + cy;
            zx = zx2 - zy2 + cx;
        }
        return maxIter;
    }

    private calculateInterestScore(
        cx: number,
        cy: number,
        radius: number,
        rng: SeededRandom,
        samples: number = 20
    ): number {
        const iterations: number[] = [];
        let hasBlack = false;
        let hasColor = false;

        for (let i = 0; i < samples; i++) {
            const angle = rng.next() * Math.PI * 2;
            const r = rng.next() * radius;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            const iter = this.getIterations(px, py, 500);
            iterations.push(iter);

            if (iter >= 500) hasBlack = true;
            else hasColor = true;
        }

        if (!hasBlack || !hasColor) return 0;

        const colorIters = iterations.filter((i) => i < 500);
        if (colorIters.length < 5) return 0;

        const mean = colorIters.reduce((a, b) => a + b, 0) / colorIters.length;
        const variance = colorIters.reduce((sum, i) => sum + (i - mean) ** 2, 0) / colorIters.length;
        const stdDev = Math.sqrt(variance);

        const unique = new Set(colorIters.map((i) => Math.floor(i / 10))).size;

        return stdDev * unique;
    }

    private getRandomBoundaryPoint(rng: SeededRandom): { x: number; y: number } {
        const strategyIndex = rng.int(0, 6);

        switch (strategyIndex) {
            case 0: {
                const t = rng.next() * Math.PI * 2;
                const r = 0.25 * (1 - Math.cos(t));
                return {
                    x: r * Math.cos(t) - 0.25 + (rng.next() - 0.5) * 0.1,
                    y: r * Math.sin(t) + (rng.next() - 0.5) * 0.1,
                };
            }
            case 1: {
                const t = rng.next() * Math.PI * 2;
                return {
                    x: -1 + 0.25 * Math.cos(t) + (rng.next() - 0.5) * 0.05,
                    y: 0.25 * Math.sin(t) + (rng.next() - 0.5) * 0.05,
                };
            }
            case 2:
                return {
                    x: -0.75 + (rng.next() - 0.5) * 0.1,
                    y: 0.1 + (rng.next() - 0.5) * 0.1,
                };
            case 3:
                return {
                    x: 0.28 + (rng.next() - 0.5) * 0.05,
                    y: 0.53 + (rng.next() - 0.5) * 0.05,
                };
            case 4:
                return {
                    x: -0.1 + (rng.next() - 0.5) * 0.1,
                    y: 0.9 + (rng.next() - 0.5) * 0.1,
                };
            case 5:
                return {
                    x: -1.77 + (rng.next() - 0.5) * 0.05,
                    y: (rng.next() - 0.5) * 0.02,
                };
            default: {
                let x = rng.next() * 3 - 2;
                let y = (rng.next() - 0.5) * 2;
                for (let i = 0; i < 20; i++) {
                    const iter = this.getIterations(x, y, 200);
                    const inside = iter >= 200;
                    const dx = ((rng.next() - 0.5) * 0.1) / (i + 1);
                    const dy = ((rng.next() - 0.5) * 0.1) / (i + 1);
                    if (inside) {
                        x += dx;
                        y += dy;
                    } else {
                        x -= dx * 0.5;
                        y -= dy * 0.5;
                    }
                }
                return { x, y };
            }
        }
    }

    private findInterestingLocation(seed: string): { x: number; y: number; zoom: number } {
        const rng = new SeededRandom(seed);

        let bestPoint = { x: -0.5, y: 0 };
        let bestScore = 0;
        let bestZoom = 0.35;

        const candidates = 30;

        for (let i = 0; i < candidates; i++) {
            const point = this.getRandomBoundaryPoint(rng);
            const zoomLevels = [10, 50, 200, 1000, 5000, 20000];

            for (const z of zoomLevels) {
                const radius = 1 / z;
                const scoreRng = new SeededRandom(`${seed}_score_${i}_${z}`);
                const score = this.calculateInterestScore(point.x, point.y, radius, scoreRng, 25);

                if (score > bestScore) {
                    bestScore = score;
                    bestPoint = point;
                    bestZoom = z * 0.35;
                }
            }
        }

        return { x: bestPoint.x, y: bestPoint.y, zoom: bestZoom };
    }

    private renderToOffscreen(
        centerX: number,
        centerY: number,
        zoom: number,
        iterations: number,
        colorScheme: RGB[]
    ): void {
        const gl = this.gl;

        gl.viewport(0, 0, this.SIZE, this.SIZE);
        gl.useProgram(this.program);

        gl.uniform2f(this.uniforms.resolution, this.SIZE, this.SIZE);
        gl.uniform2f(this.uniforms.center, centerX, centerY);
        gl.uniform1f(this.uniforms.zoom, zoom);
        gl.uniform1i(this.uniforms.maxIterations, iterations);

        const paletteSize = Math.min(colorScheme.length, 32);
        const paletteData: number[] = [];

        for (let i = 0; i < 32; i++) {
            if (i < colorScheme.length) {
                paletteData.push(colorScheme[i].r / 255, colorScheme[i].g / 255, colorScheme[i].b / 255);
            } else {
                paletteData.push(0, 0, 0);
            }
        }

        gl.uniform3fv(this.uniforms.colorPalette, paletteData);
        gl.uniform1i(this.uniforms.paletteSize, paletteSize);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    public render(canvas: HTMLCanvasElement, options: RenderOptions): void {
        const { colorScheme, seed, iterations } = options;

        if (!colorScheme || colorScheme.length === 0) {
            throw new Error('Color scheme must contain at least one color');
        }
        if (iterations < 1 || iterations > 2000) {
            throw new Error('Iterations must be between 1 and 2000');
        }

        const location = this.findInterestingLocation(seed);

        this.renderToOffscreen(location.x, location.y, location.zoom, iterations, colorScheme);

        this.copyToCanvas(canvas);
    }

    private copyToCanvas(canvas: HTMLCanvasElement): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2d context from target canvas');
        }

        const targetWidth = canvas.width;
        const targetHeight = canvas.height;
        const sourceSize = this.SIZE;

        const targetAspect = targetWidth / targetHeight;
        const sourceAspect = 1;

        let sx: number, sy: number, sWidth: number, sHeight: number;

        if (targetAspect > sourceAspect) {
            sWidth = sourceSize;
            sHeight = sourceSize / targetAspect;
            sx = 0;
            sy = (sourceSize - sHeight) / 2;
        } else {
            sWidth = sourceSize * targetAspect;
            sHeight = sourceSize;
            sx = (sourceSize - sWidth) / 2;
            sy = 0;
        }

        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(this.offscreenCanvas, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
    }

    public getSize(): number {
        return this.SIZE;
    }

    public renderAt(
        canvas: HTMLCanvasElement,
        centerX: number,
        centerY: number,
        zoom: number,
        iterations: number,
        colorScheme: RGB[]
    ): void {
        if (!colorScheme || colorScheme.length === 0) {
            throw new Error('Color scheme must contain at least one color');
        }

        this.renderToOffscreen(centerX, centerY, zoom, iterations, colorScheme);
        this.copyToCanvas(canvas);
    }
}

export { MandelbrotRenderer };
export type { RGB, RenderOptions };
export default MandelbrotRenderer;
