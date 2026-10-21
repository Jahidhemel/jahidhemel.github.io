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

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) =>
  Array.from(r.querySelectorAll<T>(s));

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

// Ping in 3D, over the top of the photograph. Loaded after everything else so
// the page is usable first, and the photograph stays if it cannot run.
if (portrait) {
  void import('./ping3d')
    .then((m) => m.mountPing3d(portrait))
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

/* --------------------------------------------------------------- the marquee */
const rows = $$('.marquee__row');
// Tripled, so the row is wide enough that its ends never come into view while
// it slides. Clones are hidden from assistive tech: the originals already say
// everything, three times over would be noise. They share the originals' src,
// so the browser serves them from cache rather than fetching again.
for (const row of rows) {
  const original = Array.from(row.children);
  for (let pass = 0; pass < 2; pass++) {
    for (const node of original) {
      const copy = node.cloneNode(true) as HTMLElement;
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('img').forEach((i) => i.setAttribute('alt', ''));
      row.appendChild(copy);
    }
  }
}
const marqueeSection = $('.marquee');

/* ------------------------------------------------------------ the card stack */
const cards = $$('.card3');

/* ------------------------------------------------------------- one rAF loop */
let ticking = false;

function frame() {
  ticking = false;
  const vh = window.innerHeight;

  // marquee: offset grows as the section comes up the screen
  if (marqueeSection && rows.length) {
    const top = marqueeSection.getBoundingClientRect().top + window.scrollY;
    const offset = (window.scrollY - top + vh) * 0.3;
    const shift = offset - 200;
    rows[0].style.transform = `translate3d(${shift}px,0,0)`;
    if (rows[1]) rows[1].style.transform = `translate3d(${-shift}px,0,0)`;
  }

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

  // the stack: each card shrinks as the ones after it arrive
  if (cards.length && !reduced) {
    for (let i = 0; i < cards.length; i++) {
      const slot = cards[i].parentElement as HTMLElement;
      const r = slot.getBoundingClientRect();
      const target = 1 - (cards.length - 1 - i) * 0.03;
      // 0 while the card is still coming up, 1 once its slot has fully passed
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      cards[i].style.transform = `scale(${1 - (1 - target) * p})`;
    }
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(frame);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
frame();

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
