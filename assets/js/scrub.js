/* ==========================================================================
   scrub.js — scroll-driven image-sequence hero (canvas)

   Markup contract (see index.html):
     <section data-scrub data-lg="dir" data-lg-count="N" data-sm="dir" data-sm-count="M">
       <div data-stage>                 ← position: sticky; height: 100svh
         <div data-frame-box>           ← the box the frames fill (cover)
           <img data-poster …>          ← frame 1, eager, high priority: instant first paint
           <canvas data-canvas></canvas>
         </div>
         <div data-scene data-from="0" data-to=".16">…</div>   ← captions keyed to progress
         <div data-cue></div>  <span data-rail></span>
       </div>
     </section>

   Why it feels fast and smooth
   • The page never waits for frames: the poster is a normal <img>, the
     sequence streams in after the page's own `load`, at low fetch priority.
   • Coarse-to-fine order (every 16th frame, then 8th, 4th, 2nd, rest): after
     ~10% of the bytes the whole scroll range already has coverage.
   • Neighbouring frames are cross-faded by the fractional position, so the
     motion reads as continuous with fewer frames (smaller download).
   • Eased tracking smooths chunky (iOS momentum) scroll events; the canvas
     backing store is capped near the frame resolution so phones don't push
     3× DPR pixels; the loop sleeps when the hero is off-screen.
   ========================================================================== */
