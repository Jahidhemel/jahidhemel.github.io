/**
 * The ticket field: a 3D drift of points from "open" on the left to
 * "resolved" on the right, behind the hero.
 *
 * Raw WebGL, no library. Every particle's whole life is computed in the
 * vertex shader from one uniform clock, so the buffers are written once at
 * start-up and nothing is uploaded per frame. One draw call, no allocations
 * in the loop.
 */

const VERT = `
precision mediump float;

// x,y: where it starts   z,w: where it ends   (all in clip space)
attribute vec4 aPath;
// x: depth -1..1   y: phase   z: speed   w: point size
attribute vec4 aLife;

uniform float uTime;
uniform vec2  uMouse;
uniform float uDpr;
uniform float uSpread;

varying float vT;
varying float vFade;

void main() {
  float t = fract(aLife.y + uTime * aLife.z);

  // ease along the path so points gather at each end rather than
  // sliding across at a constant, mechanical rate
  float e = pow(t, 1.7);
  vec2 p = mix(aPath.xy, aPath.zw, e);

  // a slow arc across the middle, flattening at both ends
  float arc = sin(t * 3.14159) * aLife.x * 0.22 * uSpread;
  p.y += arc;

  // depth: nearer points sit wider apart and react more to the pointer
  float persp = 1.0 / (1.0 + aLife.x * 0.42);
  p += uMouse * (0.055 * aLife.x);
  p *= persp;

  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = aLife.w * persp * uDpr;

  vT = t;
  // fade in as it leaves the queue, fade out as it lands
  vFade = smoothstep(0.0, 0.14, t) * smoothstep(1.0, 0.82, t);
}
`;

const FRAG = `
precision mediump float;

varying float vT;
varying float vFade;
uniform float uAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float soft = smoothstep(0.25, 0.0, d);

  vec3 open  = vec3(0.961, 0.702, 0.259);  // amber, waiting
  vec3 doing = vec3(0.133, 0.827, 0.933);  // cyan, in hand
  vec3 done  = vec3(0.216, 0.788, 0.541);  // green, resolved

  vec3 col = vT < 0.42
    ? mix(open, open, vT)                       // holds amber while queued
    : vT < 0.72
      ? mix(open, doing, (vT - 0.42) / 0.30)    // picked up
      : mix(doing, done, (vT - 0.72) / 0.28);   // resolved

  gl_FragColor = vec4(col, soft * vFade * uAlpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export interface FieldHandle { destroy(): void }

export function mountTicketField(canvas: HTMLCanvasElement, opts: { count?: number; reduced?: boolean } = {}): FieldHandle | null {
  const gl = (canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' }) ||
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const count = opts.count ?? 1600;
  const path = new Float32Array(count * 4);
  const life = new Float32Array(count * 4);

  // A deterministic generator, so the field looks the same on every load.
  let s = 20260714 >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  for (let i = 0; i < count; i++) {
    // the open queue on the left, loosely stacked
    const sy = (rnd() - 0.5) * 1.7;
    const sx = -1.35 - rnd() * 0.5;
    // the resolved pile on the right, a little tighter
    const ey = sy * 0.55 + (rnd() - 0.5) * 0.5;
    const ex = 1.35 + rnd() * 0.5;

    path[i * 4] = sx;
    path[i * 4 + 1] = sy;
    path[i * 4 + 2] = ex;
    path[i * 4 + 3] = ey;

    life[i * 4] = (rnd() - 0.5) * 2;              // depth
    life[i * 4 + 1] = rnd();                       // phase
    life[i * 4 + 2] = 0.012 + rnd() * 0.022;       // speed
    life[i * 4 + 3] = 2.4 + rnd() * 5.2;           // size
  }

  const buf = (data: Float32Array) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  };
  const bPath = buf(path);
  const bLife = buf(life);

  const aPath = gl.getAttribLocation(prog, 'aPath');
  const aLife = gl.getAttribLocation(prog, 'aLife');
  gl.bindBuffer(gl.ARRAY_BUFFER, bPath);
  gl.enableVertexAttribArray(aPath);
  gl.vertexAttribPointer(aPath, 4, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bLife);
  gl.enableVertexAttribArray(aLife);
  gl.vertexAttribPointer(aLife, 4, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uDpr = gl.getUniformLocation(prog, 'uDpr');
  const uAlpha = gl.getUniformLocation(prog, 'uAlpha');
  const uSpread = gl.getUniformLocation(prog, 'uSpread');

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);   // additive, so overlaps glow
  gl.clearColor(0, 0, 0, 0);

  let dpr = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform1f(uDpr, dpr);
    // a taller viewport needs a wider arc to read as depth
    gl.uniform1f(uSpread, Math.min(1.6, Math.max(0.6, r.height / Math.max(1, r.width) * 2.2)));
  };
  resize();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mouse.ty = -((e.clientY - r.top) / r.height - 0.5) * 2;
  };

  const draw = (t: number) => {
    mouse.x += (mouse.tx - mouse.x) * 0.055;
    mouse.y += (mouse.ty - mouse.y) * 0.055;
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uAlpha, 0.95);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  if (opts.reduced) {
    // One still frame. The shape reads without anything moving.
    draw(4200);
    return { destroy() { gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
  }

  let raf = 0;
  let running = false;
  const loop = (t: number) => {
    if (!running) return;
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(loop); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.01 });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });

  return {
    destroy() {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
