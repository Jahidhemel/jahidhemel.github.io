/**
 * Pointer-driven 3D tilt.
 *
 * Everything here is transform and opacity only, so it stays on the GPU and
 * never moves the layout. It is off on touch, where there is no cursor to
 * follow, and off under prefers-reduced-motion.
 */
import gsap from 'gsap';

interface Layer {
  el: HTMLElement;
  /** How far in front of the card this sits. Bigger means more parallax. */
  depth: number;
}

interface Options {
  /** Degrees of rotation at the far edge. */
  max?: number;
  perspective?: number;
  lift?: number;
  scale?: number;
  layers?: Layer[];
  /** A moving highlight that follows the cursor. */
  sheen?: boolean;
  /** The area the pointer is tracked over. Defaults to the card itself. */
  zone?: HTMLElement;
}

export const canTilt = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountTilt(card: HTMLElement, opts: Options = {}) {
  const { max = 7, perspective = 1100, lift = 6, scale = 1.012, layers = [], sheen = false } = opts;
  const zone = opts.zone ?? card;

  card.classList.add('is-tilt');
  // will-change is applied only while the card is actually moving: holding a
  // compositor layer for every card at once costs more than it saves.
  gsap.set(card, { transformPerspective: perspective, transformStyle: 'preserve-3d' });
  layers.forEach((l) => gsap.set(l.el, { z: l.depth, transformStyle: 'preserve-3d' }));

  let sheenEl: HTMLElement | null = null;
  if (sheen) {
    sheenEl = document.createElement('i');
    sheenEl.className = 'tilt__sheen';
    sheenEl.setAttribute('aria-hidden', 'true');
    card.appendChild(sheenEl);
  }

  const d = { duration: 0.55, ease: 'power3.out' } as const;
  const rx = gsap.quickTo(card, 'rotationX', d);
  const ry = gsap.quickTo(card, 'rotationY', d);
  const ty = gsap.quickTo(card, 'y', d);
  const sc = gsap.quickTo(card, 'scale', d);
  // Each layer drifts a little against the card, which is what sells the depth.
  const lx = layers.map((l) => gsap.quickTo(l.el, 'x', { duration: 0.7, ease: 'power3.out' }));
  const ly = layers.map((l) => gsap.quickTo(l.el, 'y', { duration: 0.7, ease: 'power3.out' }));

  let inside = false;

  // Measuring on every pointer event forces a layout each time, which is what
  // makes a tilt feel expensive. Measure once, reuse it, and throw it away
  // when the page moves. Updates are also coalesced to one a frame.
  let zoneRect: DOMRect | null = null;
  let cardRect: DOMRect | null = null;
  const invalidate = () => { zoneRect = null; cardRect = null; };

  let queued: { x: number; y: number } | null = null;
  let frame = 0;

  const apply = () => {
    frame = 0;
    const p = queued;
    if (!p) return;
    if (!zoneRect) zoneRect = zone.getBoundingClientRect();
    if (sheenEl && !cardRect) cardRect = card.getBoundingClientRect();
    const r = zoneRect;
    if (!r.width || !r.height) return;

    // -0.5 at one edge, +0.5 at the other
    const px = gsap.utils.clamp(-0.5, 0.5, (p.x - r.left) / r.width - 0.5);
    const py = gsap.utils.clamp(-0.5, 0.5, (p.y - r.top) / r.height - 0.5);

    ry(px * max * 2);
    rx(-py * max * 2);
    layers.forEach((l, i) => {
      lx[i](px * l.depth * 0.34);
      ly[i](py * l.depth * 0.34);
    });
    if (sheenEl && cardRect) {
      sheenEl.style.setProperty('--sx', `${((p.x - cardRect.left) / cardRect.width) * 100}%`);
      sheenEl.style.setProperty('--sy', `${((p.y - cardRect.top) / cardRect.height) * 100}%`);
    }
    if (!inside) {
      inside = true;
      ty(-lift);
      sc(scale);
      card.classList.add('is-tilting');
    }
  };

  const onMove = (e: PointerEvent) => {
    queued = { x: e.clientX, y: e.clientY };
    if (!frame) frame = requestAnimationFrame(apply);
  };

  const onLeave = () => {
    inside = false;
    queued = null;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    rx(0); ry(0); ty(0); sc(1);
    layers.forEach((_, i) => { lx[i](0); ly[i](0); });
    card.classList.remove('is-tilting');
  };

  zone.addEventListener('pointermove', onMove, { passive: true });
  zone.addEventListener('pointerleave', onLeave);
  // A card that scrolls out from under a stationary cursor must settle back.
  window.addEventListener('blur', onLeave);
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', invalidate, { passive: true });

  return () => {
    zone.removeEventListener('pointermove', onMove);
    zone.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    window.removeEventListener('scroll', invalidate);
    window.removeEventListener('resize', invalidate);
    if (frame) cancelAnimationFrame(frame);
    sheenEl?.remove();
    gsap.set(card, { clearProps: 'transform' });
    card.classList.remove('is-tilt', 'is-tilting');
  };
}
