/**
 * "Ping" — the interactive guide character.
 *
 * A small support robot (headset, antenna, floating thruster) that travels
 * across the viewport as the visitor scrolls, tracks the cursor with its eyes,
 * leans with scroll velocity, blinks, waves, speaks per section, and can be
 * dismissed. Pure SVG + GSAP; no runtime beyond that.
 */
import gsap from 'gsap';

type Side = 'left' | 'right';
interface Spot { side: Side; y: number; say: string }

const SPOTS: Record<string, Spot> = {
  hero:            { side: 'right', y: 0.98, say: "Hi, I'm Ping. I work for Hemel. Scroll down and I'll tag along. 👋" },
  about:           { side: 'left',  y: 0.92, say: 'Three years of this. He still likes it, somehow.' },
  skills:          { side: 'right', y: 0.70, say: 'He can fix the thing, not just explain it.' },
  ai:              { side: 'left',  y: 0.58, say: "My favourite bit. This is how he gets through 40 chats a day." },
  experience:      { side: 'right', y: 0.60, say: 'Two teams, one boss. Rosters are the hard part, he says.' },
  education:       { side: 'right', y: 0.72, say: 'Telecom engineer on paper. Support engineer in practice.' },
  recommendations: { side: 'left',  y: 0.72, say: 'Real people wrote these. I checked.' },
  work:            { side: 'right', y: 0.72, say: 'He built these on weekends. Click the live demos.' },
  life:            { side: 'left',  y: 0.70, say: 'Bikes, mountains, cricket. Not much room for me.' },
  contact:         { side: 'right', y: 0.30, say: "That's everything. Send him a note, he replies quickly. 👋" },
};

/**
 * What Ping does in each section, beyond sitting in the gutter.
 *  behind: hides behind an element and peeks over its top edge
 *  edge:   leans in from the side of the viewport
 *  walk:   crosses the viewport once, then settles in the gutter
 */
type Act =
  | { kind: 'spot' }
  | { kind: 'behind'; anchor: string; fx: number }
  | { kind: 'edge'; side: Side; y: number }
  | { kind: 'walk'; y: number; from: Side };

const ACTS: Record<string, Act> = {
  hero:            { kind: 'spot' },
  about:           { kind: 'behind', anchor: '.about__frame', fx: 0.5 },
  skills:          { kind: 'walk', y: 0.36, from: 'left' },
  ai:              { kind: 'behind', anchor: '#dash', fx: 0.72 },
  experience:      { kind: 'edge', side: 'right', y: 0.55 },
  education:       { kind: 'behind', anchor: '#education .card:last-child', fx: 0.62 },
  recommendations: { kind: 'behind', anchor: '.quote:nth-child(2)', fx: 0.5 },
  work:            { kind: 'behind', anchor: '.card--featured', fx: 0.8 },
  life:            { kind: 'behind', anchor: '.gallery li:nth-child(3) figure', fx: 0.5 },
  contact:         { kind: 'walk', y: 0.3, from: 'right' },
};

const FOUND = ['Found me. 👀', 'Too quick. Again?', 'Okay, okay. Over here.', 'Nope, not there any more.', 'You are good at this.'];
const GIVE_UP = 'Fine, you win. I will just float here.';

