(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Real-time Match Data for Chooser
  const matchData = {
    efp: {
      name: 'Единый файл правды',
      badge: '01 / Быстрый старт · 0 ₽',
      price: '0 ₽',
      period: 'демо бесплатно',
      desc: 'Один файл о компании — нейросеть отвечает строго по твоим правилам без галлюцинаций.',
      bullets: [
        'Файл о компании в формате .MD за один вечер',
        'Работает в любой LLM: ChatGPT, Claude, DeepSeek, Cursor',
        'Мгновенное получение через Telegram-бота'
      ],
      primaryText: 'Забрать демо · 0 ₽',
      primaryHref: 'https://t.me/denis_pleada_bot?start=efp_site',
      secondaryText: 'Опция: полная версия за 990 ₽',
      secondaryHref: 'https://catalystos.ru/efp',
      scrollTarget: '#card-efp',
      color: '#00c6ff',
      glow: 'rgba(0, 198, 255, 0.4)'
    },
    os: {
      name: 'Catalyst OS',
      badge: '02 / Взять готовое · Рекомендуем',
      price: '9 900 ₽',
      period: '/ месяц',
      desc: '1 200+ готовых корпоративных наработок и 370+ навыков по MCP. Решения на твоих данных.',
      bullets: [
        '1 200+ готовых решений и экранов',
        'Подключение к Cursor / Claude Code за 2 минуты',
        'Данные компании остаются строго у вас'
      ],
      primaryText: 'Подключить Catalyst OS',
      primaryHref: 'https://catalystos.ru/os',
      secondaryText: 'Подробнее о библиотеке',
      secondaryHref: '#card-os',
      scrollTarget: '#card-os',
      color: '#2F80ED',
      glow: 'rgba(47, 128, 237, 0.4)'
    },
    kurs: {
      name: 'Курс «От чата к агенту»',
      badge: '03 / Обучение с автором',
      price: '29 900 ₽',
      period: 'за весь курс',
      desc: 'Доведёшь одну конкретную работу компании до проверенного измеримого результата с Денисом Леушиным.',
      bullets: [
        'Личное сопровождение Дениса Леушина',
        'Доведёшь 1 боевую задачу до результата',
        '🎁 В подарок: ЕФП навсегда + 1 месяц Catalyst OS'
      ],
      primaryText: 'Программа курса',
      primaryHref: 'https://catalystos.ru/kurs',
      secondaryText: 'Подробнее о программе',
      secondaryHref: '#card-kurs',
      scrollTarget: '#card-kurs',
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)'
    }
  };

  const chooser = $('#chooserForm') || $('.chooser-form');

  function updateMatchCard() {
      if (!chooser) return;
      const answers = new FormData(chooser);
      const where = answers.get('where');
      const want = answers.get('want');

      const cardEl = $('#chooserResultCard');
      const kickerEl = $('#matchKicker');
      const titleEl = $('#matchTitle');
      const priceBadgeEl = $('#matchPriceBadge');
      const descEl = $('#matchDesc');
      const bulletsEl = $('#matchBullets');
      const actionsEl = $('#matchActions');
      const primaryBtn = $('#matchPrimaryBtn');
      const primaryText = $('#matchPrimaryText');
      const scrollLink = $('#matchScrollLink');

      // State 1: Nothing selected yet (clean default state matching reference Image 3)
      if (!where && !want) {
        if (kickerEl) kickerEl.textContent = 'РЕКОМЕНДАЦИЯ';
        if (titleEl) titleEl.textContent = 'Выбери ответы на два вопроса выше';
        if (priceBadgeEl) priceBadgeEl.hidden = true;
        if (descEl) descEl.textContent = 'Подберём один из 3 форматов под твой уровень и задачи.';
        if (bulletsEl) bulletsEl.hidden = true;
        if (actionsEl) actionsEl.hidden = true;
        if (cardEl) cardEl.classList.remove('has-match');
        return;
      }

      // State 2: One question answered, waiting for second
      if (!where || !want) {
        if (kickerEl) kickerEl.textContent = 'ПОДБОР В ПРОЦЕССЕ';
        if (titleEl) titleEl.textContent = !where ? 'Остался вопрос 01: Где ты работаешь с ИИ?' : 'Остался вопрос 02: Как ты хочешь двигаться?';
        if (priceBadgeEl) priceBadgeEl.hidden = true;
        if (descEl) descEl.textContent = 'Выбери второй ответ — сразу покажем точный маршрут и кнопку доступа.';
        if (bulletsEl) bulletsEl.hidden = true;
        if (actionsEl) actionsEl.hidden = true;
        if (cardEl) cardEl.classList.remove('has-match');
        return;
      }

      // State 3: Both questions answered — render recommendation
      let route = 'efp';
      if (want === 'learn') {
        route = 'kurs';
      } else if (want === 'ready') {
        route = 'os';
      } else {
        route = 'efp';
      }

      const data = matchData[route] || matchData.efp;

      if (kickerEl) kickerEl.textContent = data.badge;
      if (titleEl) titleEl.textContent = data.name;
      if (priceBadgeEl) {
        priceBadgeEl.hidden = false;
        priceBadgeEl.textContent = data.price + (data.period ? ' · ' + data.period : '');
      }
      if (descEl) descEl.textContent = data.desc;

      if (bulletsEl) {
        bulletsEl.hidden = false;
        bulletsEl.innerHTML = data.bullets.map(b => `
          <li>
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M3 8.5l3.5 3.5 6.5-7"/></svg>
            <span>${b}</span>
          </li>
        `).join('');
      }

      if (actionsEl) actionsEl.hidden = false;
      if (primaryBtn) primaryBtn.href = data.primaryHref;
      if (primaryText) primaryText.textContent = data.primaryText;
      if (scrollLink) scrollLink.href = data.scrollTarget;

      if (cardEl) {
        cardEl.style.setProperty('--match-color', data.color);
        cardEl.style.setProperty('--match-glow', data.glow);
        cardEl.classList.add('has-match');
        cardEl.classList.remove('match-updated');
        void cardEl.offsetWidth; // trigger reflow
        cardEl.classList.add('match-updated');
      }
    }

    if (chooser) {
      chooser.addEventListener('submit', event => event.preventDefault());
      chooser.addEventListener('change', updateMatchCard);
      // Initial populate on load
      updateMatchCard();

      const scrollLink = $('#matchScrollLink');
      if (scrollLink) {
        scrollLink.addEventListener('click', e => {
          const href = scrollLink.getAttribute('href');
          if (href && href.startsWith('#card-')) {
            e.preventDefault();
            const route = href.replace('#card-', '');
            const routeIdxMap = { efp: 0, os: 1, kurs: 2 };
            const targetIdx = routeIdxMap[route] !== undefined ? routeIdxMap[route] : 0;

            const gridWrap = document.getElementById('pathsGridWrap');
            const is3DActive = gridWrap && gridWrap.hidden;

            if (is3DActive && window.warpCarousel) {
              window.warpCarousel.setIndex(targetIdx);
              const startSec = document.getElementById('start');
              if (startSec) startSec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
              setTimeout(() => {
                if (window.warpCarousel && window.warpCarousel.openModal) {
                  window.warpCarousel.openModal(targetIdx);
                }
              }, 650);
            } else {
              const targetCard = document.querySelector(href);
              if (targetCard) {
                targetCard.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
                targetCard.classList.add('card-target-highlight');
                setTimeout(() => targetCard.classList.remove('card-target-highlight'), 2200);
              }
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
