/**
 * The scrolling bands: the snippets line, and the photo reel.
 *
 * One implementation drives both. A row drifts on its own, is pushed along by
 * the page scroll on top of that, and stops while the pointer is over it —
 * which is not only a nice touch. A drifting target cannot be clicked, so
 * without the hold nothing in either band is reachable.
 *
 * Tiles come in two kinds. A <button> carrying data-full opens the picture
 * large; an <a> is just a link and is left alone. The photo band uses the
 * first, the snippets line the second.
 *
 * Opening and closing a picture is one FLIP with a rotateY sweep: the big
 * image is laid out at its final size, transformed back onto the card it came
 * from, and released. Closing measures the card AGAIN rather than reusing the
 * rect from the open, because the row has drifted and very likely been
 * scrolled since, and animating to where a card used to be looks worse than
 * not animating at all.
 */

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

interface Row {
  el: HTMLElement;
  dir: number;
  speed: number;
  /** Width of one unbroken set of tiles, before the clones. */
  span: number;
  offset: number;
  held: boolean;
  visible: boolean;
}

export function mountReel(reduced: boolean): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.reel'));
  if (!sections.length) return;

  const rows: Row[] = [];

  for (const section of sections) {
    const speed = Number(section.dataset.speed) || 26; // px per second
    const mine: Row[] = [];

    for (const el of Array.from(section.querySelectorAll<HTMLElement>('.reel__row'))) {
      const originals = Array.from(el.children) as HTMLElement[];
      if (!originals.length) continue;

      let span = 0;
      for (const t of originals) span += t.getBoundingClientRect().width + 14;

      // Enough copies that the row is always wider than the window, so the
      // join never comes into view.
      const need = Math.ceil((window.innerWidth * 2) / Math.max(1, span)) + 1;
      for (let i = 0; i < need; i++) {
        for (const t of originals) {
          const copy = t.cloneNode(true) as HTMLElement;
          copy.setAttribute('aria-hidden', 'true');
          copy.tabIndex = -1;
          el.appendChild(copy);
        }
      }

      const row: Row = { el, dir: Number(el.dataset.dir) || 1, speed, span, offset: 0, held: false, visible: true };
      el.addEventListener('pointerenter', () => { row.held = true; });
      el.addEventListener('pointerleave', () => { row.held = false; });
      rows.push(row);
      mine.push(row);
    }

    const io = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting);
      for (const r of mine) r.visible = on;
    });
    io.observe(section);
  }

  if (!rows.length) return;

  /* ------------------------------------------------------------- the lightbox */

  let open: { wrap: HTMLElement; img: HTMLImageElement; source: HTMLElement } | null = null;

  /** The transform that puts an element laid out at `to` on top of `from`. */
  function flip(from: DOMRect, to: DOMRect, tilt: number) {
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return `perspective(1400px) translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy}) rotateY(${tilt}deg)`;
  }

  function openTile(tile: HTMLElement) {
    if (open) return;
    const sourceImg = tile.querySelector('img');
    if (!sourceImg) return;

    const wrap = document.createElement('div');
    wrap.className = 'lb';
    wrap.innerHTML = '<div class="lb__veil"></div>';

    const img = document.createElement('img');
    img.className = 'lb__img';
    img.alt = sourceImg.alt;
    img.src = sourceImg.currentSrc || sourceImg.src; // already decoded: no flash
    wrap.appendChild(img);

    const close = document.createElement('button');
    close.className = 'lb__x';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    wrap.appendChild(close);

    document.body.appendChild(wrap);

    const from = sourceImg.getBoundingClientRect();
    const to = img.getBoundingClientRect();

    if (reduced) {
      wrap.classList.add('is-open');
    } else {
      img.style.transform = flip(from, to, -16);
      img.style.opacity = '0.6';
      // Next frame, so the start state is painted before the transition.
      requestAnimationFrame(() => {
        img.style.transition = `transform .62s ${EASE}, opacity .3s linear`;
        img.style.transform = 'perspective(1400px) translate3d(0,0,0) scale(1) rotateY(0deg)';
        img.style.opacity = '1';
        wrap.classList.add('is-open');
      });
    }

    // Swap in the larger file once it is ready. Same picture, so the only
    // visible change is that it sharpens.
    const full = tile.dataset.full;
    if (full) {
      const pre = new Image();
      pre.onload = () => { img.src = full; };
      pre.src = full;
    }

    open = { wrap, img, source: sourceImg };
    close.addEventListener('click', closeTile);
    wrap.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === wrap || t.classList.contains('lb__veil')) closeTile();
    });
    close.focus();
  }

  function closeTile() {
    if (!open) return;
    const { wrap, img, source } = open;
    open = null;

    const finish = () => wrap.remove();
    if (reduced) { finish(); return; }

    // Measure the card now, not when it opened: the row has drifted since.
    const from = source.getBoundingClientRect();
    const to = img.getBoundingClientRect();
    wrap.classList.remove('is-open');
    img.style.transition = `transform .5s ${EASE}, opacity .4s linear`;
    img.style.transform = flip(from, to, 12);
    img.style.opacity = '0';
    window.setTimeout(finish, 520);
  }

  for (const section of sections) {
    section.addEventListener('click', (e) => {
      // Only buttons carrying a larger file open. Links are left to navigate.
      const tile = (e.target as HTMLElement).closest<HTMLElement>('.reel__tile[data-full]');
      if (tile) openTile(tile);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) closeTile();
  });

  // Scrolling with one open sends it back to its card, which is why the close
  // re-measures: by the time this runs the card has already moved.
  window.addEventListener('scroll', () => { if (open) closeTile(); }, { passive: true });

  /* ----------------------------------------------------------------- the loop */

  let last = performance.now();
  let lastScroll = window.scrollY;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const sy = window.scrollY;
    const pushed = sy - lastScroll;
    lastScroll = sy;

    for (const row of rows) {
      if (!row.visible) continue;
      // The page scroll pushes every row whether or not it is held: that is
      // the reader's own movement, not the band's.
      row.offset += pushed * 0.45 * row.dir;
      if (!row.held && !open && !reduced) row.offset += row.speed * dt * row.dir;

      // Wrap inside one set so the transform never grows without bound.
      if (row.span > 0) {
        while (row.offset <= -row.span) row.offset += row.span;
        while (row.offset > 0) row.offset -= row.span;
      }
      row.el.style.transform = `translate3d(${row.offset}px,0,0)`;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