const SVG = `
<svg class="guide__svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="gBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c2946"/><stop offset="1" stop-color="#121a2e"/></linearGradient>
    <linearGradient id="gAcc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3BA7FF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
    <radialGradient id="gGlow"><stop offset="0" stop-color="#22D3EE" stop-opacity=".85"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>
  </defs>
  <g class="g-all">
    <ellipse class="g-thrust" cx="60" cy="110" rx="16" ry="6" fill="url(#gGlow)"/>
    <g class="g-ant"><line x1="60" y1="24" x2="60" y2="11" stroke="url(#gAcc)" stroke-width="3" stroke-linecap="round"/><circle class="g-antdot" cx="60" cy="8" r="4" fill="#22D3EE"/></g>
    <g class="g-armL"><rect x="21" y="62" width="14" height="30" rx="7" fill="url(#gBody)" stroke="#2b3a5c" stroke-width="1.5"/></g>
    <g class="g-armR"><rect x="85" y="62" width="14" height="30" rx="7" fill="url(#gBody)" stroke="#2b3a5c" stroke-width="1.5"/><circle cx="92" cy="92" r="6" fill="#22D3EE" opacity=".9"/></g>
    <g class="g-body">
      <rect x="30" y="22" width="60" height="74" rx="26" fill="url(#gBody)" stroke="#2b3a5c" stroke-width="1.5"/>
      <path d="M36 46 C36 28, 84 28, 84 46" fill="none" stroke="url(#gAcc)" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="30" y="43" width="7" height="15" rx="3.5" fill="#22D3EE"/>
      <rect x="83" y="43" width="7" height="15" rx="3.5" fill="#22D3EE"/>
      <path d="M86 56 C93 62, 90 70, 80 71" fill="none" stroke="#22D3EE" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="79" cy="71.5" r="2.6" fill="#22D3EE"/>
      <rect x="38" y="38" width="44" height="30" rx="12" fill="#0B1020" stroke="#22D3EE" stroke-opacity=".35"/>
      <g class="g-eyes">
        <g class="g-eye"><ellipse cx="50" cy="52" rx="5" ry="6" fill="#22D3EE"/><circle class="g-pupil" cx="51" cy="53" r="2.2" fill="#0B1020"/></g>
        <g class="g-eye"><ellipse cx="70" cy="52" rx="5" ry="6" fill="#22D3EE"/><circle class="g-pupil" cx="71" cy="53" r="2.2" fill="#0B1020"/></g>
      </g>
      <path class="g-mouth" d="M54 62 Q60 66.5 66 62" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round"/>
      <rect class="g-chest" x="54" y="76" width="12" height="4" rx="2" fill="url(#gAcc)" opacity=".85"/>
      <rect x="48" y="84" width="24" height="3" rx="1.5" fill="#2b3a5c"/>
    </g>
  </g>
</svg>`;

