(function () {
    'use strict';

    function Rad(object) {
      var network = new Lampa.Reguest();
      var scroll = new Lampa.Scroll({
        mask: true,
        over: true,
        step: 250
      });
      var items = [];
      var html = $('<div></div>');
      var body = $('<div class="category-full"></div>');
      var info;
      var last;
      var waitload;

      this.create = function () {
        var _this = this;

        this.activity.loader(true);
        network.silent(object.url, this.build.bind(this), function () {
          var empty = new Lampa.Empty();
          html.append(empty.render());
          _this.start = empty.start;

          _this.activity.loader(false);

          _this.activity.toggle();
        });
        return this.render();
      };

      this.next = function () {
        var _this2 = this;

        if (waitload) return;

        if (object.page < 1) {
          waitload = true;
          object.page++;
          network.silent(object.url + '?pg=' + object.page, function (result) {
            _this2.append(result);

            if (result.length) waitload = false;
            Lampa.Controller.enable('content');
          });
        }
      };

      this.append = function (data) {
        var _this3 = this;

        data.forEach(function (element) {
          var card = Lampa.Template.get('card', {
            title: element.name,
            release_year: element.time + (element.quality ? ' / ' + element.quality : '')
          });
          card.addClass('card--collection');
          card.find('.card__img').attr('src', element.picture);
          card.on('hover:focus', function () {
            last = card[0];
            scroll.update(card, true);
            info.find('.info__title').text(element.name);
            info.find('.info__title-original').text(element.time + (element.quality ? ' / ' + element.quality : ''));
            var maxrow = Math.ceil(items.length / 7) - 1;
            if (Math.ceil(items.indexOf(card) / 7) >= maxrow) _this3.next();
          });
          card.on('hover:enter', function () {
            var video = {
              title: element.name,
              url: element.video
            };
            Lampa.Player.play(video);
            Lampa.Player.playlist([video]);
          });
          body.append(card);
          items.push(card);
        });
      };

      this.build = function (data) {
        info = Lampa.Template.get('info');
        info.find('.info__rate,.info__right').remove();
        scroll.render().addClass('layer--wheight').data('mheight', info);
        html.append(info);
        html.append(scroll.render());
        this.append(data);
        scroll.append(body);
        this.activity.loader(false);
        this.activity.toggle();
      };

      this.start = function () {
        Lampa.Controller.add('content', {
          toggle: function toggle() {
            Lampa.Controller.collectionSet(scroll.render());
            Lampa.Controller.collectionFocus(last || false, scroll.render());
          },
          left: function left() {
            if (Navigator.canmove('left')) Navigator.move('left');else Lampa.Controller.toggle('menu');
          },
          right: function right() {
            Navigator.move('right');
          },
          up: function up() {
            if (Navigator.canmove('up')) Navigator.move('up');else Lampa.Controller.toggle('head');
          },
          down: function down() {
            if (Navigator.canmove('down')) Navigator.move('down');
          },
          back: function back() {
            Lampa.Activity.backward();
          }
        });
        Lampa.Controller.toggle('content');
      };

      this.pause = function () {};

      this.stop = function () {};

      this.render = function () {
        return html;
      };

      this.destroy = function () {
        network.clear();
        scroll.destroy();
        if (info) info.remove();
        html.remove();
        body.remove();
        network = null;
        items = null;
        html = null;
        body = null;
        info = null;
      };
    }

    function startRad() {
      window.plugin_Rad_ready = true;
      Lampa.Component.add('Rad', Rad);
      var catalogs = [{
        title: 'Radio Record',
        url: 'http://gitnnm.github.io/p/radio.txt/'
      }];
      Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {var ico = '<svg class="svg svg--nosizes" viewBox="0 0 180 180"> <circle r="50" cx="50" cy="50" fill="white"/> <circle r="50" cx="130" cy="50" fill="gray"/> <circle r="50" cx="50" cy="130" fill="gray"/><circle r="50" cx="130" cy="130" fill="white"/><g fill="none" stroke="none"><path d="M-1,5 H180 M5,-1 V180" stroke-width="10"/><path d="M-1,2 H180 M2,-1 V180" stroke-width="5" stroke-dasharray="1 9"/> <rect width="100%" height="100%" stroke-width="2"/> </g><circle r="5" cx="0" cy="0" fill="teal"/> </svg>';
          var menu_item = $('<li class="menu__item selector focus" data-action="Rad"><div class="menu__ico">' + ico + '</div><div class="menu__text">Р Р°РґРёРѕ</div></li>');
          menu_item.on('hover:enter', function () {
            Lampa.Select.show({
              title: 'РљР°С‚Р°Р»РѕРі',
              items: catalogs,
              onSelect: function onSelect(a) {
                Lampa.Activity.push({
                  url: a.url,
                  title: a.title,
                  component: 'Rad',
                  page: 1
                });
              },
              onBack: function onBack() {
                Lampa.Controller.toggle('menu');
              }
            });
          });
          $('.menu .menu__list').eq(0).append(menu_item);
        }
      });
    }

    if (!window.plugin_Rad_ready) startRad();

})();
