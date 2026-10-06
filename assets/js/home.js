/* ==========================================================================
   home.js — index.html only.
   Map facade: the Google Maps iframe (third-party) is injected only after the
   visitor asks for it, so nothing loads from Google on page load.
   ========================================================================== */
(() => {
  'use strict';

  const map = document.querySelector('[data-map]');
  const btn = map && map.querySelector('[data-map-load]');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (map.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.title = 'VI Grožio salonas žemėlapyje — P. Butlerienės g. 6, Marijampolė';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.allowFullscreen = true;
    f.addEventListener('load', () => {
      map.classList.add('is-live');
      map.querySelector('.map__facade')?.setAttribute('aria-hidden', 'true');
      f.focus({ preventScroll: true });
    }, { once: true });
    f.src = map.dataset.src;
    map.appendChild(f);
    btn.textContent = 'Kraunama…';
    btn.setAttribute('aria-busy', 'true');
  });
})();
