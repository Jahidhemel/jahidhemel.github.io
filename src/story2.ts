/* ---------------------------------------------------------------------------
   Story 02, the diagram.

   One cart line, carrying eleven answers, becomes seven component lines at
   checkout. The answers move to a line item group, which packing-slip Liquid
   can only read the title of, so the slip prints [p:0 g:1].

   Scroll drives the sequence. The button under it toggles the fix: the answers
   written onto the first component line, where the slip can read them.

   Two layouts, chosen by width: horizontal above 760px, a vertical stack below.
   With reduced motion the end state is drawn straight away and nothing moves.
   --------------------------------------------------------------------------- */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NS = 'http://www.w3.org/2000/svg';

/* The eleven answers the shopper gave. Short, because they are drawn at 13px. */
const TAGS = [
  'Name', 'Address', 'Phone', 'Gift note', 'Gift wrap', 'Ribbon',
  'Card 1', 'Card 2', 'Engraving', 'Delivery date', 'Box size',
];

const TITLE =
  'Diagram. One cart line carrying eleven answers becomes seven component ' +
  'lines at checkout, and the answers move to a line item group the packing ' +
  'slip cannot read.';

const FALLBACK =
  'At checkout Shopify replaces the single bundle line, which carries all eleven ' +
  'answers, with seven component lines. The answers move to a line item group ' +
  'that packing-slip Liquid cannot read.';

const SAID_FIXED =
  'Fix applied. The answers are written onto the first component line, so the ' +
  'packing slip prints them and the debug probe reads eleven properties.';
const SAID_BROKEN =
  'Fix undone. The answers sit on the line item group again, the packing slip ' +
  'prints none of them, and the debug probe reads zero properties.';

interface Pt { x: number; y: number }
interface Box { x: number; y: number; w: number; h: number }

interface Geo {
  vw: number; vh: number;
  tag: { w: number; h: number };
  /* in the cart */
  cartCap: Pt; cart: Box; cartLabel: Pt; cartSub: Pt; cartGone: Pt; cartNote: Pt;
  expandPath: string; expandLabel: Pt | null; expandNotes: Pt[];
  /* at checkout */
  checkCap: Pt;
  lineX: number; lineW: number; lineH: number; lineYs: number[];
  lineLabelX: number; lineMonoX: number; lineTextDy: number;
  linesNote: Pt; linesNoteText: string;
  /* the line item group */
  group: Box; groupLabel: Pt; groupSub: Pt; groupSubText: string;
  /* the packing slip */
  slip: Box; slipTitle: Pt; slipRuleY: number; slipItem: Pt; slipLabel: Pt;
  probe: Pt; slipBroken: Pt; slipAnswers: Pt[]; answerText: string[];
  slipFrom: Pt;
  /* sight lines */
  blockedPath: string; blockedLabel: Pt; blockedAnchor: string;
  readsPath: string | null;
  fixPath: string | null;
  /* handwriting */
  handBrokenAt: Pt[]; handBrokenText: string[]; handBrokenAnchor: string; handArrow: string;
  handFixedAt: Pt[]; handFixedText: string[]; handFixedAnchor: string;
  /* where the eleven tags sit in each state, and how they bow on the way */
  arc: Pt;
  tagCart: Pt[]; tagGroup: Pt[]; tagFixed: Pt[];
}

interface Scene {
  svg: SVGSVGElement;
  geo: Geo;
  tags: SVGGElement[];
  lines: SVGGElement[];
  rest: SVGGElement;
  line1Mono: SVGTextElement;
  cartCard: SVGGElement;
  cartGone: SVGTextElement;
  notes: SVGGElement;
  groupBox: SVGGElement;
  slip: SVGGElement;
  probe: SVGTextElement;
  probeValue: SVGTSpanElement;
  slipBroken: SVGTextElement;
  slipAnswers: SVGGElement;
  blocked: SVGGElement;        /* outer, driven by the fix state */
  blockedIn: SVGGElement;      /* inner, driven by the scroll timeline */
  reads: SVGPathElement | null;
  fixPath: SVGPathElement | null;
  handBroken: SVGGElement;     /* outer */
  handBrokenIn: SVGGElement;   /* inner */
  handFixed: SVGGElement;
}

