/* Nextohr landing — motion system
   GSAP + ScrollTrigger for choreography, Lenis as the only smooth-scroll engine.
   Everything degrades to a complete static page without JS or under reduced motion. */
(() => {
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- basic UI (works with or without GSAP) ---------------- */
  // mobile nav
  const burger = $('.nav__burger'), mnav = $('#mnav');
  const setMenu = (open) => { burger.setAttribute('aria-expanded', String(open)); mnav.hidden = !open; burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', mnav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); burger.focus(); } });

  // hero tabs
  const tabs = $$('.hero__tabs [role=tab]'), shots = $$('.hero__shot');
  let tabIdx = 0, tabTimer = null, tabsTouched = false;
  const showTab = (i) => {
    tabIdx = i;
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    const key = tabs[i].dataset.shot;
    shots.forEach((s) => s.classList.toggle('is-on', s.dataset.shot === key));
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => { tabsTouched = true; stopTabs(); showTab(i); }));
  const startTabs = () => { if (reduce || tabsTouched || tabTimer) return; tabTimer = setInterval(() => showTab((tabIdx + 1) % tabs.length), 4200); };
  const stopTabs = () => { clearInterval(tabTimer); tabTimer = null; };

  /* ---------------- demo form ----------------
     No backend yet: set FORM_ENDPOINT to your API (POST, JSON) and the form will send to it.
     Until then a submit only shows the confirmation — nothing leaves the browser. */
  const FORM_ENDPOINT = '';
  const form = $('#demoForm'), done = $('#demoDone');
  const sizeSel = $('#f-size');
  const syncSel = () => sizeSel.classList.toggle('is-empty', !sizeSel.value);
  sizeSel.addEventListener('change', syncSel); syncSel();
  // plan cards pre-select the plan in the form
  $$('.pbtn[data-plan]').forEach((b) => b.addEventListener('click', () => {
    const r = form.querySelector(`input[name="plan"][value="${b.dataset.plan}"]`); if (r) r.checked = true;
  }));
  const rules = {
    name: (v) => (v.trim().length < 2 ? 'Please enter your full name.' : ''),
    company: (v) => (v.trim().length < 2 ? 'Please enter your company or business name.' : ''),
    email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Please enter a valid work email.' : ''),
    phone: (v) => (v.replace(/\D/g, '').length < 10 ? 'Please enter a phone number with at least 10 digits.' : ''),
  };
  const check = (input) => {
    const msg = rules[input.name](input.value);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('#e-' + input.name).textContent = msg;
    return !msg;
  };
  Object.keys(rules).forEach((k) => {
    const el = form.elements[k];
    el.addEventListener('blur', () => { if (el.value) check(el); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(el); });
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('.dform__status', form); status.textContent = '';
    const bad = Object.keys(rules).map((k) => form.elements[k]).filter((el) => !check(el));
    if (bad.length) { bad[0].focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    data.modules = new FormData(form).getAll('modules');
    form.classList.add('is-busy');
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error('send failed');
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }
      $('.dn-name', done).textContent = data.name.trim().split(/\s+/)[0];
      form.hidden = true; done.hidden = false; done.focus({ preventScroll: true });
      if (hasGsap && !reduce) {
        gsap.from(done, { y: 20, autoAlpha: 0, duration: .8, ease: 'expo.out' });
        gsap.fromTo($$('circle, path', done), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .8, ease: 'power3.inOut', stagger: .35 });
      }
    } catch (err) {
      status.textContent = 'Something went wrong sending this. Please try again in a moment.';
    } finally {
      form.classList.remove('is-busy');
    }
  });
  $('#demoAgain').addEventListener('click', () => {
    form.reset(); syncSel();
    Object.keys(rules).forEach((k) => { form.elements[k].removeAttribute('aria-invalid'); $('#e-' + k).textContent = ''; });
    done.hidden = true; form.hidden = false; form.elements.name.focus();
  });

  // film
  const film = $('.film__frame'), video = $('#filmVideo');
  $('.film__play').addEventListener('click', () => {
    video.controls = true; film.classList.add('is-playing');
    video.play().catch(() => {});
  });
  video.addEventListener('ended', () => { film.classList.remove('is-playing'); video.controls = false; });

  // tour step clicks (desktop) — scroll handled later when pinned
  const steps = $$('.tstep'), tourShots = $$('.tour__shot');
  const setStep = (i) => {
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    tourShots.forEach((s, k) => s.classList.toggle('is-on', k === i));
  };

  // counters / static fallbacks
  const fmtINR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const finalStatic = () => {
    $$('.count').forEach((c) => (c.textContent = c.dataset.to));
    $$('.pay [data-to]').forEach((b) => (b.textContent = fmtINR(+b.dataset.to)));
    const rn = $('.ring__n'); if (rn) rn.textContent = '100%';
    const typed = $('.cmd__typed'); if (typed) typed.textContent = 'run payroll';
  };

  if (!hasGsap || reduce) {
    finalStatic();
    steps.forEach((s, i) => s.addEventListener('click', () => setStep(i)));
    doc.classList.remove('intro-on');
    $$('.card').forEach((c) => c.classList.add('is-live'));
    return;
  }

  /* ======================================================================
     GSAP + LENIS
     ====================================================================== */
  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target, offset = -90) => (lenis ? lenis.scrollTo(target, { offset, duration: 1.4 }) : (typeof target === 'number' ? scrollTo_(target) : target.scrollIntoView({ behavior: 'smooth' })));
  const scrollTo_ = (y) => window.scrollTo({ top: y, behavior: 'smooth' });

  // in-page anchors through Lenis
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const t = id === '#top' ? 0 : $(id);
    if (t === null) { e.preventDefault(); return; }
    e.preventDefault();
    scrollTo(t === 0 ? 0 : t, id === '#film' ? -60 : -90);
  }));

  // nav state
  const nav = $('#nav');
  ScrollTrigger.create({ start: 60, end: 'max', onToggle: (s) => nav.classList.toggle('is-scrolled', s.isActive) });

  /* ---------------- split text ---------------- */
  const wrapWord = (w) => { const o = document.createElement('span'); o.className = 'w'; o.setAttribute('aria-hidden', 'true'); const i = document.createElement('span'); i.className = 'wi'; i.textContent = w; o.append(i); return o; };
  const split = (el) => {
    if (el.dataset.split) return; el.dataset.split = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const nodes = [...el.childNodes]; el.textContent = '';
    nodes.forEach((n) => {
      const words = n.textContent.split(/\s+/).filter(Boolean);
      const lead = /^\s/.test(n.textContent), trail = /\s$/.test(n.textContent);
      if (lead && el.childNodes.length) el.append(' ');
      if (n.nodeType === 3) words.forEach((w, i) => { el.append(wrapWord(w)); if (i < words.length - 1) el.append(' '); });
      else { const c = n.cloneNode(false); c.classList.add('em-split'); words.forEach((w, i) => { c.append(wrapWord(w)); if (i < words.length - 1) c.append(' '); }); el.append(c); }
      if (trail) el.append(' ');
    });
    return $$('.wi', el);
  };
  $$('.split').forEach(split);

  /* ======================================================================
     HERO ENTRANCE
     ====================================================================== */
  const heroFrame = $('.hero__frame');
  gsap.set(heroFrame, { rotateX: 16, scale: .94, transformPerspective: 1800 });
  const heroParts = ['.hero__eyebrow', '.hero__sub', '.hero__ctas', '.hero__trust'];
  gsap.set(heroParts, { autoAlpha: 0, y: 24 });
  gsap.set('.hero__title .wi', { yPercent: 110 });
  gsap.set(['.hero__tabs', '.hero__frame-wrap'], { autoAlpha: 0, y: 70 });
  gsap.set('.chip', { autoAlpha: 0, scale: .85, y: 20 });
  gsap.set('.hero__ribbon-path', { strokeDashoffset: 1 });

  let heroPlayed = false;
  const heroIn = () => {
    if (heroPlayed) return; heroPlayed = true;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__ribbon-path', { strokeDashoffset: 0, duration: 2.4, ease: 'power3.inOut' }, 0)
      .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: 1 }, .05)
      .to('.hero__title .wi', { yPercent: 0, duration: 1.3, stagger: .09 }, .1)
      .to('.hero__sub', { autoAlpha: 1, y: 0, duration: 1.1 }, .45)
      .to('.hero__ctas', { autoAlpha: 1, y: 0, duration: 1.1 }, .55)
      .to('.hero__trust', { autoAlpha: 1, y: 0, duration: 1.1 }, .65)
      .to('.hero__tabs', { autoAlpha: 1, y: 0, duration: 1.2 }, .6)
      .to('.hero__frame-wrap', { autoAlpha: 1, y: 0, duration: 1.6 }, .7)
      .to('.chip', { autoAlpha: 1, scale: 1, y: 0, duration: 1, stagger: .14, ease: 'back.out(1.6)' }, 1.3)
      .add(() => { floats.forEach((f) => f.play()); startTabs(); }, 2.2);
  };
  // gentle float on chips (paused offscreen)
  const floats = $$('.chip').map((c, i) => gsap.to(c, { y: i % 2 ? 8 : -8, duration: 2.6 + i * .3, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true, delay: i * .2 }));
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom top',
    onToggle: (s) => { if (!heroPlayed) return; s.isActive ? (floats.forEach((f) => f.play()), startTabs()) : (floats.forEach((f) => f.pause()), stopTabs()); },
  });
  // scroll: the tilted frame lays flat
  gsap.to(heroFrame, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.hero__frame-wrap', start: 'top 92%', end: 'top 22%', scrub: .6 } });
  gsap.to('.chip--a, .chip--c', { xPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero__frame-wrap', start: 'top 60%', end: 'bottom top', scrub: true } });
  gsap.to('.chip--b, .chip--d', { xPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero__frame-wrap', start: 'top 60%', end: 'bottom top', scrub: true } });

  /* ======================================================================
     INTRO — logo motion (~4.6s)
     ====================================================================== */
  const intro = $('#intro');
  const navLogo = $('#navLogo');
  const runIntro = () => {
    if (!doc.classList.contains('intro-on')) { intro.remove(); heroIn(); return; }
    lenis && lenis.stop();
    const L = $('#introLogo');
    const q = (s) => L.querySelector(s);
    gsap.set(navLogo, { autoAlpha: 0 });
    gsap.set(L.querySelectorAll('.ix'), { strokeDashoffset: 1 });
    gsap.set([q('.d-n'), q('.d-e'), q('.d-ebar'), q('.d-x1'), q('.d-x2'), q('.d-t'), q('.d-tbar')], { y: 10 });

    const tl = gsap.timeline({ onComplete: finish });
    tl.addLabel('start', 0)
      .to('.intro__bar span', { scaleX: 1, duration: 3.5, ease: 'power1.inOut' }, 0)
      .fromTo(q('.ix-seed'), { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .45, ease: 'back.out(2.4)' }, .05)
      // n e x t — written left to right
      .to(q('.d-n'), { strokeDashoffset: 0, y: 0, duration: .75, ease: 'power3.inOut' }, .3)
      .to(q('.d-e'), { strokeDashoffset: 0, y: 0, duration: .8, ease: 'power3.inOut' }, .42)
      .to(q('.d-ebar'), { strokeDashoffset: 0, y: 0, duration: .45, ease: 'power2.out' }, .58)
      .to(q('.d-x1'), { strokeDashoffset: 0, y: 0, duration: .5, ease: 'power3.inOut' }, .56)
      .to(q('.d-x2'), { strokeDashoffset: 0, y: 0, duration: .5, ease: 'power3.inOut' }, .68)
      .to(q('.d-t'), { strokeDashoffset: 0, y: 0, duration: .7, ease: 'power3.inOut' }, .8)
      .to(q('.d-tbar'), { strokeDashoffset: 0, y: 0, duration: .4, ease: 'power2.out' }, 1.02)
      // the seed opens into the o
      .to(q('.d-o'), { strokeDashoffset: 0, duration: .7, ease: 'power3.inOut' }, 1.1)
      .to(q('.ix-seed'), { opacity: 0, duration: .3 }, 1.5)
      // the ribbon flows out of the o and becomes the h
      .to([q('.d-rib'), q('.d-glow')], { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 1.5)
      .fromTo(q('.d-h'), { opacity: 0, y: -70 }, { opacity: 1, y: 0, duration: .65, ease: 'back.out(2)' }, 2.22)
      .to(q('.d-r'), { strokeDashoffset: 0, duration: .55, ease: 'power3.inOut' }, 2.36)
      .to(q('.d-glow'), { opacity: 0, duration: .8, ease: 'power2.out' }, 2.75)
      // settle + sheen + tagline
      .to(L, { scale: 1.035, duration: .35, ease: 'power2.out', transformOrigin: '50% 50%' }, 2.7)
      .to(L, { scale: 1, duration: .7, ease: 'expo.out' }, 3.05)
      .fromTo('.intro__sheen', { opacity: 1, backgroundPosition: '120% 0' }, { backgroundPosition: '-30% 0', duration: 1, ease: 'power2.inOut' }, 2.85)
      .to('.intro__sheen', { opacity: 0, duration: .2 }, 3.75)
      .fromTo('.intro__tag', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ease: 'expo.out' }, 2.95)
      .addLabel('exit', 3.75)
      .to(['.intro__tag', '.intro__bar', '.intro__skip'], { opacity: 0, y: -8, duration: .35, ease: 'power2.in' }, 'exit')
      .add(() => flyToNav(), 'exit+=0.1')
      .to('.intro__bg', { yPercent: -100, borderBottomLeftRadius: '50% 18%', borderBottomRightRadius: '50% 18%', duration: 1, ease: 'power4.inOut' }, 'exit+=0.2')
      .add(() => heroIn(), 'exit+=0.55');

    function flyToNav() {
      const a = L.getBoundingClientRect(), b = navLogo.getBoundingClientRect();
      const s = b.width / a.width;
      gsap.to(L, {
        x: (b.left + b.width / 2) - (a.left + a.width / 2), y: (b.top + b.height / 2) - (a.top + a.height / 2),
        scale: s, duration: 1.05, ease: 'expo.inOut', transformOrigin: '50% 50%',
      });
    }
    function finish() {
      gsap.delayedCall(.85, () => {
        gsap.set(navLogo, { autoAlpha: 1 });
        intro.remove();
        doc.classList.remove('intro-on');
        lenis && lenis.start();
        try { sessionStorage.setItem('nx-intro', '1'); } catch (e) {}
        ScrollTrigger.refresh();
      });
    }
    const skip = () => { if (tl.time() < tl.labels.exit) tl.seek('exit'); };
    intro.addEventListener('click', skip);
    $('.intro__skip').addEventListener('click', skip);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); }, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    addEventListener('touchmove', skip, { once: true, passive: true });
  };

  /* ======================================================================
     SECTION HEADINGS — word reveal
     ====================================================================== */
  $$('.split').forEach((el) => {
    if (el.classList.contains('hero__title')) return;
    gsap.from($$('.wi', el), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  ScrollTrigger.batch('.eyebrow:not(.hero__eyebrow), .sec-sub, .tile, .num, .faq__list details', {
    start: 'top 88%',
    onEnter: (els) => gsap.from(els, { autoAlpha: 0, y: 40, duration: 1.1, ease: 'expo.out', stagger: .08, overwrite: true }),
  });

  /* ======================================================================
     THE MESS — tools pulled into one
     ====================================================================== */
  const tools = $$('.mess__tools > *');
  gsap.set(tools, { clearProps: 'transform' });
  gsap.set(tools, { xPercent: -50, yPercent: -50 });
  const messTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.mess', start: 'top top', end: '+=150%', pin: '.mess__pin', scrub: .8, anticipatePin: 1 },
  });
  messTl
    .fromTo('.mess__tools', { opacity: 0 }, { opacity: 1, duration: .12 }, 0)
    .fromTo(tools, { scale: .6 }, { scale: 1, duration: .14, stagger: .008, ease: 'back.out(2)' }, 0)
    .to(tools, {
      x: (i, el) => -parseFloat(getComputedStyle(el).getPropertyValue('--x')) * innerWidth / 100,
      y: (i, el) => -parseFloat(getComputedStyle(el).getPropertyValue('--y')) * innerHeight / 100,
      scale: .15, rotation: (i) => (i % 2 ? 40 : -40), opacity: 0, duration: .42, stagger: .012, ease: 'power3.in',
    }, .3)
    .to('.mess__t1', { opacity: 0, y: -60, filter: 'blur(6px)', duration: .2 }, .38)
    .fromTo('.mess__core', { opacity: 0, scale: .55 }, { opacity: 1, scale: 1, duration: .25, ease: 'back.out(1.6)' }, .62)
    .fromTo('.mess__t2', { opacity: 0, y: () => innerHeight * .34 }, { opacity: 1, y: () => innerHeight * .2, duration: .22, ease: 'power2.out' }, .74)
    .to({}, { duration: .1 });

  /* ======================================================================
     THE SENTENCE — scroll-highlighted words + popping pills
     ====================================================================== */
  const sws = $$('.sentence__text .sw');
  gsap.to(sws, {
    color: (i, el) => (el.querySelector('em') ? '#B4508F' : '#24101F'), stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.sentence', start: 'top 72%', end: 'bottom 62%', scrub: .5 },
  });
  $$('.sentence .pill').forEach((p) => gsap.from(p, {
    scale: 0, rotation: -25, ease: 'back.out(2.4)', duration: .8,
    scrollTrigger: { trigger: p, start: 'top 72%', toggleActions: 'play none none reverse' },
  }));

  /* ======================================================================
     TOUR — pinned steps (desktop), stacked (mobile)
     ====================================================================== */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    let current = 0;
    const st = ScrollTrigger.create({
      trigger: '.tour__body', start: 'center center', end: () => '+=' + innerHeight * 3, pin: true, scrub: true, anticipatePin: 1,
      onUpdate: (self) => {
        const i = Math.min(steps.length - 1, Math.floor(self.progress * steps.length * .9999));
        gsap.set('.tour__rail-fill', { scaleY: .12 + self.progress * .88 });
        if (i !== current) { current = i; setStep(i); }
      },
    });
    const onClick = (i) => () => {
      const y = st.start + ((i + .5) / steps.length) * (st.end - st.start);
      scrollTo(y, 0);
    };
    const handlers = steps.map((s, i) => { const h = onClick(i); s.addEventListener('click', h); return h; });
    gsap.from('.tour__visual', { y: 60, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.tour__body', start: 'top 80%' } });
    gsap.from('.tstep', { x: -30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '.tour__body', start: 'top 80%' } });
    return () => { steps.forEach((s, i) => s.removeEventListener('click', handlers[i])); setStep(0); };
  });
  mm.add('(max-width: 960px)', () => {
    gsap.utils.toArray('.tstep').forEach((s) => gsap.from(s, { y: 50, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 88%' } }));
  });

  /* ======================================================================
     FEATURE DEMOS — only run while visible
     ====================================================================== */
  const cards = $$('.card');
  ScrollTrigger.batch(cards, { start: 'top 88%', onEnter: (els) => gsap.from(els, { y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .1 }) });
  const live = (card, tl) => ScrollTrigger.create({
    trigger: card, start: 'top 90%', end: 'bottom 10%',
    onToggle: (s) => { card.classList.toggle('is-live', s.isActive); if (!tl) return; s.isActive ? tl.play() : tl.pause(); },
  });

  // command palette typing
  (() => {
    const card = $('.card--cmd'), typed = $('.cmd__typed', card), items = $$('.cmd__list li', card);
    const words = ['run payroll', 'add employee', 'log leave'];
    const tl = gsap.timeline({ repeat: -1, paused: true });
    words.forEach((w, wi) => {
      const o = { n: 0 };
      tl.add(() => items.forEach((li, k) => li.classList.toggle('is-hl', k === wi)))
        .to(o, { n: w.length, duration: w.length * .07, ease: 'none', onUpdate: () => (typed.textContent = w.slice(0, Math.round(o.n))) })
        .to({}, { duration: 1.3 })
        .to(o, { n: 0, duration: w.length * .025, ease: 'none', onUpdate: () => (typed.textContent = w.slice(0, Math.round(o.n))) })
        .to({}, { duration: .25 });
    });
    live(card, tl);
  })();

  live($('.card--gps'));

  // payroll counters
  (() => {
    const card = $('.card--pay'), nums = $$('[data-to]', card);
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2.4 });
    nums.forEach((b, i) => {
      const o = { v: 0 };
      tl.fromTo(b.parentElement, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: .4, ease: 'expo.out' }, i * .18)
        .to(o, { v: +b.dataset.to, duration: 1.1, ease: 'power3.out', onUpdate: () => (b.textContent = fmtINR(o.v)) }, i * .18);
    });
    live(card, tl);
  })();

  // approval toasts
  (() => {
    const card = $('.card--toast'), ts = $$('.toast', card);
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .4 });
    tl.fromTo(ts, { x: 80, autoAlpha: 0, scale: .96 }, { x: 0, autoAlpha: 1, scale: 1, duration: .7, ease: 'expo.out', stagger: .55 })
      .to(ts, { x: -60, autoAlpha: 0, duration: .5, ease: 'power3.in', stagger: .12 }, '+=1.8');
    live(card, tl);
  })();

  // offer letter writes itself
  (() => {
    const card = $('.card--offer');
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.6 });
    tl.fromTo($$('.ln', card), { scaleX: 0 }, { scaleX: 1, duration: .55, ease: 'power3.out', stagger: .22 })
      .fromTo($('.offer__ctc', card), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5, ease: 'expo.out' }, '-=.2')
      .fromTo($('.offer__sign path', card), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
      .to({}, { duration: .8 });
    live(card, tl);
  })();

  // profile ring
  (() => {
    const card = $('.card--ring'), fg = $('.ring__fg', card), n = $('.ring__n', card);
    const o = { v: 0 };
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2 });
    tl.set(o, { v: 0 }).to(o, { v: 100, duration: 2, ease: 'power3.inOut', onUpdate: () => { fg.style.strokeDasharray = `${o.v} 100`; n.textContent = Math.round(o.v) + '%'; } });
    live(card, tl);
  })();

  /* ======================================================================
     FILM — the frame grows as it arrives
     ====================================================================== */
  gsap.fromTo('.film__frame', { scale: .84, borderRadius: 48 }, { scale: 1, borderRadius: 28, ease: 'none', scrollTrigger: { trigger: '.film__frame', start: 'top 95%', end: 'center 55%', scrub: .6 } });
  ScrollTrigger.create({ trigger: '.film', start: 'top bottom', end: 'bottom top', onLeave: () => video.pause(), onLeaveBack: () => video.pause() });

  /* ---------------- numbers ---------------- */
  $$('.count').forEach((c) => {
    const o = { v: 0 }, to = +c.dataset.to;
    if (to === 0) { c.textContent = '0'; return; }
    gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => (c.textContent = Math.round(o.v)), scrollTrigger: { trigger: c, start: 'top 88%' } });
  });

  /* ---------------- phones parallax ---------------- */
  mm.add('(min-width: 721px)', () => {
    gsap.from('.phone', { y: 120, autoAlpha: 0, duration: 1.4, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.phones', start: 'top 85%' } });
    gsap.to('.phone.p1, .phone.p3', { y: -60, ease: 'none', scrollTrigger: { trigger: '.phones', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.phone.p2', { y: 50, ease: 'none', scrollTrigger: { trigger: '.phones', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------------- plans ---------------- */
  gsap.from('.plans-head .mk', { scale: 0, duration: .8, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: '.plans-head', start: 'top 85%' } });
  gsap.from('.pcard', { y: 70, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: .14, scrollTrigger: { trigger: '.pcards', start: 'top 85%' } });
  $$('.pcard').forEach((c) => gsap.from($$('.pcard__list li', c), { x: -16, autoAlpha: 0, duration: .8, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: $('.pcard__list', c), start: 'top 90%' } }));

  /* ---------------- demo form + footer ---------------- */
  gsap.fromTo('.demo-lines path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', stagger: .08, scrollTrigger: { trigger: '.demo-panel', start: 'top 85%', end: 'center 50%', scrub: .8 } });
  gsap.from('.dform', { y: 60, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.dform', start: 'top 90%' } });
  gsap.from('.dform .fld, .dform .chips-fld, .dform__submit', { y: 18, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .05, delay: .15, scrollTrigger: { trigger: '.dform', start: 'top 90%' } });
  gsap.from('.foot__mark svg', { yPercent: 40, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.foot__mark', start: 'top 95%' } });

  /* ---------------- boot ---------------- */
  const boot = () => runIntro();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ScrollTrigger.refresh(); });
  addEventListener('load', () => ScrollTrigger.refresh());
  boot();
})();
