(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  /* ---------- Reveal on scroll + stat count-up ---------- */
  const countUp = (el) => {
    const end = +el.dataset.count;
    if (reduced) return;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 900, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- 3D tilt + cursor light on project shots ---------- */
  if (finePointer && !reduced) {
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
  if (finePointer && !reduced) {
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
