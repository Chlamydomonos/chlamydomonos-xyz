<template>
    <canvas ref="canvasRef" class="game-of-life"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

// Props
interface Props {
    cellSize?: number;
    fps?: number;
    brushRadius?: number;
}

const props = withDefaults(defineProps<Props>(), {
    cellSize: 4,
    fps: 24,
    brushRadius: 4,
});

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null);

// WebGL 相关变量
let gl: WebGLRenderingContext | null = null;
let computeProgram: WebGLProgram | null = null;
let renderProgram: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let textures: WebGLTexture[] = [];
let frameBuffers: WebGLFramebuffer[] = [];
let currentIndex = 0;
let generation = 0;
let animationId: number | null = null;
let lastTime = 0;

// 状态
let GRID_SIZE = 256;
let config = {
    gridSize: 256,
    screenWidth: 0,
    screenHeight: 0,
    cellsX: 0,
    cellsY: 0,
};

let mouseDown = false;
let mouseX = -1;
let mouseY = -1;

// 颜色
const colorStrings = {
    dead: '',
    aliveCenter: '',
    aliveEdge: '',
};

const colors = {
    dead: [1, 1, 1],
    aliveCenter: [0, 0, 0],
    aliveEdge: [0.5, 0.5, 0.5],
};

// Uniform 位置
interface ComputeLocations {
    position: number;
    state: WebGLUniformLocation | null;
    gridSize: WebGLUniformLocation | null;
    mouseCell: WebGLUniformLocation | null;
    brushRadius: WebGLUniformLocation | null;
    mouseActive: WebGLUniformLocation | null;
    seed: WebGLUniformLocation | null;
}

interface RenderLocations {
    position: number;
    state: WebGLUniformLocation | null;
    gridSize: WebGLUniformLocation | null;
    cellSize: WebGLUniformLocation | null;
    texCoordScale: WebGLUniformLocation | null;
    colorDead: WebGLUniformLocation | null;
    colorAliveCenter: WebGLUniformLocation | null;
    colorAliveEdge: WebGLUniformLocation | null;
}

let computeLocations: ComputeLocations;
let renderLocations: RenderLocations;

// 着色器源码
const computeVertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const computeShaderSource = `
  precision mediump float;
  uniform sampler2D u_state;
  uniform float u_gridSize;
  uniform vec2 u_mouseCell;
  uniform float u_brushRadius;
  uniform float u_mouseActive;
  uniform float u_seed;
  varying vec2 v_texCoord;

  float random(vec2 st) {
    return fract(sin(dot(st.xy + u_seed, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  int getCell(vec2 offset) {
    vec2 coord = v_texCoord + offset / u_gridSize;
    coord = fract(coord);
    return texture2D(u_state, coord).r > 0.5 ? 1 : 0;
  }

  void main() {
    vec2 cellCoord = floor(v_texCoord * u_gridSize);

    float dist = distance(cellCoord, u_mouseCell);
    if (u_mouseActive > 0.5 && dist <= u_brushRadius) {
      float rand = random(cellCoord);
      float alive = rand > 0.5 ? 1.0 : 0.0;
      gl_FragColor = vec4(alive, 0.0, 0.0, 1.0);
      return;
    }

    int neighbors = 0;
    neighbors += getCell(vec2(-1.0, -1.0));
    neighbors += getCell(vec2( 0.0, -1.0));
    neighbors += getCell(vec2( 1.0, -1.0));
    neighbors += getCell(vec2(-1.0,  0.0));
    neighbors += getCell(vec2( 1.0,  0.0));
    neighbors += getCell(vec2(-1.0,  1.0));
    neighbors += getCell(vec2( 0.0,  1.0));
    neighbors += getCell(vec2( 1.0,  1.0));

    int current = texture2D(u_state, v_texCoord).r > 0.5 ? 1 : 0;

    int alive = 0;
    if (current == 1 && (neighbors == 2 || neighbors == 3)) {
      alive = 1;
    } else if (current == 0 && neighbors == 3) {
      alive = 1;
    }

    gl_FragColor = vec4(float(alive), 0.0, 0.0, 1.0);
  }
`;

const renderVertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  uniform vec2 u_texCoordScale;

  void main() {
    v_texCoord = (a_position * 0.5 + 0.5) * u_texCoordScale;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const renderShaderSource = `
  precision mediump float;
  uniform sampler2D u_state;
  uniform float u_gridSize;
  uniform float u_cellSize;
  uniform vec3 u_colorDead;
  uniform vec3 u_colorAliveCenter;
  uniform vec3 u_colorAliveEdge;
  varying vec2 v_texCoord;

  void main() {
    vec2 screenPixel = v_texCoord * u_gridSize * u_cellSize;
    vec2 cellCoord = floor(v_texCoord * u_gridSize);
    vec2 pixelInCell = mod(screenPixel, u_cellSize);

    vec2 stateCoord = (cellCoord + 0.5) / u_gridSize;
    float alive = texture2D(u_state, stateCoord).r;

    vec3 color;
    if (alive > 0.5) {
      bool inCenter = pixelInCell.x >= 1.0 && pixelInCell.x < 3.0 &&
                     pixelInCell.y >= 1.0 && pixelInCell.y < 3.0;
      color = inCenter ? u_colorAliveCenter : u_colorAliveEdge;
    } else {
      color = u_colorDead;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// 工具函数
function nextPowerOf2(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

function parseColor(color: string): number[] {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    const parsed = ctx.fillStyle;

    if (parsed.startsWith('#')) {
        const hex = parsed.slice(1);
        if (hex.length === 3) {
            return [
                parseInt(hex[0] + hex[0], 16) / 255,
                parseInt(hex[1] + hex[1], 16) / 255,
                parseInt(hex[2] + hex[2], 16) / 255,
            ];
        } else {
            return [
                parseInt(hex.slice(0, 2), 16) / 255,
                parseInt(hex.slice(2, 4), 16) / 255,
                parseInt(hex.slice(4, 6), 16) / 255,
            ];
        }
    }

    const match = parsed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        return [parseInt(match[1]) / 255, parseInt(match[2]) / 255, parseInt(match[3]) / 255];
    }

    return [1, 1, 1];
}

function getCSSColorString(varName: string): string {
    return getComputedStyle(canvasRef.value!).getPropertyValue(varName).trim();
}

function checkAndUpdateColors() {
    const newDead = getCSSColorString('--cell-dead') || '#ffffff';
    const newAliveCenter = getCSSColorString('--cell-alive-center') || '#000000';
    const newAliveEdge = getCSSColorString('--cell-alive-edge') || '#808080';

    if (newDead !== colorStrings.dead) {
        colorStrings.dead = newDead;
        colors.dead = parseColor(newDead);
    }

    if (newAliveCenter !== colorStrings.aliveCenter) {
        colorStrings.aliveCenter = newAliveCenter;
        colors.aliveCenter = parseColor(newAliveCenter);
    }

    if (newAliveEdge !== colorStrings.aliveEdge) {
        colorStrings.aliveEdge = newAliveEdge;
        colors.aliveEdge = parseColor(newAliveEdge);
    }
}

function calculateGridSize(): typeof config {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const cellsNeededX = Math.ceil(screenWidth / props.cellSize);
    const cellsNeededY = Math.ceil(screenHeight / props.cellSize);
    const maxCells = Math.max(cellsNeededX, cellsNeededY);
    const gridSize = nextPowerOf2(maxCells);

    return {
        gridSize,
        screenWidth,
        screenHeight,
        cellsX: cellsNeededX,
        cellsY: cellsNeededY,
    };
}

function createShader(type: number, source: string): WebGLShader | null {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);

    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const vertexShader = createShader(gl!.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl!.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl!.createProgram()!;
    gl!.attachShader(program, vertexShader);
    gl!.attachShader(program, fragmentShader);
    gl!.linkProgram(program);

    if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
        console.error('Program link error:', gl!.getProgramInfoLog(program));
        gl!.deleteProgram(program);
        return null;
    }
    return program;
}

function createTexture(size: number, data: Uint8Array | null): WebGLTexture {
    const texture = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, size, size, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, data);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.REPEAT);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.REPEAT);
    return texture;
}

function createInitialData(size: number): Uint8Array {
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const alive = Math.random() > 0.7 ? 255 : 0;
        data[i * 4] = alive;
        data[i * 4 + 1] = 0;
        data[i * 4 + 2] = 0;
        data[i * 4 + 3] = 255;
    }
    return data;
}

function initializeTextures() {
    textures.forEach((t) => gl!.deleteTexture(t));
    frameBuffers.forEach((fb) => gl!.deleteFramebuffer(fb));

    const initialData = createInitialData(GRID_SIZE);
    textures = [createTexture(GRID_SIZE, initialData), createTexture(GRID_SIZE, null)];

    frameBuffers = textures.map((texture) => {
        const fb = gl!.createFramebuffer()!;
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb);
        gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0);
        return fb;
    });

    currentIndex = 0;
    generation = 0;
}

function screenToCellCoord(screenX: number, screenY: number) {
    const cellX = Math.floor(screenX / props.cellSize);
    const cellY = Math.floor((config.screenHeight - screenY) / props.cellSize);
    return { x: cellX, y: cellY };
}

function step() {
    if (!gl) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[1 - currentIndex]);
    gl.viewport(0, 0, GRID_SIZE, GRID_SIZE);

    gl.useProgram(computeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(computeLocations.position);
    gl.vertexAttribPointer(computeLocations.position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[currentIndex]);
    gl.uniform1i(computeLocations.state, 0);
    gl.uniform1f(computeLocations.gridSize, GRID_SIZE);

    const cellCoord = screenToCellCoord(mouseX, mouseY);
    gl.uniform2f(computeLocations.mouseCell, cellCoord.x, cellCoord.y);
    gl.uniform1f(computeLocations.brushRadius, props.brushRadius);
    gl.uniform1f(computeLocations.mouseActive, mouseDown ? 1.0 : 0.0);
    gl.uniform1f(computeLocations.seed, Math.random() * 1000);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    currentIndex = 1 - currentIndex;
    generation++;
}

function render() {
    if (!gl) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, config.screenWidth, config.screenHeight);

    gl.useProgram(renderProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(renderLocations.position);
    gl.vertexAttribPointer(renderLocations.position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[currentIndex]);
    gl.uniform1i(renderLocations.state, 0);
    gl.uniform1f(renderLocations.gridSize, GRID_SIZE);
    gl.uniform1f(renderLocations.cellSize, props.cellSize);

    const texScaleX = config.screenWidth / (GRID_SIZE * props.cellSize);
    const texScaleY = config.screenHeight / (GRID_SIZE * props.cellSize);
    gl.uniform2f(renderLocations.texCoordScale, texScaleX, texScaleY);

    gl.uniform3fv(renderLocations.colorDead, colors.dead);
    gl.uniform3fv(renderLocations.colorAliveCenter, colors.aliveCenter);
    gl.uniform3fv(renderLocations.colorAliveEdge, colors.aliveEdge);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function gameLoop(timestamp: number) {
    const interval = 1000 / props.fps;

    if (timestamp - lastTime >= interval) {
        checkAndUpdateColors();
        step();
        render();
        lastTime = timestamp;
    }

    animationId = requestAnimationFrame(gameLoop);
}

function handleResize() {
    if (!canvasRef.value || !gl) return;

    const newConfig = calculateGridSize();
    const needNewTextures = newConfig.gridSize !== GRID_SIZE;

    config = newConfig;
    canvasRef.value.width = config.screenWidth;
    canvasRef.value.height = config.screenHeight;

    if (needNewTextures) {
        GRID_SIZE = config.gridSize;
        initializeTextures();
    }

    render();
}

// 全局鼠标/触摸事件处理
function handleMouseDown(e: MouseEvent) {
    mouseDown = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
}

function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

function handleMouseUp() {
    mouseDown = false;
}

function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    mouseDown = true;
    mouseX = touch.clientX;
    mouseY = touch.clientY;
}

function handleTouchMove(e: TouchEvent) {
    const touch = e.touches[0];
    mouseX = touch.clientX;
    mouseY = touch.clientY;
}

function handleTouchEnd() {
    mouseDown = false;
}

function initWebGL() {
    const canvas = canvasRef.value!;
    gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return false;
    }

    computeProgram = createProgram(computeVertexShaderSource, computeShaderSource);
    renderProgram = createProgram(renderVertexShaderSource, renderShaderSource);

    if (!computeProgram || !renderProgram) return false;

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    computeLocations = {
        position: gl.getAttribLocation(computeProgram, 'a_position'),
        state: gl.getUniformLocation(computeProgram, 'u_state'),
        gridSize: gl.getUniformLocation(computeProgram, 'u_gridSize'),
        mouseCell: gl.getUniformLocation(computeProgram, 'u_mouseCell'),
        brushRadius: gl.getUniformLocation(computeProgram, 'u_brushRadius'),
        mouseActive: gl.getUniformLocation(computeProgram, 'u_mouseActive'),
        seed: gl.getUniformLocation(computeProgram, 'u_seed'),
    };

    renderLocations = {
        position: gl.getAttribLocation(renderProgram, 'a_position'),
        state: gl.getUniformLocation(renderProgram, 'u_state'),
        gridSize: gl.getUniformLocation(renderProgram, 'u_gridSize'),
        cellSize: gl.getUniformLocation(renderProgram, 'u_cellSize'),
        texCoordScale: gl.getUniformLocation(renderProgram, 'u_texCoordScale'),
        colorDead: gl.getUniformLocation(renderProgram, 'u_colorDead'),
        colorAliveCenter: gl.getUniformLocation(renderProgram, 'u_colorAliveCenter'),
        colorAliveEdge: gl.getUniformLocation(renderProgram, 'u_colorAliveEdge'),
    };

    return true;
}

// 公开方法
function reset() {
    initializeTextures();
    render();
}

function getGeneration(): number {
    return generation;
}

defineExpose({
    reset,
    getGeneration,
});

// 监听 cellSize 变化
watch(
    () => props.cellSize,
    () => {
        handleResize();
    }
);

// 生命周期
onMounted(() => {
    if (!canvasRef.value) return;

    // 初始化颜色
    checkAndUpdateColors();

    // 初始化配置
    config = calculateGridSize();
    GRID_SIZE = config.gridSize;
    canvasRef.value.width = config.screenWidth;
    canvasRef.value.height = config.screenHeight;

    // 初始化 WebGL
    if (!initWebGL()) return;

    // 初始化纹理
    initializeTextures();

    // 绑定全局事件
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    // 开始循环
    render();
    animationId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    // 移除全局事件
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('resize', handleResize);

    // 清理 WebGL 资源
    if (gl) {
        textures.forEach((t) => gl!.deleteTexture(t));
        frameBuffers.forEach((fb) => gl!.deleteFramebuffer(fb));
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (computeProgram) gl.deleteProgram(computeProgram);
        if (renderProgram) gl.deleteProgram(renderProgram);
    }
});
</script>

<style scoped>
.game-of-life {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -10000;

    --cell-dead: var(--el-bg-color);
}
</style>