/* --------------------------------------------------------------- small maths */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (v: number): number => v * v * (3 - 2 * v);

function grid(cols: number[], y0: number, step: number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) out.push({ x: cols[i % cols.length], y: y0 + Math.floor(i / cols.length) * step });
  return out;
}

/* ------------------------------------------------------------------ geometry */

function wideGeo(): Geo {
  return {
    vw: 1000, vh: 570,
    tag: { w: 104, h: 22 },

    cartCap: { x: 36, y: 30 },
    cart: { x: 36, y: 52, w: 220, h: 86 },
    cartLabel: { x: 52, y: 84 },
    cartSub: { x: 52, y: 106 },
    cartGone: { x: 52, y: 128 },
    cartNote: { x: 36, y: 334 },
    expandPath: 'M266 95 L318 95',
    expandLabel: { x: 266, y: 82 },
    expandNotes: [{ x: 36, y: 392 }, { x: 36, y: 412 }],

    checkCap: { x: 330, y: 30 },
    lineX: 330, lineW: 250, lineH: 38,
    lineYs: [100, 146, 192, 238, 284, 330, 376],
    lineLabelX: 346, lineMonoX: 564, lineTextDy: 24,
    linesNote: { x: 330, y: 440 },
    linesNoteText: '7 component lines, no properties',

    group: { x: 620, y: 30, w: 360, h: 212 },
    groupLabel: { x: 636, y: 62 },
    groupSub: { x: 636, y: 84 },
    groupSubText: 'the slip can read its title, nothing more',

    slip: { x: 620, y: 296, w: 360, h: 252 },
    slipTitle: { x: 640, y: 328 },
    slipRuleY: 340,
    slipItem: { x: 640, y: 368 },
    slipLabel: { x: 640, y: 394 },
    probe: { x: 640, y: 426 },
    slipBroken: { x: 640, y: 458 },
    slipAnswers: [{ x: 640, y: 458 }, { x: 640, y: 482 }, { x: 640, y: 506 }, { x: 640, y: 530 }],
    // Placeholders, not a real order. Jane Doe reads as a placeholder to
    // anyone; an ordinary-looking name on a packing slip does not.
    answerText: ['Name: Jane Doe', 'Gift note: Happy birthday', 'Card 1: Blue linen', 'and 8 more answers'],
    slipFrom: { x: 120, y: 0 },

    blockedPath: 'M800 294 L800 252',
    blockedLabel: { x: 814, y: 276 },
    blockedAnchor: 'start',
    readsPath: 'M616 360 C592 342 600 284 590 264',
    fixPath: 'M584 120 C606 162 600 250 616 292',

    handBrokenAt: [{ x: 964, y: 202 }, { x: 964, y: 226 }],
    handBrokenText: ['the answers', 'live here'],
    handBrokenAnchor: 'end',
    handArrow: 'M872 216 C864 212 860 210 854 206',
    handFixedAt: [{ x: 330, y: 478 }, { x: 330, y: 502 }],
    handFixedText: ['written onto', 'component 1'],
    handFixedAnchor: 'start',

    arc: { x: 0, y: -44 },
    tagCart: grid([36, 148], 158, 26, 11),
    tagGroup: grid([634, 746, 858], 104, 26, 11),
    tagFixed: grid([338, 446], 146, 24, 11),
  };
}

