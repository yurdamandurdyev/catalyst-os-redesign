/**
 * Catalyst OS — Motion Vanilla
 * Skills: lenis-core · gsap · ui-motion · mega-frontend-design · motion-site · motion-review
 *
 * Uses global gsap, ScrollTrigger, Lenis loaded via <script> tags.
 * Runs after DOMContentLoaded; deferred.
 */
(function () {
  'use strict';

  /* ── guards ── */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const isMobile = window.innerWidth < 768;
  const G = window.gsap;
  const ST = window.ScrollTrigger;

  if (!G || !ST) {
    console.warn('[motion] GSAP not loaded');
    return;
  }

  G.registerPlugin(ST);

  /* ─── Lenis smooth scroll ─────────────────────────────────────────── */
  let lenis = null;
  if (!reduced && !isTouch && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.88,
    });
    lenis.on('scroll', ST.update);
    G.ticker.add(function (time) { lenis.raf(time * 1000); });
    G.ticker.lagSmoothing(0);
  }

  /* ─── Scroll progress bar ─────────────────────────────────────────── */
  var prog = document.getElementById('scrollProgress');
  if (prog) {
    ST.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0,
      onUpdate: function (self) {
        prog.style.transform = 'scaleX(' + self.progress + ')';
      },
    });
  }

  /* ─── Header scroll-glass ─────────────────────────────────────────── */
  var header = document.querySelector('.header');
  if (header) {
    ST.create({
      trigger: 'body',
      start: 'top -60px',
      onEnter: function () { header.classList.add('scrolled'); },
      onLeaveBack: function () { header.classList.remove('scrolled'); },
    });
  }

  /* ─── HERO entrance ───────────────────────────────────────────────── */
  if (!reduced) {
    var heroTl = G.timeline({ defaults: { ease: 'expo.out' } });

    heroTl.from('.header', { y: -20, autoAlpha: 0, duration: 0.9 }, 0);
    heroTl.from('.hero-topline', { y: -8, autoAlpha: 0, duration: 0.8 }, 0.15);

    var heroSpans = document.querySelectorAll('.hero-name > span');
    if (heroSpans.length) {
      heroTl.from(heroSpans, {
        yPercent: 100,
        autoAlpha: 0,
        duration: 1.1,
        stagger: 0.09,
        ease: 'power4.out',
      }, 0.2);
    }

    heroTl.from('.hero-note', { y: 20, autoAlpha: 0, duration: 1.0 }, 0.5);
    heroTl.from('.hero-action', { y: 20, autoAlpha: 0, duration: 1.0 }, 0.5);
    heroTl.from('.hero-bottom', { y: 14, autoAlpha: 0, duration: 0.7 }, 0.7);

    /* scroll arrow pulse */
    G.to('.scroll-arrow', {
      y: 7, duration: 1.0, yoyo: true, repeat: -1,
      ease: 'sine.inOut', delay: 2.0,
    });
  }

  /* ─── Hero scroll fade ────────────────────────────────────────────── */
  if (!reduced && !isMobile) {
    G.to(['.hero-note', '.hero-action'], {
      autoAlpha: 0,
      yPercent: -12,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: '35% top',
        scrub: 1,
      },
    });
  }

  /* ─── Generic reveal helper ───────────────────────────────────────── */
  function reveal(selector, vars, stagger) {
    if (reduced) return;
    var els = document.querySelectorAll(selector);
    if (!els.length) return;
    els.forEach(function (el, i) {
      G.from(el, Object.assign({
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
        duration: 0.9,
        ease: 'expo.out',
        delay: stagger ? i * stagger : 0,
      }, vars));
    });
  }

  /* ─── Reveals by element type ─────────────────────────────────────── */
  reveal('h2',                      { y: 30, autoAlpha: 0 });
  reveal('.eyebrow-label',          { y: 16, autoAlpha: 0 });
  reveal('.section-heading p',      { y: 20, autoAlpha: 0 });
  reveal('.section-kicker',         { y: 10, autoAlpha: 0 });
  reveal('.path-card',              { y: 44, autoAlpha: 0 }, 0.08);
  reveal('.case-study',             { y: 36, autoAlpha: 0 }, 0.1);
  reveal('.principles > div',       { y: 28, autoAlpha: 0 }, 0.1);
  reveal('.roadmap-branches > a',   { y: 22, autoAlpha: 0 }, 0.08);
  reveal('.faq-list details',       { y: 14, autoAlpha: 0 }, 0.06);
  reveal('.final-paths nav a',      { y: 16, autoAlpha: 0 }, 0.08);
  reveal('.document-row',           { y: 14, autoAlpha: 0 }, 0.08);
  reveal('.gallery > figure',       { y: 24, autoAlpha: 0 }, 0.1);
  reveal('.case-study-heading',     { y: 24, autoAlpha: 0 });
  reveal('.case-proof-note',        { y: 12, autoAlpha: 0 });
  reveal('.product-heading > div',  { y: 24, autoAlpha: 0 });
  reveal('.demo-note',              { y: 16, autoAlpha: 0 });
  reveal('.compatible',             { y: 16, autoAlpha: 0 });
  reveal('.demo-disclaimer',        { y: 8,  autoAlpha: 0 });

  /* Author portrait/copy — calm vertical reveals */
  if (!reduced) {
    G.from('.author-portrait', {
      y: 32, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: '.author-portrait', start: 'top 85%' },
    });
    G.from('.author-copy', {
      y: 32, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: '.author-copy', start: 'top 85%' },
    });
    var facts = document.querySelectorAll('.author-facts > div');
    facts.forEach(function (el, i) {
      G.from(el, {
        y: 20, autoAlpha: 0, duration: 0.8, ease: 'expo.out',
        delay: 0.2 + i * 0.1,
        scrollTrigger: { trigger: '.author-copy', start: 'top 85%' },
      });
    });
  }

  /* Demo cards */
  if (!reduced) {
    document.querySelectorAll('.demo').forEach(function (el, i) {
      G.from(el, {
        y: 40, autoAlpha: 0, duration: 1.0, ease: 'expo.out',
        delay: i * 0.1,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });
  }

  /* Product stats */
  if (!reduced) {
    document.querySelectorAll('.product-stats > div').forEach(function (el, i) {
      G.from(el, {
        yPercent: 20, autoAlpha: 0, duration: 1.0, ease: 'expo.out',
        delay: i * 0.12,
        scrollTrigger: { trigger: '.product-stats', start: 'top 85%' },
      });
    });
  }

  /* Blue band */
  if (!reduced) {
    document.querySelectorAll('.blue-band > span').forEach(function (el, i) {
      G.from(el, {
        y: 20, autoAlpha: 0, duration: 0.9, ease: 'expo.out', delay: i * 0.12,
        scrollTrigger: { trigger: '.blue-band', start: 'top 88%' },
      });
    });
    var bandLogo = document.querySelector('.blue-band-logo');
    if (bandLogo) {
      G.from(bandLogo, {
        scale: 0.8, autoAlpha: 0, duration: 1.0, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.blue-band', start: 'top 88%' },
      });
    }
  }

  /* Contact link */
  if (!reduced) {
    G.from('.contact-link', {
      yPercent: 20, autoAlpha: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact-link', start: 'top 90%' },
    });
  }

  /* Access card */
  if (!reduced) {
    G.from('.access-card', {
      y: 32, autoAlpha: 0, duration: 1.0, ease: 'expo.out',
      scrollTrigger: { trigger: '.access-card', start: 'top 85%' },
    });
  }

  /* ─── Parallax ────────────────────────────────────────────────────── */
  if (!reduced && !isMobile) {
    G.to('.hero-portrait', {
      yPercent: -10, ease: 'none',
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5,
      },
    });
  }

  /* ─── Counter animation ───────────────────────────────────────────── */
  if (!reduced) {
    document.querySelectorAll('.product-stats strong, .author-facts strong, .students-proof strong').forEach(function (el) {
      var text = el.firstChild ? el.firstChild.textContent.trim() : '';
      var num = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (isNaN(num) || num === 0) return;
      var obj = { val: 0 };
      ST.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: function () {
          G.to(obj, {
            val: num, duration: 1.6, ease: 'power2.out',
            onUpdate: function () {
              if (el.firstChild) el.firstChild.textContent = Math.round(obj.val).toLocaleString('ru-RU');
            },
          });
        },
      });
    });
  }

  /* ─── Micro-interactions ──────────────────────────────────────────── */
  if (!reduced && !isTouch) {

    /* Magnetic effect on CTA buttons */
    document.querySelectorAll('.button, .round-link i').forEach(function (el) {
      var qx = G.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
      var qy = G.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
      var strength = el.classList.contains('button') ? 0.25 : 0.4;

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * strength);
        qy((e.clientY - r.top - r.height / 2) * strength);
      });
      el.addEventListener('mouseleave', function () { qx(0); qy(0); });
    });

    /* round-link arrow rotate */
    document.querySelectorAll('.round-link').forEach(function (link) {
      var icon = link.querySelector('i');
      if (!icon) return;
      link.addEventListener('mouseenter', function () {
        G.to(icon, { rotation: 45, scale: 1.1, duration: 0.3, ease: 'power2.out' });
      });
      link.addEventListener('mouseleave', function () {
        G.to(icon, { rotation: 0, scale: 1, duration: 0.35, ease: 'power2.out' });
      });
    });

    /* inline-link arrow nudge */
    document.querySelectorAll('.inline-link').forEach(function (link) {
      var arrow = link.querySelector('span');
      if (!arrow) return;
      link.addEventListener('mouseenter', function () {
        G.to(arrow, { x: 4, y: -4, duration: 0.25, ease: 'power2.out' });
      });
      link.addEventListener('mouseleave', function () {
        G.to(arrow, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
      });
    });

    /* Path card subtle lift */
    document.querySelectorAll('.path-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        G.to(card, { y: -6, duration: 0.35, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', function () {
        G.to(card, { y: 0, duration: 0.4, ease: 'power2.out' });
      });
    });

    /* Roadmap branches slide right */
    document.querySelectorAll('.roadmap-branches > a').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        G.to(el, { x: 6, duration: 0.3, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        G.to(el, { x: 0, duration: 0.3, ease: 'power2.out' });
      });
    });

    /* Final-paths arrow rotate */
    document.querySelectorAll('.final-paths nav a').forEach(function (el) {
      var icon = el.querySelector('i');
      if (!icon) return;
      el.addEventListener('mouseenter', function () {
        G.to(icon, { x: 4, y: -4, duration: 0.25, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        G.to(icon, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
      });
    });

    /* Gallery button elastic click */
    document.querySelectorAll('.gallery-controls button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        G.fromTo(btn, { scale: 0.88 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,.5)' });
      });
    });

    /* Niche picker elastic click */
    document.querySelectorAll('.niche-options button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        G.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1,.5)' });
      });
    });

    /* Logo rotate on hover */
    var logoSymbol = document.querySelector('.logo-symbol');
    if (logoSymbol) {
      var logoEl = logoSymbol.closest('a');
      if (logoEl) {
        logoEl.addEventListener('mouseenter', function () {
          G.to(logoSymbol, { rotation: -8, scale: 1.08, duration: 0.3, ease: 'power2.out' });
        });
        logoEl.addEventListener('mouseleave', function () {
          G.to(logoSymbol, { rotation: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
        });
      }
    }
  }

  /* ─── Blue-band logo: steady & crisp (no continuous spin) ───────── */

  /* ─── Chooser form choice reveal ─────────────────────────────────── */
  var choiceResult = document.querySelector('.choice-result');
  if (choiceResult && !reduced) {
    var form = document.querySelector('.chooser-form');
    if (form) {
      form.addEventListener('change', function () {
        G.fromTo(choiceResult, { y: 8, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.5, ease: 'power2.out',
        });
      });
    }
  }

  /* ─── Context document rows animate on scroll ─────────────────────── */
  if (!reduced) {
    var docResult = document.querySelector('.document-result');
    if (docResult) {
      G.from(docResult, {
        y: 20, autoAlpha: 0, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: docResult, start: 'top 88%' },
      });
    }
  }

  /* ─── Refresh after fonts/images ─────────────────────────────────── */
  window.addEventListener('load', function () {
    ST.refresh();
    if (lenis) lenis.resize();
  });

})();
