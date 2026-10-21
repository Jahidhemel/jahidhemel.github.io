/**
 * The photo reel.
 *
 * Two rows that drift in opposite directions on their own, and are pushed
 * along by the page scroll on top of that. Holding the pointer over a row
 * stops its drift; moving away starts it again. Clicking a photograph opens
 * it large, and the drift holds while it is open.
 *
 * The open and close are one FLIP: the big image is laid out at its final
 * size, then transformed back onto the card it came from and released. Only
 * transform and opacity are animated. On the way back it measures the card
 * AGAIN rather than reusing the rect from the open, because the row has very
 * likely drifted — or been scrolled — in between, and animating to where the
 * card used to be is worse than not animating at all.
 */

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DRIFT = 26; // px per second

interface Row {
  el: HTMLElement;
  dir: number;
  /** Width of one unbroken set of tiles, before the clones. */
  span: number;
  offset: number;
  held: boolean;
}

export function mountReel(reduced: boolean): void {
  const section = document.querySelector<HTMLElement>('.reel');
  if (!section) return;

  const rows: Row[] = [];

  for (const el of Array.from(section.querySelectorAll<HTMLElement>('.reel__row'))) {
    const originals = Array.from(el.children) as HTMLElement[];
    if (!originals.length) continue;

    // Enough copies that the row is always wider than the window, so the join
    // never comes into view.
    let span = 0;
    for (const t of originals) span += t.getBoundingClientRect().width + 14;
    const need = Math.ceil((window.innerWidth * 2) / Math.max(1, span)) + 1;
    for (let i = 0; i < need; i++) {
      for (const t of originals) {
        const copy = t.cloneNode(true) as HTMLElement;
        copy.setAttribute('aria-hidden', 'true');
        copy.tabIndex = -1;
        el.appendChild(copy);
      }
    }

    const row: Row = { el, dir: Number(el.dataset.dir) || 1, span, offset: 0, held: false };
    el.addEventListener('pointerenter', () => { row.held = true; });
    el.addEventListener('pointerleave', () => { row.held = false; });
    rows.push(row);
  }

  if (!rows.length) return;

  /* ------------------------------------------------------------- the lightbox */

  let open: { wrap: HTMLElement; img: HTMLImageElement; source: HTMLElement } | null = null;

  function rectOf(el: HTMLElement) {
    return el.getBoundingClientRect();
  }

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
    document.body.classList.add('has-lb');

    const from = rectOf(sourceImg);
    const to = rectOf(img);

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
    wrap.addEventListener('click', (e) => { if (e.target === wrap || (e.target as HTMLElement).classList.contains('lb__veil')) closeTile(); });
    close.focus();
  }

  function closeTile() {
    if (!open) return;
    const { wrap, img, source } = open;
    open = null;
    document.body.classList.remove('has-lb');

    const finish = () => { wrap.remove(); };

    if (reduced) { finish(); return; }

    // Measure the card now, not when it opened: the row has drifted since.
    const from = rectOf(source);
    const to = rectOf(img);
    wrap.classList.remove('is-open');
    img.style.transition = `transform .5s ${EASE}, opacity .4s linear`;
    img.style.transform = flip(from, to, 12);
    img.style.opacity = '0';
    window.setTimeout(finish, 520);
  }

  section.addEventListener('click', (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('.reel__tile');
    if (tile) openTile(tile);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) closeTile();
  });

  // Scrolling with one open sends it back to its card, which is why the close
  // re-measures: by the time this runs the card has already moved.
  window.addEventListener('scroll', () => { if (open) closeTile(); }, { passive: true });

  /* ----------------------------------------------------------------- the loop */

  let last = performance.now();
  let lastScroll = window.scrollY;
  let visible = true;
  let raf = 0;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const sy = window.scrollY;
    const pushed = sy - lastScroll;
    lastScroll = sy;

    for (const row of rows) {
      // The page scroll pushes every row whether or not it is held: that is
      // the reader's own movement, not the reel's.
      row.offset += pushed * 0.45 * row.dir;
      if (!row.held && !open && !reduced) row.offset += DRIFT * dt * row.dir;

      // Wrap inside one set so the transform never grows without bound.
      if (row.span > 0) {
        while (row.offset <= -row.span) row.offset += row.span;
        while (row.offset > 0) row.offset -= row.span;
      }
      row.el.style.transform = `translate3d(${row.offset}px,0,0)`;
    }

    raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((en) => en.isIntersecting);
    if (visible && !raf) {
      last = performance.now();
      lastScroll = window.scrollY;
      raf = requestAnimationFrame(frame);
    } else if (!visible && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
  io.observe(section);

  raf = requestAnimationFrame(frame);
}
