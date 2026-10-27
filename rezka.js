(function () {
    'use strict';

    if (window.hdrezka_ua_only) return;
    window.hdrezka_ua_only = true;

    var BASE = 'https://rezka-ua.tv';
    var COMPONENT = 'hdrezka_ua';

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

    function headers() {
        return {
            'User-Agent': UA,
            'Referer': BASE + '/',
            'Origin': BASE,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            'Cookie': COOKIE
        };
    }

    function reqGet(url, ok, err) {
        var n = new Lampa.Reguest();
        n.timeout(25000);
        var m = n.native ? 'native' : 'silent';
        n[m](url, function (html) {
            if (typeof html !== 'string') html = (html && html.body) ? html.body : String(html || '');
            if (html.indexOf('Проверяем, что вы не бот') !== -1) return err && err('cookie');
            ok && ok(html);
        }, function () { err && err('net'); }, false, { dataType: 'text', headers: headers() });
    }

    function reqPost(url, body, ok, err) {
        var n = new Lampa.Reguest();
        n.timeout(20000);
        var h = headers();
        h['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        h['X-Requested-With'] = 'XMLHttpRequest';
        var m = n.native ? 'native' : 'silent';
        n[m](url, function (json) {
            ok && ok(json);
        }, function () { err && err('net'); }, body, { headers: h });
    }

    // --- decode потока HDrezka (как в online_mod) ---
    function decodeStream(data) {
        if (!data || data.charAt(0) !== '#') return data || '';
        var enc = function (str) {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) {
                return String.fromCharCode('0x' + p1);
            }));
        };
        var dec = function (str) {
            return decodeURIComponent(atob(str).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        };
        var trashList = ['$$!!@$$@^!@#$$@', '@@@@@!##!^^^', '####^!!##!@@', '^^^!@##!!##', '$$#!!@#!@##'];
        var x = data.substring(2);
        trashList.forEach(function (t) { x = x.replace('//_//' + enc(t), ''); });
        try { return dec(x); } catch (e) { return ''; }
    }

    function parseQualities(str) {
        str = decodeStream(str);
        if (!str) return [];
        var out = [];
        var re = /\[([^\]]+)\](https?:\/\/[^,\s]+)/g, m;
        while ((m = re.exec(str)) !== null) {
            out.push({ quality: m[1].trim(), url: m[2].trim() });
        }
        var order = { '2160p': 1, '1440p': 2, '1080p Ultra': 3, '1080p': 4, '720p': 5, '480p': 6, '360p': 7 };
        out.sort(function (a, b) { return (order[a.quality] || 99) - (order[b.quality] || 99); });
        return out;
    }

    function parseSearch(html) {
        var items = [];
        var re = /data-id="(\d+)"[^>]*data-url="([^"]+)"[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi, m;
        while ((m = re.exec(html)) !== null) {
            var u = m[2];
            if (u.indexOf('http') !== 0) u = BASE + u;
            items.push({ id: m[1], url: u, title: m[3].trim() });
        }
        return items;
    }

    // Разбор страницы фильма/сериала
    function parsePage(html) {
        var info = {
            film_id: '',
            favs: '',
            is_series: false,
            voices: [],
            seasons: [],
            episodes: []
        };

        var favs = html.match(/id="ctrl_favs"\s+value="([^"]*)"/);
        if (favs) info.favs = favs[1];

        var cdnSeries = html.match(/\.initCDNSeriesEvents\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);
        var cdnMovie = html.match(/\.initCDNMoviesEvents\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);

        if (cdnSeries) {
            info.is_series = true;
            info.film_id = cdnSeries[1];
            info.def_voice_id = cdnSeries[2];
        } else if (cdnMovie) {
            info.film_id = cdnMovie[1];
            info.def_voice_id = cdnMovie[2];
            info.def_camrip = cdnMovie[3];
            info.def_ads = cdnMovie[4];
            info.def_director = cdnMovie[5];
        }

        // Озвучки
        var list = html.match(/<ul[^>]*id="translators-list"[^>]*>([\s\S]*?)<\/ul>/i);
        if (list) {
            var itemRe = /class="[^"]*b-translator__item[^"]*"[^>]*data-translator_id="(\d+)"([^>]*)>([\s\S]*?)<\/li>/gi;
            var im;
            while ((im = itemRe.exec(list[1])) !== null) {
                var attrs = im[2] || '';
                var name = $('<div>' + im[3] + '</div>').text().replace(/\s+/g, ' ').trim();
                var titleAttr = (attrs.match(/title="([^"]*)"/) || [])[1];
                if (titleAttr) name = titleAttr.trim();
                // флаги языков из img
                var imgs = im[3].match(/title="([^"]+)"/g) || im[3].match(/alt="([^"]+)"/g) || [];
                imgs.forEach(function (t) {
                    var lang = t.replace(/^(title|alt)="/, '').replace(/"$/, '');
                    if (lang && name.indexOf(lang) === -1 && lang.length < 20) name += ' (' + lang + ')';
                });
                info.voices.push({
                    id: im[1],
                    name: name || ('Озвучка ' + im[1]),
                    is_camrip: (attrs.match(/data-camrip="([^"]*)"/) || [])[1] || '0',
                    is_ads: (attrs.match(/data-ads="([^"]*)"/) || [])[1] || '0',
                    is_director: (attrs.match(/data-director="([^"]*)"/) || [])[1] || '0'
                });
            }
        }

        // если списка нет — одна дефолтная
        if (!info.voices.length && info.def_voice_id) {
            info.voices.push({
                id: info.def_voice_id,
                name: 'По умолчанию',
                is_camrip: info.def_camrip || '0',
                is_ads: info.def_ads || '0',
                is_director: info.def_director || '0'
            });
        }

        // сезоны (для сериала, с первой страницы)
        var seasons = html.match(/<ul[^>]*id="simple-seasons-tabs"[^>]*>([\s\S]*?)<\/ul>/i);
        if (seasons) {
            var sRe = /data-tab_id="(\d+)"[^>]*>([^<]+)/gi, sm;
            while ((sm = sRe.exec(seasons[1])) !== null) {
                info.seasons.push({ id: sm[1], name: sm[2].trim() });
            }
        }

        var episodes = html.match(/<div[^>]*id="simple-episodes-tabs"[^>]*>([\s\S]*?)<\/div>/i);
        if (episodes) {
            var eRe = /data-season_id="(\d+)"[^>]*data-episode_id="(\d+)"[^>]*>([^<]+)/gi, em;
            while ((em = eRe.exec(episodes[1])) !== null) {
                info.episodes.push({
                    season_id: em[1],
                    episode_id: em[2],
                    name: em[3].trim()
                });
            }
        }

        // потоки прямо со страницы (дефолтная озвучка)
        var pageStreams = [];
        var cdnBlock = html.match(/initCDN(?:Movies|Series)Events\s*\([\s\S]*?(\{[\s\S]*?\})\s*\)\s*;/);
        if (cdnBlock) {
            try {
                var data = JSON.parse(cdnBlock[1]);
                if (data.streams) pageStreams = parseQualities(data.streams);
            } catch (e) {}
        }
        if (!pageStreams.length) {
            var file = html.match(/file\s*:\s*['"]([^'"]+)['"]/);
            if (file) pageStreams = parseQualities(file[1]);
        }
        info.pageStreams = pageStreams;

        return info;
    }

    function Component(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var last;
        var pageInfo = null;
        var currentTitle = '';

        this.create = function () {
            this.activity.loader(true);
            this.search();
            return this.render();
        };

        this.search = function () {
            var title = object.movie.title || object.movie.name || '';
            var year = (object.movie.release_date || object.movie.first_air_date || '').substring(0, 4);
            var url = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(title + (year ? ' ' + year : ''));

            reqGet(url, function (html) {
                var items = parseSearch(html);
                if (!items.length) return this.empty('Ничего не найдено');
                if (items.length === 1) this.openTitle(items[0]);
                else this.showSearch(items);
            }.bind(this), function (e) {
                this.empty(e === 'cookie' ? 'Cookie устарели' : 'Ошибка сети');
            }.bind(this));
        };

        this.showSearch = function (items) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();
            items.forEach(function (item) {
                var el = $('<div class="online selector"><div class="online__title">' + item.title + '</div></div>');
                el.on('hover:enter', function () { this.openTitle(item); }.bind(this));
                scroll.append(el);
            }.bind(this));
            this.activity.toggle();
        };

        this.openTitle = function (item) {
            this.activity.loader(true);
            currentTitle = item.title;
            reqGet(item.url, function (html) {
                pageInfo = parsePage(html);
                if (!pageInfo.film_id && !pageInfo.voices.length && !pageInfo.pageStreams.length) {
                    return this.empty('Не удалось разобрать страницу');
                }
                // если одна озвучка и фильм — сразу качества (или ajax)
                if (!pageInfo.is_series && pageInfo.voices.length <= 1) {
                    this.loadMovieVoice(pageInfo.voices[0] || null);
                } else {
                    this.showVoices();
                }
            }.bind(this), function (e) {
                this.empty(e === 'cookie' ? 'Cookie устарели' : 'Ошибка загрузки');
            }.bind(this));
        };

        this.showVoices = function () {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();

            if (!pageInfo.voices.length) {
                this.empty('Озвучки не найдены');
                return;
            }

            scroll.append($('<div class="online" style="opacity:.6;padding:10px 16px;">Озвучка</div>'));

            pageInfo.voices.forEach(function (v) {
                var el = $('<div class="online selector"><div class="online__title">' + v.name + '</div></div>');
                el.on('hover:enter', function () {
                    if (pageInfo.is_series) this.loadSeriesVoice(v);
                    else this.loadMovieVoice(v);
                }.bind(this));
                scroll.append(el);
            }.bind(this));

            this.activity.toggle();
        };

        // ----- ФИЛЬМ: ajax get_movie -----
        this.loadMovieVoice = function (voice) {
            this.activity.loader(true);

            // если это дефолтная озвучка и потоки уже на странице
            if (voice && pageInfo.pageStreams.length && String(voice.id) === String(pageInfo.def_voice_id)) {
                this.showQualities(pageInfo.pageStreams, currentTitle + ' — ' + voice.name);
                return;
            }

            if (!pageInfo.film_id || !voice) {
                if (pageInfo.pageStreams.length) {
                    this.showQualities(pageInfo.pageStreams, currentTitle);
                } else {
                    this.empty('Нет данных для загрузки');
                }
                return;
            }

            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body =
                'id=' + encodeURIComponent(pageInfo.film_id) +
                '&translator_id=' + encodeURIComponent(voice.id) +
                '&is_camrip=' + encodeURIComponent(voice.is_camrip || '0') +
                '&is_ads=' + encodeURIComponent(voice.is_ads || '0') +
                '&is_director=' + encodeURIComponent(voice.is_director || '0') +
                '&favs=' + encodeURIComponent(pageInfo.favs || '') +
                '&action=get_movie';

            reqPost(url, body, function (json) {
                if (typeof json === 'string') {
                    try { json = JSON.parse(json); } catch (e) { json = {}; }
                }
                var streams = parseQualities(json && json.url);
                if (!streams.length) {
                    this.empty('Потоки для этой озвучки не найдены');
                    return;
                }
                this.showQualities(streams, currentTitle + ' — ' + voice.name);
            }.bind(this), function () {
                this.empty('Ошибка AJAX');
            }.bind(this));
        };

        // ----- СЕРИАЛ: эпизоды для озвучки -----
        this.loadSeriesVoice = function (voice) {
            this.activity.loader(true);
            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body =
                'id=' + encodeURIComponent(pageInfo.film_id) +
                '&translator_id=' + encodeURIComponent(voice.id) +
                '&favs=' + encodeURIComponent(pageInfo.favs || '') +
                '&action=get_episodes';

            reqPost(url, body, function (json) {
                if (typeof json === 'string') {
                    try { json = JSON.parse(json); } catch (e) { json = {}; }
                }

                var episodes = [];
                // seasons html in json.seasons / episodes in json.episodes
                var epHtml = (json && (json.episodes || json.seasons)) || '';
                if (typeof epHtml === 'string') {
                    var eRe = /data-season_id="(\d+)"[^>]*data-episode_id="(\d+)"[^>]*>([^<]*)/gi, em;
                    while ((em = eRe.exec(epHtml)) !== null) {
                        episodes.push({
                            season_id: em[1],
                            episode_id: em[2],
                            name: (em[3] || ('S' + em[1] + 'E' + em[2])).trim(),
                            translator_id: voice.id
                        });
                    }
                }

                // fallback — с первой страницы
                if (!episodes.length && pageInfo.episodes.length) {
                    episodes = pageInfo.episodes.map(function (e) {
                        return {
                            season_id: e.season_id,
                            episode_id: e.episode_id,
                            name: e.name,
                            translator_id: voice.id
                        };
                    });
                }

                if (!episodes.length) {
                    this.empty('Серии не найдены');
                    return;
                }

                this.showEpisodes(episodes, voice);
            }.bind(this), function () {
                // fallback на эпизоды со страницы
                if (pageInfo.episodes.length) {
                    var episodes = pageInfo.episodes.map(function (e) {
                        return {
                            season_id: e.season_id,
                            episode_id: e.episode_id,
                            name: e.name,
                            translator_id: voice.id
                        };
                    });
                    this.showEpisodes(episodes, voice);
                } else {
                    this.empty('Ошибка загрузки серий');
                }
            }.bind(this));
        };

        this.showEpisodes = function (episodes, voice) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();
            scroll.append($('<div class="online" style="opacity:.6;padding:10px 16px;">' + voice.name + '</div>'));

            episodes.forEach(function (ep) {
                var label = 'S' + ep.season_id + 'E' + ep.episode_id + (ep.name ? ' — ' + ep.name : '');
                var el = $('<div class="online selector"><div class="online__title">' + label + '</div></div>');
                el.on('hover:enter', function () { this.loadEpisode(ep, voice); }.bind(this));
                scroll.append(el);
            }.bind(this));

            this.activity.toggle();
        };

        this.loadEpisode = function (ep, voice) {
            this.activity.loader(true);
            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body =
                'id=' + encodeURIComponent(pageInfo.film_id) +
                '&translator_id=' + encodeURIComponent(voice.id) +
                '&season=' + encodeURIComponent(ep.season_id) +
                '&episode=' + encodeURIComponent(ep.episode_id) +
                '&favs=' + encodeURIComponent(pageInfo.favs || '') +
                '&action=get_stream';

            reqPost(url, body, function (json) {
                if (typeof json === 'string') {
                    try { json = JSON.parse(json); } catch (e) { json = {}; }
                }
                var streams = parseQualities(json && json.url);
                if (!streams.length) {
                    this.empty('Потоки серии не найдены');
                    return;
                }
                var t = currentTitle + ' S' + ep.season_id + 'E' + ep.episode_id + ' — ' + voice.name;
                this.showQualities(streams, t);
            }.bind(this), function () {
                this.empty('Ошибка загрузки серии');
            }.bind(this));
        };

        this.showQualities = function (streams, title) {
            this.activity.loader(false);
            scroll.clear();
            scroll.body().empty();
            streams.forEach(function (s) {
                var el = $('<div class="online selector"><div class="online__title">' + s.quality + '</div></div>');
                el.on('hover:enter', function () {
                    Lampa.Player.play({ title: title, url: s.url, quality: s.quality });
                    Lampa.Player.playlist([{ title: title + ' — ' + s.quality, url: s.url }]);
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
        console.log('[HDrezka UA] voices + series');
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });
})();
