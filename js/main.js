/* CATALYST OS — interactions */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const fmt = n => Math.round(n).toLocaleString('ru-RU');

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !reduce) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1) { const el = $(id); if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -80 }); closeMenu(); } }
    }));
  }

  /* ---------- preloader ---------- */
  const pre = $('#preloader');
  function heroIntro() {
    const heroReveals = $$('.hero__copy [data-reveal]');
    if (!hasGsap || reduce) {
      $$('.hero__title .word').forEach(w => w.style.transform = 'none');
      heroReveals.forEach(el => el.classList.add('is-in'));
      return;
    }
    gsap.set(heroReveals, { transition: 'none' });
    gsap.fromTo('.hero__title .word', { yPercent: 115, rotateX: -40 }, { yPercent: 0, rotateX: 0, duration: 1.1, stagger: 0.09, ease: 'power4.out', delay: 0.1 });
    gsap.fromTo(heroReveals, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, delay: 0.95, ease: 'power3.out' });
    gsap.fromTo('.hero__visual', { opacity: 0, scale: 0.92, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 1.3, ease: 'power3.out', delay: 0.35 });
    gsap.fromTo('.float-chip', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.8, stagger: 0.12, ease: 'back.out(2)', delay: 0.9 });
  }
  if (pre) {
    if (reduce || !hasGsap) { pre.classList.add('is-done'); heroIntro(); }
    else {
      const pct = $('#preloaderPct'), bar = $('#preloaderBar');
      const o = { v: 0 };
      gsap.to(o, {
        v: 100, duration: 1.5, ease: 'power2.inOut',
        onUpdate: () => { pct.textContent = Math.round(o.v); bar.style.width = o.v + '%'; },
        onComplete: () => { pre.classList.add('is-done'); heroIntro(); setTimeout(() => pre.remove(), 700); }
      });
    }
  } else heroIntro();

  /* ---------- reveals (IO + CSS) ---------- */
  const io = new IntersectionObserver(entries => {
    let i = 0;
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.style.transitionDelay = (i++ % 6) * 0.07 + 's';
        en.target.classList.add('is-in');
        io.unobserve(en.target);
        if (en.target.classList.contains('scramble')) scramble(en.target);
        $$('.scramble', en.target).forEach(scramble);
        $$('[data-count]', en.target).forEach(runCount);
        if (en.target.hasAttribute('data-count')) runCount(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach(el => { if (!el.closest('.hero__copy')) io.observe(el); });
  $$('.scramble').forEach(el => { if (!el.closest('[data-reveal]')) io.observe(el); });
  $$('[data-count]').forEach(el => { if (!el.closest('[data-reveal]')) io.observe(el); });
  const osWin = $('.os-window'); if (osWin) io.observe(osWin);

  /* ---------- scramble ---------- */
  const GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ01#/⚡✦';
  function scramble(el) {
    if (reduce || el.dataset.done) return;
    el.dataset.done = '1';
    const final = el.dataset.text || el.textContent;
    let frame = 0;
    const total = final.length * 2 + 8;
    const tick = () => {
      let out = '';
      for (let i = 0; i < final.length; i++) {
        if (final[i] === ' ') { out += ' '; continue; }
        out += frame / 2 > i ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (frame++ < total) requestAnimationFrame(tick); else el.textContent = final;
    };
    tick();
  }

  /* ---------- counters ---------- */
  function runCount(el) {
    if (el.dataset.done) return; el.dataset.done = '1';
    const target = parseFloat(el.dataset.count);
    const money = el.dataset.format === 'money';
    if (reduce || !hasGsap) { el.textContent = money ? fmt(target) : fmt(target); return; }
    const o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.8, ease: 'power2.out', onUpdate: () => el.textContent = fmt(o.v) });
  }

  /* ---------- nav ---------- */
  const nav = $('#nav');
  let lastY = 0;
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 30);
    if (y > 400 && y > lastY + 6) nav.classList.add('is-hidden');
    else if (y < lastY - 6 || y < 400) nav.classList.remove('is-hidden');
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- mobile menu ---------- */
  const burger = $('#burger'), menu = $('#mobileMenu');
  function closeMenu() { burger.classList.remove('is-open'); menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- cursor ---------- */
  const cur = $('#cursor');
  if (cur && matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce) {
    const dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', e => { if (!e.clientX && !e.clientY) return; x = e.clientX; y = e.clientY; cur.classList.add('is-on'); dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; }, { passive: true });
    (function loop() { rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    document.addEventListener('pointerover', e => { cur.classList.toggle('is-hover', !!e.target.closest('a,button,[data-cursor],summary')); });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  }

  /* ---------- magnetic ---------- */
  if (!reduce && matchMedia('(hover:hover)').matches) $$('.magnetic').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${mx * 0.22}px,${my * 0.3}px)`;
    });
    btn.addEventListener('pointerleave', () => btn.style.transform = '');
  });

  /* ---------- tilt ---------- */
  if (!reduce && matchMedia('(hover:hover)').matches) $$('.tilt').forEach(card => {
    let raf = null;
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { card.style.transform = `perspective(1000px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateZ(0)`; });
    });
    card.addEventListener('pointerleave', () => { if (raf) cancelAnimationFrame(raf); card.style.transform = ''; });
  });

  /* ---------- float chips ---------- */
  if (hasGsap && !reduce) $$('.float-chip').forEach((c, i) => {
    gsap.to(c, { y: i % 2 ? 14 : -14, duration: 2.6 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  });

  /* ---------- departments ---------- */
  const DEPTS = [
    { id: 'd1', label: 'Продажи', color: '#ff7a1a', items: [['Планировщик продаж', 'Успеваем ли к цели месяца?'], ['Возвращатель клиентов', 'Какие «нецелевые» заявки стоит вернуть?'], ['Аналитик рынка', 'Где наша цена среди рынка?'], ['Сделочник', 'Что дальше по сделке?'], ['Помощник перед звонком', 'Что знать до звонка?'], ['Контролёр КП', 'Сколько КП без ответа?'], ['Повторные продажи', 'Какая доля повторных заказов?'], ['Следопыт чека', 'Какой средний чек сейчас?'], ['Разбор потерь', 'Где сделки закрылись пустыми?'], ['Оптовик', 'Где теряем оптовую заявку?'], ['Хронометр сделки', 'Сколько дней живёт сделка?'], ['Спецификация', 'Какая позиция без цены?'], ['Доля побед', 'Какая доля сделок выиграна?']] },
    { id: 'd0', label: 'Деньги', color: '#d7ff5f', items: [['Казначей', 'Хватит ли денег до конца месяца?'], ['Аудитор прибыли', 'Куда утекает прибыль?'], ['Экономист', 'Какая выручка покрывает расходы?'], ['Расчётчик зарплаты', 'Сколько каждому к выплате?'], ['Дебиторщик', 'Кто нам должен и сколько?'], ['Кредиторщик', 'Кому мы должны и когда?'], ['Резервист налога', 'Сколько отложить на налог?'], ['Контролёр скидок', 'Сколько съели скидки?'], ['Маржинальщик', 'Где товар без маржи?'], ['Контролёр комиссии', 'Сколько забирает эквайринг?'], ['Сметчик закупки', 'Хватит ли бюджета закупки?'], ['Сметчик заказа', 'Какая маржа этого заказа?'], ['Учётчик возвратов', 'Сколько вернули покупателям?'], ['Контролёр расходов', 'Где расход выше плана?']] },
    { id: 'd4', label: 'Маркетинг', color: '#f5c518', items: [['Маркетолог каналов', 'Сколько стоит продажа в канале?'], ['Счётчик лида', 'Сколько стоит один лид?'], ['Окупаемость канала', 'Какой канал покрывает расход?'], ['Разбор пути заявки', 'Где заявка не стала заказом?'], ['Сезонник', 'Какой месяц даёт выручку?'], ['Доля новых', 'Какая доля клиентов новая?'], ['Учётчик акции', 'Что акция дала к неделе?'], ['Ценовик', 'Какую цену ставить?'], ['Учётчик упоминаний', 'Кого называют рядом с нами?']] },
    { id: 'd5', label: 'Звонки', color: '#3b6cff', items: [['Звонки', 'Где теряем клиента в разговоре?'], ['Калибровщик ОКК', 'Можно ли верить баллам ИИ?'], ['Разбор возражений', 'Какие возражения звучат чаще?'], ['Проверка скрипта', 'Какие шаги скрипта пропущены?'], ['Дежурный пропусков', 'Сколько звонков не дождались?'], ['Напоминатель перезвона', 'Какие перезвоны уже просрочены?'], ['Доля целевых', 'Какая доля звонков целевая?'], ['Хронометр разговора', 'Какая длина разговора типична?']] },
    { id: 'd6', label: 'ИТ и данные', color: '#22c55e', items: [['Сверщик таблиц', 'Где две таблицы не сходятся?'], ['Паспортист данных', 'Откуда число на экране?'], ['Контролёр полей', 'В каких строках пусто поле?'], ['Судья ответа', 'Есть ли в ответе обязательные поля?'], ['Связи таблиц', 'Какой ключ не находится?'], ['Свежесть данных', 'Какая выгрузка старше порога?'], ['Нормировщик', 'Какой норматив старше срока?'], ['Справочник статусов', 'Какие статусы не из списка?']] },
    { id: 'd2', label: 'Операции', color: '#a3e635', items: [['Товаровед', 'Какие товары ушли из каталога?'], ['Срок заказа', 'Сколько дней от заказа до выдачи?'], ['Учётчик брака', 'Какая доля брака в цехе?'], ['Загрузка цеха', 'Хватает ли часов цеха?'], ['Кладовщик', 'На сколько дней хватит остатка?'], ['Снабженец', 'Какие поставки опаздывают?'], ['Менеджер внедрения', 'Что блокирует запуск проекта?'], ['Мастер смены', 'Сколько изделий закрыла смена?'], ['Учётчик рекламаций', 'Сколько рекламаций на сто заказов?'], ['Комплектовщик', 'Чего не хватает к сборке?'], ['Простой станка', 'Сколько часов станок стоял?'], ['Срок поставки', 'Какой срок поставки против факта?']] },
    { id: 'd3', label: 'Команда', color: '#a78bfa', items: [['Рекрутёр', 'Где теряем кандидатов?'], ['Экзаменатор', 'Кто сдал и чему научился?'], ['Руководитель отдела', 'Где перегруз по часам?'], ['Срок испытания', 'Сколько дней до конца испытания?'], ['Дыры в сменах', 'Где смена без человека?'], ['Тренер ввода', 'Сколько дней до допуска?'], ['Учётчик текучести', 'Сколько людей ушло за квартал?'], ['Фонд оплаты', 'Какая доля выручки на оплату?'], ['Помощник сотрудника', 'Что мне сегодня сделать?'], ['Личный планировщик', 'Какие задачи горят у меня?']] },
    { id: 'd7', label: 'Заявки', color: '#22d3ee', items: [['Диспетчер заявок', 'Сколько заявка ждёт ответа?'], ['Администратор записи', 'Где окно у мастера?'], ['Повторные обращения', 'Какие темы возвращаются?'], ['Закрыватель дня', 'Сколько обращений закрыто за день?'], ['Менеджер кабинета', 'Что клиенту на согласование?'], ['Разносчик заявок', 'Откуда пришла заявка сегодня?']] },
    { id: 'd9', label: 'Контент', color: '#f472b6', items: [['Редактор витрины', 'Какой текст ещё черновик?'], ['Ритм публикаций', 'Вышел ли пост по плану?'], ['Разбор отзывов', 'Какие темы в отзывах повторяются?'], ['Оффер страницы', 'Какое обещание не подтверждено?'], ['Автор карточки', 'Чем карточка расходится с фактом?'], ['Календарь тем', 'Какие темы без материала?']] },
    { id: 'd8', label: 'Собственник', color: '#6ea8ff', items: [['Аналитик собственника', 'Какие пять чисел держат бизнес?'], ['Сводка недели', 'Что изменилось за неделю?'], ['Составитель отчётов', 'Какой отчёт нужен руководителю?'], ['Фокус месяца', 'Какая одна ставка месяца?'], ['Журнал решений', 'Какие решения ждут срока?'], ['Сигнал отклонений', 'Какие числа ушли от плана?']] },
    { id: 'd10', label: 'Юристы', color: '#94a3b8', items: [['Контролёр сроков', 'Какой договор скоро кончится?'], ['Сверка договора', 'Каких пунктов нет в черновике?'], ['Акты без подписи', 'Какие акты ждут подписи?'], ['Срок претензии', 'Какие претензии старше срока?'], ['Пролонгация', 'Что продлевать в этом месяце?']] },
    { id: 'd11', label: 'Документы', color: '#2dd4bf', items: [['Архивариус', 'Где лежит нужный документ?'], ['Хранитель правил', 'Какое правило поменялось?'], ['Аудитор доступа', 'Что читали в Едином файле правды?'], ['Комплектовщик документов', 'Каких документов не хватает?']] }
  ];
  const pillsWrap = $('#deptPills'), grid = $('#deptGrid');
  const total = DEPTS.reduce((s, d) => s + d.items.length, 0);
  const totalEl = $('#deptTotal'); if (totalEl) totalEl.textContent = total;
  let activeDept = DEPTS[0].id;

  DEPTS.forEach(d => {
    const b = document.createElement('button');
    b.className = 'dept-pill' + (d.id === activeDept ? ' is-active' : '');
    b.style.setProperty('--dc', d.color);
    b.setAttribute('role', 'tab');
    b.dataset.dept = d.id;
    b.innerHTML = `<i></i>${d.label}<b>${d.items.length}</b>`;
    b.addEventListener('click', () => selectDept(d.id));
    pillsWrap.appendChild(b);
  });

  function selectDept(id) {
    activeDept = id;
    $$('.dept-pill', pillsWrap).forEach(p => p.classList.toggle('is-active', p.dataset.dept === id));
    renderDept(DEPTS.find(d => d.id === id));
  }
  function renderDept(d) {
    grid.innerHTML = '';
    d.items.forEach((it, i) => {
      const c = document.createElement('article');
      c.className = 'emp-card';
      c.style.setProperty('--dc', d.color);
      c.setAttribute('data-cursor', '');
      c.innerHTML = `<span class="emp-card__idx">${String(i + 1).padStart(2, '0')}</span><div class="emp-card__name"><i></i>${it[0]}</div><p class="emp-card__q">${it[1]}</p>`;
      grid.appendChild(c);
      if (reduce) { c.classList.add('is-in'); }
      else setTimeout(() => c.classList.add('is-in'), 40 + i * 45);
    });
  }
  renderDept(DEPTS[0]);

  /* ---------- connection tabs ---------- */
  $$('.connect__tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.connect__tab').forEach(t => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
    $$('.connect__pane').forEach(p => p.classList.toggle('is-active', p.dataset.pane === tab.dataset.tab));
  }));

  /* ---------- copy ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const code = $('pre code', btn.closest('.code')).textContent;
    const done = () => { btn.textContent = 'Скопировано ✓'; btn.classList.add('is-done'); setTimeout(() => { btn.textContent = 'Скопировать'; btn.classList.remove('is-done'); }, 2000); };
    try { await navigator.clipboard.writeText(code); done(); }
    catch { const ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch {} ta.remove(); }
  }));

  /* ---------- pricing ---------- */
  const PRICES = { ind: { 1: 9900, 3: 23760, 12: 83160 }, com: { 1: 29900, 3: 71760, 12: 251160 } };
  const PER = { 1: 'в месяц', 3: 'за 3 месяца · −20%', 12: 'за год · −30%' };
  const toggle = $('#periodToggle'), slider = $('#periodSlider');
  function moveSlider(btn) { slider.style.width = btn.offsetWidth + 'px'; slider.style.transform = `translateX(${btn.offsetLeft - 5}px)`; }
  function setPeriod(months, btn) {
    $$('button', toggle).forEach(b => b.classList.toggle('is-active', b === btn));
    moveSlider(btn);
    ['ind', 'com'].forEach(k => {
      const el = $(`.plan__num[data-plan="${k}"]`);
      const target = PRICES[k][months];
      if (hasGsap && !reduce) { const o = { v: parseFloat(el.textContent.replace(/\s/g, '')) || 0 }; gsap.to(o, { v: target, duration: 0.6, ease: 'power2.out', onUpdate: () => el.textContent = fmt(o.v) }); }
      else el.textContent = fmt(target);
    });
    $('#perInd').textContent = PER[months];
    $('#perCom').textContent = PER[months];
  }
  $$('button', toggle).forEach(b => b.addEventListener('click', () => setPeriod(b.dataset.period, b)));
  addEventListener('resize', () => { const a = $('button.is-active', toggle); if (a) moveSlider(a); });
  requestAnimationFrame(() => { const a = $('button.is-active', toggle); if (a) moveSlider(a); });

  /* ---------- faq smooth ---------- */
  $$('.faq__item').forEach(item => {
    const sum = $('summary', item), body = $('.faq__body', item);
    sum.addEventListener('click', e => {
      e.preventDefault();
      if (item.open) {
        if (hasGsap && !reduce) gsap.to(body, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => { item.open = false; body.style.height = ''; body.style.opacity = ''; } });
        else item.open = false;
      } else {
        item.open = true;
        if (hasGsap && !reduce) { const h = body.scrollHeight; gsap.fromTo(body, { height: 0, opacity: 0 }, { height: h, opacity: 1, duration: 0.45, ease: 'power2.out', onComplete: () => body.style.height = '' }); }
      }
    });
  });

  /* ---------- report bars ---------- */
  if (osWin) {
    const bio = new IntersectionObserver(en => { if (en[0].isIntersecting) { osWin.classList.add('is-in'); bio.disconnect(); } }, { threshold: 0.3 });
    bio.observe(osWin);
  }
})();
