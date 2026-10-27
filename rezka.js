(function () {
    'use strict';

    if (window.hdrezka_ua_only) return;
    window.hdrezka_ua_only = true;

    var BASE = 'https://rezka-ua.tv';
    var COMPONENT = 'hdrezka_ua';

    // Твои cookie (обновляй, когда протухнут)
    var COOKIE =
        'PHPSESSID=a5t2q76mr23490t9ihlgu7t5uf; ' +
        'techaro.lol-anubis-auth-d82da6a5=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhY3Rpb24iOiJDSEFMTEVOR0UiLCJjaGFsbGVuZ2UiOiIwMWExN2VmNC1mMTdiLTdhZWQtOGYzMS05ZGYyN2NkODFlZWEiLCJleHAiOjE3OTU3MjMzNDUsImlhdCI6MTc5MzEzMTM0NSwibWV0aG9kIjoiZmFzdCIsIm5iZiI6MTc5MzEzMTI4NSwicG9saWN5UnVsZSI6ImFjOTgwZjQ5YzRkMzVmYWIiLCJyZXN0cmljdGlvbiI6ImM5NGI5ZTVhMzA4NDdlMGE2MzNmMmM3MTI0YzVlMTQ5MjI2YjFlMTY2MmQ0YmRjOTk0OTE3NjIzNjBiNjU0NjAifQ.Hp6S_VzCYRRRWxGZBfRnxxDsF-Lu-G6GjXZsJp5GgGHf7WG8Uxi7I-20aG35EzH4Da-6Wl60G_oMmRDiI5CDBw; ' +
        'dle_user_token=6bf57f7fdb61a5463b8de237feee0025; ' +
        'dle_user_taken=1; ' +
        'device_rzk_id=eed0c9546b0ad334ffd7d5af8728ac15; ' +
        '_vc_id=y8EhN9W2istUl896IQBm67LCdE4H1OH5; ' +
        '_vc_day=2026-10-27; ' +
        'rzk_last_refresh=1793131345; ' +
        '_ym_uid=1785609579293811962; ' +
        '_ym_d=1785609579';

    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    function makeHeaders() {
        var h = {
            'User-Agent': UA,
            'Referer': BASE + '/',
            'Origin': BASE,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
        };
        // На Android Cookie в headers критичен
        if (Lampa.Platform.is('android') || true) {
            h['Cookie'] = COOKIE;
        }
        return h;
    }

    function request(url, onok, onerr) {
        var network = new Lampa.Reguest();
        network.timeout(25000);

        var opts = {
            dataType: 'text',
            headers: makeHeaders()
        };

        // native лучше на Android (как в online_mod)
        var method = network.native ? 'native' : 'silent';

        network[method](url, function (html) {
            if (typeof html !== 'string') html = (html && html.body) ? html.body : String(html || '');

            if (html.indexOf('Проверяем, что вы не бот') !== -1 ||
                html.indexOf('techaro.lol') !== -1 && html.indexOf('anubis') !== -1 && html.length < 5000) {
                onerr && onerr('cookie_expired');
                return;
            }
            onok && onok(html);
        }, function (a, c) {
            onerr && onerr(a || c || 'network');
        }, false, opts);
    }

    function parseSearch(html) {
        var items = [];
        var re = /data-id="(\d+)"[^>]*data-url="([^"]+)"[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            var u = m[2];
            if (u.indexOf('http') !== 0) u = BASE + u;
            items.push({ id: m[1], url: u, title: m[3].trim() });
        }
        return items;
    }

    function parseStreams(html) {
        var streams = [];
        var cdn = html.match(/initCDN(?:Movies|Series)Events\s*\(\s*\d+\s*,\s*\d+[\s\S]*?(\{[\s\S]*?\})\s*\)\s*;/);
        if (cdn) {
            try {
                var data = JSON.parse(cdn[1]);
                if (data.streams) {
                    var r = /\[([^\]]+)\](https?:\/\/[^,\[]+)/g, sm;
                    while ((sm = r.exec(data.streams)) !== null) {
                        streams.push({ quality: sm[1].trim(), url: sm[2].trim() });
                    }
                }
            } catch (e) {}
        }
        if (!streams.length) {
            var file = html.match(/file\s*:\s*['"]([^'"]+)['"]/);
            if (file) {
                file[1].split(',').forEach(function (p) {
                    var q = p.match(/\[([^\]]+)\](https?:\/\/.+)/);
                    if (q) streams.push({ quality: q[1].trim(), url: q[2].trim() });
                });
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
            var q = encodeURIComponent(title + (year ? ' ' + year : ''));
            var url = BASE + '/search/?do=search&subaction=search&q=' + q;

            request(url, function (html) {
                var items = parseSearch(html);
                if (!items.length) {
                    this.empty('Ничего не найдено');
                    return;
                }
                if (items.length === 1) this.loadMovie(items[0]);
                else this.showList(items);
            }.bind(this), function (err) {
                if (err === 'cookie_expired') {
                    this.empty('Cookie устарели.\nОткрой rezka-ua.tv в браузере, пройди проверку и обнови COOKIE в коде.');
                } else {
                    this.empty('Ошибка сети.\nПроверь VPN/доступ к rezka-ua.tv с телефона.');
                }
            }.bind(this));
        };

        this.showList = function (items) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();
            items.forEach(function (item) {
                var el = $('<div class="online selector"><div class="online__title">' + item.title + '</div></div>');
                el.on('hover:enter', function () { this.loadMovie(item); }.bind(this));
                scroll.append(el);
            }.bind(this));
            this.activity.toggle();
        };

        this.loadMovie = function (item) {
            this.activity.loader(true);
            request(item.url, function (html) {
                var streams = parseStreams(html);
                if (!streams.length) {
                    this.empty('Потоки не найдены (нужна авторизация или cookie мало)');
                    return;
                }
                this.showStreams(item, streams);
            }.bind(this), function (err) {
                this.empty(err === 'cookie_expired' ? 'Cookie устарели' : 'Ошибка загрузки');
            }.bind(this));
        };

        this.showStreams = function (item, streams) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();
            streams.forEach(function (s) {
                var el = $('<div class="online selector"><div class="online__title">' + s.quality + '</div></div>');
                el.on('hover:enter', function () {
                    Lampa.Player.play({ title: item.title, url: s.url, quality: s.quality });
                    Lampa.Player.playlist([{ title: item.title + ' — ' + s.quality, url: s.url }]);
                });
                scroll.append(el);
            });
            this.activity.toggle();
        };

        this.empty = function (msg) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();
            scroll.append($('<div class="empty__text" style="padding:20px;white-space:pre-line;">' + msg + '</div>'));
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
        this.destroy = function () { scroll.destroy(); };
    }

    function addButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' && e.type !== 'complete') return;
            var render = e.object.activity.render();
            if (render.find('.hdrezka-ua-btn').length) return;

            var btn = $('<div class="full-start__button selector view--online hdrezka-ua-btn">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                '<span>HDrezka UA</span></div>');

            btn.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'HDrezka UA — ' + (e.data.movie.title || e.data.movie.name),
                    component: COMPONENT,
                    movie: e.data.movie,
                    page: 1
                });
            });

            var box = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (box.length) box.append(btn);
            else render.find('.full-start__title').after(btn);
        });
    }

    function start() {
        Lampa.Component.add(COMPONENT, Component);
        addButton();
        console.log('[HDrezka UA] only rezka-ua.tv, cookies hardcoded');
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });
})();
