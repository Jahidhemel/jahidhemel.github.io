/**
 * A sparkle trail behind the cursor ring.
 *
 * Sparkles are spawned by distance travelled, not by event, because a mouse
 * can fire a hundred pointermove events crossing the screen once and that
 * would be a hundred elements a second. One every 26px gives a steady trail
 * at any speed, and the live count is capped as well.
 *
 * Only transform and opacity are animated, each sparkle is removed the moment
 * it finishes, and the whole thing sits out on touch screens and under
 * prefers-reduced-motion, same as the cursor ring it follows.
 */
import gsap from 'gsap';

const STEP = 26; // px of travel between sparkles
const MAX_LIVE = 18;
const LIFE = 0.72; // seconds

export function mountSparkle(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'sparkles';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  let lastX: number | null = null;
  let lastY: number | null = null;
  let carried = 0;
  let live = 0;

  function spawn(x: number, y: number) {
    if (live >= MAX_LIVE) return;
    live++;

    const el = document.createElement('span');
    el.className = 'sparkle';
    // The second colour every few sparkles, so the trail is not one flat hue.
    if (Math.random() < 0.3) el.classList.add('sparkle--alt');
    layer.appendChild(el);

    const size = 5 + Math.random() * 7;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    gsap.set(el, {
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      scale: 0,
      rotation: Math.random() * 90,
      opacity: 1,
    });

    gsap
      .timeline({
        onComplete: () => {
          el.remove();
          live--;
        },
      })
      .to(el, { scale: 1, duration: LIFE * 0.3, ease: 'back.out(2)' })
      .to(
        el,
        {
          // Drifts up and outward a little as it goes, like it is being left
          // behind rather than falling.
          x: `+=${(Math.random() - 0.5) * 26}`,
          y: `-=${10 + Math.random() * 18}`,
          scale: 0,
          opacity: 0,
          rotation: `+=${(Math.random() - 0.5) * 120}`,
          duration: LIFE * 0.7,
          ease: 'power2.in',
        },
        '>-0.05',
      );
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (lastX === null || lastY === null) {
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      carried += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      if (carried < STEP) return;
      carried = 0;
      spawn(e.clientX, e.clientY);
    },
    { passive: true },
  );
}