(() => {
  'use strict';

  const host = document.querySelector('[data-scrub]');
  if (!host) return;

  const VI = window.VI || {};
  const stage = host.querySelector('[data-stage]');
  const box = host.querySelector('[data-frame-box]');
  const canvas = host.querySelector('[data-canvas]');
  const poster = host.querySelector('[data-poster]');
  const cue = host.querySelector('[data-cue]');
  const rail = host.querySelector('[data-rail]');
  const scenes = [...host.querySelectorAll('[data-scene]')].map(el => ({
    el, from: parseFloat(el.dataset.from), to: parseFloat(el.dataset.to),
  }));
  if (!stage || !box || !canvas) return;

  const conn = navigator.connection || {};
  const slow = VI.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  const useSm = window.innerWidth <= 600 || slow;
  const DIR = useSm ? host.dataset.sm : host.dataset.lg;
  const COUNT = parseInt(useSm ? host.dataset.smCount : host.dataset.lgCount, 10) || 0;
  host.dataset.build = useSm ? 'sm' : 'lg';

  const ctx = canvas.getContext('2d', { alpha: false });
  const frames = new Array(COUNT);
  const ready = new Uint8Array(COUNT);
  let readyCount = 0;
  let current = 0;          // eased frame position
  let target = 0;           // scroll-derived frame position
  let progress = 0;
  let drawn = -1;           // last drawn position (skip redundant paints)
  let dirty = true;
  let visible = true;
  let running = false;
  let lastT = 0;
  let frameW = useSm ? 432 : 576;

  const pad = n => String(n).padStart(3, '0');
  const src = i => `${DIR}/f_${pad(i + 1)}.webp`;

  /* ---------- sizing ------------------------------------------------------ */
  function resize() {
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // Backing store ≈ what the frames can actually resolve (×1.25), never more
    // than the CSS box × DPR. Keeps fill-rate low on 3× phones.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, (frameW * 1.25) / r.width, 2);
    canvas.width = Math.max(1, Math.round(r.width * scale));
    canvas.height = Math.max(1, Math.round(r.height * scale));
    dirty = true;
    paint(current);
  }

  /* ---------- drawing ----------------------------------------------------- */
  function nearestReady(i) {
    if (ready[i]) return i;
    for (let d = 1; d < COUNT; d++) {
      if (i - d >= 0 && ready[i - d]) return i - d;
      if (i + d < COUNT && ready[i + d]) return i + d;
    }
    return -1;
  }

  function cover(img, alpha) {
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s, h = ih * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function paint(pos) {
    if (!readyCount) return;
    const a = Math.max(0, Math.min(COUNT - 1, Math.floor(pos)));
    const b = Math.min(COUNT - 1, a + 1);
    const t = pos - a;
    const ia = nearestReady(a);
    if (ia < 0) return;
    cover(frames[ia], 1);
    // Cross-fade into the next frame only when both real neighbours exist.
    if (t > 0.02 && ia === a && b !== a && ready[b]) cover(frames[b], t);
    ctx.globalAlpha = 1;
    if (poster && !poster.hidden) { canvas.classList.add('is-on'); poster.hidden = true; }
  }

  /* ---------- scroll → progress ------------------------------------------- */
  function measure() {
    const total = host.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    const p = -host.getBoundingClientRect().top / total;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  const FADE = 0.06;
  function updateScenes(p) {
    for (const s of scenes) {
      let o = 0;
      if (p >= s.from - FADE && p <= s.to + FADE) {
        o = Math.min((p - (s.from - FADE)) / FADE, ((s.to + FADE) - p) / FADE, 1);
        if (s.from <= 0 && p <= s.to) o = 1;            // first scene is on at the very top
        if (s.to >= 1 && p >= s.from) o = 1;            // last scene stays on at the end
      }
      o = Math.max(0, o);
      s.el.style.opacity = o.toFixed(3);
      s.el.style.transform = `translate3d(0, ${((1 - o) * 22).toFixed(1)}px, 0)`;
      s.el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
      s.el.toggleAttribute('inert', o < 0.5);
    }
    if (cue) cue.classList.toggle('is-gone', p > 0.035);
    if (rail) rail.style.transform = `scaleY(${p.toFixed(4)})`;
    host.style.setProperty('--p', p.toFixed(4));
  }

  /* ---------- loop -------------------------------------------------------- */
  function tick(now) {
    if (!visible) { running = false; return; }
    const dt = lastT ? Math.min(64, now - lastT) : 16.7;
    lastT = now;

    const p = measure();
    if (p !== progress) { progress = p; updateScenes(p); }
    target = p * (COUNT - 1);
    const k = 1 - Math.pow(1 - 0.2, dt / 16.7);      // frame-rate independent easing
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.004) current = target;

    if (dirty || Math.abs(current - drawn) > 0.002) {
      paint(current);
      drawn = current;
      dirty = false;
    }
    requestAnimationFrame(tick);
  }
  function kick() {
    if (!running && visible) { running = true; lastT = 0; requestAnimationFrame(tick); }
  }

  /* ---------- loading: coarse → fine, low priority ------------------------ */
  function order(n) {
    const seen = new Uint8Array(n), out = [];
    for (let step = 16; step >= 1; step >>= 1) {
      for (let i = 0; i < n; i += step) if (!seen[i]) { seen[i] = 1; out.push(i); }
    }
    if (!seen[n - 1]) out.push(n - 1);
    return out;
  }

  function load() {
    const queue = order(COUNT);
    let inFlight = 0;
    const MAX = 6;
    const next = () => {
      while (inFlight < MAX && queue.length) {
        const i = queue.shift();
        const im = new Image();
        im.decoding = 'async';
        if ('fetchPriority' in im) im.fetchPriority = 'low';
        inFlight++;
        im.onload = () => {
          inFlight--;
          frames[i] = im;
          if (!ready[i]) { ready[i] = 1; readyCount++; }
          if (readyCount === 1 && im.naturalWidth && im.naturalWidth !== frameW) { frameW = im.naturalWidth; resize(); }
          const a = Math.floor(current);
          if (i === a || i === a + 1 || readyCount === 1) { dirty = true; kick(); }
          next();
        };
        im.onerror = () => { inFlight--; next(); };
        im.src = src(i);
      }
    };
    next();
  }

  /* ---------- reduced motion: a still, no scrubbing ----------------------- */
  if (VI.reduced || !COUNT) {
    host.classList.add('is-static');
    updateScenes(1);
    return;
  }

  /* ---------- wiring ------------------------------------------------------ */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) kick();
    }, { rootMargin: '120px 0px' }).observe(host);
  }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { resize(); kick(); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => { resize(); kick(); }).observe(box);

  resize();
  progress = measure();
  updateScenes(progress);
  current = target = progress * (COUNT - 1);
  kick();

  const begin = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 600 });
    else setTimeout(load, 120);
  };
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
})();
