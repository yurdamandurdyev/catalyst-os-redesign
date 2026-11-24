(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Same routing rule as catalystos.ru/site/home/mount.js.
  const routeNames = { efp: 'Единый файл правды', os: 'Catalyst OS', kurs: 'Курс «От чата к агенту»' };
  const chooser = $('.chooser-form');
  chooser.addEventListener('submit', event => event.preventDefault());
  chooser.addEventListener('change', () => {
    const answers = new FormData(chooser);
    const where = answers.get('where'), want = answers.get('want');
    if (!where && !want) {
      $('#choiceResult').textContent = 'Выбери ответ на каждый вопрос выше';
      $('#choiceHint').textContent = '';
      $('#choiceLink').hidden = true;
      $('.choice-result').classList.remove('has-result');
      return;
    }
    if (!where || !want) {
      $('#choiceResult').innerHTML = 'Остался <span>1 вопрос</span> выше';
      $('#choiceHint').textContent = where ? 'Теперь укажи, какой результат нужен во 2-м вопросе.' : 'Укажи, где сейчас работаешь с ИИ в 1-м вопросе.';
      $('#choiceLink').hidden = true;
      $('.choice-result').classList.remove('has-result');
      return;
    }
    const route = want === 'learn' ? 'kurs' : want === 'ready' && where === 'agent' ? 'os' : 'efp';
    $('#choiceResult').innerHTML = `Твой путь: <span>${routeNames[route]}</span>`;
    $('#choiceHint').textContent = where === 'chat' && want === 'ready' ? 'Сначала файл, потом Catalyst OS.' : 'Оптимальная точка старта под твои параметры.';
    $('#choiceLink').hidden = false;
    $('#choiceLink').href = `#path-${route}`;
    $('.choice-result').classList.add('has-result');
    $$('.path-card').forEach(card => {
      const selected = card.id === `path-${route}`;
      card.classList.toggle('recommended', selected);
      if (selected) card.setAttribute('aria-label', `Рекомендованный путь: ${routeNames[route]}`);
      else card.removeAttribute('aria-label');
    });
  });
  $('#choiceLink').addEventListener('click', event => {
    event.preventDefault();
    const target = document.querySelector(event.currentTarget.getAttribute('href'));
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    target.classList.add('pulse-focus');
    setTimeout(() => target.classList.remove('pulse-focus'), 1800);
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
