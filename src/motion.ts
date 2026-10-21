/**
 * The motion build's behaviour.
 *
 * Five pieces, all of them scroll or pointer driven:
 *   fadeIn      elements arrive once, then the class comes off
 *   magnet      the portrait leans towards the cursor
 *   marquee     two rows that slide opposite ways with the page scroll
 *   readReveal  the about paragraph lights up a character at a time
 *   stack       project cards pin and scale down as the next one covers them
 *
 * No animation library. Everything here is transform and opacity, written
 * from a single rAF loop driven by scroll, so the whole page is one handler
 * rather than one per effect.
 */
import './motion.css';
import { mountReel } from './reel';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) =>
  Array.from(r.querySelectorAll<T>(s));

/* ------------------------------------------------------------ the photo reel */
mountReel(reduced);

/* ----------------------------------------------------------------- fade in */
// IntersectionObserver rather than a scroll handler: the browser does the
// hit testing, and each element is unobserved the moment it has played.
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
      // Drop the class once the transition is done, so nothing is left with a
      // transform. A transformed ancestor becomes the containing block for a
      // sticky or fixed child, and the project cards below are sticky.
      window.setTimeout(() => e.target.classList.remove('fade', 'is-in'), 1400);
    }
  },
  { rootMargin: '0px 0px -50px 0px', threshold: 0 },
);
$$('.fade').forEach((el) => io.observe(el));

/* ------------------------------------------------------------ the headline */
// The reference pins the headline at 17.5vw, which only fits because the name
// is "jack". Measure it and scale to the width instead, so it fills the line
// edge to edge whatever the name and whatever the viewport.
const h1 = $('.hero__headline h1');
function fitHeadline() {
  if (!h1 || !h1.parentElement) return;
  h1.style.fontSize = '';
  const available = h1.parentElement.clientWidth;
  const current = parseFloat(getComputedStyle(h1).fontSize);
  const natural = h1.scrollWidth;
  if (!natural || !available) return;
  h1.style.fontSize = `${Math.floor(current * (available / natural) * 0.985)}px`;
}
fitHeadline();
// Again once Kanit has actually loaded: measured against the fallback the
// answer is wrong, and the headline is the first thing anyone sees.
if (document.fonts?.ready) void document.fonts.ready.then(fitHeadline);
window.addEventListener('resize', fitHeadline, { passive: true });

/* ------------------------------------------------------------- the portrait */
function magnet(host: HTMLElement, padding = 150, strength = 3) {
  if (reduced) return;
  const inner = $('.magnet', host);
  if (!inner) return;
  let active = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      // Once the model is up it owns the pointer: it has its own drag, and
      // two things leaning the same element in different directions is one
      // too many. It also leaves the hidden photograph where it belongs.
      if (host.classList.contains('is-3d')) {
        if (inner.style.transform) inner.style.transform = '';
        return;
      }
      const r = host.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const near =
        e.clientX > r.left - padding &&
        e.clientX < r.right + padding &&
        e.clientY > r.top - padding &&
        e.clientY < r.bottom + padding;

      if (near) {
        if (!active) {
          active = true;
          inner.style.transition = 'transform 0.3s ease-out';
        }
        inner.style.transform = `translate3d(${(e.clientX - cx) / strength}px, ${(e.clientY - cy) / strength}px, 0)`;
      } else if (active) {
        active = false;
        inner.style.transition = 'transform 0.6s ease-in-out';
        inner.style.transform = 'translate3d(0,0,0)';
      }
    },
    { passive: true },
  );
}
const portrait = $('.hero__portrait');
if (portrait) magnet(portrait);

// The hero model, and Ping seeing you out at the end. Both are loaded after
// everything else so the page is usable first, and the hero's photograph
// stays put if WebGL is missing or the chunk fails.
const slots = $$('[data-model]');
if (slots.length) {
  void import('./model3d')
    .then(({ mountModel }) => {
      for (const slot of slots) {
        const url = slot.dataset.model!;
        const isHero = slot.classList.contains('hero__portrait');
        const isFace = url.includes('hemel');
        void mountModel(slot, {
          url,
          drag: isHero,
          camera: isHero ? [0, 1.18, 5.9] : [0, 1.0, 6.6],
          lookAt: isHero ? [0, 0.92, 0] : [0, 0.75, 0],
          rim: isFace ? [0x8fb6d6, 0.85] : [0x22d3ee, 1.8],
          fill: isFace ? 0.6 : 0,
        });
      }
    })
    .catch(() => {
      /* no WebGL, or the chunk failed. The photograph is already there. */
    });
}

/* ------------------------------------------------- the about paragraph text */
// Split once into spans; the scroll loop only writes opacity after that.
const copy = $('.about__copy');
let letters: HTMLElement[] = [];
if (copy) {
  const text = copy.textContent ?? '';
  copy.textContent = '';
  for (const ch of text) {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.opacity = reduced ? '1' : '0.2';
    copy.appendChild(s);
    letters.push(s);
  }
}

/* ------------------------------------------------------------ the card stack */
const cards = $$('.card3');
// Read once: these come from CSS and asking for them every frame is a forced
// layout on every scroll.
const pinnedTops = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0);

/* -------------------------------------------------- the experience rail ---- */
const railList = $('.rail__list');
const railFill = $('.rail__line i');
const roles = $$('.role');

/* -------------------------------------- opening a story moves everything --- */
// Positions are read from the layout on every frame, so a disclosure opening
// needs no special handling beyond a repaint on the next scroll.
$$('details.more').forEach((d) => d.addEventListener('toggle', () => frame(performance.now())));


