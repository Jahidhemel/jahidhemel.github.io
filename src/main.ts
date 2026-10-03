import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { mountCodeBg } from './codebg';
import { mountGuide } from './guide';
import { runIntro, shouldRunIntro, revealHeroInstantly } from './intro';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

/* ---------------- smooth scroll ---------------- */
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollTo(target: string) {
  const el = document.querySelector(target);
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -20, duration: 1.2 });
  else el.scrollIntoView({ behavior: 'smooth' });
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href')!;
    if (href.length < 2) return;
    e.preventDefault();
    scrollTo(href);
    history.replaceState(null, '', href);
    navLinks?.classList.remove('is-open');
    burger?.setAttribute('aria-expanded', 'false');
  });
});

/* ---------------- nav ---------------- */
const nav = $('#nav');
const navLinks = $('#navLinks');
const burger = $('#navBurger');
burger?.addEventListener('click', () => {
  const open = navLinks!.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
ScrollTrigger.create({ start: 40, onUpdate: (st) => nav?.classList.toggle('is-scrolled', st.scroll() > 40) });

/* ---------------- guide + section tracking ---------------- */
const intro = shouldRunIntro(reduced);
const guide = mountGuide($('#guideRoot')!, { reduced, intro });
$$('[data-section]').forEach((sec) => {
  const id = sec.dataset.section!;
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 55%',
    end: 'bottom 55%',
    onEnter: () => activate(id),
    onEnterBack: () => activate(id),
  });
});
function activate(id: string) {
  guide.setSection(id);
  $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === id));
}
if (lenis) lenis.on('scroll', ({ velocity }) => guide.setVelocity(velocity));

/* ---------------- intro gate ---------------- */
// Things that type/count in the hero wait until Ping has delivered the hero
// (or immediately when the intro doesn't run).
const heroReadyQueue: Array<() => void> = [];
let heroReady = false;
function onHeroReady(fn: () => void) { heroReady ? fn() : heroReadyQueue.push(fn); }
function markHeroReady() {
  if (heroReady) return;
  heroReady = true;
  document.documentElement.classList.remove('intro');
  heroReadyQueue.splice(0).forEach((fn) => fn());
}
const deliverables = $$('[data-deliver]');
if (intro) {
  window.addEventListener('load', () => runIntro(guide, deliverables, markHeroReady), { once: true });
} else {
  revealHeroInstantly(deliverables);
  markHeroReady();
}

/* ---------------- hero: split name ---------------- */
const splits = $$('.hero__line .split');
if (reduced || intro) gsap.set(splits, { y: 0 });
else {
  gsap.set(splits, { yPercent: 110 });
  gsap.to(splits, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.15 });
}

/* ---------------- typewriter ---------------- */
const phrases = [
  'I turn support tickets into happy customers.',
  'I help SaaS merchants adopt and succeed.',
  'I reproduce before I guess.',
  'I lead the team that keeps customers happy.',
];
const tw = $('#typewriter');
if (tw) {
  if (reduced) tw.textContent = phrases[0];
  else {
    let p = 0, i = 0, del = false;
    const tick = () => {
      const text = phrases[p];
      tw.textContent = text.slice(0, i);
      let wait = del ? 28 : 46;
      if (!del && i === text.length) { wait = 2200; del = true; }
      else if (del && i === 0) { del = false; p = (p + 1) % phrases.length; wait = 350; }
      else i += del ? -1 : 1;
      setTimeout(tick, wait);
    };
    onHeroReady(() => setTimeout(tick, 400));
  }
}

