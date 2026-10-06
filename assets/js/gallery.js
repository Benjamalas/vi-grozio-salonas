/* ==========================================================================
   gallery.js — filterable photo gallery, deferred "show more" and lightbox.
   Nothing heavy loads until it is asked for:
     • extra photos sit in an inert <template> until "Rodyti daugiau"
       (or until a filter needs them)
     • the lightbox's 1200 px image loads only when opened

   Markup contract:
     <div data-filters>
       <button type="button" data-filter="all" aria-pressed="true">Visi <span class="chip__n"></span></button> …
     </div>
     <div class="gallery" data-gallery>
       <figure class="g-item" data-cat="salonas"
               data-full="…-1200.webp" data-full-avif="…-1200.avif">
         <button class="g-open" type="button" aria-label="Didinti: …">
           <div class="ph" style="--lqip:url(…);--ar:3/4">
             <picture>…<img alt="…" loading="lazy" decoding="async"></picture>
           </div>
         </button>
         <figcaption>…</figcaption>
       </figure>
     </div>
     <template data-gallery-more> …more <figure class="g-item">… </template>
     <button type="button" data-gallery-more-btn>Rodyti daugiau</button>
   ========================================================================== */
(() => {
  'use strict';

  const grid = document.querySelector('[data-gallery]');
  if (!grid) return;

  const VI = window.VI || {};
  const filtersBox = document.querySelector('[data-filters]');
  const moreTpl = document.querySelector('[data-gallery-more]');
  const moreBtn = document.querySelector('[data-gallery-more-btn]');
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  let filter = 'all';

  const items = () => [...grid.querySelectorAll('.g-item')];
  const matches = (el, cat) => cat === 'all' || (el.dataset.cat || '').split(/\s+/).includes(cat);

  /* ---------- show more (deferred photos) -------------------------------- */
  function loadMore(focusFirst) {
    if (!moreTpl || moreTpl.dataset.used) return;
    moreTpl.dataset.used = '1';
    const frag = moreTpl.content.cloneNode(true);
    const added = [...frag.querySelectorAll('.g-item')];
    added.forEach((el, i) => el.style.setProperty('--d', i % 6));
    grid.appendChild(frag);
    added.forEach(el => { el.hidden = !matches(el, filter); });
    VI.markImages?.(grid);
    VI.observeReveal?.(grid);
    if (moreBtn) moreBtn.hidden = true;
    if (focusFirst) added.find(el => !el.hidden)?.querySelector('.g-open')?.focus({ preventScroll: true });
  }
  if (moreBtn) moreBtn.addEventListener('click', () => loadMore(true));

  /* ---------- filters with FLIP reflow ------------------------------------ */
  function applyFilter(cat) {
    // A category may live partly in the deferred template — pull it in first.
    if (cat !== 'all' && moreTpl && !moreTpl.dataset.used &&
        moreTpl.content.querySelector(`.g-item[data-cat~="${cat}"]`)) loadMore(false);

    filter = cat;
    const all = items();
    const first = new Map();
    all.forEach(el => { if (!el.hidden) first.set(el, el.getBoundingClientRect()); });
    all.forEach(el => { el.hidden = !matches(el, cat); });

    let n = 0;
    all.forEach(el => {
      if (el.hidden) return;
      el.classList.add('in');                        // never leave a reveal half-done
      if (VI.reduced) return;
      const f = first.get(el);
      const l = el.getBoundingClientRect();
      if (f) {
        const dx = f.left - l.left, dy = f.top - l.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 650, easing: EASE });
        }
      } else if (l.top < window.innerHeight + 200) {
        el.animate([{ opacity: 0, transform: 'scale(.94) translateY(16px)' }, { opacity: 1, transform: 'none' }],
          { duration: 600, easing: EASE, delay: Math.min(n++, 8) * 45, fill: 'backwards' });
      }
    });
    if (moreBtn && moreTpl && !moreTpl.dataset.used) moreBtn.hidden = cat !== 'all';
  }

  function updateCounts() {
    if (!filtersBox) return;
    const pending = moreTpl && !moreTpl.dataset.used ? [...moreTpl.content.querySelectorAll('.g-item')] : [];
    const all = [...items(), ...pending];
    filtersBox.querySelectorAll('[data-filter]').forEach(b => {
      const badge = b.querySelector('.chip__n');
      if (badge) badge.textContent = all.filter(el => matches(el, b.dataset.filter)).length;
    });
  }

  if (filtersBox) {
    filtersBox.addEventListener('click', e => {
      const b = e.target.closest('[data-filter]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      filtersBox.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      applyFilter(b.dataset.filter);
    });
    updateCounts();
  }

  /* ---------- lightbox ----------------------------------------------------- */
  let dlg, imgEl, mediaEl, srcAvif, capEl, countEl, index = 0, list = [];

  function buildLightbox() {
    dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Nuotraukų peržiūra');
    dlg.innerHTML = `
      <div class="lb__bar">
        <span class="lb__count" aria-live="polite"></span>
        <button class="lb__btn lb__close" type="button" aria-label="Uždaryti">✕</button>
      </div>
      <figure class="lb__fig">
        <div class="lb__media"><picture><source type="image/avif"><img alt="" decoding="async"></picture></div>
        <figcaption class="lb__cap"></figcaption>
      </figure>
      <button class="lb__btn lb__nav lb__prev" type="button" aria-label="Ankstesnė nuotrauka">←</button>
      <button class="lb__btn lb__nav lb__next" type="button" aria-label="Kita nuotrauka">→</button>`;
    document.body.appendChild(dlg);
    mediaEl = dlg.querySelector('.lb__media');
    srcAvif = dlg.querySelector('source');
    imgEl = dlg.querySelector('img');
    capEl = dlg.querySelector('.lb__cap');
    countEl = dlg.querySelector('.lb__count');

    dlg.querySelector('.lb__close').addEventListener('click', close);
    dlg.querySelector('.lb__prev').addEventListener('click', () => go(-1));
    dlg.querySelector('.lb__next').addEventListener('click', () => go(1));
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
    imgEl.addEventListener('load', () => imgEl.classList.add('is-in'));

    // swipe on touch
    let x0 = null, y0 = 0;
    dlg.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } });
    dlg.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
    });
  }

  function show(i, dir) {
    index = (i + list.length) % list.length;
    const fig = list[index];
    const img = fig.querySelector('img');
    imgEl.classList.remove('is-in');
    imgEl.style.setProperty('--from', `${(dir || 0) * 40}px`);
    // the already-loaded thumbnail is the backdrop; the 1200 px image fades in over it
    const thumb = img?.currentSrc || '';
    mediaEl.style.backgroundImage = thumb ? `url("${thumb}")` : 'none';
    if (fig.dataset.fullAvif) srcAvif.srcset = fig.dataset.fullAvif; else srcAvif.removeAttribute('srcset');
    imgEl.src = fig.dataset.full || thumb;
    imgEl.alt = img?.alt || '';
    if (imgEl.complete && imgEl.naturalWidth) requestAnimationFrame(() => imgEl.classList.add('is-in'));
    capEl.textContent = fig.querySelector('figcaption')?.textContent || img?.alt || '';
    countEl.textContent = `${index + 1} / ${list.length}`;
    // warm the neighbours
    [list[(index + 1) % list.length], list[(index - 1 + list.length) % list.length]].forEach(n => {
      if (n && n !== fig && n.dataset.full) { const p = new Image(); p.decoding = 'async'; p.src = n.dataset.full; }
    });
  }
  function go(step) { if (list.length > 1) show(index + step, step); }

  let lastFocus = null;
  function open(fig) {
    if (!dlg) buildLightbox();
    list = items().filter(el => !el.hidden);
    lastFocus = document.activeElement;
    document.body.classList.add('lb-open');
    dlg.showModal();
    show(list.indexOf(fig), 0);
  }
  function close() {
    dlg.classList.add('is-closing');
    setTimeout(() => {
      dlg.classList.remove('is-closing');
      dlg.close();
      document.body.classList.remove('lb-open');
      lastFocus?.focus?.({ preventScroll: true });
    }, VI.reduced ? 0 : 260);
  }

  grid.addEventListener('click', e => {
    const btn = e.target.closest('.g-open');
    if (btn) open(btn.closest('.g-item'));
  });
})();
