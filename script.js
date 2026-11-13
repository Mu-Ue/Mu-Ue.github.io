(() => {
  const root = document.documentElement;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Language (DE default, remembered per visitor) ---------- */
  let lang = 'de';
  try { lang = localStorage.getItem('lang') === 'en' ? 'en' : 'de'; } catch {}
  const setLang = (l) => {
    lang = l;
    root.dataset.lang = l;
    root.lang = l;
    try { localStorage.setItem('lang', l); } catch {}
    tick();
  };
  document.querySelector('.lang-toggle').addEventListener('click', () => setLang(lang === 'de' ? 'en' : 'de'));

  /* ---------- Live clock ---------- */
  const clock = document.getElementById('clock');
  function tick() {
    const now = new Date();
    const loc = lang === 'de' ? 'de-DE' : 'en-GB';
    const date = now.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
    const time = now.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clock.dateTime = now.toISOString();
    clock.innerHTML = `<span class="date">${date} · </span>${time}`;
  }
  setLang(lang);
  setInterval(tick, 1000);
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Scroll effects: everything is a pure function of the scroll position ---------- */
  const hint = document.querySelector('.scroll-hint');
  const bar = document.querySelector('.bar');
  const aurora = document.querySelector('.aurora');
  const heroText = document.querySelector('.hero-text');
  const heroLayers = document.querySelectorAll('.layer');
  const heads = document.querySelectorAll('.section-head');
  const projects = [...document.querySelectorAll('.project')].map((p) => ({
    p, shot: p.querySelector('.shot'), info: p.querySelector('.info'), img: p.querySelector('.view img'),
  }));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  projects.forEach(({ img }) => {
    if (!img.closest('.stage')) img.parentElement.style.aspectRatio = `${img.getAttribute('width')} / ${img.getAttribute('height') * 0.92}`;
  });
  const onScroll = () => {
    const y = scrollY, vh = innerHeight;
    const wide = innerWidth > 960;  // stacked layout on small screens: no opposing shifts, they would overlap
    // read all positions first, then write, so the browser lays out only once per frame
    const pr = projects.map(({ p }) => { const r = p.getBoundingClientRect(); return clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1); });
    const hr = [...heads].map((h) => h.getBoundingClientRect().top);
    const max = document.documentElement.scrollHeight - vh;

    hint.classList.toggle('gone', y > 60);
    bar.style.setProperty('--p', max > 0 ? Math.min(y / max, 1) : 0);
    aurora.style.setProperty('--shift', `${-y * 0.05}px`);
    if (y < vh * 1.3) {
      // hero text lags behind the scroll, screenshots rush ahead; side by side only, stacked they would collide
      const hy = wide ? y : 0;
      heroText.style.setProperty('--shift', `${hy * 0.2}px`);
      heroLayers.forEach((l) => l.style.setProperty('--sy', `${-hy * l.dataset.depth / 90}px`));
    }
    projects.forEach(({ shot, info, img }, i) => {
      const t = pr[i];  // -1 above centre … 0 centred … 1 below
      shot.style.setProperty('--shift', wide ? `${t * 70}px` : '0px');
      info.style.setProperty('--shift', wide ? `${t * -35}px` : '0px');
      img.style.setProperty('--inner', `${t * -4}%`);  // the picture moves inside its window
    });
    heads.forEach((h, i) => h.style.setProperty('--u', clamp((vh - hr[i]) / (vh * 0.6), 0, 1)));
  };
  // browsers already fire scroll at most once per frame, so no extra frame scheduling (which could stall)
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('load', onScroll);
  onScroll();

  /* ---------- 3D tilt + cursor light on project shots ---------- */
  if (finePointer) {
    document.querySelectorAll('.shot').forEach((shot) => {
      const frame = shot.querySelector('.frame');
      shot.addEventListener('pointermove', (e) => {
        const r = shot.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        frame.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
        frame.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
        frame.style.setProperty('--mx', `${x * 100}%`);
        frame.style.setProperty('--my', `${y * 100}%`);
      });
      shot.addEventListener('pointerleave', () => {
        frame.style.setProperty('--rx', '0deg');
        frame.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Background: dot grid lit up around the cursor ---------- */
  const canvas = document.getElementById('dots');
  const ctx = canvas.getContext('2d');
  const GAP = 28;
  let w, h, dpr, mx = -1e4, my = -1e4, dirty = true;
  const layers = [...document.querySelectorAll('.layer')];

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  };
  const draw = () => {
    if (dirty && !document.hidden) {
      dirty = false;
      ctx.clearRect(0, 0, w, h);
      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) {
          const d = Math.hypot(x - mx, y - my);
          const glow = Math.max(0, 1 - d / 180);
          ctx.fillStyle = glow > 0
            ? `rgba(150,170,255,${0.08 + glow * 0.55})`
            : 'rgba(255,255,255,0.06)';
          const s = 1.1 + glow * 1.4;
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
    }
    requestAnimationFrame(draw);
  };
  addEventListener('resize', resize);
  if (finePointer) {
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY; dirty = true;
      // hero parallax: each screenshot moves by its own depth
      const nx = e.clientX / w - 0.5, ny = e.clientY / h - 0.5;
      for (const l of layers) {
        const d = +l.dataset.depth;
        l.style.setProperty('--px', `${-nx * d}px`);
        l.style.setProperty('--py', `${-ny * d}px`);
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mx = my = -1e4; dirty = true; });
  }
  resize();
  requestAnimationFrame(draw);

  /* ---------- Self-check: every DE text needs an EN twin ---------- */
  document.querySelectorAll('body [lang="de"]').forEach((de) => {
    const en = de.nextElementSibling;
    if (!en || en.getAttribute('lang') !== 'en') console.warn('Missing EN translation for:', de);
  });
})();
