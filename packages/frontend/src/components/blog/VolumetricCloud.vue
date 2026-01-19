<template>
    <canvas ref="canvasRef" :width="width" :height="height" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Props {
    width?: number;
    height?: number;
    // 光照
    lightIntensity?: number;
    lightAngleX?: number;
    lightAngleY?: number;
    // 天空颜色
    skyColorTop?: [number, number, number];
    skyColorBottom?: [number, number, number];
    // 相机
    cameraAngleX?: number;
    cameraAngleY?: number;
    cameraDistance?: number;
}

const props = withDefaults(defineProps<Props>(), {
    width: 800,
    height: 600,
    lightIntensity: 1.0,
    lightAngleX: -0.7071,
    lightAngleY: 0.0,
    skyColorTop: () => [0.6, 0.71, 0.75],
    skyColorBottom: () => [0.4, 0.51, 0.55],
    cameraAngleX: 0.5,
    cameraAngleY: 0.4,
    cameraDistance: 4.0,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let animationId: number | null = null;
let startTime: number = 0;
let noiseTexture: WebGLTexture | null = null;
let blueNoiseTexture: WebGLTexture | null = null;

// 顶点着色器
const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// 片段着色器
const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_noiseTexture;
uniform sampler2D u_blueNoiseTexture;

// 自定义 uniform
uniform float u_lightIntensity;
uniform vec3 u_sundir;
uniform vec3 u_skyColorTop;
uniform vec3 u_skyColorBottom;
uniform float u_cameraAngleX;
uniform float u_cameraAngleY;
uniform float u_cameraDistance;

mat3 setCamera(in vec3 ro, in vec3 ta, float cr) {
  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(sin(cr), cos(cr), 0.0);
  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = normalize(cross(cu, cw));
  return mat3(cu, cv, cw);
}

float hash(vec3 p) {
  p = fract(p * 0.3183099 + .1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(in vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  vec2 uv = (p.xy + vec2(37.0, 239.0) * p.z) + f.xy;
  vec2 rg = texture2D(u_noiseTexture, (uv + 0.5) / 256.0).yx;
  return mix(rg.x, rg.y, f.z) * 2.0 - 1.0;
}

float map5(in vec3 p) {
  vec3 q = p - vec3(0.0, 0.1, 1.0) * u_time;
  float f;
  f  = 0.50000 * noise(q); q = q * 2.02;
  f += 0.25000 * noise(q); q = q * 2.03;
  f += 0.12500 * noise(q); q = q * 2.01;
  f += 0.06250 * noise(q); q = q * 2.02;
  f += 0.03125 * noise(q);
  return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

float map4(in vec3 p) {
  vec3 q = p - vec3(0.0, 0.1, 1.0) * u_time;
  float f;
  f  = 0.50000 * noise(q); q = q * 2.02;
  f += 0.25000 * noise(q); q = q * 2.03;
  f += 0.12500 * noise(q); q = q * 2.01;
  f += 0.06250 * noise(q);
  return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

float map3(in vec3 p) {
  vec3 q = p - vec3(0.0, 0.1, 1.0) * u_time;
  float f;
  f  = 0.50000 * noise(q); q = q * 2.02;
  f += 0.25000 * noise(q); q = q * 2.03;
  f += 0.12500 * noise(q);
  return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

float map2(in vec3 p) {
  vec3 q = p - vec3(0.0, 0.1, 1.0) * u_time;
  float f;
  f  = 0.50000 * noise(q); q = q * 2.02;
  f += 0.25000 * noise(q);
  return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

vec4 raymarch(in vec3 ro, in vec3 rd, in vec3 bgcol, in vec2 px) {
  vec4 sum = vec4(0.0);

  ivec2 ipx = ivec2(px);
  float t = 0.05 * texture2D(u_blueNoiseTexture, px / 256.0).x;

  // LOD 5 - 最高细节
  for(int i = 0; i < 40; i++) {
    vec3 pos = ro + t * rd;
    if(pos.y < -3.0 || pos.y > 2.0 || sum.a > 0.99) break;
    float den = map5(pos);
    if(den > 0.01) {
      float dif = clamp((den - map5(pos + 0.3 * u_sundir)) / 0.6, 0.0, 1.0);
      vec3 lin = vec3(1.0, 0.6, 0.3) * dif * u_lightIntensity + vec3(0.91, 0.98, 1.05);
      vec4 col = vec4(mix(vec3(1.0, 0.95, 0.8), vec3(0.25, 0.3, 0.35), den), den);
      col.xyz *= lin;
      col.xyz = mix(col.xyz, bgcol, 1.0 - exp(-0.003 * t * t));
      col.w *= 0.4;
      col.rgb *= col.a;
      sum += col * (1.0 - sum.a);
    }
    t += max(0.06, 0.05 * t);
  }

  // LOD 4
  for(int i = 0; i < 40; i++) {
    vec3 pos = ro + t * rd;
    if(pos.y < -3.0 || pos.y > 2.0 || sum.a > 0.99) break;
    float den = map4(pos);
    if(den > 0.01) {
      float dif = clamp((den - map4(pos + 0.3 * u_sundir)) / 0.6, 0.0, 1.0);
      vec3 lin = vec3(1.0, 0.6, 0.3) * dif * u_lightIntensity + vec3(0.91, 0.98, 1.05);
      vec4 col = vec4(mix(vec3(1.0, 0.95, 0.8), vec3(0.25, 0.3, 0.35), den), den);
      col.xyz *= lin;
      col.xyz = mix(col.xyz, bgcol, 1.0 - exp(-0.003 * t * t));
      col.w *= 0.4;
      col.rgb *= col.a;
      sum += col * (1.0 - sum.a);
    }
    t += max(0.06, 0.05 * t);
  }

  // LOD 3
  for(int i = 0; i < 30; i++) {
    vec3 pos = ro + t * rd;
    if(pos.y < -3.0 || pos.y > 2.0 || sum.a > 0.99) break;
    float den = map3(pos);
    if(den > 0.01) {
      float dif = clamp((den - map3(pos + 0.3 * u_sundir)) / 0.6, 0.0, 1.0);
      vec3 lin = vec3(1.0, 0.6, 0.3) * dif * u_lightIntensity + vec3(0.91, 0.98, 1.05);
      vec4 col = vec4(mix(vec3(1.0, 0.95, 0.8), vec3(0.25, 0.3, 0.35), den), den);
      col.xyz *= lin;
      col.xyz = mix(col.xyz, bgcol, 1.0 - exp(-0.003 * t * t));
      col.w *= 0.4;
      col.rgb *= col.a;
      sum += col * (1.0 - sum.a);
    }
    t += max(0.06, 0.05 * t);
  }

  // LOD 2 - 最低细节
  for(int i = 0; i < 30; i++) {
    vec3 pos = ro + t * rd;
    if(pos.y < -3.0 || pos.y > 2.0 || sum.a > 0.99) break;
    float den = map2(pos);
    if(den > 0.01) {
      float dif = clamp((den - map2(pos + 0.3 * u_sundir)) / 0.6, 0.0, 1.0);
      vec3 lin = vec3(1.0, 0.6, 0.3) * dif * u_lightIntensity + vec3(0.91, 0.98, 1.05);
      vec4 col = vec4(mix(vec3(1.0, 0.95, 0.8), vec3(0.25, 0.3, 0.35), den), den);
      col.xyz *= lin;
      col.xyz = mix(col.xyz, bgcol, 1.0 - exp(-0.003 * t * t));
      col.w *= 0.4;
      col.rgb *= col.a;
      sum += col * (1.0 - sum.a);
    }
    t += max(0.06, 0.05 * t);
  }

  return clamp(sum, 0.0, 1.0);
}

vec4 render(in vec3 ro, in vec3 rd, in vec2 px) {
  // 背景天空
  float sun = clamp(dot(u_sundir, rd), 0.0, 1.0);
  vec3 col = mix(u_skyColorBottom, u_skyColorTop, max(0.0, rd.y));
  col += 0.2 * vec3(1.0, 0.6, 0.1) * pow(sun, 8.0) * u_lightIntensity;

  // 云
  vec4 res = raymarch(ro, rd, col, px);
  col = col * (1.0 - res.w) + res.xyz;

  // 太阳光晕
  col += vec3(0.2, 0.08, 0.04) * pow(sun, 3.0) * u_lightIntensity;

  return vec4(col, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 p = (2.0 * fragCoord - u_resolution.xy) / u_resolution.y;

  // 相机
  vec3 ro = u_cameraDistance * normalize(vec3(
    sin(3.0 * u_cameraAngleX),
    0.8 * u_cameraAngleY,
    cos(3.0 * u_cameraAngleX)
  )) - vec3(0.0, 0.1, 0.0);

  vec3 ta = vec3(0.0, -1.0, 0.0);
  mat3 ca = setCamera(ro, ta, 0.07 * cos(0.25 * u_time));

  // 光线
  vec3 rd = ca * normalize(vec3(p.xy, 1.5));

  gl_FragColor = render(ro, rd, fragCoord);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function createNoiseTexture(gl: WebGLRenderingContext): WebGLTexture | null {
    const texture = gl.createTexture();
    if (!texture) return null;

    const size = 256;
    const data = new Uint8Array(size * size * 4);

    // 生成噪声数据
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            data[i] = Math.random() * 255;
            data[i + 1] = Math.random() * 255;
            data[i + 2] = Math.random() * 255;
            data[i + 3] = 255;
        }
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

function createBlueNoiseTexture(gl: WebGLRenderingContext): WebGLTexture | null {
    const texture = gl.createTexture();
    if (!texture) return null;

    const size = 256;
    const data = new Uint8Array(size * size * 4);

    // 生成蓝噪声（简化版本）
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            // 使用简单的噪声模式
            const value = (x * 127 + y * 311) % 256;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
            data[i + 3] = 255;
        }
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
}

function initWebGL() {
    const canvas = canvasRef.value;
    if (!canvas) return false;

    gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported');
        return false;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return false;

    program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return false;

    // 创建全屏四边形
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 创建纹理
    noiseTexture = createNoiseTexture(gl);
    blueNoiseTexture = createBlueNoiseTexture(gl);

    startTime = Date.now();

    return true;
}

function normalizeDirection(x: number, y: number): [number, number, number] {
    const z = -Math.sqrt(Math.max(0, 1 - x * x - y * y)) || -0.7071;
    const len = Math.sqrt(x * x + y * y + z * z);
    return [x / len, y / len, z / len];
}

function render() {
    if (!gl || !program) return;

    gl.viewport(0, 0, props.width, props.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // 设置 uniforms
    const time = (Date.now() - startTime) / 1000;

    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), props.width, props.height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
    gl.uniform1f(gl.getUniformLocation(program, 'u_lightIntensity'), props.lightIntensity);

    const sunDir = normalizeDirection(props.lightAngleX, props.lightAngleY);
    gl.uniform3f(gl.getUniformLocation(program, 'u_sundir'), sunDir[0], sunDir[1], sunDir[2]);

    gl.uniform3f(
        gl.getUniformLocation(program, 'u_skyColorTop'),
        props.skyColorTop[0],
        props.skyColorTop[1],
        props.skyColorTop[2]
    );
    gl.uniform3f(
        gl.getUniformLocation(program, 'u_skyColorBottom'),
        props.skyColorBottom[0],
        props.skyColorBottom[1],
        props.skyColorBottom[2]
    );

    gl.uniform1f(gl.getUniformLocation(program, 'u_cameraAngleX'), props.cameraAngleX);
    gl.uniform1f(gl.getUniformLocation(program, 'u_cameraAngleY'), props.cameraAngleY);
    gl.uniform1f(gl.getUniformLocation(program, 'u_cameraDistance'), props.cameraDistance);

    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_noiseTexture'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blueNoiseTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_blueNoiseTexture'), 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animationId = requestAnimationFrame(render);
}

function cleanup() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (gl) {
        if (noiseTexture) gl.deleteTexture(noiseTexture);
        if (blueNoiseTexture) gl.deleteTexture(blueNoiseTexture);
        if (program) gl.deleteProgram(program);
    }
}

// 监听 props 变化
watch(
    () => [props.width, props.height],
    () => {
        if (canvasRef.value && gl) {
            gl.viewport(0, 0, props.width, props.height);
        }
    }
);

onMounted(() => {
    if (initWebGL()) {
        render();
    }
});

onUnmounted(() => {
    cleanup();
});
</script>

<style scoped>
canvas {
    display: block;
}
</style>
