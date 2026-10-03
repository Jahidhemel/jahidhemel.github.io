/**
 * Code-running background: lines of Liquid/JS-flavoured code type themselves
 * out on a canvas, drift upward slowly and fade. Pauses when offscreen.
 */

const SNIPPETS = [
  'const ticket = await get(id)',
  '// reproduce before guessing',
  "{% render 'the-fix' %}",
  'if (merchant.happy) ship()',
  'const bug = reproduce(ticket)',
  'await discovery(needs)',
  '{% if product.available %}',
  'onboard(merchant).then(adopt)',
  'qa.run("checkout · guest · Shop Pay")',
  'const fix = scope(customWork)',
  '// customer first',
  'review(draft) && send()',
  "{{ cart.total_price | money }}",
  'ClickUp → Drive → Figma → store',
  'playwright.test("bundle shows")',
  'resolve(ticket) // leaves better off',
  'return reply.humanReviewed',
  "{%- assign fix = 'shipped' -%}",
  'const team = lead(support, qa)',
  'await followUp(merchant, "did it work?")',
];

interface Line {
  text: string;
  shown: number;
  x: number;
  y: number;
  speed: number;
  alpha: number;
  size: number;
  life: number; // 0..1 lifecycle
  cps: number; // chars per second
  acc: number;
}

export function mountCodeBg(canvas: HTMLCanvasElement, opts: { density?: number; reduced?: boolean } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const density = opts.density ?? 10;
  const lines: Line[] = [];
  let w = 0, h = 0, dpr = 1, raf = 0, running = false, last = 0;

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(initial = false): Line {
    const size = rand(11, 14);
    return {
      text: SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)],
      shown: initial ? rand(0, 1) : 0,
      x: rand(0.02, 0.78) * w,
      y: initial ? rand(0, h) : h + rand(10, 80),
      speed: rand(8, 16),
      alpha: rand(0.16, 0.36),
      size,
      life: 0,
      cps: rand(10, 22),
      acc: 0,
    };
  }

  function seed() {
    lines.length = 0;
    const n = Math.max(4, Math.round((w * h) / 90000) * (density / 10));
    for (let i = 0; i < n; i++) lines.push(spawn(true));
  }

  function draw(t: number) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    ctx!.clearRect(0, 0, w, h);
    ctx!.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      l.y -= l.speed * dt;
      l.acc += dt * l.cps;
      if (l.shown < l.text.length) l.shown = Math.min(l.text.length, l.shown + Math.floor(l.acc));
      l.acc -= Math.floor(l.acc);
      const edge = Math.min(1, l.y / 120, (h - l.y) / 160);
      const a = Math.max(0, l.alpha * edge);
      ctx!.font = `${l.size}px "JetBrains Mono", ui-monospace, monospace`;
      const shown = l.text.slice(0, Math.floor(l.shown));
      const isComment = l.text.startsWith('//');
      ctx!.fillStyle = isComment ? `rgba(135,152,181,${a})` : `rgba(34,211,238,${a})`;
      ctx!.fillText(shown, l.x, l.y);
      if (l.shown < l.text.length && Math.floor(t / 400) % 2 === 0) {
        const cw = ctx!.measureText(shown).width;
        ctx!.fillStyle = `rgba(59,167,255,${a})`;
        ctx!.fillRect(l.x + cw + 1, l.y, 6, l.size);
      }
      if (l.y < -30) lines[i] = spawn();
    }
    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(draw);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  resize(); seed();

  if (opts.reduced) {
    // Static frame: a few fully-typed, dim lines.
    for (const l of lines) l.shown = l.text.length;
    running = true; draw(performance.now()); running = false; cancelAnimationFrame(raf);
    return () => {};
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? start() : stop();
  }, { threshold: 0.01 });
  io.observe(canvas);

  const onResize = () => { resize(); seed(); };
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  return () => { stop(); io.disconnect(); window.removeEventListener('resize', onResize); };
}
