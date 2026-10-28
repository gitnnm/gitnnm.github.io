(function () {
    'use strict';

    if (window.hdrezka_ua_only) return;
    window.hdrezka_ua_only = true;

    var BASE = 'https://rezka-ua.tv';
    var COMPONENT = 'hdrezka_ua';
    var COOKIE_SERVER = 'http://192.168.100.5:9999/anubis';

    var COOKIE = Lampa.Storage.get('hdrezka_ua_cookie', '');
    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // === КИНОПОИСК ===
    var KP_KEY = '2d55adfd-019d-4567-bbf7-67d503f61b5a';
    var KP_BASE = 'https://kinopoiskapiunofficial.tech';
    var kpCache = {};

    function kpHeaders() {
        return {
            'X-API-KEY': KP_KEY,
            'Content-Type': 'application/json'
        };
    }

    function extractKpId(movie) {
        if (!movie) return null;
        var candidates = [
            movie.kinopoisk_id,
            movie.kp_id,
            movie.kinopoiskId,
            movie.ids && movie.ids.kinopoisk
        ];
        for (var i = 0; i < candidates.length; i++) {
            var v = candidates[i];
            if (v && String(v).match(/^\d+$/)) return String(v);
        }
        return null;
    }

    function kpDetails(id, cb) {
        if (!id) return cb(null);
        if (kpCache['id:' + id] && kpCache['id:' + id].filmLength !== undefined) {
            return cb(kpCache['id:' + id]);
        }
        var url = KP_BASE + '/v2.2/films/' + id;
        var n = new Lampa.Reguest();
        n.timeout(10000);
        var m = n.native ? 'native' : 'silent';
        n[m](url, function (resp) {
            var data = null;
            try { data = typeof resp === 'string' ? JSON.parse(resp) : resp; } catch (e) {}
            cb(data || null);
        }, function () { cb(null); }, false, { dataType: 'text', headers: kpHeaders() });
    }

    function kpSearch(title, year, cb) {
        if (!title) return cb(null);
        var key = 'search:' + title.toLowerCase() + ':' + (year || '');
        if (kpCache[key] !== undefined) return cb(kpCache[key]);

        var url = KP_BASE + '/v2.1/films/search-by-keyword?keyword=' +
            encodeURIComponent(title) + '&page=1';

        var n = new Lampa.Reguest();
        n.timeout(10000);
        var m = n.native ? 'native' : 'silent';
        n[m](url, function (resp) {
            var data = null;
            try { data = typeof resp === 'string' ? JSON.parse(resp) : resp; } catch (e) {}
            var result = null;
            if (data && data.films && data.films.length) {
                var best = data.films[0];
                if (year) {
                    for (var i = 0; i < data.films.length; i++) {
                        var f = data.films[i];
                        if (String(f.year) === String(year)) { best = f; break; }
                    }
                }
                result = {
                    id: String(best.filmId),
                    rating: best.rating || null,
                    year: best.year || null,
                    genres: (best.genres || []).map(function (g) { return g.genre; }),
                    name: best.nameRu || best.nameEn || title
                };
                kpDetails(result.id, function (details) {
                    if (details) {
                        result.rating = details.ratingKinopoisk || result.rating;
                        result.year = details.year || result.year;
                        result.genres = (details.genres || []).map(function (g) { return g.genre; });
                        result.countries = (details.countries || []).map(function (c) { return c.country; });
                        result.filmLength = details.filmLength || null;
                        result.type = details.type || null;
                    }
                    kpCache[key] = result;
                    if (result.id) kpCache['id:' + result.id] = result;
                    cb(result);
                });
            } else {
                kpCache[key] = null;
                cb(null);
            }
        }, function () {
            cb(null);
        }, false, { dataType: 'text', headers: kpHeaders() });
    }

    function fmtLength(min) {
        if (!min) return '';
        min = parseInt(min, 10);
        if (!min) return '';
        var h = Math.floor(min / 60), m = min % 60;
        if (h && m) return h + 'ч ' + m + 'м';
        if (h) return h + 'ч';
        return m + 'м';
    }

    function kpInfoLine(kp) {
        if (!kp) return '';
        var parts = [];
        if (kp.rating) parts.push('⭐' + kp.rating);
        if (kp.year) parts.push(kp.year);
        if (kp.genres && kp.genres.length) parts.push(kp.genres[0]);
        if (kp.filmLength) parts.push(fmtLength(kp.filmLength));
        return parts.join(' • ');
    }

    // === РЕЗКА КАЧЕСТВ ===
    function fixQualityCheat(q) {
        if (!q) return '360p';
        var num = parseInt(q, 10);
        if (isNaN(num)) return q;
        if (num >= 1080) return '720p';
        if (num >= 720) return '480p';
        if (num >= 480) return '360p';
        if (num >= 360) return '240p';
        return q;
    }

    // === СТИЛИ ===
    if (!$('#hdrezka_ua_fix_css').length) {
        $('head').append(
            '<style id="hdrezka_ua_fix_css">' +
            '.hdrezka-ua-item { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding: 0 !important; margin: 0 0 0.5em 0 !important; overflow: hidden !important; }' +
            '.hdrezka-ua-inner { display: flex !important; align-items: center !important; width: 100% !important; padding: 0.8em 1.2em !important; box-sizing: border-box !important; }' +
            '.hdrezka-ua-icon { flex-shrink: 0 !important; width: 2.4em !important; height: 2.4em !important; margin-right: 1em !important; }' +
            '.hdrezka-ua-text { flex-grow: 1 !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; }' +
            '.hdrezka-ua-title { font-size: 1.1em !important; color: #fff !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; margin-bottom: 0.2em !important; }' +
            '.hdrezka-ua-subtext { font-size: 0.85em !important; color: #888 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }' +
            '</style>'
        );
    }

    // === ШАБЛОН КАРТОЧКИ ===
    Lampa.Template.add('hdrezka_ua_item',
        '<div class="online selector hdrezka-ua-item">' +
        '  <div class="online__body hdrezka-ua-inner">' +
        '    <div class="hdrezka-ua-icon">' +
        '      <svg style="width:100%;height:100%;" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '        <circle cx="64" cy="64" r="56" stroke="#ccc" stroke-width="12"/>' +
        '        <path d="M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z" fill="#ccc"/>' +
        '      </svg>' +
        '    </div>' +
        '    <div class="hdrezka-ua-text">' +
        '      <div class="hdrezka-ua-title">{title}</div>' +
        '      <div class="hdrezka-ua-subtext">{quality}{info}</div>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    );

    // === ЗАПРОС КУКОВ С СЕРВЕРА ===
    function refreshCookies(callback) {
        console.log('[HDrezka] Запрос новых куков у сервера...');
        var n = new Lampa.Reguest();
        n.timeout(15000);
        var m = n.native ? 'native' : 'silent';

        n[m](COOKIE_SERVER, function(response) {
            try {
                var data = JSON.parse(response);
                if (data.cookie) {
                    COOKIE = data.cookie;
                    Lampa.Storage.set('hdrezka_ua_cookie', COOKIE);
                    console.log('[HDrezka] Куки успешно обновлены');
                    Lampa.Noty.show('HDrezka: Куки обновлены');
                }
            } catch (e) {
                console.log('[HDrezka] Ошибка парсинга ответа сервера');
            }
            callback();
        }, function() {
            console.log('[HDrezka] Сервер куков недоступен');
            Lampa.Noty.show('HDrezka: Локальный сервер недоступен');
            callback();
        }, false, {
            dataType: 'text',
            headers: { 'User-Agent': UA }
        });
    }

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

            if (html.indexOf('Проверяем, что вы не бот') !== -1 || html.indexOf('anubis_challenge') !== -1) {
                refreshCookies(function() {
                    reqGet(url, ok, err);
                });
                return;
            }
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
            if (typeof json === 'string' && (json.indexOf('anubis_challenge') !== -1 || json.indexOf('Проверяем, что вы не бот') !== -1)) {
                refreshCookies(function() {
                    reqPost(url, body, ok, err);
                });
                return;
            }
            ok && ok(json);
        }, function () { err && err('net'); }, body, { headers: h });
    }

    function decodeStream(data) {
        if (!data || data.charAt(0) !== '#') return data || '';
        var enc = function (str) { return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) { return String.fromCharCode('0x' + p1); })); };
        var dec = function (str) { return decodeURIComponent(atob(str).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); };
        var trashList = ['$$!!@$$@^!@#$$@', '@@@@@!##!^^^', '####^!!##!@@', '^^^!@##!!##', '$$#!!@#!@##'];
        var x = data.substring(2);
        trashList.forEach(function (t) { x = x.replace('//_//' + enc(t), ''); });
        try { return dec(x); } catch (e) { return ''; }
    }

    function bestStream(str) {
        str = decodeStream(str);
        if (!str) return null;
        var map = {};
        var re = /\[([^\]]+)\](https?:\/\/[^,\s]+)/g, m;
        while ((m = re.exec(str)) !== null) {
            var q = m[1].trim();
            if (/ultra|2160|1440|4k|2k/i.test(q)) continue;
            var num = (q.match(/(\d{3,4})/) || [])[1];
            if (!num) continue;
            var key = num + 'p';
            if (!map[key]) map[key] = m[2].trim();
        }
        var qualities = ['1080p', '720p', '480p', '360p'];
        for (var i = 0; i < qualities.length; i++) {
            if (map[qualities[i]]) {
                return { quality: fixQualityCheat(qualities[i]), url: map[qualities[i]] };
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
            def_voice_id: '', pageStreamRaw: '', kp: null
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

    function Component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 150 });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);

        var last;
        var pageInfo = null;
        var currentTitle = '';
        var allEpisodes = [];
        var choice = { voice: 0, season: 0 };
        var filter_items = { voice: [], season: [], season_id: [] };
        var mode = 'search';

        var localObject = object;

        this.create = function () {
            this.activity.loader(true);

            filter.onBack = function () { this.start(); }.bind(this);

            filter.onSelect = function (type, a, b) {
                if (type !== 'filter') return;
                if (a.reset) {
                    choice.voice = 0;
                    choice.season = 0;
                    if (mode === 'series') this.reloadSeries();
                    else if (mode === 'movie') this.drawMovieList();
                    return;
                }
                if (a.stype === 'voice') {
                    choice.voice = b.index;
                    choice.season = 0;
                    if (mode === 'series') this.reloadSeries();
                    else this.drawMovieList();
                } else if (a.stype === 'season') {
                    choice.season = b.index;
                    this.drawEpisodeList();
                }
            }.bind(this);

            files.appendHead(filter.render());
            files.appendFiles(scroll.render());

            this.search();
            return this.render();
        };

        this.render = function () { return files.render(); };

        this.loading = function (status) {
            this.activity.loader(status);
            if (!status) {
                this.activity.toggle();
                this.fixScroll();
            }
        };

        this.fixScroll = function () {
            try {
                var head = files.render().find('.explorer__files-head, .files__header, .filter').first();
                if (head.length) scroll.minus(head);
                else scroll.minus();
            } catch (e) {}
        };

        this.reset = function () {
            last = false;
            scroll.clear();
            scroll.body().empty();
        };

        this.append = function (item) {
            item.on('hover:focus', function (e) {
                last = e.target;
                try { scroll.update($(e.target), true); } catch (err) {}
            });
            scroll.append(item);
        };

        this.empty = function (msg) {
            this.reset();
            this.loading(false);
            scroll.append($('<div class="empty__text" style="padding:1.5em">' + (msg || 'Нет данных') + '</div>'));
            this.start(true);
        };

        this.buildFilter = function () {
            var select = [];
            var need = choice;

            var add = function (type, title) {
                var items = filter_items[type] || [];
                if (!items.length) return;
                var sub = [];
                items.forEach(function (name, i) {
                    sub.push({ title: name, selected: need[type] == i, index: i });
                });
                select.push({ title: title, subtitle: items[need[type]] || '', items: sub, stype: type });
            };

            select.push({ title: Lampa.Lang.translate('torrent_parser_reset') || 'Сбросить', reset: true });
            add('voice', Lampa.Lang.translate('torrent_parser_voice') || 'Озвучка');
            add('season', Lampa.Lang.translate('torrent_serial_season') || 'Сезон');

            filter.set('filter', select);

            var chosen = [];
            if (filter_items.voice && filter_items.voice.length > 1) {
                chosen.push((Lampa.Lang.translate('torrent_parser_voice') || 'Озвучка') + ': ' + filter_items.voice[choice.voice]);
            }
            if (filter_items.season && filter_items.season.length > 1) {
                chosen.push((Lampa.Lang.translate('torrent_serial_season') || 'Сезон') + ': ' + filter_items.season[choice.season]);
            }
            filter.chosen('filter', chosen);
        };

        this.search = function () {
            mode = 'search';
            this.loading(true);
            var title = localObject.movie.title || localObject.movie.name || '';
            var year = (localObject.movie.release_date || localObject.movie.first_air_date || '').substring(0, 4);
            var url = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(title + (year ? ' ' + year : ''));

            reqGet(url, function (html) {
                var items = parseSearch(html);
                if (!items.length) return this.empty('Ничего не найдено');
                if (items.length === 1) this.openTitle(items[0]);
                else this.drawSearch(items);
            }.bind(this), function (e) {
                this.empty(e === 'cookie' ? 'Cookie устарели' : 'Ошибка сети');
            }.bind(this));
        };

        this.drawSearch = function (items) {
            this.reset();
            this.loading(false);
            filter.set('filter', []);
            filter.chosen('filter', []);

            items.forEach(function (it) {
                var element = { title: it.title, quality: '', info: '' };
                var item = Lampa.Template.get('hdrezka_ua_item', element);
                var sub = item.find('.hdrezka-ua-subtext');

                var yearMatch = it.title.match(/\((\d{4})\)/);
                var year = yearMatch ? yearMatch[1] : '';
                var cleanTitle = it.title.replace(/\s*\(\d{4}\)\s*$/, '').trim();

                kpSearch(cleanTitle, year, function (kp) {
                    if (!kp) return;
                    it.kp = kp;
                    var line = kpInfoLine(kp);
                    if (line) sub.text(line);
                });

                item.on('hover:enter', function () { this.openTitle(it); }.bind(this));
                this.append(item);
            }.bind(this));

            this.start(true);
        };

        this.openTitle = function (item) {
            this.loading(true);
            currentTitle = item.title;
            reqGet(item.url, function (html) {
                pageInfo = parsePage(html);
                if (!pageInfo.film_id && !pageInfo.voices.length) return this.empty('Не удалось разобрать страницу');
                choice.voice = 0;
                choice.season = 0;
                for (var i = 0; i < pageInfo.voices.length; i++) {
                    if (String(pageInfo.voices[i].id) === String(pageInfo.def_voice_id)) {
                        choice.voice = i;
                        break;
                    }
                }
                filter_items.voice = pageInfo.voices.map(function (v) { return v.name; });
                filter_items.season = [];
                filter_items.season_id = [];

                var kpId = (item.kp && item.kp.id) || extractKpId(localObject.movie);
                var year = (localObject.movie.release_date || localObject.movie.first_air_date || '').substring(0, 4);
                var titleForKp = localObject.movie.title || localObject.movie.name || currentTitle;

                if (kpId) {
                    kpDetails(kpId, function (details) {
                        if (details) pageInfo.kp = {
                            id: kpId,
                            rating: details.ratingKinopoisk,
                            year: details.year,
                            genres: (details.genres || []).map(function (g) { return g.genre; }),
                            countries: (details.countries || []).map(function (c) { return c.country; }),
                            filmLength: details.filmLength,
                            type: details.type
                        };
                        this.afterKp();
                    }.bind(this));
                } else {
                    kpSearch(titleForKp, year, function (kp) {
                        pageInfo.kp = kp;
                        this.afterKp();
                    }.bind(this));
                }
            }.bind(this), function (e) {
                this.empty(e === 'cookie' ? 'Cookie устарели' : 'Ошибка загрузки');
            }.bind(this));
        };

        this.afterKp = function () {
            if (pageInfo.is_series) {
                mode = 'series';
                this.reloadSeries();
            } else {
                mode = 'movie';
                this.drawMovieList();
            }
        };

        this.drawMovieList = function () {
            this.reset();
            this.buildFilter();
            this.loading(false);

            var maxQuality = '360p';
            if (pageInfo.pageStreamRaw) {
                var parsed = bestStream(pageInfo.pageStreamRaw);
                if (parsed) maxQuality = parsed.quality;
            }

            var hash = Lampa.Utils.hash(localObject.movie.original_title || localObject.movie.title || localObject.movie.name);
            var view = Lampa.Timeline.view(hash);

            var kpLine = kpInfoLine(pageInfo.kp);

            pageInfo.voices.forEach(function (voice, idx) {
                var element = {
                    title: voice.name,
                    quality: maxQuality,
                    info: kpLine ? ' • ' + kpLine : ''
                };
                var item = Lampa.Template.get('hdrezka_ua_item', element);

                if (view.percent > 0) {
                    item.find('.hdrezka-ua-text').append(Lampa.Timeline.render(view));
                }

                item.on('hover:enter', function () {
                    choice.voice = idx;
                    this.playMovie(voice, hash);
                }.bind(this));
                this.append(item);
            }.bind(this));

            this.start(true);
        };

        this.playMovie = function (voice, hash) {
            Lampa.Noty.show('Загрузка…');

            if (String(voice.id) === String(pageInfo.def_voice_id) && pageInfo.pageStreamRaw) {
                var s0 = bestStream(pageInfo.pageStreamRaw);
                if (!s0) return Lampa.Noty.show('Нет доступного качества');
                this.startPlayer(currentTitle + ' — ' + voice.name, s0, hash);
                return;
            }

            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body = 'id=' + encodeURIComponent(pageInfo.film_id) +
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
                if (json && json.premium_content) return Lampa.Noty.show('Только Premium');
                var s = bestStream(json && json.url);
                if (!s) return Lampa.Noty.show('Нет доступного качества');
                this.startPlayer(currentTitle + ' — ' + voice.name, s, hash);
            }.bind(this), function () {
                Lampa.Noty.show('Ошибка потока');
            });
        };

        this.reloadSeries = function () {
            this.loading(true);
            var voice = pageInfo.voices[choice.voice];
            if (!voice) return this.empty('Нет озвучки');

            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body = 'id=' + encodeURIComponent(pageInfo.film_id) +
                '&translator_id=' + encodeURIComponent(voice.id) +
                '&favs=' + encodeURIComponent(pageInfo.favs || '') +
                '&action=get_episodes';

            reqPost(url, body, function (json) {
                if (typeof json === 'string') {
                    try { json = JSON.parse(json); } catch (e) { json = {}; }
                }
                allEpisodes = parseEpisodesHtml(json && json.episodes, voice.id);
                if (!allEpisodes.length) allEpisodes = parseEpisodesHtml(json && json.seasons, voice.id);
                if (!allEpisodes.length && pageInfo.episodes.length) {
                    allEpisodes = pageInfo.episodes.map(function (e) {
                        return { season_id: e.season_id, episode_id: e.episode_id, name: e.name, translator_id: voice.id };
                    });
                }

                var map = {}, pairs = [];
                allEpisodes.forEach(function (e) {
                    if (!map[e.season_id]) {
                        map[e.season_id] = true;
                        pairs.push({ id: e.season_id, n: 'Сезон ' + e.season_id });
                    }
                });
                pairs.sort(function (a, b) { return parseInt(a.id, 10) - parseInt(b.id, 10); });
                filter_items.season = pairs.map(function (p) { return p.n; });
                filter_items.season_id = pairs.map(function (p) { return p.id; });
                if (choice.season >= filter_items.season.length) choice.season = 0;

                this.drawEpisodeList();
            }.bind(this), function () {
                this.empty('Ошибка загрузки серий');
            }.bind(this));
        };

        this.drawEpisodeList = function () {
            this.reset();
            this.buildFilter();
            this.loading(false);

            var sid = filter_items.season_id[choice.season];
            var voice = pageInfo.voices[choice.voice];
            var kpLine = kpInfoLine(pageInfo.kp);
            var list = allEpisodes.filter(function (e) {
                return !sid || String(e.season_id) === String(sid);
            });

            if (!list.length) {
                scroll.append($('<div class="empty__text" style="padding:1.5em">Нет серий</div>'));
                this.start(true);
                return;
            }

            list.forEach(function (ep) {
                var titleText = 'Сезон ' + ep.season_id + ' — Серия ' + ep.episode_id;
                if (ep.name && ep.name.toLowerCase().indexOf('серия') === -1) {
                    titleText += ' (' + ep.name + ')';
                }

                var element = {
                    title: titleText,
                    quality: '360p ~ 1080p',
                    info: ' / ' + (voice ? voice.name : '') + (kpLine ? ' • ' + kpLine : '')
                };

                var item = Lampa.Template.get('hdrezka_ua_item', element);

                var hash = Lampa.Utils.hash([ep.season_id, ':', ep.episode_id, localObject.movie.original_title].join(''));
                var view = Lampa.Timeline.view(hash);
                if (view.percent > 0) {
                    item.find('.hdrezka-ua-text').append(Lampa.Timeline.render(view));
                }

                item.on('hover:enter', function () {
                    this.playEpisode(ep, voice, hash);
                }.bind(this));
                this.append(item);
            }.bind(this));

            this.start(true);
        };

        this.playEpisode = function (ep, voice, hash) {
            Lampa.Noty.show('Загрузка…');
            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body = 'id=' + encodeURIComponent(pageInfo.film_id) +
                '&translator_id=' + encodeURIComponent(voice.id) +
                '&season=' + encodeURIComponent(ep.season_id) +
                '&episode=' + encodeURIComponent(ep.episode_id) +
                '&favs=' + encodeURIComponent(pageInfo.favs || '') +
                '&action=get_stream';

            reqPost(url, body, function (json) {
                if (typeof json === 'string') {
                    try { json = JSON.parse(json); } catch (e) { json = {}; }
                }
                if (json && json.premium_content) return Lampa.Noty.show('Только Premium');
                var s = bestStream(json && json.url);
                if (!s) return Lampa.Noty.show('Нет доступного качества');
                var t = currentTitle + ' S' + ep.season_id + 'E' + ep.episode_id + ' — ' + voice.name;

                var view = Lampa.Timeline.view(hash);
                Lampa.Player.play({ title: t, url: s.url, quality: s.quality, timeline: view });
            }.bind(this), function () {
                Lampa.Noty.show('Ошибка серии');
            });
        };

        this.startPlayer = function (title, stream, hash) {
            var view = Lampa.Timeline.view(hash);
            Lampa.Player.play({ title: title, url: stream.url, quality: stream.quality, timeline: view });
            Lampa.Player.playlist([{ title: title + ' — ' + stream.quality, url: stream.url, timeline: view }]);
        };

        this.start = function (first_select) {
            this.fixScroll();

            if (first_select) {
                last = scroll.render().find('.selector').eq(0)[0];
            }

            try { Lampa.Background.immediately(Lampa.Utils.cardImgBackground(localObject.movie)); } catch (e) {}

            scroll.render().css({
                'padding-left': '1em',
                'padding-right': '1em',
                'box-sizing': 'border-box',
                'width': '100%'
            });

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () { Navigator.move('down'); },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                    else filter.show(Lampa.Lang.translate('title_filter') || 'Фильтр', 'filter');
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: function () { Lampa.Activity.backward(); }
            });

            Lampa.Controller.toggle('content');

            setTimeout(function () {
                this.fixScroll();
                if (last) { try { scroll.update($(last), true); } catch (e) {} }
            }.bind(this), 100);
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {
            network.clear();
            files.destroy();
            scroll.destroy();
        };
    }

    function addButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' && e.type !== 'complete') return;
            var render = e.object.activity.render();
            if (render.find('.hdrezka-ua-btn').length) return;

            var btn = $('<div class="full-start__button selector view--online hdrezka-ua-btn" data-subtitle="HDrezka">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                '<span>HDrezka</span></div>');

            btn.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: (e.data.movie.title || e.data.movie.name || '') + ' — HDrezka',
                    component: COMPONENT,
                    movie: e.data.movie,
                    page: 1
                });
            });

            var box = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (box.length) box.prepend(btn);
            else render.find('.full-start__title').after(btn);
        });
    }

    function start() {
        Lampa.Component.add(COMPONENT, Component);
        addButton();
        console.log('[HDrezka] Автообновление куков включено, автоплей отключён, Кинопоиск подключён');
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });
})();