/* ---------------- hero: code window typing ---------------- */
const CODE: Array<[string, string]> = [
  ['c', '// support.ts — how a merchant conversation runs'],
  ['', ''],
  ['', '<k>const</k> ticket = <k>await</k> <f>get</f>(id)'],
  ['', '<k>const</k> needs = <k>await</k> <f>discovery</f>(ticket.merchant)'],
  ['', ''],
  ['', '<k>if</k> (!<f>reproduce</f>(ticket)) {'],
  ['', '  <k>throw</k> <k>new</k> <f>Error</f>(<s>"don\'t guess — reproduce"</s>)'],
  ['', '}'],
  ['', ''],
  ['', '<k>const</k> fix = <f>scope</f>(needs, { <t>custom</t>: <n>true</n> })'],
  ['', '<k>const</k> draft = <k>await</k> ai.<f>draft</f>(fix)'],
  ['', '<f>review</f>(draft) <k>&&</k> <f>send</f>(draft)'],
  ['', ''],
  ['', '<f>qa</f>.<f>verify</f>(<s>"storefront actually changed"</s>)'],
  ['ok', '// ✓ resolved · merchant leaves better off'],
];
const codeEl = $('#codeType');
function renderCode(upTo: number, partial = 1e9) {
  const out: string[] = [];
  for (let i = 0; i < Math.min(upTo + 1, CODE.length); i++) {
    const [cls, html] = CODE[i];
    let line = html;
    if (i === upTo) {
      // type by visible characters, keep tags intact
      const plain = html.replace(/<[^>]+>/g, '');
      const n = Math.min(partial, plain.length);
      let count = 0, res = '';
      for (let k = 0; k < html.length; k++) {
        if (html[k] === '<') { const j = html.indexOf('>', k); res += html.slice(k, j + 1); k = j; continue; }
        if (count >= n) break;
        res += html[k]; count++;
      }
      line = res;
    }
    out.push(cls ? `<span class="${cls}">${line}</span>` : line);
  }
  return out.join('\n');
}
if (codeEl) {
  if (reduced) codeEl.innerHTML = renderCode(CODE.length - 1);
  else {
    let li = 0, ch = 0;
    const type = () => {
      const plainLen = CODE[li][1].replace(/<[^>]+>/g, '').length;
      codeEl.innerHTML = renderCode(li, ch);
      if (ch < plainLen) { ch++; setTimeout(type, 18 + Math.random() * 30); }
      else if (li < CODE.length - 1) { li++; ch = 0; setTimeout(type, plainLen === 0 ? 60 : 160); }
      else {
        heroTicketResolve();
        setTimeout(() => { li = 0; ch = 0; heroTicketReset(); type(); }, 9000);
      }
    };
    onHeroReady(() => setTimeout(type, 600));
  }
}

/* ---------------- hero: floating ticket ---------------- */
const ticket = $('#heroTicket');
const ticketStatus = $('[data-status]');
const ticketBar = $('.ticket__bar i');
if (ticket && !reduced) {
  gsap.to(ticket, { y: -10, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.set(ticket, { opacity: 0 });
  onHeroReady(() => gsap.fromTo(ticket, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.8, delay: 0.4, ease: 'power3.out' }));
}
function heroTicketResolve() {
  if (!ticketStatus || !ticketBar) return;
  gsap.to(ticketBar, { width: '100%', duration: 1.2, ease: 'power2.inOut', onComplete: () => { ticketStatus.textContent = 'Resolved'; ticketStatus.classList.add('is-resolved'); } });
}
function heroTicketReset() {
  if (!ticketStatus || !ticketBar) return;
  gsap.set(ticketBar, { width: 0 });
  ticketStatus.textContent = 'Open'; ticketStatus.classList.remove('is-resolved');
}
if (reduced) { gsap.set(ticketBar, { width: '100%' }); ticketStatus!.textContent = 'Resolved'; ticketStatus?.classList.add('is-resolved'); }

/* ---------------- reveals ---------------- */
if (!reduced) {
  $$('[data-reveal]').forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  $$('[data-stagger]').forEach((grp) => {
    gsap.to(Array.from(grp.children), { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: grp, start: 'top 85%', once: true } });
  });
  // gentle parallax on the about photo + contact card
  const frame = $('.about__frame');
  if (frame) gsap.to(frame, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'bottom top', scrub: true } });
} else {
  gsap.set(['[data-reveal]', '[data-stagger] > *'], { opacity: 1, y: 0 });
}

