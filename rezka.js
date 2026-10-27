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
    // Разрешённые качества (без Ultra / 1440 / 2160)
    var ALLOWED_Q = ['1080p', '720p', '480p', '360p'];

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

    /** Лучшее качество из 1080/720/480/360 */
    function bestStream(str) {
        str = decodeStream(str);
        if (!str) return null;
        var map = {};
        var re = /\[([^\]]+)\](https?:\/\/[^,\s]+)/g, m;
        while ((m = re.exec(str)) !== null) {
            var q = m[1].trim();
            // отбрасываем Ultra / 2K / 4K
            if (/ultra|2160|1440|4k|2k/i.test(q)) continue;
            // нормализуем к 1080p / 720p ...
            var num = (q.match(/(\d{3,4})/) || [])[1];
            if (!num) continue;
            var key = num + 'p';
            if (ALLOWED_Q.indexOf(key) === -1) continue;
            map[key] = m[2].trim();
        }
        for (var i = 0; i < ALLOWED_Q.length; i++) {
            if (map[ALLOWED_Q[i]]) {
                return { quality: ALLOWED_Q[i], url: map[ALLOWED_Q[i]] };
            }
        }
        return null;
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

    function parsePage(html) {
        var info = {
            film_id: '', favs: '', is_series: false,
            voices: [], seasons: [], episodes: [],
            def_voice_id: '', pageUrl: ''
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

        var list = html.match(/<ul[^>]*id="translators-list"[^>]*>([\s\S]*?)<\/ul>/i);
        if (list) {
            var itemRe = /class="[^"]*b-translator__item[^"]*"[^>]*data-translator_id="(\d+)"([^>]*)>([\s\S]*?)<\/li>/gi;
            var im;
            while ((im = itemRe.exec(list[1])) !== null) {
                var attrs = im[2] || '';
                var name = $('<div>' + im[3] + '</div>').text().replace(/\s+/g, ' ').trim();
                var titleAttr = (attrs.match(/title="([^"]*)"/) || [])[1];
                if (titleAttr) name = titleAttr.trim();
                info.voices.push({
                    id: im[1],
                    name: name || ('Озвучка ' + im[1]),
                    is_camrip: (attrs.match(/data-camrip="([^"]*)"/) || [])[1] || '0',
                    is_ads: (attrs.match(/data-ads="([^"]*)"/) || [])[1] || '0',
                    is_director: (attrs.match(/data-director="([^"]*)"/) || [])[1] || '0'
                });
            }
        }

        if (!info.voices.length && info.def_voice_id) {
            info.voices.push({
                id: info.def_voice_id,
                name: 'По умолчанию',
                is_camrip: info.def_camrip || '0',
                is_ads: info.def_ads || '0',
                is_director: info.def_director || '0'
            });
        }

        var seasons = html.match(/<ul[^>]*id="simple-seasons-tabs"[^>]*>([\s\S]*?)<\/ul>/i);
        if (seasons) {
            var sRe = /data-tab_id="(\d+)"[^>]*>([^<]+)/gi, sm;
            while ((sm = sRe.exec(seasons[1])) !== null) {
                info.seasons.push({ id: sm[1], name: sm[2].trim() });
            }
        }

        var episodes = html.match(/<div[^>]*id="simple-episodes-tabs"[^>]*>([\s\S]*?)<\/div>/i);
        if (episodes) {
            var eRe = /data-season_id="(\d+)"[^>]*data-episode_id="(\d+)"[^>]*>([^<]*)/gi, em;
            while ((em = eRe.exec(episodes[1])) !== null) {
                info.episodes.push({
                    season_id: em[1],
                    episode_id: em[2],
                    name: (em[3] || '').trim()
                });
            }
        }

        var cdnBlock = html.match(/initCDN(?:Movies|Series)Events\s*\([\s\S]*?(\{[\s\S]*?\})\s*\)\s*;/);
        if (cdnBlock) {
            try {
                var data = JSON.parse(cdnBlock[1]);
                if (data.streams) info.pageStreamRaw = data.streams;
            } catch (e) {}
        }
        if (!info.pageStreamRaw) {
            var file = html.match(/file\s*:\s*['"]([^'"]+)['"]/);
            if (file) info.pageStreamRaw = file[1];
        }

        return info;
    }

    function parseEpisodesHtml(html, translator_id) {
        var episodes = [];
        if (!html) return episodes;
        var eRe = /data-season_id="(\d+)"[^>]*data-episode_id="(\d+)"[^>]*>([^<]*)/gi, em;
        while ((em = eRe.exec(html)) !== null) {
            episodes.push({
                season_id: em[1],
                episode_id: em[2],
                name: (em[3] || '').trim(),
                translator_id: translator_id
            });
        }
        return episodes;
    }

    // ---------- UI helpers ----------
    function lineItem(title, subtitle, onEnter) {
        var el = $('<div class="online selector">' +
            '<div class="online__body">' +
            '<div class="online__title">' + title + '</div>' +
            (subtitle ? '<div class="online__texts"><div class="online__text">' + subtitle + '</div></div>' : '') +
            '</div></div>');
        el.on('hover:enter', onEnter);
        return el;
    }

    function Component(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var filter_html = $('<div class="online-filter" style="padding:0 1.2em 0.8em;"></div>');
        var last;
        var pageInfo = null;
        var currentTitle = '';
        var choice = { voice: 0, season: 0 };
        var allEpisodes = []; // все серии текущей озвучки
        var viewEpisodes = [];

        this.create = function () {
            this.activity.loader(true);
            // контейнер: фильтр сверху + скролл
            var root = $('<div class="online-empty" style="display:flex;flex-direction:column;height:100%;"></div>');
            root.append(filter_html);
            root.append(scroll.render());
            this.root = root;
            this.search();
            return this.render();
        };

        this.render = function () {
            return this.root || scroll.render();
        };

        this.search = function () {
            var title = object.movie.title || object.movie.name || '';
            var year = (object.movie.release_date || object.movie.first_air_date || '').substring(0, 4);
            var url = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(title + (year ? ' ' + year : ''));

            reqGet(url, function (html) {
                var items = parseSearch(html);
                if (!items.length) return this.empty('Ничего не найдено');
                if (items.length === 1) this.openTitle(items[0]);
                else this.drawSearch(items);
            }.bind(this), function (e) {
                this.empty(e === 'cookie' ? 'Cookie устарели — обнови в коде' : 'Ошибка сети');
            }.bind(this));
        };

        this.clearList = function () {
            scroll.clear();
            scroll.body().empty();
        };

        this.drawSearch = function (items) {
            this.activity.loader(false);
            filter_html.empty();
            this.clearList();
            items.forEach(function (item) {
                scroll.append(lineItem(item.title, '', function () {
                    this.openTitle(item);
                }.bind(this)));
            }.bind(this));
            this.focusFirst();
            this.activity.toggle();
        };

        this.openTitle = function (item) {
            this.activity.loader(true);
            currentTitle = item.title;
            reqGet(item.url, function (html) {
                pageInfo = parsePage(html);
                if (!pageInfo.film_id && !pageInfo.voices.length) {
                    return this.empty('Не удалось разобрать страницу');
                }
                choice.voice = 0;
                choice.season = 0;
                // индекс дефолтной озвучки
                for (var i = 0; i < pageInfo.voices.length; i++) {
                    if (String(pageInfo.voices[i].id) === String(pageInfo.def_voice_id)) {
                        choice.voice = i;
                        break;
                    }
                }
                if (pageInfo.is_series) {
                    this.loadEpisodesForVoice(pageInfo.voices[choice.voice]);
                } else {
                    this.drawFilter();
                    this.playMovie();
                }
            }.bind(this), function (e) {
                this.empty(e === 'cookie' ? 'Cookie устарели' : 'Ошибка загрузки');
            }.bind(this));
        };

        // --- фильтр (озвучка / сезон) ---
        this.drawFilter = function () {
            filter_html.empty();
            var row = $('<div class="items-line__head" style="display:flex;flex-wrap:wrap;gap:0.6em;align-items:center;"></div>');

            // кнопка озвучки
            if (pageInfo.voices.length) {
                var v = pageInfo.voices[choice.voice];
                var voiceBtn = $('<div class="simple-button simple-button--filter selector" style="margin:0;">' +
                    '<span>Озвучка</span> · ' + (v ? v.name : '') + '</div>');
                voiceBtn.on('hover:enter', function () {
                    this.openVoiceSelect();
                }.bind(this));
                row.append(voiceBtn);
            }

            // кнопка сезона (только сериал)
            if (pageInfo.is_series && pageInfo.seasons.length) {
                var s = pageInfo.seasons[choice.season];
                var seasonBtn = $('<div class="simple-button simple-button--filter selector" style="margin:0;">' +
                    '<span>Сезон</span> · ' + (s ? s.name : '') + '</div>');
                seasonBtn.on('hover:enter', function () {
                    this.openSeasonSelect();
                }.bind(this));
                row.append(seasonBtn);
            }

            filter_html.append(row);
        };

        this.openVoiceSelect = function () {
            var items = pageInfo.voices.map(function (v, i) {
                return {
                    title: v.name,
                    selected: i === choice.voice,
                    index: i
                };
            });
            Lampa.Select.show({
                title: 'Озвучка',
                items: items,
                onSelect: function (a) {
                    choice.voice = a.index;
                    choice.season = 0;
                    if (pageInfo.is_series) {
                        this.loadEpisodesForVoice(pageInfo.voices[choice.voice]);
                    } else {
                        this.drawFilter();
                        this.playMovie();
                    }
                }.bind(this),
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        this.openSeasonSelect = function () {
            var seasons = pageInfo.seasons;
            if (!seasons.length) {
                // уникальные сезоны из эпизодов
                var map = {}, list = [];
                allEpisodes.forEach(function (e) {
                    if (!map[e.season_id]) {
                        map[e.season_id] = true;
                        list.push({ id: e.season_id, name: 'Сезон ' + e.season_id });
                    }
                });
                seasons = list;
                pageInfo.seasons = seasons;
            }
            var items = seasons.map(function (s, i) {
                return {
                    title: s.name,
                    selected: i === choice.season,
                    index: i
                };
            });
            Lampa.Select.show({
                title: 'Сезон',
                items: items,
                onSelect: function (a) {
                    choice.season = a.index;
                    this.drawFilter();
                    this.drawEpisodes();
                }.bind(this),
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        // --- фильм: сразу play лучшего качества ---
        this.playMovie = function () {
            this.activity.loader(true);
            this.clearList();

            var voice = pageInfo.voices[choice.voice];
            if (!voice) {
                this.empty('Нет озвучки');
                return;
            }

            // дефолтный поток со страницы
            if (String(voice.id) === String(pageInfo.def_voice_id) && pageInfo.pageStreamRaw) {
                var s = bestStream(pageInfo.pageStreamRaw);
                this.activity.loader(false);
                if (!s) return this.empty('Нет доступного качества (1080/720/480/360)');
                this.drawPlayLine(s, currentTitle + ' — ' + voice.name);
                this.focusFirst();
                this.activity.toggle();
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
                this.activity.loader(false);
                if (json && json.premium_content) {
                    return this.empty('Перевод только с Premium');
                }
                var s = bestStream(json && json.url);
                if (!s) return this.empty('Нет доступного качества');
                this.drawPlayLine(s, currentTitle + ' — ' + voice.name);
                this.focusFirst();
                this.activity.toggle();
            }.bind(this), function () {
                this.empty('Ошибка загрузки потока');
            }.bind(this));
        };

        this.drawPlayLine = function (stream, title) {
            this.clearList();
            var el = lineItem('Смотреть', stream.quality, function () {
                Lampa.Player.play({ title: title, url: stream.url, quality: stream.quality });
                Lampa.Player.playlist([{ title: title + ' — ' + stream.quality, url: stream.url }]);
            });
            scroll.append(el);
        };

        // --- сериал ---
        this.loadEpisodesForVoice = function (voice) {
            this.activity.loader(true);
            this.clearList();

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

                allEpisodes = parseEpisodesHtml(json && json.episodes, voice.id);
                if (!allEpisodes.length) {
                    allEpisodes = parseEpisodesHtml(json && json.seasons, voice.id);
                }
                if (!allEpisodes.length && pageInfo.episodes.length) {
                    allEpisodes = pageInfo.episodes.map(function (e) {
                        return {
                            season_id: e.season_id,
                            episode_id: e.episode_id,
                            name: e.name,
                            translator_id: voice.id
                        };
                    });
                }

                // собрать сезоны
                var map = {}, seasons = [];
                allEpisodes.forEach(function (e) {
                    if (!map[e.season_id]) {
                        map[e.season_id] = true;
                        seasons.push({ id: e.season_id, name: 'Сезон ' + e.season_id });
                    }
                });
                seasons.sort(function (a, b) { return parseInt(a.id, 10) - parseInt(b.id, 10); });
                pageInfo.seasons = seasons;
                if (choice.season >= seasons.length) choice.season = 0;

                this.drawFilter();
                this.drawEpisodes();
            }.bind(this), function () {
                if (pageInfo.episodes.length) {
                    allEpisodes = pageInfo.episodes.map(function (e) {
                        return {
                            season_id: e.season_id,
                            episode_id: e.episode_id,
                            name: e.name,
                            translator_id: voice.id
                        };
                    });
                    this.drawFilter();
                    this.drawEpisodes();
                } else {
                    this.empty('Не удалось загрузить серии');
                }
            }.bind(this));
        };

        this.drawEpisodes = function () {
            this.activity.loader(false);
            this.clearList();

            var season = pageInfo.seasons[choice.season];
            var sid = season ? String(season.id) : null;

            viewEpisodes = allEpisodes.filter(function (e) {
                return !sid || String(e.season_id) === sid;
            });

            if (!viewEpisodes.length) {
                scroll.append($('<div class="empty__text" style="padding:1.5em;">Нет серий в этом сезоне</div>'));
                this.activity.toggle();
                return;
            }

            var voice = pageInfo.voices[choice.voice];

            viewEpisodes.forEach(function (ep, idx) {
                var num = ep.episode_id;
                var title = 'Серия ' + num;
                var sub = ep.name && ep.name !== title ? ep.name : '';
                var el = lineItem(title, sub, function () {
                    this.playEpisode(ep, voice);
                }.bind(this));

                el.on('hover:focus', function () {
                    last = el;
                });

                scroll.append(el);
            }.bind(this));

            this.focusFirst();
            this.activity.toggle();
            // важно для длинных списков
            try { scroll.update(last || scroll.body().find('.selector').first()); } catch (e) {}
        };

        this.playEpisode = function (ep, voice) {
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
                this.activity.loader(false);
                if (typeof json === 'string') {
                    try { json = JSON.parse(json); } catch (e) { json = {}; }
                }
                if (json && json.premium_content) {
                    Lampa.Noty.show('Перевод только с Premium');
                    return;
                }
                var s = bestStream(json && json.url);
                if (!s) {
                    Lampa.Noty.show('Нет доступного качества');
                    return;
                }
                var t = currentTitle + ' S' + ep.season_id + 'E' + ep.episode_id + ' — ' + voice.name;
                Lampa.Player.play({ title: t, url: s.url, quality: s.quality });
                // плейлист остальных серий сезона
                var pl = viewEpisodes.map(function (e) {
                    return {
                        title: currentTitle + ' S' + e.season_id + 'E' + e.episode_id,
                        url: '', // подгрузится только текущая; остальные без url — ок для одной серии
                        media: e
                    };
                });
                Lampa.Player.playlist([{ title: t + ' — ' + s.quality, url: s.url }]);
            }.bind(this), function () {
                this.activity.loader(false);
                Lampa.Noty.show('Ошибка загрузки серии');
            }.bind(this));
        };

        this.focusFirst = function () {
            last = scroll.body().find('.selector').first();
        };

        this.empty = function (msg) {
            this.activity.loader(false);
            filter_html.empty();
            this.clearList();
            scroll.append($('<div class="empty__text" style="padding:1.5em;white-space:pre-line;">' + msg + '</div>'));
            this.activity.toggle();
        };

        this.start = function () {
            // высота скролла под экран (чтобы серии не уезжали «в никуда»)
            try {
                scroll.minus(filter_html);
            } catch (e) {
                try { scroll.minus(); } catch (e2) {}
            }

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
        this.destroy = function () {
            scroll.destroy();
        };
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
        console.log('[HDrezka UA] UI + filter + auto quality');
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });
})();
