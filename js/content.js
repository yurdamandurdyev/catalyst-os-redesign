(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Routing metadata & styling for interactive chooser
  const routeMeta = {
    efp: {
      name: 'Единый файл правды',
      badge: '01 / Демо бесплатно · 0 ₽ (апгрейд 990 ₽)',
      color: '#00c6ff',
      glow: 'rgba(0, 198, 255, 0.4)',
      btnText: 'Забрать демо (0 ₽)'
    },
    os: {
      name: 'Catalyst OS',
      badge: '02 / Catalyst OS · 9 900 ₽ / мес',
      color: '#2F80ED',
      glow: 'rgba(47, 128, 237, 0.4)',
      btnText: 'Открыть Catalyst OS'
    },
    kurs: {
      name: 'Курс «От чата к агенту»',
      badge: '03 / Курс с Денисом · 29 900 ₽',
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      btnText: 'Программа курса'
    }
  };

  const chooser = $('#chooserForm') || $('.chooser-form');
  const progressStat = $('#choiceProgressStat');
  const progressBar = $('#choiceProgressBar');
  const progressHint = $('#choiceProgressHint');
  const resultContainer = $('#choiceResultContainer') || $('.choice-result');
  const resultBadge = $('#choiceRouteBadge');
  const resultLinkText = $('#choiceLinkText');

  if (chooser) {
    chooser.addEventListener('submit', event => event.preventDefault());
    chooser.addEventListener('change', () => {
      const answers = new FormData(chooser);
      const where = answers.get('where'), want = answers.get('want');
      
      const count = (where ? 1 : 0) + (want ? 1 : 0);
      const percent = count === 2 ? 100 : count === 1 ? 50 : 0;
      
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressStat) progressStat.textContent = `${count} / 2`;

      if (count === 0) {
        if (progressHint) progressHint.textContent = 'Выберите, где вы работаете с нейросетью';
        $('#choiceResult').textContent = 'Выбери ответы на два вопроса выше';
        $('#choiceHint').textContent = 'Подберём один из 3 форматов под твой уровень и задачи.';
        $('#choiceLink').hidden = true;
        if (resultBadge) resultBadge.hidden = true;
        if (resultContainer) resultContainer.classList.remove('has-result');
        return;
      }

      if (count === 1) {
        if (progressHint) progressHint.textContent = where ? 'Шаг 2: выберите желаемый темп' : 'Шаг 1: укажите текущую среду';
        $('#choiceResult').textContent = 'Остался ещё один вопрос выше';
        $('#choiceHint').textContent = where ? 'Выбери желаемый формат во 2-м блоке' : 'Укажи текущую среду в 1-м блоке';
        $('#choiceLink').hidden = true;
        if (resultBadge) resultBadge.hidden = true;
        if (resultContainer) resultContainer.classList.remove('has-result');
        return;
      }

      // Both answered (count === 2)
      if (progressHint) progressHint.textContent = 'Готово! Оптимальный маршрут найден';
      const route = want === 'learn' ? 'kurs' : want === 'ready' && where === 'agent' ? 'os' : 'efp';
      const meta = routeMeta[route] || routeMeta.efp;

      $('#choiceResult').textContent = `Твой путь: ${meta.name}`;
      $('#choiceHint').textContent = where === 'chat' && want === 'ready' 
        ? 'Сначала забрать файл правды, затем подключить готовую базу Catalyst OS.' 
        : 'Оптимальный старт под твой текущий уровень и задачи компании.';
      
      if (resultBadge) {
        resultBadge.textContent = meta.badge;
        resultBadge.hidden = false;
        resultBadge.style.color = meta.color;
        resultBadge.style.borderColor = meta.color;
      }

      if (resultContainer) {
        resultContainer.style.setProperty('--route-color', meta.color);
        resultContainer.style.setProperty('--route-glow', meta.glow);
        resultContainer.classList.add('has-result');
      }

      const choiceLink = $('#choiceLink');
      if (choiceLink) {
        choiceLink.hidden = false;
        choiceLink.href = '#start';
        choiceLink.dataset.route = route;
        if (resultLinkText) resultLinkText.textContent = meta.btnText;
      }
    });

    const choiceLink = $('#choiceLink');
    if (choiceLink) {
      choiceLink.addEventListener('click', event => {
        event.preventDefault();
        const route = event.currentTarget.dataset.route || 'efp';
        const routeMap = { efp: 0, os: 1, kurs: 2 };
        const targetIdx = routeMap[route] !== undefined ? routeMap[route] : 0;
        
        // If 3D view is active, spin to it; otherwise highlight card in grid
        const gridWrap = document.getElementById('pathsGridWrap');
        const is3DActive = gridWrap && gridWrap.hidden;

        if (is3DActive) {
          if (window.warpCarousel) {
            window.warpCarousel.setIndex(targetIdx);
          }
          const target = document.getElementById('start');
          if (target) {
            target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
          }
          setTimeout(() => {
            if (window.warpCarousel && window.warpCarousel.openModal) {
              window.warpCarousel.openModal(targetIdx);
            }
          }, 650);
        } else {
          const targetCard = document.getElementById(`card-${route}`);
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
            targetCard.classList.add('card-target-highlight');
            setTimeout(() => targetCard.classList.remove('card-target-highlight'), 2200);
          } else {
            const target = document.getElementById('start');
            if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
          }
        }
      });
    }
  }

  // Paths View Switcher: "Все 3 пути" vs "3D-орбита"
  const viewGridBtn = $('#viewGridBtn');
  const view3dBtn = $('#view3dBtn');
  const pathsGridWrap = $('#pathsGridWrap');
  const paths3dWrap = $('#paths3dWrap');

  function setPathsView(view) {
    if (view === '3d') {
      if (pathsGridWrap) pathsGridWrap.hidden = true;
      if (paths3dWrap) paths3dWrap.hidden = false;
      if (view3dBtn) {
        view3dBtn.classList.add('active');
        view3dBtn.setAttribute('aria-selected', 'true');
      }
      if (viewGridBtn) {
        viewGridBtn.classList.remove('active');
        viewGridBtn.setAttribute('aria-selected', 'false');
      }
      // Trigger canvas resize
      window.dispatchEvent(new Event('resize'));
    } else {
      if (pathsGridWrap) pathsGridWrap.hidden = false;
      if (paths3dWrap) paths3dWrap.hidden = true;
      if (viewGridBtn) {
        viewGridBtn.classList.add('active');
        viewGridBtn.setAttribute('aria-selected', 'true');
      }
      if (view3dBtn) {
        view3dBtn.classList.remove('active');
        view3dBtn.setAttribute('aria-selected', 'false');
      }
    }
  }

  if (viewGridBtn) viewGridBtn.addEventListener('click', () => setPathsView('grid'));
  if (view3dBtn) view3dBtn.addEventListener('click', () => setPathsView('3d'));

  // Path Cards interactive click & detail triggers
  const routeIdxMap = { efp: 0, os: 1, kurs: 2 };
  $$('.path-detail-trigger').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const pathCode = btn.dataset.path || 'efp';
      const idx = routeIdxMap[pathCode] !== undefined ? routeIdxMap[pathCode] : 0;
      if (window.warpCarousel && window.warpCarousel.openModal) {
        window.warpCarousel.openModal(idx);
      }
    });
  });

  $$('.path-card').forEach(card => {
    card.addEventListener('click', e => {
      // Don't trigger modal if clicking directly on link or button
      if (e.target.closest('a') || e.target.closest('button')) return;
      const pathCode = card.dataset.path || 'efp';
      const idx = routeIdxMap[pathCode] !== undefined ? routeIdxMap[pathCode] : 0;
      if (window.warpCarousel && window.warpCarousel.openModal) {
        window.warpCarousel.openModal(idx);
      }
    });
  });

  const niches = {
    any: 'Деньги, звонки, заявки и команда.',
    retail: 'Выручка, смены и продажи по точкам.',
    horeca: 'Касса, выписка и смены сходятся.',
    services: 'Ни одна заявка не висит до обеда.',
    edu: 'Заявки, оплаты и ответы в одном месте.',
    b2b: 'Отчёт клиенту собирается из его данных.',
    realty: 'Каждый звонок разобран.',
    factory: 'Загрузка и заказы, которые горят.',
    sales: 'Все звонки по чек-листу.',
    integrator: 'Собирай клиентам быстрее.',
    more: 'Подберём пример под твою задачу.'
  };
  $$('[data-niche]').forEach(button => button.addEventListener('click', () => {
    $$('[data-niche]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#nicheResult').textContent = niches[button.dataset.niche];
    $('#nicheLink').href = button.dataset.niche === 'more' ? 'https://t.me/catalystosbot' : 'https://catalystos.ru/os';
    $('#nicheLink').textContent = button.dataset.niche === 'more' ? 'Обсудить задачу ↗' : 'Посмотреть решения ↗';
    if (!reduced) $('#nicheResult').animate([{ opacity: .2, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 350, easing: 'ease-out' });
  }));

  // Prices from the original homepage account_funnel, stored in content/home-source.json.
  const prices = { personal: { 1: 9900, 3: 23760, 12: 83160 }, team: { 1: 29900, 3: 71760, 12: 251160 } };
  const number = value => new Intl.NumberFormat('ru-RU').format(value).replace(/\u00a0/g, ' ');
  let plan = 'personal', months = 1;
  function updatePrice() {
    const team = plan === 'team', total = prices[plan][months];
    $$('[data-plan]').forEach(button => { const active = button.dataset.plan === plan; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    $$('[data-months]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.months) === months)));
    $('#planPrice').textContent = number(total);
    $('#planPeriod').textContent = months === 1 ? '/ месяц' : months === 3 ? '/ 3 месяца' : '/ год';
    $('#billingSummary').textContent = `${number(total / months)} ₽ в месяц. Оплата ${months === 1 ? 'за 1 месяц' : months === 3 ? 'сразу за 3 месяца' : 'сразу за 12 месяцев'}.`;
    $('#planDescription').textContent = team ? 'До пяти доступов для команды и клиентских проектов.' : 'Один доступ для своих проектов и компании.';
    $('#planFeature').textContent = team ? 'Клиентские проекты и приоритетная поддержка' : 'Решения для своей работы';
    if (!reduced) $('.price').animate([{ opacity: .3, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 350, easing: 'ease-out' });
  }
  $$('[data-plan]').forEach(button => button.addEventListener('click', () => { plan = button.dataset.plan; updatePrice(); }));
  $$('[data-months]').forEach(button => button.addEventListener('click', () => { months = Number(button.dataset.months); updatePrice(); }));

  const menuButton = $('.mobile-menu-toggle'), menu = $('#mobileNav');
  const closeMenu = () => { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Открыть навигацию'); };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть навигацию' : 'Открыть навигацию');
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); } });
  document.addEventListener('click', event => { if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu(); });
  addEventListener('resize', () => { if (innerWidth > 900) closeMenu(); });

  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); }
  }), { threshold: .08 });
  $$('.mission-grid, .path-card, .roadmap-start, .roadmap-branches > a, .context-copy, .context-document, .author-grid, .case-study, .niche-layout, .final-paths').forEach(el => {
    if (!reduced) { el.classList.add('reveal'); reveal.observe(el); }
  });
})();
