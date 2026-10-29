(function () {
    'use strict';

    if (window.hdrezka_ua_only) return;
    window.hdrezka_ua_only = true;

    var BASE = 'https://rezka-ua.tv';
    var COMPONENT = 'hdrezka_ua';
    var COOKIE_SERVER = 'http://192.168.100.5:9999/anubis';

    var COOKIE = Lampa.Storage.get('hdrezka_ua_cookie', '');
    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // === TMDB через CUB-прокси ===
    var TMDB_BASE = 'https://apitmdb.cub.best/3';
    var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
    var TMDB_IMG = 'https://imagetmdb.com/t/p';
    var TMDB_IMG_ALT = 'https://image.tmdb.org/t/p';
    var tmdbCache = {};

    // Красивый значок рейтинга (SVG-звезда)
    var STAR_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" style="vertical-align:-1px;margin-right:2px;fill:#f5c518;filter:drop-shadow(0 0 2px rgba(245,197,24,0.6))"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6L12 2z"/></svg>';

    function tmdbGet(path, params, cb) {
        var q = ['api_key=' + TMDB_KEY, 'language=ru', 'email='];
        for (var k in (params || {})) {
            if (params.hasOwnProperty(k)) q.push(k + '=' + encodeURIComponent(params[k]));
        }
        var url = TMDB_BASE + path + '?' + q.join('&');
        var n = new Lampa.Reguest();
        n.timeout(10000);
        var m = n.native ? 'native' : 'silent';
        n[m](url, function (resp) {
            var d = null;
            try { d = typeof resp === 'string' ? JSON.parse(resp) : resp; } catch (e) {}
            cb(d || null);
        }, function () { cb(null); }, false, { dataType: 'text' });
    }

    function tmdbImage(path, size) {
        if (!path) return '';
        return TMDB_IMG + '/' + (size || 'w185') + path;
    }

    function tmdbImageAlt(path, size) {
        if (!path) return '';
        return TMDB_IMG_ALT + '/' + (size || 'w185') + path;
    }

    function extractTmdbId(movie) {
        if (!movie) return null;
        var c = [movie.tmdb_id, movie.tmdbId, movie.ids && movie.ids.tmdb];
        for (var i = 0; i < c.length; i++) {
            if (c[i] && String(c[i]).match(/^\d+$/)) return String(c[i]);
        }
        return null;
    }

    function extractImdbId(movie) {
        if (!movie) return null;
        var c = [movie.imdb_id, movie.imdbId, movie.ids && movie.ids.imdb];
        for (var i = 0; i < c.length; i++) {
            if (c[i] && String(c[i]).match(/^tt\d+$/)) return String(c[i]);
        }
        return null;
    }

    function tmdbFindShow(movie, currentTitle, cb) {
        var id = extractTmdbId(movie);
        if (id) return cb(id);

        var imdb = extractImdbId(movie);
        if (imdb) {
            var keyImdb = 'findimdb:' + imdb;
            if (tmdbCache[keyImdb] !== undefined) return cb(tmdbCache[keyImdb]);
            tmdbGet('/find/' + imdb, { external_source: 'imdb_id' }, function (d) {
                var found = null;
                if (d && d.tv_results && d.tv_results.length) {
                    found = String(d.tv_results[0].id);
                }
                tmdbCache[keyImdb] = found;
                cb(found);
            });
            return;
        }

        var title = movie.title || movie.name || currentTitle;
        var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
        if (!title) return cb(null);
        var key = 'find:' + title.toLowerCase() + ':' + year;
        if (tmdbCache[key] !== undefined) return cb(tmdbCache[key]);

        var params = { query: title };
        if (year) params.first_air_date_year = year;

        tmdbGet('/search/tv', params, function (d) {
            var found = null;
            if (d && d.results && d.results.length) {
                for (var i = 0; i < d.results.length; i++) {
                    var r = d.results[i];
                    var rYear = (r.first_air_date || '').substring(0, 4);
                    var rName = (r.name || '').toLowerCase();
                    var rOrig = (r.original_name || '').toLowerCase();
                    var tLower = title.toLowerCase();
                    if ((rName === tLower || rOrig === tLower) && (!year || rYear === year)) {
                        found = String(r.id);
                        break;
                    }
                }
                if (!found) {
                    for (var j = 0; j < d.results.length; j++) {
                        var rr = d.results[j];
                        var rY = (rr.first_air_date || '').substring(0, 4);
                        if (!year || rY === year) { found = String(rr.id); break; }
                    }
                }
            }
            tmdbCache[key] = found;
            cb(found);
        });
    }

    function tmdbDetails(tvId, cb) {
        if (!tvId) return cb(null);
        var key = 'tv:' + tvId;
        if (tmdbCache[key] !== undefined) return cb(tmdbCache[key]);
        tmdbGet('/tv/' + tvId, {}, function (d) {
            var info = null;
            if (d) {
                info = {
                    poster: d.poster_path || null,
                    name: d.name || null,
                    year: (d.first_air_date || '').substring(0, 4),
                    genres: (d.genres || []).map(function (g) { return g.name; }),
                    runtime: (d.episode_run_time && d.episode_run_time[0]) || null,
                    rating: d.vote_average || null
                };
            }
            tmdbCache[key] = info;
            cb(info);
        });
    }

    function tmdbMovieDetails(movieId, cb) {
        if (!movieId) return cb(null);
        var key = 'movie:' + movieId;
        if (tmdbCache[key] !== undefined) return cb(tmdbCache[key]);
        tmdbGet('/movie/' + movieId, {}, function (d) {
            var info = null;
            if (d) {
                info = {
                    poster: d.poster_path || null,
                    name: d.title || null,
                    year: (d.release_date || '').substring(0, 4),
                    genres: (d.genres || []).map(function (g) { return g.name; }),
                    runtime: d.runtime || null,
                    rating: d.vote_average || null,
                    date: d.release_date || null
                };
            }
            tmdbCache[key] = info;
            cb(info);
        });
    }

    function tmdbFindMovie(movie, currentTitle, cb) {
        var id = extractTmdbId(movie);
        if (id) return tmdbMovieDetails(id, cb);

        var imdb = extractImdbId(movie);
        if (imdb) {
            var keyImdb = 'findmovieimdb:' + imdb;
            if (tmdbCache[keyImdb] !== undefined) return cb(tmdbCache[keyImdb]);
            tmdbGet('/find/' + imdb, { external_source: 'imdb_id' }, function (d) {
                if (d && d.movie_results && d.movie_results.length) {
                    tmdbMovieDetails(String(d.movie_results[0].id), function (info) {
                        tmdbCache[keyImdb] = info;
                        cb(info);
                    });
                } else {
                    tmdbCache[keyImdb] = null;
                    cb(null);
                }
            });
            return;
        }

        var title = movie.title || movie.name || currentTitle;
        var year = (movie.release_date || '').substring(0, 4);
        if (!title) return cb(null);
        var key = 'findmovie:' + title.toLowerCase() + ':' + year;
        if (tmdbCache[key] !== undefined) return cb(tmdbCache[key]);

        var params = { query: title };
        if (year) params.year = year;

        tmdbGet('/search/movie', params, function (d) {
            var foundId = null;
            if (d && d.results && d.results.length) {
                for (var i = 0; i < d.results.length; i++) {
                    var r = d.results[i];
                    var rYear = (r.release_date || '').substring(0, 4);
                    var rName = (r.title || '').toLowerCase();
                    var rOrig = (r.original_title || '').toLowerCase();
                    var tLower = title.toLowerCase();
                    if ((rName === tLower || rOrig === tLower) && (!year || rYear === year)) {
                        foundId = String(r.id);
                        break;
                    }
                }
                if (!foundId) {
                    for (var j = 0; j < d.results.length; j++) {
                        var rr = d.results[j];
                        var rY = (rr.release_date || '').substring(0, 4);
                        if (!year || rY === year) { foundId = String(rr.id); break; }
                    }
                }
            }
            if (foundId) {
                tmdbMovieDetails(foundId, function (info) {
                    tmdbCache[key] = info;
                    cb(info);
                });
            } else {
                tmdbCache[key] = null;
                cb(null);
            }
        });
    }

    function tmdbSeason(tvId, seasonNumber, cb) {
        if (!tvId || !String(tvId).match(/^\d+$/)) return cb(null);
        var key = 'season:' + tvId + ':' + seasonNumber;
        if (tmdbCache[key] !== undefined) return cb(tmdbCache[key]);
        tmdbGet('/tv/' + tvId + '/season/' + seasonNumber, {}, function (d) {
            var map = {};
            if (d && d.episodes) {
                d.episodes.forEach(function (ep) {
                    map[ep.episode_number] = {
                        name: ep.name || null,
                        date: ep.air_date || null,
                        still: ep.still_path || null,
                        rating: ep.vote_average || null,
                        runtime: ep.runtime || null
                    };
                });
            }
            tmdbCache[key] = map;
            cb(map);
        });
    }

    function fmtDate(s) {
        if (!s) return '';
        var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return s;
        return m[3] + '-' + m[2] + '-' + m[1];
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

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function iconData(path, size) {
        var primary = path ? tmdbImage(path, size || 'w185') : '';
        var alt = path ? tmdbImageAlt(path, size || 'w185') : '';
        return {
            poster: primary,
            poster_alt: alt,
            poster_display: primary ? 'block' : 'none',
            play_display: primary ? 'none' : 'block'
        };
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
            '.hdrezka-ua-item { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding: 0 !important; margin: 0 0 0.45em 0 !important; overflow: hidden !important; background: #181818 !important; border-radius: 0.45em !important; transition: background 0.2s ease, box-shadow 0.2s ease !important; }' +
            '.hdrezka-ua-item.focus { background: linear-gradient(90deg, rgba(60,120,200,0.35) 0%, rgba(60,120,200,0.12) 40%, #181818 100%) !important; box-shadow: 0 0 0 1px rgba(90,160,255,0.35) inset !important; }' +
            /* базовые пропорции (фильмы) */
            '.hdrezka-ua-inner { display: flex !important; align-items: stretch !important; width: 100% !important; padding: 0 !important; box-sizing: border-box !important; min-height: 7em !important; }' +
            '.hdrezka-ua-icon { position: relative !important; flex-shrink: 0 !important; width: 8.6em !important; min-height: 7em !important; margin: 0 !important; overflow: hidden !important; background: #222 !important; }' +
            /* серии: выше на треть и постер шире */
            '.hdrezka-ua-item--ep .hdrezka-ua-inner { min-height: 9.4em !important; }' +
            '.hdrezka-ua-item--ep .hdrezka-ua-icon { width: 9.4em !important; min-height: 9.4em !important; }' +
            '.hdrezka-ua-poster { display: block !important; width: 100% !important; height: 100% !important; object-fit: cover !important; }' +
            '.hdrezka-ua-play { width: 100% !important; height: 100% !important; }' +
            /* бейдж на всю картинку */
            '.hdrezka-ua-badge { position: absolute !important; inset: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 2.8em !important; font-weight: 700 !important; color: rgba(255,255,255,0.92) !important; letter-spacing: 0.02em !important; text-shadow: 0 2px 8px rgba(0,0,0,0.85), 0 0 20px rgba(0,0,0,0.6) !important; pointer-events: none !important; }' +
            '.hdrezka-ua-text { flex-grow: 1 !important; display: flex !important; flex-direction: column !important; justify-content: center !important; overflow: hidden !important; padding: 0.6em 1em !important; }' +
            '.hdrezka-ua-title { font-size: 1.12em !important; font-weight: 600 !important; color: #fff !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; margin-bottom: 0.25em !important; line-height: 1.3 !important; }' +
            '.hdrezka-ua-line2 { font-size: 0.95em !important; color: #c4c4c4 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; margin-bottom: 0.15em !important; line-height: 1.35 !important; display: flex !important; align-items: center !important; }' +
            '.hdrezka-ua-line3 { font-size: 0.88em !important; color: #8f8f8f !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; line-height: 1.35 !important; display: flex !important; align-items: center !important; }' +
            '.hdrezka-ua-rating { display: inline-flex !important; align-items: center !important; color: #f5c518 !important; font-weight: 600 !important; margin-right: 0.5em !important; }' +
            '.hdrezka-ua-subtext { display: none !important; }' +
            '</style>'
        );
    }

    // === ШАБЛОН ===
    Lampa.Template.add('hdrezka_ua_item',
        '<div class="online selector hdrezka-ua-item {extra_class}">' +
        '  <div class="online__body hdrezka-ua-inner">' +
        '    <div class="hdrezka-ua-icon">' +
        '      <img class="hdrezka-ua-poster" src="{poster}" data-alt="{poster_alt}" style="display:{poster_display}" ' +
        '           onerror="if(this.dataset.alt && this.src!==this.dataset.alt){this.src=this.dataset.alt;}else{this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'}">' +
        '      <svg class="hdrezka-ua-play" style="display:{play_display};width:100%;height:100%;" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '        <circle cx="64" cy="64" r="56" stroke="#ccc" stroke-width="12"/>' +
        '        <path d="M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z" fill="#ccc"/>' +
        '      </svg>' +
        '      <div class="hdrezka-ua-badge" style="display:{badge_display}">{badge}</div>' +
        '    </div>' +
        '    <div class="hdrezka-ua-text">' +
        '      <div class="hdrezka-ua-title">{title}</div>' +
        '      <div class="hdrezka-ua-line2">{line2}</div>' +
        '      <div class="hdrezka-ua-line3">{line3}</div>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    );

    // === КУКИ ===
    function refreshCookies(callback) {
        console.log('[HDrezka] Запрос новых куков у сервера...');
        var n = new Lampa.Reguest();
        n.timeout(15000);
        var m = n.native ? 'native' : 'silent';
        n[m](COOKIE_SERVER, function (response) {
            try {
                var data = JSON.parse(response);
                if (data.cookie) {
                    COOKIE = data.cookie;
                    Lampa.Storage.set('hdrezka_ua_cookie', COOKIE);
                    console.log('[HDrezka] Куки успешно обновлены');
                    Lampa.Noty.show('HDrezka: Куки обновлены');
                }
            } catch (e) { console.log('[HDrezka] Ошибка парсинга ответа сервера'); }
            callback();
        }, function () {
            console.log('[HDrezka] Сервер куков недоступен');
            Lampa.Noty.show('HDrezka: Локальный сервер недоступен');
            callback();
        }, false, { dataType: 'text', headers: { 'User-Agent': UA } });
    }

    function headers() {
        return {
            'User-Agent': UA, 'Referer': BASE + '/', 'Origin': BASE,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8', 'Cookie': COOKIE
        };
    }

    function reqGet(url, ok, err) {
        var n = new Lampa.Reguest();
        n.timeout(25000);
        var m = n.native ? 'native' : 'silent';
        n[m](url, function (html) {
            if (typeof html !== 'string') html = (html && html.body) ? html.body : String(html || '');
            if (html.indexOf('Проверяем, что вы не бот') !== -1 || html.indexOf('anubis_challenge') !== -1) {
                refreshCookies(function () { reqGet(url, ok, err); });
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
                refreshCookies(function () { reqPost(url, body, ok, err); });
                return;
            }
            ok && ok(json);
        }, function () { err && err('net'); }, body, { headers: h });
    }

    function decodeStream(data) {
        if (!data || data.charAt(0) !== '#') return data || '';
        var enc = function (str) { return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) { return String.fromCharCode('0x' + p1); })); };
        var dec = function (str) { return decodeURIComponent(atob(str).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); };
        var trash = ['$$!!@$$@^!@#$$@', '@@@@@!##!^^^', '####^!!##!@@', '^^^!@##!!##', '$$#!!@#!@##'];
        var x = data.substring(2);
        trash.forEach(function (t) { x = x.replace('//_//' + enc(t), ''); });
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
        var order = ['1080p', '720p', '480p', '360p'];
        for (var i = 0; i < order.length; i++) {
            if (map[order[i]]) return { quality: fixQualityCheat(order[i]), url: map[order[i]] };
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
        var info = { film_id: '', favs: '', is_series: false, voices: [], seasons: [], episodes: [], def_voice_id: '', pageStreamRaw: '', tmdbEpisodes: null, tmdb: null, tmdbId: null };
        var favs = html.match(/id="ctrl_favs"\s+value="([^"]*)"/);
        if (favs) info.favs = favs[1];

        var cdnS = html.match(/\.initCDNSeriesEvents\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);
        var cdnM = html.match(/\.initCDNMoviesEvents\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);
        if (cdnS) { info.is_series = true; info.film_id = cdnS[1]; info.def_voice_id = cdnS[2]; }
        else if (cdnM) { info.film_id = cdnM[1]; info.def_voice_id = cdnM[2]; info.def_camrip = cdnM[3]; info.def_ads = cdnM[4]; info.def_director = cdnM[5]; }

        var list = html.match(/<ul[^>]*id="translators-list"[^>]*>([\s\S]*?)<\/ul>/i);
        if (list) {
            var re = /class="[^"]*b-translator__item[^"]*"[^>]*data-translator_id="(\d+)"([^>]*)>([\s\S]*?)<\/li>/gi, im;
            while ((im = re.exec(list[1])) !== null) {
                var attrs = im[2] || '';
                var name = $('<div>' + im[3] + '</div>').text().replace(/\s+/g, ' ').trim();
                var t = (attrs.match(/title="([^"]*)"/) || [])[1];
                if (t) name = t.trim();
                info.voices.push({
                    id: im[1], name: name || ('Озвучка ' + im[1]),
                    is_camrip: (attrs.match(/data-camrip="([^"]*)"/) || [])[1] || '0',
                    is_ads: (attrs.match(/data-ads="([^"]*)"/) || [])[1] || '0',
                    is_director: (attrs.match(/data-director="([^"]*)"/) || [])[1] || '0'
                });
            }
        }
        if (!info.voices.length && info.def_voice_id) {
            info.voices.push({ id: info.def_voice_id, name: 'По умолчанию', is_camrip: info.def_camrip || '0', is_ads: info.def_ads || '0', is_director: info.def_director || '0' });
        }

        var ep = html.match(/<div[^>]*id="simple-episodes-tabs"[^>]*>([\s\S]*?)<\/div>/i);
        if (ep) {
            var re2 = /data-season_id="(\d+)"[^>]*data-episode_id="(\d+)"[^>]*>([^<]*)/gi, em;
            while ((em = re2.exec(ep[1])) !== null) {
                info.episodes.push({ season_id: em[1], episode_id: em[2], name: (em[3] || '').trim() });
            }
        }

        var block = html.match(/initCDN(?:Movies|Series)Events\s*\([\s\S]*?(\{[\s\S]*?\})\s*\)\s*;/);
        if (block) { try { var d = JSON.parse(block[1]); if (d.streams) info.pageStreamRaw = d.streams; } catch (e) {} }
        if (!info.pageStreamRaw) { var f = html.match(/file\s*:\s*['"]([^'"]+)['"]/); if (f) info.pageStreamRaw = f[1]; }
        return info;
    }

    function parseEpisodesHtml(html, tid) {
        var out = [];
        if (!html) return out;
        var re = /data-season_id="(\d+)"[^>]*data-episode_id="(\d+)"[^>]*>([^<]*)/gi, m;
        while ((m = re.exec(html)) !== null) {
            out.push({ season_id: m[1], episode_id: m[2], name: (m[3] || '').trim(), translator_id: tid });
        }
        return out;
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
                    choice.voice = 0; choice.season = 0;
                    if (mode === 'series') this.reloadSeries(); else if (mode === 'movie') this.drawMovieList();
                    return;
                }
                if (a.stype === 'voice') {
                    choice.voice = b.index;
                    choice.season = 0;
                    if (mode === 'series') this.reloadSeries(); else this.drawMovieList();
                } else if (a.stype === 'season') {
                    choice.season = b.index;
                    this.loadSeasonEpisodes();
                }
            }.bind(this);
            files.appendHead(filter.render());
            files.appendFiles(scroll.render());
            this.search();
            return this.render();
        };

        this.render = function () { return files.render(); };

        this.loading = function (s) { this.activity.loader(s); if (!s) { this.activity.toggle(); this.fixScroll(); } };

        this.fixScroll = function () {
            try { var h = files.render().find('.explorer__files-head, .files__header, .filter').first(); if (h.length) scroll.minus(h); else scroll.minus(); } catch (e) {}
        };

        this.reset = function () { last = false; scroll.clear(); scroll.body().empty(); };

        this.append = function (item) {
            item.on('hover:focus', function (e) {
                last = e.target;
                scroll.render().find('.hdrezka-ua-item').removeClass('focus');
                $(e.target).addClass('focus');
                try { scroll.update($(e.target), true); } catch (err) {}
            });
            scroll.append(item);
        };

        this.empty = function (msg) {
            this.reset(); this.loading(false);
            scroll.append($('<div class="empty__text" style="padding:1.5em">' + (msg || 'Нет данных') + '</div>'));
            this.start(true);
        };

        this.buildFilter = function () {
            var select = [];
            var add = function (type, title) {
                var items = filter_items[type] || [];
                if (!items.length) return;
                var sub = [];
                items.forEach(function (n, i) { sub.push({ title: n, selected: choice[type] == i, index: i }); });
                select.push({ title: title, subtitle: items[choice[type]] || '', items: sub, stype: type });
            };
            select.push({ title: Lampa.Lang.translate('torrent_parser_reset') || 'Сбросить', reset: true });
            add('voice', Lampa.Lang.translate('torrent_parser_voice') || 'Озвучка');
            add('season', Lampa.Lang.translate('torrent_serial_season') || 'Сезон');
            filter.set('filter', select);

            var chosen = [];
            if (filter_items.voice && filter_items.voice.length > 1) chosen.push((Lampa.Lang.translate('torrent_parser_voice') || 'Озвучка') + ': ' + filter_items.voice[choice.voice]);
            if (filter_items.season && filter_items.season.length > 1) chosen.push((Lampa.Lang.translate('torrent_serial_season') || 'Сезон') + ': ' + filter_items.season[choice.season]);
            filter.chosen('filter', chosen);
        };

        this.loadSeasonEpisodes = function () {
            var sid = filter_items.season_id[choice.season];
            var seasonNum = sid ? String(sid) : '';
            if (pageInfo.tmdbId && seasonNum) {
                this.loading(true);
                tmdbSeason(pageInfo.tmdbId, seasonNum, function (epMap) {
                    pageInfo.tmdbEpisodes = epMap || {};
                    this.loading(false);
                    this.drawEpisodeList();
                }.bind(this));
            } else {
                pageInfo.tmdbEpisodes = {};
                this.drawEpisodeList();
            }
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
            }.bind(this), function (e) { this.empty(e === 'cookie' ? 'Cookie устарели' : 'Ошибка сети'); }.bind(this));
        };

        this.drawSearch = function (items) {
            this.reset(); this.loading(false);
            filter.set('filter', []); filter.chosen('filter', []);
            items.forEach(function (it) {
                var el = {
                    title: it.title,
                    line2: '',
                    line3: '',
                    badge: '',
                    badge_display: 'none',
                    extra_class: ''
                };
                $.extend(el, iconData(null));
                var item = Lampa.Template.get('hdrezka_ua_item', el);
                var img = item.find('.hdrezka-ua-poster');
                var play = item.find('.hdrezka-ua-play');
                var ym = it.title.match(/\((\d{4})\)/);
                var year = ym ? ym[1] : '';
                var clean = it.title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                tmdbFindShow({ title: clean, first_air_date: year ? year + '-01-01' : '' }, clean, function (tvId) {
                    if (!tvId) return;
                    tmdbDetails(tvId, function (d) {
                        if (!d) return;
                        it.tmdb = d;
                        it.tmdbId = tvId;
                        if (d.poster) {
                            img.attr('src', tmdbImage(d.poster, 'w185'))
                               .attr('data-alt', tmdbImageAlt(d.poster, 'w185'))
                               .css('display', 'block');
                            play.css('display', 'none');
                        }
                        item.find('.hdrezka-ua-line2').text([d.year, (d.genres || [])[0]].filter(Boolean).join(' • '));
                        if (d.rating) item.find('.hdrezka-ua-line3').html('<span class="hdrezka-ua-rating">' + STAR_SVG + Number(d.rating).toFixed(1) + '</span>');
                    });
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
                choice.voice = 0; choice.season = 0;
                for (var i = 0; i < pageInfo.voices.length; i++) {
                    if (String(pageInfo.voices[i].id) === String(pageInfo.def_voice_id)) { choice.voice = i; break; }
                }
                filter_items.voice = pageInfo.voices.map(function (v) { return v.name; });
                filter_items.season = []; filter_items.season_id = [];

                if (item.tmdb) {
                    pageInfo.tmdb = item.tmdb;
                    pageInfo.tmdbId = item.tmdbId || null;
                }

                if (pageInfo.is_series) {
                    tmdbFindShow(localObject.movie, currentTitle, function (tvId) {
                        if (tvId) pageInfo.tmdbId = tvId;
                        console.log('[TMDB] tvId =', pageInfo.tmdbId, 'title =', currentTitle);
                        if (tvId && !pageInfo.tmdb) {
                            tmdbDetails(tvId, function (d) {
                                pageInfo.tmdb = d;
                                this.afterTmdb();
                            }.bind(this));
                        } else {
                            this.afterTmdb();
                        }
                    }.bind(this));
                } else {
                    tmdbFindMovie(localObject.movie, currentTitle, function (info) {
                        pageInfo.tmdb = info;
                        this.afterTmdb();
                    }.bind(this));
                }
            }.bind(this), function (e) { this.empty(e === 'cookie' ? 'Cookie устарели' : 'Ошибка загрузки'); }.bind(this));
        };

        this.afterTmdb = function () {
            if (pageInfo.is_series) { mode = 'series'; this.reloadSeries(); }
            else { mode = 'movie'; this.drawMovieList(); }
        };

        this.drawMovieList = function () {
            this.reset(); this.buildFilter(); this.loading(false);
            var maxQ = '360p';
            if (pageInfo.pageStreamRaw) { var p = bestStream(pageInfo.pageStreamRaw); if (p) maxQ = p.quality; }
            var hash = Lampa.Utils.hash(localObject.movie.original_title || localObject.movie.title || localObject.movie.name);
            var view = Lampa.Timeline.view(hash);
            var tmdb = pageInfo.tmdb;
            var posterPath = tmdb && tmdb.poster ? tmdb.poster : null;

            pageInfo.voices.forEach(function (voice, idx) {
                var line2Parts = [];
                if (tmdb && tmdb.year) line2Parts.push(tmdb.year);
                if (maxQ) line2Parts.push(maxQ);

                var line3Parts = [];
                if (tmdb && tmdb.genres && tmdb.genres.length) line3Parts.push(tmdb.genres[0]);
                if (tmdb && tmdb.runtime) line3Parts.push(fmtLength(tmdb.runtime));
                if (tmdb && tmdb.date) line3Parts.push(fmtDate(tmdb.date));
                line3Parts.push(voice.name);

                var line3Html = line3Parts.join(' • ');
                if (tmdb && tmdb.rating) {
                    line3Html = '<span class="hdrezka-ua-rating">' + STAR_SVG + Number(tmdb.rating).toFixed(1) + '</span>' + line3Html;
                }

                var el = $.extend({
                    title: currentTitle,
                    line2: line2Parts.join(' • '),
                    line3: line3Html,
                    badge: '',
                    badge_display: 'none',
                    extra_class: ''
                }, iconData(posterPath));
                var item = Lampa.Template.get('hdrezka_ua_item', el);
                if (view.percent > 0) item.find('.hdrezka-ua-text').append(Lampa.Timeline.render(view));
                item.on('hover:enter', function () { choice.voice = idx; this.playMovie(voice, hash); }.bind(this));
                this.append(item);
            }.bind(this));
            this.start(true);
        };

        this.playMovie = function (voice, hash) {
            Lampa.Noty.show('Загрузка…');
            if (String(voice.id) === String(pageInfo.def_voice_id) && pageInfo.pageStreamRaw) {
                var s0 = bestStream(pageInfo.pageStreamRaw);
                if (!s0) return Lampa.Noty.show('Нет доступного качества');
                return this.startPlayer(currentTitle + ' — ' + voice.name, s0, hash);
            }
            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body = 'id=' + encodeURIComponent(pageInfo.film_id) + '&translator_id=' + encodeURIComponent(voice.id) +
                '&is_camrip=' + encodeURIComponent(voice.is_camrip || '0') + '&is_ads=' + encodeURIComponent(voice.is_ads || '0') +
                '&is_director=' + encodeURIComponent(voice.is_director || '0') + '&favs=' + encodeURIComponent(pageInfo.favs || '') + '&action=get_movie';
            reqPost(url, body, function (json) {
                if (typeof json === 'string') { try { json = JSON.parse(json); } catch (e) { json = {}; } }
                if (json && json.premium_content) return Lampa.Noty.show('Только Premium');
                var s = bestStream(json && json.url);
                if (!s) return Lampa.Noty.show('Нет доступного качества');
                this.startPlayer(currentTitle + ' — ' + voice.name, s, hash);
            }.bind(this), function () { Lampa.Noty.show('Ошибка потока'); });
        };

        this.reloadSeries = function () {
            this.loading(true);
            var voice = pageInfo.voices[choice.voice];
            if (!voice) return this.empty('Нет озвучки');
            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body = 'id=' + encodeURIComponent(pageInfo.film_id) + '&translator_id=' + encodeURIComponent(voice.id) +
                '&favs=' + encodeURIComponent(pageInfo.favs || '') + '&action=get_episodes';
            reqPost(url, body, function (json) {
                if (typeof json === 'string') { try { json = JSON.parse(json); } catch (e) { json = {}; } }
                allEpisodes = parseEpisodesHtml(json && json.episodes, voice.id);
                if (!allEpisodes.length) allEpisodes = parseEpisodesHtml(json && json.seasons, voice.id);
                if (!allEpisodes.length && pageInfo.episodes.length) {
                    allEpisodes = pageInfo.episodes.map(function (e) { return { season_id: e.season_id, episode_id: e.episode_id, name: e.name, translator_id: voice.id }; });
                }
                var map = {}, pairs = [];
                allEpisodes.forEach(function (e) { if (!map[e.season_id]) { map[e.season_id] = true; pairs.push({ id: e.season_id, n: 'Сезон ' + e.season_id }); } });
                pairs.sort(function (a, b) { return parseInt(a.id, 10) - parseInt(b.id, 10); });
                filter_items.season = pairs.map(function (p) { return p.n; });
                filter_items.season_id = pairs.map(function (p) { return p.id; });
                if (choice.season >= filter_items.season.length) choice.season = 0;

                this.loading(false);
                this.loadSeasonEpisodes();
            }.bind(this), function () { this.empty('Ошибка загрузки серий'); }.bind(this));
        };

        this.drawEpisodeList = function () {
            this.reset(); this.buildFilter(); this.loading(false);
            var sid = filter_items.season_id[choice.season];
            var voice = pageInfo.voices[choice.voice];
            var list = allEpisodes.filter(function (e) { return !sid || String(e.season_id) === String(sid); });
            if (!list.length) { scroll.append($('<div class="empty__text" style="padding:1.5em">Нет серий</div>')); this.start(true); return; }

            var seriesPoster = pageInfo.tmdb && pageInfo.tmdb.poster ? pageInfo.tmdb.poster : null;
            var now = new Date();

            list.forEach(function (ep) {
                var t = pageInfo.tmdbEpisodes && pageInfo.tmdbEpisodes[parseInt(ep.episode_id, 10)];
                var epName = (t && t.name) || ep.name;
                var epNum = parseInt(ep.episode_id, 10);
                var badge = isNaN(epNum) ? '' : pad2(epNum);

                var titleText = epName && epName.toLowerCase().indexOf('серия') === -1
                    ? epName
                    : ('Серия ' + ep.episode_id);

                var line2Parts = [];
                if (voice && voice.name) line2Parts.push(voice.name);
                if (t && t.runtime) line2Parts.push(t.runtime + 'м');

                var line3Parts = [];
                if (t && t.date) {
                    var d = new Date(t.date);
                    if (!isNaN(d.getTime()) && d <= now) line3Parts.push(fmtDate(t.date));
                }

                var line3Html = line3Parts.join(' • ');
                if (t && t.rating) {
                    var ratingHtml = '<span class="hdrezka-ua-rating">' + STAR_SVG + Number(t.rating).toFixed(1) + '</span>';
                    line3Html = line3Html ? ratingHtml + line3Html : ratingHtml;
                }

                var posterPath = (t && t.still) ? t.still : seriesPoster;
                var el = $.extend({
                    title: titleText,
                    line2: line2Parts.join(' • '),
                    line3: line3Html,
                    badge: badge,
                    badge_display: badge ? 'flex' : 'none',
                    extra_class: 'hdrezka-ua-item--ep'
                }, iconData(posterPath));
                var item = Lampa.Template.get('hdrezka_ua_item', el);

                var hash = Lampa.Utils.hash([ep.season_id, ':', ep.episode_id, localObject.movie.original_title].join(''));
                var view = Lampa.Timeline.view(hash);
                if (view.percent > 0) item.find('.hdrezka-ua-text').append(Lampa.Timeline.render(view));
                item.on('hover:enter', function () { this.playEpisode(ep, voice, hash); }.bind(this));
                this.append(item);
            }.bind(this));
            this.start(true);
        };

        this.playEpisode = function (ep, voice, hash) {
            Lampa.Noty.show('Загрузка…');
            var url = BASE + '/ajax/get_cdn_series/?t=' + Date.now();
            var body = 'id=' + encodeURIComponent(pageInfo.film_id) + '&translator_id=' + encodeURIComponent(voice.id) +
                '&season=' + encodeURIComponent(ep.season_id) + '&episode=' + encodeURIComponent(ep.episode_id) +
                '&favs=' + encodeURIComponent(pageInfo.favs || '') + '&action=get_stream';
            reqPost(url, body, function (json) {
                if (typeof json === 'string') { try { json = JSON.parse(json); } catch (e) { json = {}; } }
                if (json && json.premium_content) return Lampa.Noty.show('Только Premium');
                var s = bestStream(json && json.url);
                if (!s) return Lampa.Noty.show('Нет доступного качества');
                var t = currentTitle + ' S' + ep.season_id + 'E' + ep.episode_id + ' — ' + voice.name;
                Lampa.Player.play({ title: t, url: s.url, quality: s.quality, timeline: Lampa.Timeline.view(hash) });
            }.bind(this), function () { Lampa.Noty.show('Ошибка серии'); });
        };

        this.startPlayer = function (title, stream, hash) {
            var view = Lampa.Timeline.view(hash);
            Lampa.Player.play({ title: title, url: stream.url, quality: stream.quality, timeline: view });
            Lampa.Player.playlist([{ title: title + ' — ' + stream.quality, url: stream.url, timeline: view }]);
        };

        this.start = function (first_select) {
            this.fixScroll();
            if (first_select) last = scroll.render().find('.selector').eq(0)[0];
            try { Lampa.Background.immediately(Lampa.Utils.cardImgBackground(localObject.movie)); } catch (e) {}
            scroll.render().css({ 'padding-left': '1em', 'padding-right': '1em', 'box-sizing': 'border-box', 'width': '100%' });
            Lampa.Controller.add('content', {
                toggle: function () { Lampa.Controller.collectionSet(scroll.render(), files.render()); Lampa.Controller.collectionFocus(last || false, scroll.render()); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { Navigator.move('down'); },
                right: function () { if (Navigator.canmove('right')) Navigator.move('right'); else filter.show(Lampa.Lang.translate('title_filter') || 'Фильтр', 'filter'); },
                left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
            setTimeout(function () { this.fixScroll(); if (last) { try { scroll.update($(last), true); } catch (e) {} } }.bind(this), 100);
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { network.clear(); files.destroy(); scroll.destroy(); };
    }

    function addButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite' && e.type !== 'complete') return;
            var render = e.object.activity.render();
            if (render.find('.hdrezka-ua-btn').length) return;
            var btn = $('<div class="full-start__button selector view--online hdrezka-ua-btn" data-subtitle="HDrezka">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>HDrezka</span></div>');
            btn.on('hover:enter', function () {
                Lampa.Activity.push({ url: '', title: (e.data.movie.title || e.data.movie.name || '') + ' — HDrezka', component: COMPONENT, movie: e.data.movie, page: 1 });
            });
            var box = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (box.length) box.prepend(btn); else render.find('.full-start__title').after(btn);
        });
    }

    function start() {
        Lampa.Component.add(COMPONENT, Component);
        addButton();
        console.log('[HDrezka] Готово: серии выше на треть, постеры шире, золотая звезда рейтинга');
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
