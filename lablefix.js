(function() {
  'use strict';

  // Инициализация TV-платформы (можно оставить, если нужно; на обычной Lampa не мешает)
  if (Lampa.Platform && Lampa.Platform.tv) {
    Lampa.Platform.tv();
  }

  // Защита от повторного запуска
  if (window.lable_tv_plugin) return;
  window.lable_tv_plugin = true;

  // Локализация
  Lampa.Lang.add({
    lable_tv_caption: {
      ru: 'Сериал',
      en: 'Series',
      uk: 'Серiал'
    }
  });

  // --- Замена текста на карточках ---
  function replaceCardLabels(cards) {
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var typeEl = card.querySelector('.card__type');

      if (typeEl && typeEl.textContent !== 'Сериал') {
        typeEl.textContent = 'Сериал';
        typeEl.style.fontSize = '0.9em';
      }
    }
  }

  // --- Инициализация ---
  function init() {
    var caption = Lampa.Lang.translate('lable_tv_caption');

    // Удаляем старые стили, если есть
    var oldStyle = document.getElementById('lable_tv_styles');
    if (oldStyle) oldStyle.remove();

    // Вставляем новый CSS
    var style = document.createElement('style');
    style.id = 'lable_tv_styles';
    style.textContent = [
      '.card--tv .card__type {',
      '  font-size: 1em;',
      '  color: transparent;',
      '}',
      '.card--tv .card__type::after {',
      '  content: "' + caption + '";',
      '  color: #fff;',
      '  background: #ff4242;',
      '  position: absolute;',
      '  top: 0;',
      '  left: 0;',
      '  padding: 0.4em 0.4em;',
      '  border-radius: 0.3em;',
      '  font-weight: 600;',
      '  font-size: 0.95em;',
      '}'
    ].join('\n');

    document.body.appendChild(style);

    // Применяем к уже существующим карточкам
    replaceCardLabels(document.querySelectorAll('.card--tv'));

    // Наблюдаем за динамически добавленными карточками
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (!mutation.addedNodes.length) return;

        for (var i = 0; i < mutation.addedNodes.length; i++) {
          var node = mutation.addedNodes[i];

          if (node.nodeType === 1) { // ELEMENT_NODE
            // Если сам добавленный элемент — карточка
            if (node.matches && node.matches('.card--tv')) {
              replaceCardLabels([node]);
            }

            // Если внутри добавленного элемента есть карточки
            if (node.querySelectorAll) {
              var innerCards = node.querySelectorAll('.card--tv');
              if (innerCards.length > 0) {
                replaceCardLabels(innerCards);
              }
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // --- Запуск: ждём appready ---
  if (window.appready) {
    init();
  } else {
    Lampa.Listener.follow('app', function(e) {
      if (e.type === 'ready') {
        init();
      }
    });
  }

})();
