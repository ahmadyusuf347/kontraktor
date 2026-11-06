(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hasGsap = typeof gsap !== 'undefined';
  if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  // Header ikut turun menutup top bar; transparan -> putih (halaman terang) saat scroll
  const header = $('#header');
  if (header) {
    const dark = header.dataset.dark === 'true';
    const onScroll = () => {
      const y = scrollY; header.style.top = Math.max(0, 32 - y) + 'px';
      if (!dark) ['bg-white/95', 'shadow-md', 'backdrop-blur'].forEach(c => header.classList.toggle(c, y > 80));
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // Drawer menu dari kiri
  const btn = $('#menuBtn'), nav = $('#mobileNav'), overlay = $('#overlay'), closeBtn = $('#closeBtn');
  if (btn && nav && hasGsap) {
    gsap.set(nav, { xPercent: -100 });
    let open = false;
    const toggle = o => {
      open = o; btn.setAttribute('aria-expanded', o); nav.setAttribute('aria-hidden', !o);
      document.body.style.overflow = o ? 'hidden' : '';
      const d = reduce ? 0 : .4;
      if (o) {
        gsap.to(overlay, { autoAlpha: 1, duration: d });
        gsap.to(nav, { autoAlpha: 1, xPercent: 0, duration: d, ease: 'power3.out' });
        if (!reduce) gsap.from($$('li, [data-drawer-cta]', nav), { x: -20, opacity: 0, stagger: .05, delay: .15, duration: .35, clearProps: 'all' });
        closeBtn.focus();
      } else {
        gsap.to(overlay, { autoAlpha: 0, duration: d });
        gsap.to(nav, { xPercent: -100, duration: d, ease: 'power3.in', onComplete: () => gsap.set(nav, { autoAlpha: 0 }) });
        btn.focus();
      }
    };
    btn.onclick = () => toggle(true); closeBtn.onclick = () => toggle(false); overlay.onclick = () => toggle(false);
    addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(false); });
    matchMedia('(min-width:1024px)').addEventListener('change', e => { if (e.matches && open) toggle(false); });
  }

  // Judul halaman
  if (hasGsap && !reduce && $('#pageTitle')) gsap.from('#pageTitle', { y: 40, opacity: 0, duration: 1, ease: 'power3.out' });

  // Hero slider (Home): teks + latar gambar/video per slide (crossfade)
  const hero = $('[data-hero]');
  if (hero && hasGsap) {
    let slides = []; try { slides = JSON.parse(hero.dataset.slides); } catch (e) {}
    const title = $('.hero-title', hero), sub = $('.hero-sub', hero);
    const bars = $$('.bar button', hero), fills = bars.map(b => b.firstElementChild);
    const layers = $$('[data-layer]', hero);
    layers.forEach(el => { const v = $('video', el); if (v) { v.muted = true; v.addEventListener('error', () => console.warn('[hero] Video gagal dimuat/diputar. Gunakan MP4 H.264 atau WebM.')); } });
    let curLayer = slides[0] ? slides[0].l : -1, first = true;
    const setLayer = l => {
      layers.forEach((el, k) => {
        const on = k === l, v = $('video', el);
        gsap.to(el, { opacity: on ? 1 : 0, duration: reduce || first ? 0 : 1, overwrite: true });
        if (v) {
          if (on) { if (reduce) v.pause(); else v.play().catch(e => console.warn('[hero] Autoplay diblokir:', e.message)); }
          else setTimeout(() => { if (curLayer !== k) v.pause(); }, 1100);
        }
      });
      curLayer = l;
    };
    if (slides.length) {
      let idx = 0, tl;
      const show = i => {
        idx = i; title.textContent = slides[i].t; sub.textContent = slides[i].s;
        if (slides[i].l !== curLayer || first) setLayer(slides[i].l);
        first = false;
        gsap.set(fills, { width: 0 }); gsap.set(fills.slice(0, i), { width: '100%' });
        if (tl) tl.kill();
        tl = gsap.timeline({ onComplete: () => change((i + 1) % slides.length) });
        if (!reduce) tl.fromTo([title, sub], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .12, ease: 'power3.out' }, 0);
        tl.fromTo(fills[i], { width: 0 }, { width: '100%', duration: slides[i].d || 6, ease: 'none' }, 0);
      };
      const change = i => reduce ? show(i) : gsap.to([title, sub], { opacity: 0, y: -15, duration: .25, onComplete: () => show(i) });
      bars.forEach((b, i) => b.addEventListener('click', () => { if (i !== idx) change(i); }));
      if (slides.length > 1) show(0); else { setLayer(slides[0].l); gsap.set(fills, { width: '100%' }); }
    }
    if (!reduce && $('.hero-img')) gsap.from('.hero-img', { x: 60, opacity: 0, duration: 1.1, ease: 'power3.out' });
  }

  // Slider kartu (scroll-snap + tombol)
  $$('[data-slider]').forEach(track => {
    const wrap = track.closest('section'), prev = $('[data-prev]', wrap), next = $('[data-next]', wrap);
    const step = () => { const c = track.firstElementChild; return c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0); };
    const go = dir => { const max = track.scrollWidth - track.clientWidth; let t = track.scrollLeft + dir * step(); if (t > max + 4) t = 0; if (t < -4) t = max; track.scrollTo({ left: t, behavior: reduce ? 'auto' : 'smooth' }); };
    if (prev) prev.onclick = () => go(-1); if (next) next.onclick = () => go(1);
  });

  // Reveal saat scroll + counter angka
  if (hasGsap && typeof ScrollTrigger !== 'undefined') {
    if (!reduce) ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true,
      onEnter: els => gsap.from(els, { y: 40, opacity: 0, duration: .7, stagger: .1, ease: 'power2.out', clearProps: 'all' }) });
    $$('[data-count]').forEach(el => {
      const end = +el.dataset.count;
      if (reduce) { el.textContent = end.toLocaleString('id-ID'); return; }
      ScrollTrigger.create({ trigger: el, start: 'top 95%', once: true, onEnter: () => { const o = { v: 0 }; gsap.to(o, { v: end, duration: 1.6, ease: 'power1.out', onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('id-ID') }); } });
    });
    const tl = $('#tlLine');
    if (tl && !reduce) gsap.from(tl, { scaleX: 0, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: '#timeline', start: 'top 85%', once: true } });
  } else $$('[data-count]').forEach(el => el.textContent = el.dataset.count);

  // Filter project
  const filter = $('[data-filter]');
  if (filter) {
    const items = $$('[data-filter-grid] .proj');
    filter.addEventListener('click', e => {
      const b = e.target.closest('button[data-cat]'); if (!b) return;
      $$('button', filter).forEach(x => { const on = x === b; x.classList.toggle('bg-black', on); x.classList.toggle('text-white', on); x.classList.toggle('hover:bg-neutral-100', !on); });
      const cat = b.dataset.cat; const shown = items.filter(i => cat === 'Semua' || i.dataset.cat === cat);
      items.forEach(i => i.classList.toggle('hidden', !shown.includes(i)));
      if (hasGsap && !reduce) gsap.from(shown, { y: 30, opacity: 0, duration: .5, stagger: .07, clearProps: 'all' });
    });
  }

  // Tombol kembali ke atas
  const top = $('#toTop');
  if (top) { addEventListener('scroll', () => { const s = scrollY > 600; top.classList.toggle('hidden', !s); top.classList.toggle('grid', s); }, { passive: true }); top.onclick = () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
})();
