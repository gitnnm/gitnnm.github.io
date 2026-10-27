(function () {
    'use strict';

    if (window.hdrezka_ua_cookie_plugin) return;
    window.hdrezka_ua_cookie_plugin = true;

    var BASE = 'https://rezka-ua.tv';
    var component_name = 'hdrezka_ua';
    var network = new Lampa.Reguest();

    // ---------- Настройки ----------
    function getCookie() {
        return Lampa.Storage.get('hdrezka_ua_cookie', '') || '';
    }

    function addSettings() {
        // Добавляем раздел настроек
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'hdrezka_ua_cookie',
                type: 'input',
                values: '',
                default: '',
                placeholder: 'Вставь cookie с rezka-ua.tv'
            },
            field: {
                name: 'HDrezka UA — Cookie',
                description: 'Открой rezka-ua.tv в браузере, пройди проверку «не бот», скопируй cookie и вставь сюда'
            },
            onChange: function (value) {
                Lampa.Storage.set('hdrezka_ua_cookie', value);
            }
        });
    }

    // ---------- Запрос с cookie ----------
    function request(url, success, error) {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Referer': BASE + '/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
        };

        var cookie = getCookie();
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        network.clear();
        network.timeout(20000);

        // На Android предпочтительнее silent с headers
        network.silent(url, success, error, false, {
            headers: headers
        });
    }

    // ---------- Парсинг поиска ----------
    function parseSearch(html) {
        var items = [];

        // Основной паттерн
        var re = /data-id="(\d+)"[^>]*data-url="([^"]+)"[\s\S]*?<a[^>]*>([^<]+)<\/a>\s*<div[^>]*>([^<]*)<\/div>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            items.push({
                id: m[1],
                url: m[2].indexOf('http') === 0 ? m[2] : BASE + m[2],
                title: m[3].trim(),
                info: (m[4] || '').trim()
            });
        }

        // Запасной
        if (!items.length) {
            re = /<div class="b-content__inline_item"[^>]*data-id="(\d+)"[^>]*data-url="([^"]+)"[\s\S]*?<div class="b-content__inline_item-link">\s*<a[^>]*>([^<]+)<\/a>/gi;
            while ((m = re.exec(html)) !== null) {
                items.push({
                    id: m[1],
                    url: m[2].indexOf('http') === 0 ? m[2] : BASE + m[2],
                    title: m[3].trim(),
                    info: ''
                });
            }
        }

        return items;
    }

    // ---------- Парсинг потоков ----------
    function parseStreams(html) {
        var streams = [];

        // Способ 1: initCDNMoviesEvents / initCDNSeriesEvents
        var cdnMatch = html.match(/initCDN(?:Movies|Series)Events\s*\(\s*\d+\s*,\s*\d+[\s\S]*?(\{[\s\S]*?\})\s*\)\s*;/);
        if (cdnMatch) {
            try {
                var data = JSON.parse(cdnMatch[1]);
                if (data.streams) {
                    var streamRe = /\[([^\]]+)\](https?:\/\/[^,\[]+)/g;
                    var sm;
                    while ((sm = streamRe.exec(data.streams)) !== null) {
                        streams.push({
                            quality: sm[1].trim(),
                            url: sm[2].trim()
                        });
                    }
                }
            } catch (e) {}
        }

        // Способ 2: file: '...'
        if (!streams.length) {
            var fileMatch = html.match(/file\s*:\s*['"]([^'"]+)['"]/);
            if (fileMatch) {
                fileMatch[1].split(',').forEach(function (p) {
                    var qm = p.match(/\[([^\]]+)\](https?:\/\/.+)/);
                    if (qm) {
                        streams.push({
                            quality: qm[1].trim(),
                            url: qm[2].trim()
                        });
                    }
                });
            }
        }

        // Способ 3: "streams": "..."
        if (!streams.length) {
            var alt = html.match(/"streams"\s*:\s*"([^"]+)"/);
            if (alt) {
                var decoded = alt[1].replace(/\\u0026/g, '&');
                var streamRe2 = /\[([^\]]+)\](https?:\/\/[^,\[]+)/g;
                var sm2;
                while ((sm2 = streamRe2.exec(decoded)) !== null) {
                    streams.push({
                        quality: sm2[1].trim(),
                        url: sm2[2].trim()
                    });
                }
            }
        }

        // Сортировка
        var order = {
            '2160p': 1,
            '1440p': 2,
            '1080p Ultra': 3,
            '1080p': 4,
            '720p': 5,
            '480p': 6,
            '360p': 7
        };
        streams.sort(function (a, b) {
            return (order[a.quality] || 99) - (order[b.quality] || 99);
        });

        return streams;
    }

    // ---------- Компонент ----------
    function Component(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var last;

        this.create = function () {
            this.activity.loader(true);

            if (!getCookie()) {
                this.empty('Нужно вставить Cookie.\n\nОткрой rezka-ua.tv в браузере → пройди проверку → скопируй cookie → Настройки Lampa → HDrezka UA — Cookie');
                return this.render();
            }

            this.search();
            return this.render();
        };

        this.search = function () {
            var title = object.movie.title || object.movie.name || '';
            var year = (object.movie.release_date || object.movie.first_air_date || '').substring(0, 4);
            var query = title + (year ? ' ' + year : '');

            var url = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);

            request(url, function (html) {
                // Проверяем, не попали ли снова на антибот
                if (html.indexOf('Проверяем, что вы не бот') !== -1 || html.indexOf('anubis') !== -1) {
                    this.empty('Cookie устарели или неверные.\nОткрой сайт в браузере заново и обнови cookie в настройках.');
                    return;
                }

                var items = parseSearch(html);

                if (!items.length) {
                    this.empty('Ничего не найдено на rezka-ua.tv');
                    return;
                }

                if (items.length === 1) {
                    this.loadMovie(items[0]);
                } else {
                    this.appendResults(items);
                }
            }.bind(this), function () {
                this.empty('Ошибка сети или сайт недоступен');
            }.bind(this));
        };

        this.appendResults = function (items) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();

            items.forEach(function (item) {
                var elem = $('<div class="online selector">' +
                    '<div class="online__title">' + item.title + '</div>' +
                    (item.info ? '<div class="online__info">' + item.info + '</div>' : '') +
                    '</div>');

                elem.on('hover:enter', function () {
                    this.loadMovie(item);
                }.bind(this));

                scroll.append(elem);
            }.bind(this));

            this.activity.toggle();
        };

        this.loadMovie = function (item) {
            this.activity.loader(true);

            request(item.url, function (html) {
                if (html.indexOf('Проверяем, что вы не бот') !== -1) {
                    this.empty('Cookie устарели. Обнови их в настройках.');
                    return;
                }

                var streams = parseStreams(html);

                if (!streams.length) {
                    this.empty('Потоки не найдены.\nВозможно, нужна авторизация или cookie недостаточно.');
                    return;
                }

                this.showQualities(item, streams);
            }.bind(this), function () {
                this.empty('Ошибка загрузки страницы фильма');
            }.bind(this));
        };

        this.showQualities = function (item, streams) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();

            streams.forEach(function (s) {
                var elem = $('<div class="online selector">' +
                    '<div class="online__title">' + s.quality + '</div>' +
                    '</div>');

                elem.on('hover:enter', function () {
                    Lampa.Player.play({
                        title: item.title,
                        url: s.url,
                        quality: s.quality
                    });
                    Lampa.Player.playlist([{
                        title: item.title + ' — ' + s.quality,
                        url: s.url
                    }]);
                });

                scroll.append(elem);
            });

            this.activity.toggle();
        };

        this.empty = function (msg) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();
            scroll.append($('<div class="empty__text" style="padding:20px;white-space:pre-line;">' + (msg || 'Нет данных') + '</div>'));
            this.activity.toggle();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () {
            return scroll.render();
        };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
        };
    }

    // ---------- Кнопка на карточке ----------
    function addButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var render = e.object.activity.render();
                if (render.find('.hdrezka-ua-btn').length) return;

                var btn = $('<div class="full-start__button selector view--online hdrezka-ua-btn">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                    '<span>HDrezka UA</span>' +
                    '</div>');

                btn.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: '',
                        title: 'HDrezka UA — ' + (e.data.movie.title || e.data.movie.name),
                        component: component_name,
                        movie: e.data.movie,
                        page: 1
                    });
                });

                var container = render.find('.full-start-new__buttons, .full-start__buttons, .full-start__button-group').first();
                if (container.length) {
                    container.append(btn);
                } else {
                    render.find('.full-start__title').after(btn);
                }
            }
        });
    }

    // ---------- Запуск ----------
    function startPlugin() {
        Lampa.Component.add(component_name, Component);
        addSettings();
        addButton();
        console.log('[HDrezka UA] Плагин загружен (только cookie, без авторизации)');
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
