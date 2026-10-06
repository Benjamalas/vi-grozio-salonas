/* ==========================================================================
   kainos.html — sticky category chips (scroll-spy via IntersectionObserver,
   smooth offset scrolling, active chip kept in view, reading progress) and
   the staggered dotted-leader reveal. Loaded with `defer` after site.js.
   ========================================================================== */
(() => {
  'use strict';

  const d = document;
  const w = window;
  const root = d.documentElement;
  const reduced = (w.VI && w.VI.reduced) || w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HEADER = 62;            // .site-header.is-scrolled height (site.css)
  const HIDE_AFTER = 700;       // site.js hides the header below this scroll position

  /* leaders draw one after another inside each list */
  d.querySelectorAll('.p-list').forEach(list => {
    [...list.children].forEach((li, i) => li.style.setProperty('--i', i));
  });

  /* the card's blossom sprig loads only as the card approaches */
  const sprig = d.querySelector('.p-card__sprig[data-src]');
  if (sprig) {
    const load = () => {
      sprig.addEventListener('load', () => sprig.classList.add('is-loaded'), { once: true });
      sprig.src = sprig.dataset.src;
      sprig.removeAttribute('data-src');
    };
    if ('IntersectionObserver' in w) {
      const so = new IntersectionObserver(([en]) => { if (en.isIntersecting) { so.disconnect(); load(); } }, { rootMargin: '250px 0px' });
      so.observe(sprig.parentElement);
    } else load();
  }

  const nav = d.querySelector('[data-pnav]');
  if (!nav) return;
  const scroller = nav.querySelector('[data-pnav-list]');
  const bar = nav.querySelector('.p-nav__bar');
  const sentinel = d.querySelector('.p-nav-sentinel');
  const items = [...nav.querySelectorAll('a[href^="#"]')]
    .map(a => ({ a, el: d.getElementById(decodeURIComponent(a.hash.slice(1))) }))
    .filter(it => it.el);
  if (!items.length) return;

  /* layout position in the document — ignores the 34px .rv reveal offsets
     (card + group are both .rv, so a rect read before they reveal is 68px low) */
  const docTop = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };

  let navH = 0;
  let line = 0;               // spy line, px from the top of the viewport
  let start = 0, end = 1;       // progress range (document px)
  let active = null;
  let locked = false;
  const onLine = new Set();

  /* ---------- active chip ------------------------------------------------ */
  const keepInView = chip => {
    if (scroller.scrollWidth <= scroller.clientWidth + 2) return;
    const left = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
  };
  const setActive = it => {
    if (it === active) return;
    if (active) { active.a.classList.remove('is-active'); active.a.removeAttribute('aria-current'); }
    active = it;
    if (!it) return;
    it.a.classList.add('is-active');
    it.a.setAttribute('aria-current', 'location');
    keepInView(it.a);
  };
  const applySpy = () => {
    if (locked) return;
    const hit = items.find(it => onLine.has(it.el));
    if (hit) setActive(hit);
    else if (items[0].el.getBoundingClientRect().top > line) setActive(null);   // still above the list
  };

  /* ---------- scroll-spy: a 1px band across the viewport ----------------- */
  let io;
  const buildSpy = () => {
    if (io) io.disconnect();
    onLine.clear();
    line = HEADER + navH + 32;    // just below the chip bar: short groups still register
    io = new IntersectionObserver(entries => {
      for (const en of entries) en.isIntersecting ? onLine.add(en.target) : onLine.delete(en.target);
      applySpy();
    }, { rootMargin: `-${line}px 0px -${Math.max(0, w.innerHeight - line - 1)}px 0px` });
    items.forEach(it => io.observe(it.el));
  };

  /* ---------- stuck state ------------------------------------------------ */
  if (sentinel) {
    new IntersectionObserver(([en]) => {
      nav.classList.toggle('is-stuck', !en.isIntersecting && en.boundingClientRect.top < HEADER + 2);
    }, { rootMargin: `-${HEADER + 1}px 0px 0px 0px` }).observe(sentinel);
  }

  /* ---------- reading progress + edge fades ------------------------------ */
  let ticking = false;
  const frame = () => {
    ticking = false;
    const p = Math.min(1, Math.max(0, (w.scrollY + line - start) / (end - start)));
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  w.addEventListener('scroll', onScroll, { passive: true });

  const edges = () => {
    const x = scroller.scrollLeft;
    scroller.classList.toggle('is-l', x > 4);
    scroller.classList.toggle('is-r', x + scroller.clientWidth < scroller.scrollWidth - 4);
  };
  scroller.addEventListener('scroll', edges, { passive: true });

  /* ---------- measure (load, resize, late layout changes) ---------------- */
  let lastVh = 0;
  const measure = () => {
    navH = nav.offsetHeight;
    root.style.setProperty('--pnav-h', navH + 'px');
    const last = items[items.length - 1].el;
    start = docTop(items[0].el);
    end = Math.max(start + 1, docTop(last) + last.offsetHeight);
    if (Math.abs(w.innerHeight - lastVh) > 60 || !io) { lastVh = w.innerHeight; buildSpy(); }
    edges();
    frame();
  };
  let rt = 0;
  const later = () => { clearTimeout(rt); rt = setTimeout(measure, 120); };
  w.addEventListener('resize', later, { passive: true });
  if ('ResizeObserver' in w) new ResizeObserver(later).observe(d.getElementById('main') || d.body);
  measure();

  /* ---------- chip click: smooth scroll with header + bar offset ---------- */
  let unlockTimer = 0;
  const unlock = () => { clearTimeout(unlockTimer); locked = false; applySpy(); };
  nav.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const it = items.find(x => x.a === a);
    if (!it) return;
    e.preventDefault();                       // site.js's generic anchor handler then stands down

    let top = docTop(it.el) - navH - 16;                      // header slides away when scrolling down…
    if (top < w.scrollY || top < HIDE_AFTER) top -= HEADER;   // …but stays when going up / near the top
    top = Math.max(0, Math.round(top));

    locked = true;
    setActive(it);
    history.replaceState(null, '', a.hash);
    w.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    it.el.focus({ preventScroll: true });

    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(unlock, 1400);
    if ('onscrollend' in w) w.addEventListener('scrollend', unlock, { once: true });
  });
})();
