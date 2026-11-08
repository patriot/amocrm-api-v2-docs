/*
 * Общий код архива документации amoCRM API v2.
 *
 * Подключается двумя способами:
 *  - из index.html (просмотрщик) — даёт ему список разделов и вспомогательные функции;
 *  - из каждой страницы docs/*.html — когда страница открыта отдельно (не в просмотрщике),
 *    переписывает ссылки на сайт amoCRM на файлы архива и заменяет меню сайта разделами архива.
 */
(function () {
  'use strict';

  var GROUPS = [
    { title: 'REST API', docs: [
      { slug: 'account', name: 'Аккаунт' },
      { slug: 'auth', name: 'Авторизация' },
      { slug: 'companies', name: 'Компании' },
      { slug: 'contacts', name: 'Контакты' },
      { slug: 'leads', name: 'Сделки' },
      { slug: 'notes', name: 'События (примечания)' },
      { slug: 'tasks', name: 'Задачи' },
      { slug: 'unsorted', name: 'Неразобранное' },
      { slug: 'webhooks', name: 'Webhooks', note: 'на английском' },
      { slug: 'customers', name: 'Покупатели' },
      { slug: 'custom_fields', name: 'Дополнительные поля' },
      { slug: 'widgets', name: 'Виджеты' },
      { slug: 'pipelines', name: 'Воронки и этапы продаж' }
    ] },
    { title: 'Списки', docs: [
      { slug: 'catalogs', name: 'Списки' },
      { slug: 'catalog-elements', name: 'Элементы списков' },
      { slug: 'products', name: 'Товары' }
    ] },
    { title: 'Телефония', docs: [
      { slug: 'calls-add', name: 'Логирование звонков' },
      { slug: 'call-event', name: 'Уведомление о звонке' }
    ] },
    { title: 'Справка', docs: [
      { slug: 'errors', name: 'Коды ошибок' },
      { slug: 'recommendations', name: 'Ограничения и рекомендации' }
    ] }
  ];

  // Адреса страниц на сайте amoCRM -> локальные файлы архива.
  var URL_MAP = {
    'api/account': 'account',
    'api/auth': 'auth',
    'api/companies': 'companies',
    'api/contacts': 'contacts',
    'api/leads': 'leads',
    'api/notes': 'notes',
    'api/tasks': 'tasks',
    'api/unsorted': 'unsorted',
    'api/webhooks': 'webhooks',
    'api/webhooks-2': 'webhooks',
    'api/customers': 'customers',
    'api/custom_fields': 'custom_fields',
    'api/widgets': 'widgets',
    'api/pipelines': 'pipelines',
    'api/errors': 'errors',
    'api/recommendations': 'recommendations',
    'catalogs/catalogs': 'catalogs',
    'catalogs/elements': 'catalog-elements',
    'catalogs/products': 'products',
    'telephony/calls_add': 'calls-add',
    'telephony/call_event': 'call-event'
  };

  // Подсветка текущего раздела в меню сайта и сворачивание групп.
  var BASE_CSS = [
    '.amo-archive-nav .amo-archive-current { font-weight: 700 !important; text-decoration: underline !important; text-underline-offset: 3px; }',
    '.amo-archive-nav .amo-archive-group { display: block !important; }',
    '.amo-archive-nav .amo-archive-group.amo-archive-collapsed { display: none !important; }',
    '.amo-archive-nav .amo-archive-toggle-open .icon-arrow-down::before { transform: rotate(180deg); }'
  ].join('\n');

  var DOCS = {};
  GROUPS.forEach(function (g) { g.docs.forEach(function (d) { DOCS[d.slug] = d; }); });

  /** Абсолютный адрес страницы amoCRM -> { slug, anchor } раздела архива или null. */
  function resolve(href) {
    var url;
    try { url = new URL(href); } catch (e) { return null; }
    if (!/(^|\.)amocrm\.(ru|com)$/.test(url.hostname)) return null;
    var m = url.pathname.match(/\/developers\/content\/([^/]+)\/([^/]+)\/?$/);
    var slug = m && URL_MAP[m[1] + '/' + m[2]];
    if (!slug) return null;
    return { slug: slug, anchor: url.hash ? decodeURIComponent(url.hash.slice(1)) : '' };
  }

  function injectBaseCss(doc) {
    if (doc.getElementById('amo-archive-base')) return;
    var style = doc.createElement('style');
    style.id = 'amo-archive-base';
    style.textContent = BASE_CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }

  /**
   * Боковое меню сохранённых страниц — это меню актуальной документации amoCRM (API v4),
   * которой в архиве нет. Заменяем его пункты разделами архива, сохраняя разметку сайта.
   * hrefFor(slug) возвращает адрес ссылки на раздел.
   */
  function buildSiteNav(doc, currentSlug, hrefFor) {
    var ruNav = doc.querySelector('nav.nav_aside');
    var comNav = !ruNav && doc.querySelector('.page-aside nav.nav');
    var host = ruNav || comNav;
    if (!host) return;
    host.classList.add('amo-archive-nav');
    var mk = function (tag, cls, text) {
      var n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    var list = mk('ul', ruNav ? 'nav_aside__list custom_list' : 'custom_list nav__list');
    GROUPS.forEach(function (g) {
      var li, head, sub;
      if (ruNav) {
        li = mk('li', 'nav_aside__item colapse_block');
        head = mk('a', 'nav_aside__item_link colapse_toggler', g.title + ' ');
        head.setAttribute('href', '#');
        head.appendChild(mk('span', 'icon-arrow-down'));
        sub = mk('ul', 'nav_aside__sub_list custom_list colapse_content');
      } else {
        li = mk('li', 'nav__item expander-item text-style--list-heading');
        head = mk('a', 'nav__link nav__link-expander text-bold', g.title);
        sub = mk('ul', 'nav__list nav__list--embedded nav__list--active');
      }
      head.setAttribute('data-archive-toggle', '');
      sub.classList.add('amo-archive-group');
      // Раскрыта только группа текущего раздела.
      var open = g.docs.some(function (d) { return d.slug === currentSlug; });
      setGroupOpen(head, sub, open);
      g.docs.forEach(function (d) {
        var item = mk('li', ruNav ? 'nav_aside__subitem' : 'nav__item text-style--list-subheading');
        var a = mk('a', ruNav ? 'nav_aside__subitem_link' : 'nav__link', d.name);
        a.setAttribute('href', hrefFor(d.slug));
        a.setAttribute('data-archive-slug', d.slug);
        if (d.slug === currentSlug) {
          a.classList.add('amo-archive-current');
          if (!ruNav) item.classList.add('nav__item--active');
        }
        item.appendChild(a);
        sub.appendChild(item);
      });
      li.appendChild(head);
      li.appendChild(sub);
      list.appendChild(li);
    });
    host.textContent = '';
    host.appendChild(list);
  }

  function setGroupOpen(head, sub, open) {
    sub.classList.toggle('amo-archive-collapsed', !open);
    head.classList.toggle('amo-archive-toggle-open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /** Клик по заголовку группы: раскрыть её и свернуть остальные (или свернуть, если уже раскрыта). */
  function toggleGroup(head) {
    var nav = head.closest('.amo-archive-nav');
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('[data-archive-toggle]'), function (h) {
      var sub = h.parentNode.querySelector('.amo-archive-group');
      if (!sub) return;
      var open = h === head ? sub.classList.contains('amo-archive-collapsed') : false;
      setGroupOpen(h, sub, open);
    });
  }

  function findAnchor(doc, name) {
    if (!name) return null;
    return doc.getElementById(name) || doc.getElementsByName(name)[0] || null;
  }

  /** Поиск сайта amoCRM недоступен — ищем текст из формы поиска на текущей странице. */
  function searchOnPage(form, win) {
    var input = form.querySelector('input[type="search"], input[name="s"]');
    var q = input && input.value.trim();
    if (!q) return;
    try {
      if (!win.find(q, false, false, true)) win.alert('На этой странице «' + q + '» не найдено.');
    } catch (e) { /* window.find есть не во всех браузерах */ }
  }

  window.AmoArchive = {
    GROUPS: GROUPS,
    DOCS: DOCS,
    resolve: resolve,
    injectBaseCss: injectBaseCss,
    buildSiteNav: buildSiteNav,
    toggleGroup: toggleGroup,
    findAnchor: findAnchor,
    searchOnPage: searchOnPage
  };

  /* ---------- Страница docs/*.html, открытая отдельно ---------- */

  var page = location.pathname.match(/\/docs\/([^/]+)\.html$/);
  if (!page) return;
  // В просмотрщике ссылки обрабатывает сам просмотрщик.
  try { if (window.parent !== window && window.parent.AmoViewer) return; } catch (e) { /* другой origin */ }

  var currentSlug = decodeURIComponent(page[1]);
  var pageUrl = location.href.split('#')[0];
  var docUrl = function (slug, anchor) {
    return new URL(encodeURIComponent(slug) + '.html' + (anchor ? '#' + encodeURIComponent(anchor) : ''), pageUrl).href;
  };

  function enhance() {
    injectBaseCss(document);
    buildSiteNav(document, currentSlug, function (slug) { return docUrl(slug); });

    // Переписываем сами адреса ссылок: так работают и обычный клик, и «открыть в новой вкладке».
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      if (a.hasAttribute('data-archive-slug')) return;
      var raw = a.getAttribute('href') || '';
      if (raw === '#' || /^javascript:/i.test(raw)) return;
      if (raw.charAt(0) === '#') {
        // Из-за <base href> на сайт amoCRM якорь иначе уводит на чужую страницу.
        a.setAttribute('href', pageUrl + raw);
        return;
      }
      var r = resolve(a.href);
      if (r) {
        a.setAttribute('href', docUrl(r.slug, r.anchor));
        a.removeAttribute('target');
      } else if (/^https?:$/.test(a.protocol) && a.host !== location.host) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      }
    });

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      var toggle = e.target.closest && e.target.closest('[data-archive-toggle]');
      if (toggle) { e.preventDefault(); toggleGroup(toggle); return; }
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var raw = a.getAttribute('href') || '';
      if (raw === '#' || /^javascript:/i.test(raw)) e.preventDefault();
    }, true);

    document.addEventListener('submit', function (e) {
      e.preventDefault();
      searchOnPage(e.target, window);
    }, true);

    // Ссылка обратно в просмотрщик.
    var back = document.createElement('a');
    back.href = new URL('../index.html#' + encodeURIComponent(currentSlug), pageUrl).href;
    back.textContent = '☰ Все разделы архива';
    back.title = 'Открыть в просмотрщике документации с оглавлением';
    back.setAttribute('style', [
      'position:fixed', 'left:16px', 'bottom:16px', 'z-index:2147483646',
      'padding:8px 14px', 'border-radius:20px', 'background:#fff', 'color:#1f2933',
      'font:14px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
      'text-decoration:none', 'box-shadow:0 2px 10px rgba(0,0,0,.25)'
    ].join(';'));
    document.body.appendChild(back);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance);
  else enhance();
})();
