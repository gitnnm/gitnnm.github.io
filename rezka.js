(function () {
    'use strict';

    if (window.hdrezka_ua_plugin) return;
    window.hdrezka_ua_plugin = true;

    // ========== АКТУАЛЬНЫЕ ЗЕРКАЛА (октябрь 2026) ==========
    var MIRRORS = [
        'https://rezka.ag',
        'https://hdrzk.org',
        'https://rezka.fi',
        'https://hdrezka.ag',
        'https://hdrezka.me',
        'https://rezkify.com',
        'https://rezka-ua.net',
        'https://rezka-kz.tv'
    ];

    var network = new Lampa.Reguest();
    var component_name = 'hdrezka_ua';

    // ---------- Настройки ----------
    function addSettings() {
        Lampa.SettingsApi.addParam({
            component: 'online',
            param: {
                name: 'hdrezka_ua_mirror',
                type: 'select',
                values: (function () {
                    var v = {};
                    MIRRORS.forEach(function (m) { v[m] = m.replace('https://', ''); });
                    return v;
                })(),
                default: MIRRORS[0]
            },
            field: {
                name: 'HDrezka UA — зеркало',
                description: 'Выберите рабочее зеркало HDrezka'
            },
            onChange: function () {
                Lampa.Noty.show('Зеркало HDrezka изменено');
            }
        });
    }

    function getMirror() {
        return Lampa.Storage.get('hdrezka_ua_mirror', MIRRORS[0]).replace(/\/$/, '');
    }

    // ---------- Парсинг поиска ----------
    function parseSearch(html) {
        var items = [];
        var re = /data-id="(\d+)"[^>]*data-url="([^"]+)"[\s\S]*?<a[^>]*>([^<]+)<\/a>\s*<div[^>]*>([^<]*)<\/div>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            items.push({
                id: m[1],
                url: m[2].indexOf('http') === 0 ? m[2] : getMirror() + m[2],
                title: m[3].trim(),
                info: (m[4] || '').trim()
            });
        }
        // запасной вариант
        if (!items.length) {
            re = /<div class="b-content__inline_item"[^>]*data-id="(\d+)"[^>]*data-url="([^"]+)"[\s\S]*?<div class="b-content__inline_item-link">\s*<a[^>]*>([^<]+)<\/a>/gi;
            while ((m = re.exec(html)) !== null) {
                items.push({
                    id: m[1],
                    url: m[2].indexOf('http') === 0 ? m[2] : getMirror() + m[2],
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
        // основной способ
        var cdnMatch = html.match(/initCDN(?:Movies|Series)Events\s*\(\s*\d+\s*,\s*\d+[\s\S]*?(\{[\s\S]*?\})\s*\)\s*;/);
        if (cdnMatch) {
            try {
                var data = JSON.parse(cdnMatch[1]);
                if (data.streams) {
                    var streamRe = /\[([^\]]+)\](https?:\/\/[^,\[]+)/g;
                    var sm;
                    while ((sm = streamRe.exec(data.streams)) !== null) {
                        streams.push({ quality: sm[1].trim(), url: sm[2].trim() });
                    }
                }
            } catch (e) {}
        }

        // запасной способ (file: '...')
        if (!streams.length) {
            var fileMatch = html.match(/file\s*:\s*['"]([^'"]+)['"]/);
            if (fileMatch) {
                var parts = fileMatch[1].split(',');
                parts.forEach(function (p) {
                    var qm = p.match(/\[([^\]]+)\](https?:\/\/.+)/);
                    if (qm) streams.push({ quality: qm[1].trim(), url: qm[2].trim() });
                });
            }
        }

        // ещё один вариант
        if (!streams.length) {
            var alt = html.match(/"streams"\s*:\s*"([^"]+)"/);
            if (alt) {
                var decoded = alt[1].replace(/\\u0026/g, '&');
                var streamRe2 = /\[([^\]]+)\](https?:\/\/[^,\[]+)/g;
                var sm2;
                while ((sm2 = streamRe2.exec(decoded)) !== null) {
                    streams.push({ quality: sm2[1].trim(), url: sm2[2].trim() });
                }
            }
        }

        // сортировка по качеству
        var order = { '2160p': 1, '1440p': 2, '1080p Ultra': 3, '1080p': 4, '720p': 5, '480p': 6, '360p': 7 };
        streams.sort(function (a, b) {
            return (order[a.quality] || 99) - (order[b.quality] || 99);
        });

        return streams;
    }

    // ---------- Компонент ----------
    function Component(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var last;
        var filter = {
            season: 0,
            voice: 0
        };

        this.create = function () {
            this.activity.loader(true);
            this.search();
            return this.render();
        };

        this.search = function () {
            var title = object.movie.title || object.movie.name || '';
            var year = (object.movie.release_date || object.movie.first_air_date || '').substring(0, 4);
            var query = title + (year ? ' ' + year : '');

            var url = getMirror() + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);

            network.clear();
            network.timeout(15000);
            network.silent(url, function (html) {
                var items = parseSearch(html);
                if (!items.length) {
                    this.empty('Ничего не найдено на HDrezka');
                    return;
                }

                // если один результат — сразу открываем
                if (items.length === 1) {
                    this.loadMovie(items[0]);
                } else {
                    this.appendResults(items);
                }
            }.bind(this), function () {
                this.empty('Ошибка сети. Попробуйте другое зеркало в настройках.');
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
            network.clear();
            network.timeout(15000);
            network.silent(item.url, function (html) {
                var streams = parseStreams(html);
                if (!streams.length) {
                    this.empty('Потоки не найдены (возможно нужна авторизация или другое зеркало)');
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
                        title: item.title + ' - ' + s.quality,
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
            scroll.append($('<div class="empty__text">' + (msg || 'Нет данных') + '</div>'));
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

    // ---------- Добавление кнопки на карточку ----------
    function addButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var render = e.object.activity.render();
                if (render.find('.hdrezka-ua-btn').length) return;

                var btn = $('<div class="full-start__button selector view--online hdrezka-ua-btn">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                    '<span>HDrezka</span>' +
                    '</div>');

                btn.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: '',
                        title: 'HDrezka — ' + (e.data.movie.title || e.data.movie.name),
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
        console.log('[HDrezka UA] Плагин загружен. Зеркало: ' + getMirror());
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