/* ----------------------------------------------------- the arriving edge -- */
// Both edges are built as a polygon across the top of the card: a handful of
// points along the top, then down the right side and back. Amplitude falls to
// nothing as the card settles, so the shape is only there while it moves.
const STEPS = 22;

/** A travelling sine: the card comes in under water. */
function wave(arrive: number, now: number): string {
  const amp = (1 - arrive) * 58;
  const phase = (now / 1000) * 1.7;
  const pts: string[] = [];
  for (let k = 0; k <= STEPS; k++) {
    const u = k / STEPS;
    // Two frequencies, so the crest is not a single clean hump.
    const h = Math.sin(phase + u * Math.PI * 3) * 0.65 + Math.sin(phase * 1.4 + u * Math.PI * 5) * 0.35;
    pts.push(`${(u * 100).toFixed(2)}% ${(amp * (0.55 + 0.45 * h)).toFixed(1)}px`);
  }
  return `polygon(${pts.join(',')},100% 100%,0% 100%)`;
}

/** Parts from the middle outwards, like something being unzipped. */
function part(arrive: number, now: number): string {
  const amp = (1 - arrive) * 120;
  const phase = (now / 1000) * 1.3;
  const open = arrive; // how much of the width has opened
  const pts: string[] = [];
  for (let k = 0; k <= STEPS; k++) {
    const u = k / STEPS;
    const fromCentre = Math.abs(u - 0.5) * 2; // 0 middle, 1 edges
    // Closed beyond the opening, and eased rather than cut square.
    const shut = Math.max(0, Math.min(1, (fromCentre - open) / 0.45));
    const ripple = 0.85 + 0.15 * Math.sin(phase + u * Math.PI * 6);
    pts.push(`${(u * 100).toFixed(2)}% ${(amp * shut * shut * ripple).toFixed(1)}px`);
  }
  return `polygon(${pts.join(',')},100% 100%,0% 100%)`;
}

/* ------------------------------------------------------------- one rAF loop */
// Continuous rather than scroll-triggered: the wave on an arriving card has
// to keep moving while you are reading, not freeze the moment you stop
// scrolling. It idles when the projects are off screen.
let stackVisible = false;

function frame(now: number) {
  const vh = window.innerHeight;

  // the paragraph, a character at a time
  if (copy && letters.length && !reduced) {
    const r = copy.getBoundingClientRect();
    // 'start 0.8' to 'end 0.2': from the text reaching 80% down the screen
    // until its end passes 20% down.
    const total = r.height + vh * 0.6;
    const travelled = vh * 0.8 - r.top;
    const progress = Math.min(1, Math.max(0, travelled / total));
    const lit = progress * letters.length;
    for (let i = 0; i < letters.length; i++) {
      letters[i].style.opacity = String(i < lit ? 1 : 0.2);
    }
  }

  // the experience rail draws itself, and each role lights as it is reached
  if (railList && railFill) {
    const r = railList.getBoundingClientRect();
    const p = (vh * 0.72 - r.top) / Math.max(1, r.height);
    railFill.style.setProperty('--draw', String(Math.min(1, Math.max(0, p))));
    for (const role of roles) {
      const rr = role.getBoundingClientRect();
      role.classList.toggle('lit', rr.top < vh * 0.74);
    }
  }

  // The stack. Each card shrinks as the ones after it arrive, and each
  // arriving card comes in under a wave: its top edge is a moving sine that
  // flattens as it settles, with a tilt out of the page that flattens with
  // it. The last one parts from the middle outwards instead, so the three
  // do not all do the same thing.
  if (cards.length && !reduced && stackVisible) {
    // Every card arrives under a wave, including the first.
    //
    // An earlier version measured arrival across the overlap only — the
    // stretch where the previous card is still pinned. That is honest about
    // the stacking but it is barely 250px, so the wave flashed past and was
    // effectively gone. Measured across the card's whole approach it is
    // visible for most of a screen, which is the point of it.
    const arrived = cards.map((c, i) => {
      const slot = (c.parentElement as HTMLElement).getBoundingClientRect();
      return Math.min(1, Math.max(0, (vh - slot.top) / Math.max(1, vh - pinnedTops[i])));
    });

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const arrive = arrived[i];
      const sink = i + 1 < cards.length ? arrived[i + 1] : 0;

      card.style.setProperty('--arrive', String(arrive));
      card.style.setProperty('--sink', String(sink));

      // It holds where it is pinned and goes down, rather than sliding away.
      const tilt = (1 - arrive) * 7 - sink * 3;
      const scale = 1 - sink * 0.055;
      const drop = sink * 16;
      card.style.transform =
        `perspective(1600px) translateY(${drop.toFixed(1)}px) rotateX(${tilt.toFixed(2)}deg) scale(${scale.toFixed(4)})`;

      if (arrive > 0.995) {
        card.style.clipPath = '';
        continue;
      }
      // The last one parts from the middle outwards, so the set does not all
      // do the same thing.
      card.style.clipPath = i === cards.length - 1
        ? part(arrive, now)
        : wave(arrive, now);
    }
  }
}

function loop(now: number) {
  frame(now);
  requestAnimationFrame(loop);
}

const stack = $('.stack');
if (stack) {
  new IntersectionObserver((entries) => {
    stackVisible = entries.some((e) => e.isIntersecting);
  }).observe(stack);
}

window.addEventListener('scroll', () => frame(performance.now()), { passive: true });
window.addEventListener('resize', () => frame(performance.now()), { passive: true });
requestAnimationFrame(loop);

/* ---------------------------------------------------------------- nav links */
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href') ?? '';
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });
});

/* ------------------------------------------------------------------ the year */
const year = $('#year');
if (year) year.textContent = String(new Date().getFullYear());