const RESTORE_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="30" y="22" width="60" height="74" rx="26" fill="#1c2946" stroke="#2b3a5c" stroke-width="3"/><rect x="38" y="38" width="44" height="30" rx="12" fill="#0B1020"/><ellipse cx="50" cy="52" rx="5" ry="6" fill="#22D3EE"/><ellipse cx="70" cy="52" rx="5" ry="6" fill="#22D3EE"/><path d="M54 62 Q60 66.5 66 62" fill="none" stroke="#22D3EE" stroke-width="3" stroke-linecap="round"/></svg>`;

export interface Guide {
  setSection(id: string): void;
  setVelocity(v: number): void;
  /** Fly to a viewport point (top-left of Ping). Resolves when it arrives. */
  flyTo(x: number, y: number, duration?: number): Promise<void>;
  /** Flash the antenna + chest light — the "beam" moment. */
  pulse(): void;
  say(text: string, hold?: number): void;
  wave(): void;
  /** While locked, section changes don't move Ping (used by the intro). */
  lock(on: boolean): void;
  goHome(instant?: boolean): void;
  readonly hidden: boolean;
  readonly size: { w: number; h: number };
  destroy(): void;
}

export function mountGuide(root: HTMLElement, opts: { reduced: boolean; intro?: boolean }): Guide {
  const KEY = 'ping-dismissed';
  const el = document.createElement('div');
  el.className = 'guide';
  el.innerHTML = `
    <div class="guide__bubble" role="status" aria-live="polite"></div>
    <div class="guide__body" tabindex="0" role="button" aria-label="Ping, the site guide. Press to make Ping react.">
      ${SVG}
      <div class="guide__shadow"></div>
      <button class="guide__close" type="button" aria-label="Hide the guide">×</button>
    </div>`;
  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'guide__restore';
  restore.setAttribute('aria-label', 'Show the guide');
  restore.innerHTML = RESTORE_SVG;
  root.append(el, restore);

  const body = el.querySelector<HTMLElement>('.guide__body')!;
  const bubble = el.querySelector<HTMLElement>('.guide__bubble')!;
  const closeBtn = el.querySelector<HTMLButtonElement>('.guide__close')!;
  const svg = el.querySelector<SVGSVGElement>('svg')!;
  const q = (s: string) => svg.querySelector<SVGGraphicsElement>(s)!;
  const all = q('.g-all'), armR = q('.g-armR'), armL = q('.g-armL'), eyes = q('.g-eyes'), ant = q('.g-antdot'), thrust = q('.g-thrust'), mouth = q('.g-mouth'), chest = q('.g-chest');
  const pupils = Array.from(svg.querySelectorAll<SVGCircleElement>('.g-pupil'));

  gsap.set(armR, { svgOrigin: '92 66' });
  gsap.set(armL, { svgOrigin: '28 66' });
  gsap.set(eyes, { svgOrigin: '60 52' });
  gsap.set(all, { svgOrigin: '60 60' });
  gsap.set(thrust, { svgOrigin: '60 110' });
  gsap.set(ant, { svgOrigin: '60 8' });

  const reduced = opts.reduced;
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  let current = 'hero';
  let hidden = false;
  let locked = false;
  let bubbleTimer = 0;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem(KEY) === '1'; } catch { /* storage may be unavailable */ }

  // ---- position ----
  const pos = { x: -200, y: -200 };

  // Ping travels only when the viewport has a gutter wide enough to hold it
  // beside the content column; otherwise it docks bottom-right like on mobile.
  function target(id: string) {
    const spot = SPOTS[id] ?? SPOTS.hero;
    const vw = window.innerWidth, vh = window.innerHeight;
    const margin = Math.max(0, (vw - Math.min(1180, vw - 32)) / 2);
    const docked = isMobile() || reduced || margin < 128;
    el.classList.toggle('is-docked', docked);
    const w = el.offsetWidth || 120, h = el.offsetHeight || 150;
    if (docked) return { x: vw - w - 10, y: vh - h - 14, side: 'right' as Side };
    const inset = Math.max(4, (margin - w) / 2);
    const x = spot.side === 'left' ? inset : vw - w - inset;
    const y = Math.min(vh - h - 12, Math.max(90, spot.y * vh - h / 2));
    return { x, y, side: spot.side };
  }

  function place(id: string, instant = false) {
    const t = target(id);
    el.classList.toggle('is-left', t.side === 'left');
    el.classList.toggle('is-right', t.side === 'right');
    pos.x = t.x; pos.y = t.y;
    if (instant || reduced) { gsap.set(el, { x: t.x, y: t.y }); return; }
    const goingRight = t.x > (gsap.getProperty(el, 'x') as number);
    gsap.to(el, { x: t.x, y: t.y, duration: 1.1, ease: 'power3.inOut', overwrite: 'auto' });
    // a little hop + lean in the direction of travel
    gsap.timeline()
      .to(all, { rotation: goingRight ? 10 : -10, y: -10, duration: 0.35, ease: 'power2.out' })
      .to(all, { rotation: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
  }

  // ---- speech ----
  function say(text: string, hold = 5200) {
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    if (hold > 0) bubbleTimer = window.setTimeout(() => bubble.classList.remove('is-on'), hold);
  }

  // ---- idle life ----
  if (!reduced) {
    gsap.to(all, { y: '+=5', duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(thrust, { opacity: 0.55, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(ant, { opacity: 0.35, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    const blink = () => {
      gsap.timeline({ onComplete: () => gsap.delayedCall(2.4 + Math.random() * 3, blink) })
        .to(eyes, { scaleY: 0.08, duration: 0.07 })
        .to(eyes, { scaleY: 1, duration: 0.12 });
    };
    gsap.delayedCall(1.5, blink);
  }

  function wave() {
    if (reduced) return;
    gsap.timeline()
      .to(armR, { rotation: -140, duration: 0.35, ease: 'power2.out' })
      .to(armR, { rotation: -110, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      .to(armR, { rotation: 0, duration: 0.45, ease: 'power2.inOut' });
  }

  function react() {
    if (reduced) { say('Beep. Scroll down for the work, or jump to Contact.'); return; }
    const pick = Math.floor(Math.random() * 3);
    if (pick === 0) {
      gsap.timeline().to(all, { rotation: 360, duration: 0.7, ease: 'power2.inOut' }).set(all, { rotation: 0 });
    } else if (pick === 1) {
      gsap.timeline().to(all, { y: -34, scaleY: 1.08, duration: 0.3, ease: 'power2.out' }).to(all, { y: 0, scaleY: 1, duration: 0.55, ease: 'bounce.out' });
    } else {
      gsap.timeline()
        .to(armL, { rotation: 140, duration: 0.3 }).to(armR, { rotation: -140, duration: 0.3 }, 0)
        .to([armL, armR], { rotation: 0, duration: 0.5, ease: 'elastic.out(1, .5)' });
    }
    gsap.timeline().to(mouth, { attr: { d: 'M53 61 Q60 70 67 61' }, duration: 0.2 }).to(mouth, { attr: { d: 'M54 62 Q60 66.5 66 62' }, duration: 0.4, delay: 0.8 });
    const lines = ['Beep. He built me on a weekend.', 'He does 20 to 40 merchant chats a day. I do none.', 'Keep scrolling, or jump to Contact and say hi.', 'I am just SVG and a bit of GSAP. No API keys in here.'];
    say(lines[Math.floor(Math.random() * lines.length)]);
  }

  // ---- acts: peek / edge / walk ----
  type Mode = { kind: 'spot' } | { kind: 'behind'; anchor: HTMLElement; fx: number } | { kind: 'edge'; side: Side; y: number } | { kind: 'walk' };
  let mode: Mode = { kind: 'spot' };
  const peek = { p: 0 };          // how many px of Ping are showing (behind/edge)
  let ducking = false;
  let finds = 0;
  let seekTimer: gsap.core.Tween | null = null;
  const bodyH = () => body.offsetHeight || 120;

  function clip(px: number) {
    body.style.clipPath = px >= bodyH() ? '' : `inset(0 0 ${Math.max(0, bodyH() - px)}px 0)`;
  }

  // Runs every frame while Ping is behind something: follow the element as the page scrolls.
  function tick() {
    if (mode.kind !== 'behind') return;
    const r = mode.anchor.getBoundingClientRect();
    const w = el.offsetWidth || 120;
    const x = r.left + r.width * mode.fx - w / 2;
    const y = r.top - peek.p + 2;
    gsap.set(el, { x: gsap.utils.clamp(4, window.innerWidth - w - 4, x), y });
    // Only show when the hiding place's top edge is comfortably on screen
    // (not under the nav, not below the fold).
    const inBand = r.top > 150 && r.top < window.innerHeight - 30;
    clip(inBand ? peek.p : 0);
    bubble.style.visibility = inBand ? '' : 'hidden';
    el.classList.toggle('is-left', x < window.innerWidth / 2);
    el.classList.toggle('is-right', x >= window.innerWidth / 2);
  }

  function exitMode() {
    gsap.ticker.remove(tick);
    gsap.killTweensOf(peek);
    gsap.killTweensOf(mode);
    token++;
    seekTimer?.kill(); seekTimer = null;
    clip(bodyH());
    bubble.style.left = ''; bubble.style.right = ''; bubble.style.visibility = '';
    gsap.to(all, { rotation: 0, duration: 0.3 });
    gsap.killTweensOf(el, 'x,y');
    ducking = false;
    mode = { kind: 'spot' };
  }

  function rise(to: number, dur = 0.55) {
    return gsap.to(peek, { p: to, duration: dur, ease: 'back.out(1.6)', onUpdate: applyPeek, overwrite: true });
  }
  function sink(dur = 0.3) {
    return gsap.to(peek, { p: 0, duration: dur, ease: 'power2.in', onUpdate: applyPeek, overwrite: true });
  }
  function applyPeek() {
    if (mode.kind === 'behind') tick();
    else if (mode.kind === 'edge') {
      const w = el.offsetWidth || 120;
      const x = mode.side === 'left' ? -w + peek.p : window.innerWidth - peek.p;
      gsap.set(el, { x, y: mode.y * window.innerHeight - (el.offsetHeight || 150) / 2 });
      const lean = peek.p <= w ? peek.p / w : Math.max(0, 1 - (peek.p - w) / 16);
      gsap.set(all, { rotation: (mode.side === 'left' ? -1 : 1) * 16 * lean });
      // keep the bubble inside the viewport while Ping is half off it
      el.classList.toggle('is-left', mode.side === 'left'); el.classList.toggle('is-right', mode.side === 'right');
      if (mode.side === 'left') { bubble.style.left = `${w - peek.p + 10}px`; bubble.style.right = ''; }
      else { bubble.style.right = `${w - peek.p + 10}px`; bubble.style.left = ''; }
    }
  }

  // A routine is a loop of small moves: peek, come right out, do something,
  // slide along the hiding place, drop back behind it, pop up somewhere else.
  // `token` lets a mode change or a duck cancel a routine mid-way.
  let token = 0;
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const newFx = (fx: number) => gsap.utils.clamp(0.12, 0.88, fx + (Math.random() > 0.5 ? 1 : -1) * rnd(0.25, 0.5));
  function hop() {
    gsap.timeline().to(all, { y: -22, scaleY: 1.08, duration: 0.28, ease: 'power2.out' }).to(all, { y: 0, scaleY: 1, duration: 0.5, ease: 'bounce.out' });
  }
  function lookAround() {
    gsap.timeline()
      .to(pupils, { x: -3, duration: 0.25 }).to(all, { rotation: -8, duration: 0.25 }, '<')
      .to(pupils, { x: 3, duration: 0.4, delay: 0.3 }).to(all, { rotation: 8, duration: 0.4 }, '<')
      .to(pupils, { x: 0, duration: 0.3, delay: 0.3 }).to(all, { rotation: 0, duration: 0.3 }, '<');
  }
  function antic() {
    const pick = Math.random();
    if (pick < 0.4) wave(); else if (pick < 0.7) hop(); else lookAround();
  }

  async function behindRoutine(line?: string) {
    const t = ++token;
    const m = mode;
    if (m.kind !== 'behind') return;
    const ok = () => token === t && mode === m && !ducking && !hidden;
    const H = bodyH();
    await rise(H * 0.5); if (!ok()) return;                 // head over the edge
    if (line) say(line, 3200);
    await wait(rnd(1800, 2600)); if (!ok()) return;
    await rise(H + 10, 0.6); if (!ok()) return;             // all the way out
    antic();
    await wait(rnd(1600, 2200)); if (!ok()) return;
    // slide along the top edge to a new spot
    const to = newFx(m.fx);
    gsap.to(all, { rotation: to > m.fx ? 10 : -10, duration: 0.3 });
    flareX(1.8); flareY(2); flareA(0.9);
    await gsap.to(m, { fx: to, duration: 1.3, ease: 'power2.inOut', overwrite: true }); if (!ok()) return;
    gsap.to(all, { rotation: 0, duration: 0.4 }); flareX(1); flareY(1); flareA(0.55);
    await wait(rnd(500, 900)); if (!ok()) return;
    await sink(0.35); if (!ok()) return;                    // drop back behind
    await wait(rnd(900, 1800)); if (!ok()) return;
    m.fx = newFx(m.fx);
    behindRoutine();
  }

  async function edgeRoutine(line?: string) {
    const t = ++token;
    const m = mode;
    if (m.kind !== 'edge') return;
    const ok = () => token === t && mode === m && !ducking && !hidden;
    const w = el.offsetWidth || 120;
    await rise(w * 0.62, 0.7); if (!ok()) return;           // lean in
    if (line) say(line, 3200);
    await wait(rnd(1800, 2400)); if (!ok()) return;
    await rise(w + 16, 0.6); if (!ok()) return;             // come right in
    antic();
    await wait(rnd(1600, 2200)); if (!ok()) return;
    await sink(0.4); if (!ok()) return;                     // back out
    await wait(rnd(800, 1400)); if (!ok()) return;
    m.side = m.side === 'left' ? 'right' : 'left';
    m.y = gsap.utils.clamp(0.25, 0.8, m.y + rnd(-0.25, 0.25));
    edgeRoutine();
  }

  const continueBehind = () => { void wait(1500).then(() => { if (mode.kind === 'behind' && !ducking) behindRoutine(); }); };
  const continueEdge = () => { void wait(1500).then(() => { if (mode.kind === 'edge' && !ducking) edgeRoutine(); }); };
  function enterBehind(anchorSel: string, fx: number, line: string) {
    const anchor = document.querySelector<HTMLElement>(anchorSel);
    if (!anchor) { place(current); return; }
    mode = { kind: 'behind', anchor, fx };
    peek.p = 0; finds = 0;
    gsap.ticker.add(tick);
    tick();
    behindRoutine(line);
  }
  function enterEdge(side: Side, y: number, line: string) {
    mode = { kind: 'edge', side, y };
    peek.p = 0; finds = 0;
    applyPeek();
    edgeRoutine(line);
  }
  function enterWalk(y: number, from: Side, line: string) {
    mode = { kind: 'walk' };
    const w = el.offsetWidth || 120, vw = window.innerWidth;
    const startX = from === 'left' ? -w : vw, endX = from === 'left' ? vw : -w;
    const py = y * window.innerHeight - (el.offsetHeight || 150) / 2;
    gsap.set(el, { x: startX, y: py });
    el.classList.toggle('is-left', from === 'left'); el.classList.toggle('is-right', from === 'right');
    flareX(2.2); flareY(2.6); flareA(1);
    const swing = gsap.timeline({ repeat: -1, yoyo: true }).to([armL, armR], { rotation: 28, duration: 0.3, ease: 'sine.inOut' });
    gsap.to(all, { rotation: from === 'left' ? 10 : -10, duration: 0.3 });
    gsap.delayedCall(0.4, () => say(line, 2600));
    gsap.to(el, { x: endX, duration: 3.2, ease: 'power1.inOut', onComplete: () => {
      swing.kill(); gsap.to([armL, armR], { rotation: 0, duration: 0.4 });
      flareX(1); flareY(1); flareA(0.55);
      if (mode.kind !== 'walk') return;
      mode = { kind: 'spot' };
      // arrive from the far side into the gutter spot
      gsap.set(el, { x: from === 'left' ? vw : -w });
      place(current);
      if (current === 'contact') gsap.delayedCall(1.0, wave);
    } });
  }
  function enterAct(id: string) {
    exitMode();
    const act = ACTS[id] ?? { kind: 'spot' };
    const line = SPOTS[id]?.say ?? '';
    const roomy = !isMobile() && !reduced;
    if (act.kind === 'behind') enterBehind(act.anchor, act.fx, line);
    else if (act.kind === 'edge' && roomy) enterEdge(act.side, act.y, line);
    else if (act.kind === 'walk' && roomy) enterWalk(act.y, act.from, line);
    else { place(id); gsap.delayedCall(0.5, () => say(line)); if (id === 'contact') gsap.delayedCall(0.9, wave); }
  }

  // Hide and seek: the pointer getting close makes Ping duck and come back somewhere else.
  function seek(e: PointerEvent) {
    if (ducking || hidden || locked) return;
    if (mode.kind !== 'behind' && mode.kind !== 'edge') return;
    const r = body.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = mode.kind === 'behind' ? r.top + peek.p / 2 : r.top + r.height / 2;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) > 110) return;
    ducking = true; token++;
    gsap.killTweensOf(mode);
    finds++;
    bubble.classList.remove('is-on');
    gsap.timeline().to(eyes, { scaleY: 1.3, scaleX: 1.2, duration: 0.1 }).to(eyes, { scaleY: 1, scaleX: 1, duration: 0.2 });
    if (finds >= 4) {
      // enough: come out properly and float in the gutter
      const id = current;
      sink(0.25).then(() => { exitMode(); place(id, true); gsap.fromTo(el, { scale: 0.5 }, { scale: 1, duration: 0.5, ease: 'back.out(1.8)' }); say(GIVE_UP, 4000); wave(); });
      return;
    }
    const m = mode;
    sink(0.22).then(() => {
      gsap.delayedCall(0.8, () => {
        if (mode !== m) return;
        if (m.kind === 'behind') m.fx = gsap.utils.clamp(0.15, 0.85, m.fx + (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3));
        if (m.kind === 'edge') { m.side = m.side === 'left' ? 'right' : 'left'; m.y = gsap.utils.clamp(0.25, 0.8, m.y + (Math.random() - 0.5) * 0.4); }
        const to = m.kind === 'behind' ? bodyH() * 0.5 : (el.offsetWidth || 120) * 0.62;
        rise(to).then(() => { ducking = false; say(FOUND[Math.min(finds - 1, FOUND.length - 1)], 2200); if (m.kind === 'behind') continueBehind(); else continueEdge(); });
      });
    });
  }
  window.addEventListener('pointermove', seek, { passive: true });

  // ---- cursor tracking ----
  const pupilX = pupils.map((p) => gsap.quickTo(p, 'x', { duration: 0.25, ease: 'power2.out' }));
  const pupilY = pupils.map((p) => gsap.quickTo(p, 'y', { duration: 0.25, ease: 'power2.out' }));
  const headTilt = gsap.quickTo(all, 'rotation', { duration: 0.6, ease: 'power2.out' });
  const flareX = gsap.quickTo(thrust, 'scaleX', { duration: 0.35, ease: 'power2.out' });
  const flareY = gsap.quickTo(thrust, 'scaleY', { duration: 0.35, ease: 'power2.out' });
  const flareA = gsap.quickTo(thrust, 'opacity', { duration: 0.35, ease: 'power2.out' });
  let lean = 0;
  let flareTimer = 0;
  function onPointer(e: PointerEvent) {
    if (reduced || hidden) return;
    const r = body.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 300);
    const ox = (dx / d) * 2.6 * k, oy = (dy / d) * 2.2 * k;
    pupilX.forEach((f) => f(ox)); pupilY.forEach((f) => f(oy));
    headTilt(gsap.utils.clamp(-6, 6, dx / 120) + lean);
  }
  window.addEventListener('pointermove', onPointer, { passive: true });

  // ---- hide / show ----
  function hide(remember = true) {
    hidden = true;
    exitMode();
    bubble.classList.remove('is-on');
    gsap.to(el, { scale: 0.6, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => el.classList.add('is-hidden') });
    restore.classList.add('is-on');
    if (remember) try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  }
  function show() {
    hidden = false;
    el.classList.remove('is-hidden');
    restore.classList.remove('is-on');
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    exitMode();
    place(current, true);
    gsap.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' });
    wave();
    say(SPOTS[current]?.say ?? SPOTS.hero.say);
  }
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
  restore.addEventListener('click', show);
  body.addEventListener('click', react);
  body.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); react(); } });
  body.addEventListener('pointerenter', () => { if (mode.kind === 'spot' && !bubble.classList.contains('is-on')) say(SPOTS[current]?.say ?? '', 3000); });

  // ---- entrance ----
  if (dismissed) {
    el.classList.add('is-hidden'); hidden = true; restore.classList.add('is-on');
  } else if (opts.intro) {
    // the intro module flies Ping in and hands back control
    place('hero', true);
    gsap.set(el, { opacity: 0 });
  } else {
    place('hero', true);
    gsap.set(el, { opacity: 0, scale: 0.4 });
    gsap.to(el, { opacity: 1, scale: 1, duration: 0.7, delay: 1.1, ease: 'back.out(1.7)', onComplete: () => { wave(); say(SPOTS.hero.say, 6500); } });
  }

  const onResize = () => { if (hidden) return; if (mode.kind === 'spot') place(current, true); else applyPeek(); };
  window.addEventListener('resize', onResize, { passive: true });

  return {
    setSection(id) {
      if (id === current) return;
      current = id;
      if (hidden || locked) return;
      enterAct(id);
    },
    setVelocity(v) {
      if (reduced || hidden) return;
      lean = gsap.utils.clamp(-10, 10, v * 0.25);
      headTilt(lean);
      // flying: the thruster flares with speed and the body squashes a touch
      const k = Math.min(1, Math.abs(v) / 40);
      flareX(1 + k * 1.1); flareY(1 + k * 1.6); flareA(0.55 + k * 0.45);
      clearTimeout(flareTimer);
      flareTimer = window.setTimeout(() => { flareX(1); flareY(1); flareA(0.55); }, 180);
    },
    flyTo(x, y, duration = 0.9) {
      pos.x = x; pos.y = y;
      if (reduced) { gsap.set(el, { x, y }); return Promise.resolve(); }
      const fromX = gsap.getProperty(el, 'x') as number;
      const dir = x > fromX ? 1 : -1;
      gsap.timeline()
        .to(all, { rotation: dir * 12, duration: 0.3, ease: 'power2.out' })
        .to(all, { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, duration * 0.6);
      flareX(2); flareY(2.4); flareA(1);
      gsap.delayedCall(duration, () => { flareX(1); flareY(1); flareA(0.55); });
      return new Promise((resolve) => {
        gsap.to(el, { x, y, duration, ease: 'power3.inOut', onComplete: resolve });
      });
    },
    pulse() {
      if (reduced) return;
      gsap.timeline()
        .fromTo(ant, { scale: 1 }, { scale: 2.2, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' })
        .fromTo(chest, { opacity: 0.85 }, { opacity: 0.2, duration: 0.1, yoyo: true, repeat: 3 }, 0)
        .to(eyes, { scaleY: 1.25, scaleX: 1.15, duration: 0.15, yoyo: true, repeat: 1 }, 0)
        .to(armL, { rotation: 55, duration: 0.25, ease: 'power2.out' }, 0)
        .to(armL, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, .5)' }, 0.3);
    },
    say,
    wave,
    lock(on) { locked = on; },
    goHome(instant = false) { exitMode(); place(current, instant); },
    get hidden() { return hidden; },
    get size() { return { w: el.offsetWidth || 120, h: el.offsetHeight || 150 }; },
    destroy() {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointermove', seek);
      window.removeEventListener('resize', onResize);
      exitMode();
      el.remove(); restore.remove();
    },
  };
}
