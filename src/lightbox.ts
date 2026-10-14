/**
 * A viewer for the Beyond-work photos.
 *
 * It sizes itself to the screen rather than filling it, closes on the cross,
 * on a click outside the picture and on Escape, and steps through the set
 * with the arrows or the arrow keys.
 */
interface Shot {
  src: string;
  alt: string;
  caption: string;
  trigger: HTMLElement;
}

export function mountLightbox(reduced: boolean) {
  const figures = Array.from(document.querySelectorAll<HTMLElement>('.gallery figure'));
  if (!figures.length) return;

  const shots: Shot[] = figures.map((fig) => {
    const img = fig.querySelector('img')!;
    return {
      src: img.currentSrc || img.src,
      alt: img.alt,
      caption: fig.querySelector('figcaption')?.textContent?.trim() ?? '',
      trigger: fig,
    };
  });

  // Each photo becomes a real control, so it can be reached by keyboard.
  figures.forEach((fig, i) => {
    fig.setAttribute('role', 'button');
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('aria-label', `${shots[i].caption || shots[i].alt}. Open the photo`);
    fig.addEventListener('click', () => open(i));
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(i);
      }
    });
  });

  let box: HTMLElement | null = null;
  let imgEl: HTMLImageElement;
  let capEl: HTMLElement;
  let countEl: HTMLElement;
  let current = -1;
  let lastFocus: HTMLElement | null = null;

  function build() {
    box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML = `
      <button class="lb__close" type="button" aria-label="Close the photo">&times;</button>
      <button class="lb__nav lb__nav--prev" type="button" aria-label="Previous photo">&lsaquo;</button>
      <figure class="lb__frame">
        <img alt="" />
        <figcaption><span class="lb__cap"></span><span class="lb__count mono"></span></figcaption>
      </figure>
      <button class="lb__nav lb__nav--next" type="button" aria-label="Next photo">&rsaquo;</button>`;
    document.body.appendChild(box);

    imgEl = box.querySelector('img')!;
    capEl = box.querySelector('.lb__cap')!;
    countEl = box.querySelector('.lb__count')!;

    box.querySelector('.lb__close')!.addEventListener('click', close);
    box.querySelector('.lb__nav--prev')!.addEventListener('click', () => step(-1));
    box.querySelector('.lb__nav--next')!.addEventListener('click', () => step(1));
    // Anywhere that is not the picture or a control closes it.
    box.addEventListener('click', (e) => {
      if (e.target === box) close();
    });
  }

  function show(i: number) {
    const shot = shots[i];
    current = i;
    imgEl.src = shot.src;
    imgEl.alt = shot.alt;
    capEl.textContent = shot.caption;
    countEl.textContent = `${i + 1} of ${shots.length}`;
    if (!reduced) {
      imgEl.animate(
        [{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' },
      );
    }
  }

  function open(i: number) {
    if (!box) build();
    lastFocus = document.activeElement as HTMLElement;
    show(i);
    document.body.style.overflow = 'hidden';
    box!.classList.add('is-open');
    document.addEventListener('keydown', onKey);
    (box!.querySelector('.lb__close') as HTMLElement).focus();
  }

  function close() {
    if (!box) return;
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    // Put the reader back where they were.
    (lastFocus ?? shots[current]?.trigger)?.focus?.();
  }

  function step(by: number) {
    show((current + by + shots.length) % shots.length);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Tab' && box) {
      // Keep the tab ring inside the dialog while it is open.
      const focusables = Array.from(box.querySelectorAll<HTMLElement>('button'));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
}
