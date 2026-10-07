/**
 * The recommendations move past slowly, like a train, and stop when you want
 * to read one. It is a real scroll container, so a thumb can drag it, the
 * keyboard can tab through it, and the arrows work. The loop is seamless
 * because the cards are duplicated once and the position wraps at the halfway
 * mark, where the copy looks identical to the start.
 */
const SPEED = 26;          // pixels a second: slow enough to read a line
const RESUME_AFTER = 2600; // how long to leave it alone after someone touches it

export function mountRecs(reduced: boolean) {
  const root = document.getElementById('recs');
  const track = document.getElementById('recsTrack');
  if (!root || !track) return;

  const originals = Array.from(track.children) as HTMLElement[];
  if (!originals.length) return;
  originals.forEach((el) => el.setAttribute('role', 'listitem'));

  // One duplicate set carries the wrap. It is hidden from screen readers so
  // the same words are not announced twice, and its links are not tab stops.
  originals.forEach((el) => {
    const c = el.cloneNode(true) as HTMLElement;
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('a, button').forEach((n) => n.setAttribute('tabindex', '-1'));
    track.appendChild(c);
  });

  const prev = root.querySelector<HTMLButtonElement>('.recs__btn--prev');
  const next = root.querySelector<HTMLButtonElement>('.recs__btn--next');
  const step = () => (originals[0]?.getBoundingClientRect().width ?? 400) + 18;

  // Half the track is one full set of cards, so wrapping there is invisible.
  const half = () => track.scrollWidth / 2;

  if (reduced) {
    // No drifting. It stays a plain row that can be scrolled by hand.
    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    return;
  }

  // The drift is kept in a float here rather than read back from scrollLeft:
  // a fraction of a pixel a frame gets rounded away if it is written straight
  // to the element, and the strip never moves.
  let pos = 0;
  let mine = false;
  let paused = false;
  let holdUntil = 0;
  let onScreen = true;
  let last = performance.now();

  const hold = (ms = RESUME_AFTER) => { holdUntil = performance.now() + ms; };

  track.addEventListener('scroll', () => {
    // If the scroll came from a hand rather than from the loop, follow it.
    if (mine) mine = false;
    else pos = track.scrollLeft;
    const h = half();
    if (h > 0 && pos >= h) { pos -= h; mine = true; track.scrollLeft = pos; }
  }, { passive: true });

  prev?.addEventListener('click', () => { hold(); track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  next?.addEventListener('click', () => { hold(); track.scrollBy({ left: step(), behavior: 'smooth' }); });

  root.addEventListener('pointerenter', () => { paused = true; });
  root.addEventListener('pointerleave', () => { paused = false; });
  root.addEventListener('focusin', () => { paused = true; });
  root.addEventListener('focusout', () => { paused = false; });
  // A drag or a wheel means somebody is reading. Leave it still for a moment.
  track.addEventListener('touchstart', () => hold(), { passive: true });
  track.addEventListener('touchmove', () => hold(), { passive: true });
  track.addEventListener('wheel', () => hold(), { passive: true });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  new IntersectionObserver(
    ([e]) => { onScreen = e.isIntersecting; last = performance.now(); },
    { threshold: 0.02 },
  ).observe(root);

  let raf = requestAnimationFrame(function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (onScreen && !paused && !document.hidden && now > holdUntil) {
      const h = half();
      pos += SPEED * dt;
      if (h > 0 && pos >= h) pos -= h;
      mine = true;
      track.scrollLeft = pos;
    }
    raf = requestAnimationFrame(tick);
  });

  window.addEventListener('pagehide', () => cancelAnimationFrame(raf));
}
