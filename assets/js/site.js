/* ==========================================================================
   VI GROŽIO SALONAS — shared behaviour (every page, loaded with `defer`)
   Vanilla JS, no dependencies. Exposes window.VI for page modules.
   ========================================================================== */
(() => {
  'use strict';

  const d = document;
  const w = window;
  const root = d.documentElement;
  const VI = (w.VI = w.VI || {});

  const mq = q => w.matchMedia(q).matches;
  const conn = navigator.connection || {};
  VI.reduced = mq('(prefers-reduced-motion: reduce)');
  VI.finePointer = mq('(hover: hover) and (pointer: fine)');
  VI.saveData = conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
  VI.small = () => w.innerWidth <= 760;

  /* ---------- scroll-driven chrome (one rAF per frame) -------------------- */
  const header = d.querySelector('.site-header');
  const progress = d.querySelector('.progress');
  const toTop = d.querySelector('.to-top');
  const parallax = [...d.querySelectorAll('[data-parallax]')];
  const hideHeader = d.body.dataset.header !== 'static';
  let lastY = w.scrollY;
  let ticking = false;

  function frame() {
    ticking = false;
    const y = w.scrollY;
    const max = root.scrollHeight - w.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

    if (header) {
      header.classList.toggle('is-scrolled', y > 24);
      if (hideHeader && !d.body.classList.contains('menu-open')) {
        const goingDown = y > lastY + 4;
        const goingUp = y < lastY - 4;
        if (goingDown && y > 700) header.classList.add('is-hidden');
        else if (goingUp || y < 700) header.classList.remove('is-hidden');
      }
    }
    if (progress) progress.style.transform = `scaleX(${p.toFixed(4)})`;
    if (toTop) {
      toTop.classList.toggle('is-visible', y > w.innerHeight * 0.9);
      toTop.style.setProperty('--p', p.toFixed(3));
    }
    if (!VI.reduced) {
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > w.innerHeight + 200) continue;
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        const offset = (r.top + r.height / 2 - w.innerHeight / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      }
    }
    lastY = y;
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', onScroll, { passive: true });
  frame();

  if (toTop) toTop.addEventListener('click', () => w.scrollTo({ top: 0, behavior: VI.reduced ? 'auto' : 'smooth' }));

  /* ---------- mobile menu ------------------------------------------------- */
  const burger = d.querySelector('[data-burger]');
  const menu = d.getElementById('mobileMenu');
  if (burger && menu) {
    const setOpen = open => {
      menu.classList.toggle('is-open', open);
      if (open) menu.classList.add('was-open');          // lets the decorative blossom load on first open only
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Uždaryti meniu' : 'Atidaryti meniu');
      d.body.classList.toggle('menu-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      if (header) header.classList.remove('is-hidden');
      if (open) setTimeout(() => menu.querySelector('a')?.focus({ preventScroll: true }), 350);
    };
    burger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    d.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); burger.focus(); }
    });
    w.addEventListener('resize', () => { if (w.innerWidth > 980 && menu.classList.contains('is-open')) setOpen(false); });
  }

  /* ---------- "Registruotis": choose Indrė (hair) or Valentina (beauty) --- */
  const book = d.querySelector('[data-book]');
  if (book) {
    const btn = book.querySelector('[data-book-btn]');
    const links = [...book.querySelectorAll('.book__pop a')];
    const isOpen = () => book.classList.contains('is-open');
    const set = (open, focus) => {
      book.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open && focus) links[0].focus({ preventScroll: true });
    };
    btn.addEventListener('click', e => set(!isOpen(), e.detail === 0));   // keyboard activation → focus the first number
    d.addEventListener('click', e => { if (isOpen() && !book.contains(e.target)) set(false); });
    book.addEventListener('focusout', e => { if (isOpen() && !book.contains(e.relatedTarget)) set(false); });
    d.addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { set(false); btn.focus(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = links.indexOf(d.activeElement), n = links.length;
        links[e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n].focus();
      }
    });
    w.addEventListener('scroll', () => { if (isOpen() && header && header.classList.contains('is-hidden')) set(false); }, { passive: true });
  }

  /* ---------- same-page anchors: smooth scroll ---------------------------- */
  const samePath = a => {
    const norm = p => p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    return a.origin === w.location.origin && norm(a.pathname) === norm(w.location.pathname);
  };
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!samePath(a) || a.hash.length < 2) return;
    let target;
    try { target = d.querySelector(decodeURIComponent(a.hash)); } catch { return; }
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: VI.reduced ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', a.hash);
  });

  /* ---------- reveal on scroll ------------------------------------------- */
  const revealSel = '.rv, .rv-mask, .rv-lines';
  if ('IntersectionObserver' in w && !VI.reduced) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    VI.observeReveal = scope => (scope || d).querySelectorAll(revealSel).forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
  } else {
    VI.observeReveal = scope => (scope || d).querySelectorAll(revealSel).forEach(el => el.classList.add('in'));
  }
  VI.observeReveal();

  /* ---------- images: fade in over the LQIP once decoded ------------------ */
  const markLoaded = img => { if (img.complete && img.naturalWidth) img.classList.add('is-loaded'); };
  d.addEventListener('load', e => {
    const t = e.target;
    if (t.tagName === 'IMG' && t.closest('.ph')) t.classList.add('is-loaded');
  }, true);
  VI.markImages = scope => (scope || d).querySelectorAll('.ph img').forEach(markLoaded);
  VI.markImages();

  /* ---------- ambient video loops: load near view, play only when visible - */
  // <video data-src="lg.mp4" data-src-sm="sm.mp4" poster="poster.webp" muted loop playsinline preload="none">
  const videos = [...d.querySelectorAll('video[data-src]')];
  const allowMotionVideo = !VI.reduced && !VI.saveData;
  const startVideo = v => {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    const poster = v.getAttribute('poster');
    if (poster) {
      const im = new Image();
      im.onload = im.onerror = () => v.classList.add('is-ready');
      im.src = poster;
    } else {
      v.classList.add('is-ready');
    }
    if (!allowMotionVideo) return;
    v.muted = true;
    v.src = VI.small() && v.dataset.srcSm ? v.dataset.srcSm : v.dataset.src;
    v.load();
  };
  VI.startVideo = startVideo;
  if (videos.length && 'IntersectionObserver' in w) {
    const near = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { startVideo(en.target); near.unobserve(en.target); }
    }, { rootMargin: '300px 0px' });
    const vis = new IntersectionObserver(entries => {
      for (const en of entries) {
        const v = en.target;
        v.dataset.visible = en.isIntersecting ? '1' : '';
        if (!allowMotionVideo || !v.src) continue;
        if (en.isIntersecting && !d.hidden) v.play().catch(() => {});
        else v.pause();
      }
    }, { threshold: 0.2 });
    videos.forEach(v => {
      near.observe(v); vis.observe(v);
      v.addEventListener('loadeddata', () => { if (v.dataset.visible && !d.hidden) v.play().catch(() => {}); });
    });
    d.addEventListener('visibilitychange', () => {
      for (const v of videos) {
        if (!v.src) continue;
        if (d.hidden) v.pause();
        else if (v.dataset.visible) v.play().catch(() => {});
      }
    });
  } else {
    videos.forEach(startVideo);
  }

  /* ---------- magnetic buttons ------------------------------------------- */
  if (VI.finePointer && !VI.reduced) {
    d.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- page-transition fallback (no cross-document view transitions) */
  if (root.classList.contains('vt-fallback') && !VI.reduced) {
    d.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download') || a.origin !== w.location.origin) return;
      if (samePath(a) && a.hash) return;
      if (!/^https?:$/.test(a.protocol)) return;
      e.preventDefault();
      d.body.classList.add('is-leaving');
      setTimeout(() => { w.location.href = a.href; }, 280);
    });
    w.addEventListener('pageshow', e => { if (e.persisted) d.body.classList.remove('is-leaving'); });
  }

  /* ---------- falling cherry-blossom petals ------------------------------ */
  // VI.petals(canvas, { count, interactive, speed }) → { stop() }
  VI.petals = (canvas, opts = {}) => {
    if (!canvas || VI.reduced) return { stop() {} };
    const ctx = canvas.getContext('2d');
    const count = opts.count || (VI.small() ? 14 : 24);
    const speed = opts.speed || 1;
    const tints = ['#f6c9d7', '#eeb6c8', '#f9dbe4', '#e7a3ba', '#fbe7ee'];
    let W = 0, H = 0, dpr = 1, raf = 0, on = false, mouse = null;
    const P = [];

    const reset = (p, top) => {
      p.x = Math.random() * W;
      p.y = top ? -20 - Math.random() * H * 0.3 : Math.random() * H;
      p.s = 5 + Math.random() * 8;                 // size
      p.vy = (0.35 + Math.random() * 0.55) * speed;
      p.vx = (-0.2 + Math.random() * 0.5) * speed;
      p.a = Math.random() * Math.PI * 2;           // spin
      p.va = (-0.02 + Math.random() * 0.04);
      p.f = Math.random() * Math.PI * 2;           // flip phase
      p.vf = 0.02 + Math.random() * 0.03;
      p.sway = Math.random() * Math.PI * 2;
      p.c = tints[(Math.random() * tints.length) | 0];
      p.o = 0.55 + Math.random() * 0.4;
    };
    const size = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(w.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const petal = p => {
      const s = p.s;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.scale(Math.cos(p.f) * 0.9 + 0.1, 1);
      ctx.globalAlpha = p.o;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(s * 1.1, s * 0.4, s * 0.8, -s * 0.9, s * 0.18, -s);
      ctx.lineTo(0, -s * 0.72);                  // the little notch of a sakura petal
      ctx.lineTo(-s * 0.18, -s);
      ctx.bezierCurveTo(-s * 0.8, -s * 0.9, -s * 1.1, s * 0.4, 0, s);
      ctx.fill();
      ctx.restore();
    };
    const tick = () => {
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.sway += 0.012;
        p.x += p.vx + Math.sin(p.sway) * 0.35;
        p.y += p.vy;
        p.a += p.va; p.f += p.vf;
        if (mouse) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = dx * dx + dy * dy;
          if (dist < 12000) { const k = (12000 - dist) / 12000 * 2.2; p.x += dx / 60 * k; p.y += dy / 60 * k; }
        }
        if (p.y > H + 20 || p.x < -40 || p.x > W + 40) reset(p, true);
        petal(p);
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!on) { on = true; raf = requestAnimationFrame(tick); } };
    const stop = () => { on = false; cancelAnimationFrame(raf); };

    size();
    for (let i = 0; i < count; i++) { const p = {}; reset(p, false); P.push(p); }
    if ('ResizeObserver' in w) new ResizeObserver(size).observe(canvas);
    let visible = true;
    if ('IntersectionObserver' in w) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible && !d.hidden ? start() : stop(); }).observe(canvas);
    }
    d.addEventListener('visibilitychange', () => (d.hidden || !visible ? stop() : start()));
    if (opts.interactive) {
      const host = canvas.parentElement;
      host.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
      host.addEventListener('pointerleave', () => { mouse = null; });
    }
    start();
    return { stop };
  };
  d.querySelectorAll('canvas[data-petals]').forEach(c => VI.petals(c, {
    count: Number(c.dataset.petals) || undefined,
    interactive: c.hasAttribute('data-interactive'),
  }));

  /* ---------- small things ------------------------------------------------ */
  d.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  d.querySelectorAll('[data-hours] [data-d="' + new Date().getDay() + '"]').forEach(tr => tr.classList.add('is-today'));
})();
