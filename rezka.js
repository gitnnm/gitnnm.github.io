(function () {
    'use strict';

    if (window.hdrezka_ua_cookie_plugin) return;
    window.hdrezka_ua_cookie_plugin = true;

    var BASE = 'https://rezka-ua.tv';
    var component_name = 'hdrezka_ua';
    var network = new Lampa.Reguest();

    // ========== ТВОИ COOKIE ==========
    var COOKIE = 'PHPSESSID=a5t2q76mr23490t9ihlgu7t5uf; techaro.lol-anubis-auth-d82da6a5=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhY3Rpb24iOiJDSEFMTEVOR0UiLCJjaGFsbGVuZ2UiOiIwMWExN2VmNC1mMTdiLTdhZWQtOGYzMS05ZGYyN2NkODFlZWEiLCJleHAiOjE3OTU3MjMzNDUsImlhdCI6MTc5MzEzMTM0NSwibWV0aG9kIjoiZmFzdCIsIm5iZiI6MTc5MzEzMTI4NSwicG9saWN5UnVsZSI6ImFjOTgwZjQ5YzRkMzVmYWIiLCJyZXN0cmljdGlvbiI6ImM5NGI5ZTVhMzA4NDdlMGE2MzNmMmM3MTI0YzVlMTQ5MjI2YjFlMTY2MmQ0YmRjOTk0OTE3NjIzNjBiNjU0NjAifQ.Hp6S_VzCYRRRWxGZBfRnxxDsF-Lu-G6GjXZsJp5GgGHf7WG8Uxi7I-20aG35EzH4Da-6Wl60G_oMmRDiI5CDBw; dle_user_token=6bf57f7fdb61a5463b8de237feee0025; dle_user_taken=1; device_rzk_id=eed0c9546b0ad334ffd7d5af8728ac15; _vc_id=y8EhN9W2istUl896IQBm67LCdE4H1OH5; _vc_day=2026-10-27; rzk_last_refresh=1793131345; _ym_uid=1785609579293811962; _ym_d=1785609579';
    // ================================

    function request(url, success, error) {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': BASE + '/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cookie': COOKIE
        };

        network.clear();
        network.timeout(20000);
        network.silent(url, success, error, false, {
            headers: headers
        });
    }

    function parseSearch(html) {
        var items = [];
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

    function parseStreams(html) {
        var streams = [];

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

        if (!streams.length) {
            var fileMatch = html.match(/file\s*:\s*['"]([^'"]+)['"]/);
            if (fileMatch) {
                fileMatch[1].split(',').forEach(function (p) {
                    var qm = p.match(/\[([^\]]+)\](https?:\/\/.+)/);
                    if (qm) streams.push({ quality: qm[1].trim(), url: qm[2].trim() });
                });
            }
        }

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

        var order = { '2160p': 1, '1440p': 2, '1080p Ultra': 3, '1080p': 4, '720p': 5, '480p': 6, '360p': 7 };
        streams.sort(function (a, b) {
            return (order[a.quality] || 99) - (order[b.quality] || 99);
        });

        return streams;
    }

    function Component(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var last;

        this.create = function () {
            this.activity.loader(true);
            this.search();
            return this.render();
        };

        this.search = function () {
            var title = object.movie.title || object.movie.name || '';
            var year = (object.movie.release_date || object.movie.first_air_date || '').substring(0, 4);
            var query = title + (year ? ' ' + year : '');
            var url = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);

            request(url, function (html) {
                if (html.indexOf('Проверяем, что вы не бот') !== -1 || html.indexOf('anubis') !== -1) {
                    this.empty('Cookie устарели.\nНужно обновить их в коде плагина.');
                    return;
                }

                var items = parseSearch(html);
                if (!items.length) {
                    this.empty('Ничего не найдено');
                    return;
                }

                if (items.length === 1) {
                    this.loadMovie(items[0]);
                } else {
                    this.appendResults(items);
                }
            }.bind(this), function () {
                this.empty('Ошибка сети');
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
                    this.empty('Cookie устарели');
                    return;
                }

                var streams = parseStreams(html);
                if (!streams.length) {
                    this.empty('Потоки не найдены');
                    return;
                }

                this.showQualities(item, streams);
            }.bind(this), function () {
                this.empty('Ошибка загрузки');
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
                right: function () { Navigator.move('right'); },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
        };
    }

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

    function startPlugin() {
        Lampa.Component.add(component_name, Component);
        addButton();
        console.log('[HDrezka UA] Плагин загружен (cookie вшиты)');
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
