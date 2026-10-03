/**
 * The delivery intro: Ping flies in and beams each hero element into place,
 * one at a time, with a line for each. Skippable (button, scroll, or key),
 * plays once per session, and never runs under prefers-reduced-motion.
 */
import gsap from 'gsap';
import type { Guide } from './guide';

const KEY = 'ping-intro-done';

export function shouldRunIntro(reduced: boolean): boolean {
  if (reduced) return false;
  try {
    if (sessionStorage.getItem(KEY) === '1') return false;
    if (sessionStorage.getItem('ping-dismissed') === '1') return false;
  } catch { /* ignore */ }
  return window.innerWidth >= 480 && window.innerHeight >= 520;
}

export function revealHeroInstantly(items: HTMLElement[]) {
  gsap.set(items, { opacity: 1, x: 0, y: 0, scale: 1, filter: 'none', clearProps: 'filter' });
}

export async function runIntro(guide: Guide, items: HTMLElement[], onDone: () => void) {
  const skipBtn = document.getElementById('skipIntro') as HTMLButtonElement | null;
  let skipped = false;
  const finish = () => {
    if (skipped) return;
    skipped = true;
    gsap.killTweensOf(items);
    revealHeroInstantly(items);
    skipBtn?.setAttribute('hidden', '');
    window.removeEventListener('wheel', onScrollSkip);
    window.removeEventListener('touchmove', onScrollSkip);
    window.removeEventListener('keydown', onKey);
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    guide.lock(false);
    guide.goHome();
    onDone();
  };
  const onScrollSkip = () => finish();
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };

  // Hide everything Ping will deliver.
  gsap.set(items, { opacity: 0, scale: 0.6, filter: 'blur(10px)' });
  guide.lock(true);

  skipBtn?.removeAttribute('hidden');
  skipBtn?.addEventListener('click', finish, { once: true });
  window.addEventListener('wheel', onScrollSkip, { passive: true });
  window.addEventListener('touchmove', onScrollSkip, { passive: true });
  window.addEventListener('keydown', onKey);

  const guideEl = document.querySelector<HTMLElement>('.guide')!;
  const { w: gw, h: gh } = guide.size;
  const vw = window.innerWidth, vh = window.innerHeight;

  // Entrance: rise from below the fold, centre screen.
  guideEl.classList.remove('is-left', 'is-right');
  gsap.set(guideEl, { x: vw / 2 - gw / 2, y: vh + 40, opacity: 1 });
  await guide.flyTo(vw / 2 - gw / 2, vh * 0.42, 0.9);
  if (skipped) return;
  guide.wave();
  guide.say("Hi, I'm Ping. Give me a second, I'll set the page up.", 2200);
  await wait(1500);

  for (const item of items) {
    if (skipped) return;
    // Measure the element's real place (it is hidden at scale .6 right now).
    const prevTransform = item.style.transform;
    item.style.transform = 'none';
    const r = item.getBoundingClientRect();
    item.style.transform = prevTransform;
    const onScreen = r.top < vh - 40 && r.bottom > 40;
    if (onScreen) {
      // Hover beside the element: to its left if there's room, else above it.
      const left = r.left - gw - 6;
      const beside = left >= 2;
      const px = beside ? left : Math.min(vw - gw - 8, Math.max(8, r.left));
      const py = beside ? gsap.utils.clamp(70, vh - gh - 8, r.top + r.height / 2 - gh * 0.55) : Math.max(70, r.top - gh - 10);
      const dist = Math.hypot(px - (gsap.getProperty(guideEl, 'x') as number), py - (gsap.getProperty(guideEl, 'y') as number));
      guideEl.classList.toggle('is-left', px < vw / 2);
      guideEl.classList.toggle('is-right', px >= vw / 2);
      await guide.flyTo(px, py, gsap.utils.clamp(0.32, 0.6, dist / 1200));
      if (skipped) return;
      guide.say(item.dataset.deliver || '', 1400);
      guide.pulse();
      // The element materialises out of Ping's position.
      const gx = px + gw / 2 - (r.left + r.width / 2);
      const gy = py + gh * 0.5 - (r.top + r.height / 2);
      await tween(item, { x: gx * 0.6, y: gy * 0.6, scale: 0.6, opacity: 0, filter: 'blur(10px)' }, { x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'back.out(1.4)' });
      await wait(140);
    } else {
      // Below the fold: just fade in, no flight.
      gsap.to(item, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.5 });
    }
  }
  if (skipped) return;
  gsap.set(items, { clearProps: 'filter,transform' });
  await guide.flyTo(vw - gw - 14, vh - gh - 12, 0.9);
  if (skipped) return;
  guide.wave();
  skipped = true; // sequence complete; finish() becomes a no-op
  skipBtn?.setAttribute('hidden', '');
  window.removeEventListener('wheel', onScrollSkip);
  window.removeEventListener('touchmove', onScrollSkip);
  window.removeEventListener('keydown', onKey);
  try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  guide.lock(false);
  guide.goHome();
  guide.say("Done. Scroll down, I'll come with you. 👋", 5000);
  onDone();
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const tween = (el: Element, from: gsap.TweenVars, to: gsap.TweenVars) =>
  new Promise<void>((resolve) => gsap.fromTo(el, from, { ...to, onComplete: resolve }));