function narrowGeo(): Geo {
  return {
    vw: 400, vh: 1210,
    tag: { w: 118, h: 24 },

    cartCap: { x: 14, y: 22 },
    cart: { x: 14, y: 34, w: 230, h: 80 },
    cartLabel: { x: 30, y: 66 },
    cartSub: { x: 30, y: 88 },
    cartGone: { x: 30, y: 108 },
    cartNote: { x: 14, y: 322 },
    expandPath: 'M28 338 L28 376',
    expandLabel: null,
    expandNotes: [],

    checkCap: { x: 44, y: 362 },
    lineX: 14, lineW: 248, lineH: 32,
    lineYs: [398, 436, 474, 512, 550, 588, 626],
    lineLabelX: 30, lineMonoX: 248, lineTextDy: 21,
    linesNote: { x: 14, y: 684 },
    linesNoteText: '7 lines the slip can read, all with no properties',

    group: { x: 14, y: 712, w: 372, h: 244 },
    groupLabel: { x: 30, y: 744 },
    groupSub: { x: 30, y: 766 },
    groupSubText: 'the slip reads its title only',

    slip: { x: 14, y: 1000, w: 372, h: 196 },
    slipTitle: { x: 30, y: 1028 },
    slipRuleY: 1038,
    slipItem: { x: 30, y: 1062 },
    slipLabel: { x: 30, y: 1084 },
    probe: { x: 30, y: 1112 },
    slipBroken: { x: 30, y: 1138 },
    slipAnswers: [{ x: 30, y: 1138 }, { x: 30, y: 1160 }, { x: 30, y: 1182 }],
    answerText: ['Name: Jane Doe', 'Gift note: Happy birthday', 'and 9 more answers'],
    slipFrom: { x: 0, y: 70 },

    blockedPath: 'M300 996 L300 962',
    blockedLabel: { x: 292, y: 984 },
    blockedAnchor: 'end',
    readsPath: null,
    fixPath: null,

    handBrokenAt: [{ x: 378, y: 904 }, { x: 378, y: 928 }],
    handBrokenText: ['the answers', 'live here'],
    handBrokenAnchor: 'end',
    handArrow: 'M300 914 L276 920',
    handFixedAt: [{ x: 386, y: 462 }, { x: 386, y: 486 }],
    handFixedText: ['written onto', 'line 1'],
    handFixedAnchor: 'end',

    arc: { x: 104, y: 0 },
    tagCart: grid([14, 138], 134, 28, 11),
    tagGroup: grid([26, 150], 786, 26, 11),
    tagFixed: grid([18, 142], 436, 26, 11),
  };
}

/* ------------------------------------------------------------- tiny builders */

function node<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs?: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, name);
  if (attrs) for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
  return el;
}

function g(cls?: string, kids: SVGElement[] = []): SVGGElement {
  const el = node('g');
  if (cls) el.setAttribute('class', cls);
  for (const k of kids) el.appendChild(k);
  return el;
}

function words(content: string, at: Pt, cls: string, anchor?: string): SVGTextElement {
  const el = node('text', { x: at.x, y: at.y, class: cls });
  if (anchor) el.setAttribute('text-anchor', anchor);
  el.textContent = content;
  return el;
}

function lines(content: string[], at: Pt[], cls: string, anchor?: string): SVGTextElement[] {
  return content.map((t, i) => words(t, at[i], cls, anchor));
}

