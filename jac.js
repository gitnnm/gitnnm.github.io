/**
 * Jackett Selector Plugin (Deobfuscated & origin-check removed)
 * -----------------------------------------------------------------
 * Убирает проверку Lampa.Manifest.origin === 'bylampa' — теперь плагин разрешён для всех сред.
 * Сохраняет основную функциональность: добавляет параметр выбора "парсера" в настройки,
 * отображает список известных Jackett-инстансов, проверяет их статус и сохраняет выбор.
 */

(function() {
  'use strict';

  // Работает в режиме TV платформы
  Lampa.Platform.tv();

  // Защита от повторной инициализации
  if (window.jackett_plugin) return;
  window.jackett_plugin = true;

  // Включаем использование парсера по умолчанию
  Lampa.Settings.set('parser_use', true);

  // Список известных инстансов и примечания
  var protocol = location.protocol === 'https:' ? 'https://' : 'http://';
  var hosts = [
    '62.60.149.237:2601',
    '62.60.149.237:9117',
    'jac-red.ru',
    'jr.maxvol.pro',
    'jacred.pro',
    'jacred.viewbox.dev',
    'jacred.xyz',
    'jacblack.ru:9117'
  ];

  var titles = [
    'Lampa32', 'ByLampa Jackett', 'Jacred.ru', 'Jacred Maxvol Pro',
    'Jacred RU', 'Jacred Viewbox Dev', 'Jacred.xyz', 'Jac Black'
  ];

  // Параметры конфигурации (по-умолчанию)
  function ensureDefaults() {
    if (!Lampa.Settings.get('jackett_url')) Lampa.Settings.set('jackett_url', 'jacred.xyz');
    if (!Lampa.Settings.get('jackett_urltwo')) Lampa.Settings.set('jackett_urltwo', 'jacred_xyz');
    if (Lampa.Storage.get('jackett_key') === null) Lampa.Storage.set('jackett_key', '');
    if (Lampa.Settings.get('jackett_interview') === undefined) Lampa.Settings.set('jackett_interview', '');
  }

  ensureDefaults();

  // Функция проверки статуса инстанса (делает запрос к /api/v2.0/indexers/status:healthy/results?apikey=...)
  function checkInstance(host, title, apiKey) {
    return new Promise(function(resolve) {
      var proto = (host === 'jr.maxvol.pro') ? 'https://' : protocol;
      var apikey = host === '62.60.149.237:2601' ? '777' : (apiKey || '');
      var url = proto + host + '/api/v2.0/indexers/status:healthy/results?apikey=' + apikey;

      var xhr = new XMLHttpRequest();
      xhr.timeout = 3000;
      xhr.open('GET', url, true);

      xhr.onload = function() {
        if (xhr.status === 200) {
          resolve(Object.assign({}, { title: '✔️ ' + title }, { url: host, url_two: host }));
        } else {
          resolve(Object.assign({}, { title: '✖️ ' + title }, { url: host, url_two: host }));
        }
      };

      xhr.onerror = xhr.ontimeout = function() {
        resolve(Object.assign({}, { title: '✖️ ' + title }, { url: host, url_two: host }));
      };

      try { xhr.send(); } catch (e) { resolve(Object.assign({}, { title: '✖️ ' + title }, { url: host, url_two: host })); }
    });
  }

  // Собираем список опций и показываем Select
  function showSelector() {
    // Базовый список (пара объектов)
    var base = [
      { title: 'Lampa32', url: '62.60.149.237:2601', url_two: '62.60.149.237:2601', jac_key: '', jac_int: 'healthy', jac_lang: 'lg' },
      { title: 'ByLampa Jackett', url: '62.60.149.237:9117', url_two: '62.60.149.237:9117', jac_key: '777', jac_int: 'all', jac_lang: 'df' }
    ];

    // Добавим остальные hosts как набор промисов с проверкой
    var promises = hosts.map(function(h, idx) {
      return checkInstance(h, titles[idx], (h === '62.60.149.237:2601' ? '777' : ''));
    });

    Promise.all(promises).then(function(results) {
      // Преобразуем в нужный формат для Lampa.Select
      var items = results.map(function(r) {
        return {
          title: r.title.replace(/^✔️ |^✖️ /, ''),
          url: r.url,
          url_two: r.url_two,
          jac_key: Lampa.Storage.get('jackett_key') || '',
          jac_int: Lampa.Settings.get('jackett_interview') || '',
          jac_lang: Lampa.Settings.get('jackett_lang') || 'lg'
        };
      });

      Lampa.Select.show({
        title: 'Меню смены парсера',
        items: items,
        onBack: function() {
          Lampa.Activity.back();
        },
        onSelect: function(item) {
          Lampa.Settings.set('jackett_url', item.url);
          Lampa.Settings.set('jackett_urltwo', item.url_two);
          Lampa.Storage.set('jackett_key', item.jac_key || '');
          Lampa.Settings.set('jackett_interview', item.jac_int || '');
          Lampa.Settings.set('jackett_lang', item.jac_lang || 'lg');
          Lampa.Settings.set('parser_use', true);

          // Сохраняем и возвращаемся назад
          setTimeout(function() { window.activity.back(); }, 300);
          setTimeout(function() { Lampa.Controller.addHistory(Lampa.Settings.get('jackett_url')); }, 500);
        }
      });
    }).catch(function(e) {
      console.error('Jackett: error building select', e);
    });
  }

  // Регистрация параметра в настройках
  Lampa.Settings.addParam({
    component: 'settings_component',
    param: {
      name: 'parser',
      type: 'select',
      values: {
        no_parser: 'Свой вариант',
        jac_lampa32_ru: 'Lampa32',
        bylampa_jackett: 'ByLampa Jackett',
        jacred_xyz: 'Jacred.xyz',
        jr_maxvol_pro: 'Jacred Maxvol Pro',
        jacred_ru: 'Jacred RU',
        jacred_viewbox_dev: 'Jacred Viewbox Dev',
        jacred_pro: 'Jacred Pro',
        jac_black: 'Jac Black'
      },
      default: 'jacred_xyz'
    },
    field: {
      name: 'jackett_url',
      description: 'Нажмите для выбора парсера из списка'
    },
    onChange: function() {
      ensureDefaults();
      Lampa.Activity.update();
    },
    onRender: function(component) {
      setTimeout(function() {
        // Слушаем клики по селектору
        $('body').on('hover:enter', function() {
          Lampa.Activity.update();
        });

        if (localStorage.getItem('parser') !== 'Свой вариант') {
          $('div[data-name=\"jackett_url\"]').show();
        }

        if (Lampa.Storage.get('parser_use') && Lampa.Settings.get('parser') == 'parser') {
          component.show();
        } else {
          component.hide();
        }
      }, 5);
    }
  });

  // Слушаем открытие настроек
  Lampa.Settings.listener.follow('open', function(e) {
    if (e.component == 'settings_component') {
      e.body.find('[data-name=\"jackett_url2\"]').show();
    }
  });

  // Слушаем изменение storage и показываем/скрываем дополнительные поля
  Lampa.Storage.listener.follow('change', function(e) {
    if (Lampa.Storage.get('parser_use') !== 'parser') {
      $('div[data-name=\"jackett_urltwo\"]').hide();
    } else {
      $('div[data-name=\"jackett_urltwo\"]').show().insertAfter('div[data-name=\"parser_torrent_type\"]');
    }
  });

  // При инициализации — убедимся, что настройки заполнены и добавим наблюдатель, если нужно
  var interval = setInterval(function() {
    if (typeof Lampa !== 'undefined') {
      clearInterval(interval);
      ensureDefaults();
      // Если ещё не включён — покажем селектор при старте приложения
      // (без проверки origin — разрешено везде)
      showSelector();
    }
  }, 100);

  // Следим за активностью Controller и при переключении на torrents — показываем наш список
  Lampa.Settings.listener.follow('change', function(e) {
    if (e.name == 'parser') {
      if (Lampa.Controller.activity().component == 'torrents') {
        showSelector();
      }
    }
  });

})();