/* ---------------- counters ---------------- */
$$('.count').forEach((el) => {
  const to = Number(el.dataset.count || 0);
  if (reduced) { el.textContent = String(to); return; }
  const o = { v: 0 };
  onHeroReady(() => gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', delay: 0.3, onUpdate: () => (el.textContent = String(Math.round(o.v))) }));
});

/* ---------------- cards: cursor spotlight ---------------- */
$$('.card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------------- magnetic buttons ---------------- */
if (!reduced && window.matchMedia('(pointer: fine)').matches) {
  $$('.magnetic').forEach((btn) => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ---------------- about: ticket journey ---------------- */
const journey = $('#journey');
if (journey) {
  const stages = $$('.journey__stage', journey);
  const bar = $('#journeyBar')!;
  const card = $('#journeyCard')!;
  const text = $('#journeyText')!;
  const who = $('b', card)!;
  const msgs = ['"My discount isn\'t applying…"', 'Which plan, which theme, guest or signed in?', 'Reproduced on a test store. It\'s the guest checkout.', 'Fixed, documented, and followed up. ✓'];
  const whos = ['Merchant', 'Hemel', 'Hemel', 'Hemel'];
  const run = () => {
    stages.forEach((s) => s.classList.remove('is-done'));
    card.classList.remove('is-resolved');
    gsap.set(bar, { width: 0 });
    gsap.set(card, { left: '12.5%' });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.2 });
    stages.forEach((s, i) => {
      tl.call(() => { s.classList.add('is-done'); text.textContent = msgs[i]; who.textContent = whos[i]; if (i === 3) card.classList.add('is-resolved'); })
        .to(card, { left: `${12.5 + i * 25}%`, duration: 0.9, ease: 'power2.inOut' }, '<')
        .to(bar, { width: `${(i / 3) * 100}%`, duration: 0.9, ease: 'power2.inOut' }, '<')
        .to({}, { duration: 1.1 });
    });
    tl.call(() => { stages.forEach((s) => s.classList.remove('is-done')); card.classList.remove('is-resolved'); });
    return tl;
  };
  if (reduced) {
    stages.forEach((s) => s.classList.add('is-done'));
    gsap.set(bar, { width: '100%' }); gsap.set(card, { left: '87.5%' }); text.textContent = msgs[3]; who.textContent = whos[3]; card.classList.add('is-resolved');
  } else {
    let tl: gsap.core.Timeline | null = null;
    ScrollTrigger.create({ trigger: journey, start: 'top 85%', end: 'bottom 10%', onEnter: () => (tl ??= run()), onLeave: () => tl?.pause(), onEnterBack: () => tl?.play(), onLeaveBack: () => tl?.pause() });
  }
}

/* ---------------- AI: dashboard ---------------- */
const dash = $('#dash');
if (dash) {
  const bars = $('#dashBars')!;
  const feed = $$('#dashFeed li');
  if (reduced) { bars.classList.add('is-on'); }
  else {
    ScrollTrigger.create({
      trigger: dash, start: 'top 80%', once: true,
      onEnter: () => {
        bars.classList.add('is-on');
        gsap.to(feed, { opacity: 1, y: 0, duration: 0.5, stagger: 0.35, delay: 0.6, ease: 'power2.out' });
        // keep the feed alive: rotate items in and out
        gsap.delayedCall(4, () => {
          const cycle = () => {
            const first = feed[0];
            gsap.to(first, { opacity: 0, x: -10, duration: 0.3, onComplete: () => {
              feed.push(feed.shift()!); feed[feed.length - 1].parentElement!.append(first);
              gsap.fromTo(first, { opacity: 0, y: 8, x: 0 }, { opacity: 1, y: 0, duration: 0.4 });
              gsap.delayedCall(3.2, cycle);
            } });
          };
          cycle();
        });
      },
    });
  }
}

/* ---------------- code backgrounds ---------------- */
const heroCode = $<HTMLCanvasElement>('#heroCode');
const aiCode = $<HTMLCanvasElement>('#aiCode');
if (heroCode) mountCodeBg(heroCode, { density: 10, reduced });
if (aiCode) mountCodeBg(aiCode, { density: 7, reduced });

/* ---------------- scroll progress ---------------- */
const progress = $('#progress');
if (progress) {
  const setP = (p: number) => progress.style.setProperty('--p', String(p));
  if (lenis) lenis.on('scroll', ({ progress: p }) => setP(p));
  else window.addEventListener('scroll', () => setP(window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)), { passive: true });
}

/* ---------------- cursor ring ---------------- */
const cursor = $('#cursor');
if (cursor && !reduced && window.matchMedia('(pointer: fine)').matches) {
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.22, ease: 'power3.out' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.22, ease: 'power3.out' });
  document.documentElement.classList.add('has-cursor');
  window.addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); cursor.classList.add('is-on'); }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest('a, button, [role="button"]');
    cursor.classList.toggle('is-link', !!t);
  });
}

/* ---------------- misc ---------------- */
$('#year')!.textContent = String(new Date().getFullYear());
window.addEventListener('load', () => ScrollTrigger.refresh());
