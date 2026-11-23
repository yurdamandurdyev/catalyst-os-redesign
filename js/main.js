(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const themeButton = $('.theme-switch');
  const setTheme = theme => {
    document.documentElement.dataset.theme = theme;
    const dark = theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
    $('meta[name="theme-color"]').content = dark ? '#101217' : '#f5f5f2';
    themeButton.innerHTML = dark ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/></svg>';
    try { localStorage.setItem('catalyst-theme-v3', theme); } catch (_) {}
  };
  setTheme(document.documentElement.dataset.theme);
  themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

  const hero = $('.hero'), stage = $('.hero-stage');
  let scrollQueued = false;
  const updateHero = () => {
    scrollQueued = false;
    if (reduced) return;
    const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight - stage.offsetHeight)));
    stage.style.setProperty('--name-y', `${32 - progress * 48}px`);
    stage.style.setProperty('--last-y', `${76 * (1 - progress)}px`);
    stage.style.setProperty('--name-opacity', String(.08 + progress * .92));
  };
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateHero); } }, { passive: true });
  addEventListener('resize', updateHero);
  updateHero();

  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .1 });
  $$('.about-grid, .principles > div, .product-heading, .product-stats, .demo, .journal-heading, .access-layout').forEach(el => {
    el.classList.add('reveal'); observer.observe(el);
  });

  $('.call-wave').innerHTML = Array.from({ length: 50 }, (_, i) => `<i style="--height:${12 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * .3)) * 85}%;--delay:${i * .012}s"></i>`).join('');

  const gallery = $('.gallery'), slides = $$('figure', gallery);
  let galleryIndex = 0;
  const slideTo = index => {
    galleryIndex = (index + slides.length) % slides.length;
    gallery.scrollTo({ left: slides[galleryIndex].offsetLeft - slides[0].offsetLeft, behavior: reduced ? 'instant' : 'smooth' });
  };
  $$('[data-gallery]').forEach(button => button.addEventListener('click', () => slideTo(galleryIndex + Number(button.dataset.gallery))));
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); slideTo(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  gallery.addEventListener('scroll', () => {
    const step = slides[1].offsetLeft - slides[0].offsetLeft;
    const atEnd = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 3;
    galleryIndex = atEnd ? slides.length - 1 : Math.round(gallery.scrollLeft / step);
    $('#galleryNumber').textContent = String(galleryIndex + 1).padStart(2, '0');
    $('.gallery-counter i').style.transform = `scaleX(${(galleryIndex + 1) / slides.length})`;
  }, { passive: true });

})();