function box(b: Box, cls: string, r = 10): SVGRectElement {
  return node('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: r, class: cls });
}

function arrow(d: string, cls: string, head = 's2-head'): SVGPathElement {
  return node('path', { d, class: cls, 'marker-end': 'url(#' + head + ')' });
}

function defs(): SVGDefsElement {
  const make = (id: string, cls: string): SVGMarkerElement => {
    const m = node('marker', {
      id, viewBox: '0 0 10 10', refX: 8, refY: 5,
      markerWidth: 5, markerHeight: 5, orient: 'auto',
    });
    m.appendChild(node('path', { d: 'M0 0 L10 5 L0 10 Z', class: cls }));
    return m;
  };
  const d = node('defs');
  d.appendChild(make('s2-head', 's2-headfill'));
  d.appendChild(make('s2-head-accent', 's2-headfill s2-headfill--accent'));
  return d;
}

/* ----------------------------------------------------------------- the scene */

function build(host: HTMLElement, wide: boolean): Scene {
  const geo = wide ? wideGeo() : narrowGeo();

  const svg = node('svg', {
    viewBox: '0 0 ' + geo.vw + ' ' + geo.vh,
    class: 's2-svg' + (wide ? '' : ' s2-svg--narrow'),
    role: 'img',
    'aria-label': TITLE,
  });
  const title = node('title');
  title.textContent = TITLE;
  svg.appendChild(title);
  svg.appendChild(defs());

  /* --- in the cart ------------------------------------------------------- */
  const cartCard = g('s2-card', [
    box(geo.cart, 's2-shape'),
    words('1 cart line', geo.cartLabel, 's2-label'),
    words('11 properties, all on it', geo.cartSub, 's2-sub'),
  ]);
  const cartGone = words('replaced at checkout', geo.cartGone, 's2-sub s2-sub--accent');
  const noteText = ["Shopify's native bundle expansion", 'replaces the line they were written on.'];
  const notes = g('s2-notes', lines(noteText.slice(0, geo.expandNotes.length), geo.expandNotes, 's2-sub'));

  const cartStage = g('s2-stagegroup', [
    words('in the cart', geo.cartCap, 's2-cap'),
    cartCard,
    cartGone,
    words('the 11 answers ride on that one line', geo.cartNote, 's2-sub'),
    arrow(geo.expandPath, 's2-sight'),
    notes,
  ]);
  if (geo.expandLabel) cartStage.appendChild(words('expands', geo.expandLabel, 's2-sub'));
  svg.appendChild(cartStage);

  /* --- at checkout, the seven component lines ---------------------------- */
  const lineEls: SVGGElement[] = [];
  let line1Mono!: SVGTextElement;
  const rest = g('s2-rest');

  geo.lineYs.forEach((y, i) => {
    const mono = words('p:0', { x: geo.lineMonoX, y: y + geo.lineTextDy }, 's2-mono', 'end');
    const row = g('s2-row', [
      box({ x: geo.lineX, y, w: geo.lineW, h: geo.lineH }, 's2-shape', 8),
      words('Component ' + (i + 1), { x: geo.lineLabelX, y: y + geo.lineTextDy }, 's2-rowlabel'),
      mono,
    ]);
    lineEls.push(row);
    if (i === 0) { line1Mono = mono; svg.appendChild(row); } else rest.appendChild(row);
  });
  svg.appendChild(rest);
  svg.appendChild(g('s2-stagegroup', [
    words('at checkout', geo.checkCap, 's2-cap'),
    words(geo.linesNoteText, geo.linesNote, 's2-sub'),
  ]));

  /* --- the line item group ----------------------------------------------- */
  const groupBox = g('s2-groupbox', [
    box(geo.group, 's2-shape s2-shape--group'),
    words('line item group', geo.groupLabel, 's2-label'),
    words(geo.groupSubText, geo.groupSub, 's2-sub'),
  ]);
  svg.appendChild(groupBox);

  /* --- the packing slip --------------------------------------------------- */
  const probeValue = node('tspan', { class: 's2-probe__v' });
  probeValue.textContent = '0';
  const probe = node('text', { x: geo.probe.x, y: geo.probe.y, class: 's2-probe' });
  const open = node('tspan');
  open.textContent = '[p:';
  const close = node('tspan');
  close.textContent = ' g:1]';
  probe.appendChild(open);
  probe.appendChild(probeValue);
  probe.appendChild(close);

  const slipBroken = words('nothing to print', geo.slipBroken, 's2-sub');
  const slipAnswers = g('s2-answers', lines(geo.answerText, geo.slipAnswers, 's2-slipline'));

  const slip = g('s2-slip', [
    box(geo.slip, 's2-shape s2-shape--slip'),
    words('packing slip', geo.slipTitle, 's2-label'),
    node('line', {
      x1: geo.slipTitle.x, y1: geo.slipRuleY,
      x2: geo.slip.x + geo.slip.w - (geo.slipTitle.x - geo.slip.x), y2: geo.slipRuleY,
      class: 's2-rule',
    }),
    words('Gift box, qty 1', geo.slipItem, 's2-slipline'),
    words('properties printed', geo.slipLabel, 's2-sub'),
    probe,
    slipBroken,
    slipAnswers,
  ]);
  svg.appendChild(slip);

  /* --- what the slip can and cannot reach --------------------------------- */
  const blockedIn = g('s2-blockedin', [
    arrow(geo.blockedPath, 's2-sight s2-sight--blocked', 's2-head-accent'),
    words('reads the title only', geo.blockedLabel, 's2-sub s2-sub--accent', geo.blockedAnchor),
  ]);
  const blocked = g('s2-blocked', [blockedIn]);
  svg.appendChild(blocked);

  const reads = geo.readsPath ? arrow(geo.readsPath, 's2-sight') : null;
  if (reads) svg.appendChild(reads);

  const fixPath = geo.fixPath ? arrow(geo.fixPath, 's2-sight s2-sight--fix', 's2-head-accent') : null;
  if (fixPath) svg.appendChild(fixPath);

  /* --- the eleven tags ---------------------------------------------------- */
  const tags: SVGGElement[] = TAGS.map((name) => {
    const tag = g('s2-tag', [
      node('rect', { x: 0, y: 0, width: geo.tag.w, height: geo.tag.h, rx: 6, class: 's2-tag__box' }),
      words(name, { x: 10, y: geo.tag.h / 2 + 4.5 }, 's2-tag__t'),
    ]);
    svg.appendChild(tag);
    return tag;
  });

  /* --- handwriting --------------------------------------------------------- */
  const handBrokenIn = g('s2-handin', [
    ...lines(geo.handBrokenText, geo.handBrokenAt, 's2-hand', geo.handBrokenAnchor),
    arrow(geo.handArrow, 's2-sight s2-sight--hand', 's2-head-accent'),
  ]);
  const handBroken = g('s2-hand-broken', [handBrokenIn]);
  const handFixed = g('s2-hand-fixed', lines(geo.handFixedText, geo.handFixedAt, 's2-hand', geo.handFixedAnchor));
  svg.appendChild(handBroken);
  svg.appendChild(handFixed);

  host.appendChild(svg);

  return {
    svg, geo, tags, lines: lineEls, rest,
    line1Mono,
    cartCard, cartGone, notes, groupBox, slip, probe, probeValue,
    slipBroken, slipAnswers, blocked, blockedIn, reads, fixPath,
    handBroken, handBrokenIn, handFixed,
  };
}

/* --------------------------------------------------------- state and drawing */

const state = { lift: 0, fix: 0 };
let scene: Scene | null = null;
let fixTween: gsap.core.Tween | null = null;

function setText(el: Element, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

/* Every position that both scroll and the fix button can change is worked out
   here, from the two numbers in `state`, so the two never fight over a style. */
function render(): void {
  const s = scene;
  if (!s) return;
  const { lift, fix } = state;

  for (let i = 0; i < s.tags.length; i++) {
    const p = smooth(clamp01((lift - i * 0.05) / 0.5));
    const from = s.geo.tagCart[i];
    const held = s.geo.tagGroup[i];
    const onLine = s.geo.tagFixed[i];
    /* they bow on the way over, so eleven tags crossing the same space read as
       a stream rather than a pile */
    const bow = Math.sin(Math.PI * p);
    const mx = lerp(from.x, held.x, p) + s.geo.arc.x * bow;
    const my = lerp(from.y, held.y, p) + s.geo.arc.y * bow;
    gsap.set(s.tags[i], { x: lerp(mx, onLine.x, fix), y: lerp(my, onLine.y, fix) });
    s.tags[i].classList.toggle('s2-tag--on', fix > 0.5);
  }

  const fixed = fix > 0.5;
  setText(s.line1Mono, fixed ? 'p:11' : 'p:0');
  s.line1Mono.classList.toggle('s2-mono--on', fixed);
  setText(s.probeValue, fixed ? '11' : '0');
  s.probe.classList.toggle('s2-probe--on', fixed);

  gsap.set(s.rest, { opacity: 1 - 0.88 * fix });
  gsap.set(s.slipBroken, { opacity: clamp01(1 - fix * 2.2) });
  gsap.set(s.slipAnswers, { opacity: clamp01((fix - 0.45) / 0.45) });
  gsap.set(s.blocked, { opacity: 1 - 0.72 * fix });
  gsap.set(s.handBroken, { opacity: 1 - fix });
  gsap.set(s.handFixed, { opacity: fix });
  if (s.fixPath) gsap.set(s.fixPath, { opacity: clamp01((fix - 0.2) / 0.6) });
}

/* --------------------------------------------------------------- the scrolling */

function attach(s: Scene, trigger: HTMLElement, wide: boolean): gsap.core.Timeline {
  const geo = s.geo;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger,
      start: wide ? 'top 14%' : 'top 82%',
      end: wide ? '+=1100' : 'bottom 32%',
      scrub: wide ? 0.6 : 0.45,
      pin: wide,
      // Pin by transform rather than position:fixed. On this site the diagram
      // sits inside a .card that the reveal animation leaves a transform on,
      // and any transformed ancestor becomes the containing block for a fixed
      // element, which placed the pinned diagram against its own card, off
      // screen. Transform pinning does not care what the ancestors do.
      pinType: 'transform',
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  const cx = geo.cart.x + 12;
  const cy = geo.cart.y + geo.cart.h / 2 - geo.lineH / 2;

  tl.from(s.lines, {
    duration: 1.4,
    opacity: 0,
    scaleY: 0.5,
    transformOrigin: 'left center',
    x: cx - geo.lineX,
    y: (i: number) => cy - geo.lineYs[i],
    stagger: 0.09,
    ease: 'power2.out',
  }, 0.4)
    .to(s.cartCard, { duration: 0.6, opacity: 0.45 }, 0.9)
    .from(s.cartGone, { duration: 0.5, opacity: 0 }, 1.1)
    .from(s.notes, { duration: 0.5, opacity: 0 }, 1.2)
    .from(s.groupBox, { duration: 0.8, opacity: 0, y: -14, ease: 'power2.out' }, 1.9)
    .to(state, { duration: 1.7, lift: 1, onUpdate: render }, 2.1)
    .from(s.slip, {
      duration: 1.1, opacity: 0, x: geo.slipFrom.x, y: geo.slipFrom.y, ease: 'power2.out',
    }, 3.7);

  if (s.reads) tl.from(s.reads, { duration: 0.5, opacity: 0 }, 4.5);
  tl.from(s.blockedIn, { duration: 0.6, opacity: 0 }, 4.7)
    .from(s.probe, { duration: 0.5, opacity: 0, y: 8 }, 5.1)
    .from(s.handBrokenIn, { duration: 0.6, opacity: 0 }, 5.4)
    .to({}, { duration: 0.8 });

  return tl;
}

/* -------------------------------------------------------------------- mount */

export function mountStory2(): void {
  const fig = document.getElementById('story2Diagram');
  if (!fig || fig.dataset.s2 === 'on') return;
  fig.dataset.s2 = 'on';

  const cap = fig.querySelector('figcaption');
  const stage = document.createElement('div');
  stage.className = 's2-stage';

  const alt = document.createElement('p');
  alt.className = 's2-alt';
  alt.textContent = fig.dataset.fallback ?? FALLBACK;

  const said = document.createElement('div');
  said.className = 's2-alt';
  said.setAttribute('role', 'status');

  if (cap) {
    fig.insertBefore(stage, cap);
    fig.insertBefore(alt, cap);
  } else {
    fig.appendChild(stage);
    fig.appendChild(alt);
  }
  fig.appendChild(said);

  gsap.matchMedia().add(
    {
      wide: '(min-width: 760px)',
      narrow: '(max-width: 759.98px)',
      motion: '(prefers-reduced-motion: no-preference)',
    },
    (ctx) => {
      const wide = ctx.conditions?.wide === true;
      const motion = ctx.conditions?.motion === true;

      stage.textContent = '';
      scene = build(stage, wide);
      state.lift = motion ? 0 : 1;
      const tl = motion ? attach(scene, fig, wide) : null;
      render();

      return () => {
        tl?.scrollTrigger?.kill();
        tl?.kill();
        scene = null;
        stage.textContent = '';
      };
    },
  );

  const btn = document.getElementById('story2Fix');
  if (!btn) return;

  let on = false;
  btn.addEventListener('click', () => {
    on = !on;
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Undo the fix' : 'Apply the fix';
    said.textContent = on ? SAID_FIXED : SAID_BROKEN;

    fixTween?.kill();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.fix = on ? 1 : 0;
      render();
      return;
    }
    fixTween = gsap.to(state, {
      fix: on ? 1 : 0,
      duration: 0.7,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onUpdate: render,
    });
  });
}
