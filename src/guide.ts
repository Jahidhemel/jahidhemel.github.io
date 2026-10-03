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
  hero:            { side: 'right', y: 0.98, say: "Hi! I'm Ping, Hemel's support bot. Scroll on — I'll show you around. 👋" },
  about:           { side: 'left',  y: 0.92, say: 'Three years of making merchants leave better off than they arrived.' },
  skills:          { side: 'right', y: 0.70, say: 'Support skills, plus enough engineering to actually fix things.' },
  ai:              { side: 'left',  y: 0.58, say: "This is the good part — how he actually uses AI, every day. AI drafts, he decides." },
  experience:      { side: 'right', y: 0.60, say: 'He leads both the Support and the QA team at Efoli.' },
  education:       { side: 'right', y: 0.72, say: 'Telecom engineer by degree, support engineer by choice.' },
  recommendations: { side: 'left',  y: 0.72, say: 'What his teammates say — real words from real people.' },
  work:            { side: 'right', y: 0.72, say: 'Things he built to make support better. Try the live demos!' },
  life:            { side: 'left',  y: 0.70, say: 'Off the clock: motorcycles, mountains, and cricket.' },
  contact:         { side: 'right', y: 0.30, say: "That's the tour! Say hi — he replies fast. 👋" },
};

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
      <rect x="54" y="76" width="12" height="4" rx="2" fill="url(#gAcc)" opacity=".85"/>
      <rect x="48" y="84" width="24" height="3" rx="1.5" fill="#2b3a5c"/>
    </g>
  </g>
</svg>`;

const RESTORE_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="30" y="22" width="60" height="74" rx="26" fill="#1c2946" stroke="#2b3a5c" stroke-width="3"/><rect x="38" y="38" width="44" height="30" rx="12" fill="#0B1020"/><ellipse cx="50" cy="52" rx="5" ry="6" fill="#22D3EE"/><ellipse cx="70" cy="52" rx="5" ry="6" fill="#22D3EE"/><path d="M54 62 Q60 66.5 66 62" fill="none" stroke="#22D3EE" stroke-width="3" stroke-linecap="round"/></svg>`;

export interface Guide {
  setSection(id: string): void;
  setVelocity(v: number): void;
  destroy(): void;
}

export function mountGuide(root: HTMLElement, opts: { reduced: boolean }): Guide {
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
  const all = q('.g-all'), armR = q('.g-armR'), armL = q('.g-armL'), eyes = q('.g-eyes'), ant = q('.g-antdot'), thrust = q('.g-thrust'), mouth = q('.g-mouth');
  const pupils = Array.from(svg.querySelectorAll<SVGCircleElement>('.g-pupil'));

  gsap.set(armR, { transformOrigin: '92px 66px' });
  gsap.set(armL, { transformOrigin: '28px 66px' });
  gsap.set(eyes, { transformOrigin: '60px 52px' });
  gsap.set(all, { transformOrigin: '60px 60px' });

  const reduced = opts.reduced;
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  let current = 'hero';
  let hidden = false;
  let bubbleTimer = 0;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem(KEY) === '1'; } catch { /* storage may be unavailable */ }

  // ---- position ----
  const pos = { x: -200, y: -200 };
  const xTo = gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3.inOut' });
  const yTo = gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3.inOut' });

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
    xTo(t.x); yTo(t.y);
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
    gsap.to(thrust, { scaleX: 1.25, opacity: 0.6, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '60px 110px' });
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
    if (reduced) { say('Beep! Scroll down to see the work, or jump to Contact.'); return; }
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
    const lines = ['Beep! Hemel builds things like me on weekends.', 'Fun fact: he handles 20–40 merchant chats a day.', 'Scroll on — or jump to Contact and say hi.', 'I run on SVG and GSAP. No API keys were harmed.'];
    say(lines[Math.floor(Math.random() * lines.length)]);
  }

  // ---- cursor tracking ----
  const pupilX = pupils.map((p) => gsap.quickTo(p, 'x', { duration: 0.25, ease: 'power2.out' }));
  const pupilY = pupils.map((p) => gsap.quickTo(p, 'y', { duration: 0.25, ease: 'power2.out' }));
  const headTilt = gsap.quickTo(all, 'rotation', { duration: 0.6, ease: 'power2.out' });
  let lean = 0;
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
    place(current, true);
    gsap.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' });
    wave();
    say(SPOTS[current]?.say ?? SPOTS.hero.say);
  }
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
  restore.addEventListener('click', show);
  body.addEventListener('click', react);
  body.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); react(); } });
  body.addEventListener('pointerenter', () => { if (!bubble.classList.contains('is-on')) say(SPOTS[current]?.say ?? '', 3000); });

  // ---- entrance ----
  if (dismissed) {
    el.classList.add('is-hidden'); hidden = true; restore.classList.add('is-on');
  } else {
    place('hero', true);
    gsap.set(el, { opacity: 0, scale: 0.4 });
    gsap.to(el, { opacity: 1, scale: 1, duration: 0.7, delay: 1.1, ease: 'back.out(1.7)', onComplete: () => { wave(); say(SPOTS.hero.say, 6500); } });
  }

  const onResize = () => { if (!hidden) place(current, true); };
  window.addEventListener('resize', onResize, { passive: true });

  return {
    setSection(id) {
      if (id === current) return;
      current = id;
      if (hidden) return;
      place(id);
      const spot = SPOTS[id];
      if (spot) gsap.delayedCall(0.5, () => say(spot.say));
      if (id === 'contact') gsap.delayedCall(0.9, wave);
    },
    setVelocity(v) {
      if (reduced || hidden) return;
      lean = gsap.utils.clamp(-10, 10, v * 0.25);
      headTilt(lean);
    },
    destroy() {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      el.remove(); restore.remove();
    },
  };
}
