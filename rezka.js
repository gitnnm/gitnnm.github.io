(function () {
    'use strict';

    if (window.hdrezka_ua_ready) return;
    window.hdrezka_ua_ready = true;

    var BASE = 'https://rezka-ua.tv';
    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    console.log('[HDRezkaUA] Script loaded');

    // ... (функции request, parseSearch, extractYear, parseMoviePage остаются без изменений) ...
    // Я скопирую их сюда, чтобы вы просто заменили весь файл целиком.

    function request(url, callback, options) {
        options = options || {};
        var headers = Object.assign({
            'User-Agent': UA,
            'Referer': BASE + '/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }, options.headers || {});

        if (window.Android && typeof Android.httpReq === 'function') {
            Android.httpReq({
                url: url,
                method: options.method || 'GET',
                headers: headers,
                body: options.body || null
            }, function (response) {
                callback(null, response);
            }, function (error) {
                callback(error || 'http error');
            });
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open(options.method || 'GET', url, true);
        Object.keys(headers).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });
        xhr.onload = function () { callback(null, xhr.responseText); };
        xhr.onerror = function () { callback('network error'); };
        xhr.send(options.body || null);
    }

    function parseSearch(html) {
        var items = [];
        var re = /<div class="b-content__inline_item"[^>]*data-id="(\d+)"[^>]*data-url="([^"]+)"[\s\S]*?<div class="b-content__inline_item-link">\s*<a[^>]*>([^<]+)<\/a>\s*<div[^>]*>([^<]*)<\/div>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            items.push({
                id: m[1],
                url: m[2].replace(/^https?:\/\/[^\/]+/, ''),
                title: m[3].trim(),
                info: m[4].trim()
            });
        }
        return items;
    }

    function extractYear(info) {
        var m = info.match(/(\d{4})/);
        return m ? m[1] : '';
    }

    function parseMoviePage(html) {
        var result = { streams: [] };
        var cdnRe = /initCDN(?:Movies|Series)Events\s*\(\s*(\d+)\s*,\s*(\d+)[\s\S]*?(\{[\s\S]*?\})\s*\)\s*;/;
        var cm = cdnRe.exec(html);
        if (cm) {
            try {
                var data = JSON.parse(cm[3]);
                if (data.streams) {
                    var streamRe = /\[([^\]]+)\](https?:\/\/[^,\[]+)/g;
                    var sm;
                    while ((sm = streamRe.exec(data.streams)) !== null) {
                        result.streams.push({ quality: sm[1], url: sm[2] });
                    }
                }
            } catch (e) {
                console.log('[HDRezkaUA] JSON parse error:', e);
            }
        }
        return result;
    }

    function searchAndGetStream(title, year, onComplete) {
        var query = title + (year ? ' ' + year : '');
        var searchUrl = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);

        request(searchUrl, function (err, html) {
            if (err) return onComplete(null);
            var items = parseSearch(html);
            if (year) {
                var exact = items.filter(function(it) { return extractYear(it.info) === year; });
                if (exact.length) items = exact;
            }
            if (!items.length) return onComplete(null);

            var bestMatch = items[0];
            request(BASE + bestMatch.url, function (err2, movieHtml) {
                if (err2) return onComplete(null);
                var parsed = parseMoviePage(movieHtml);
                if (!parsed.streams.length) return onComplete(null);

                var stream = parsed.streams.find(function(s) { return s.quality === '720p'; }) || parsed.streams[0];
                onComplete({ url: stream.url, quality: stream.quality });
            });
        });
    }

    var hdrezkaSource = {
        name: 'hdrezka_ua',
        title: 'HDrezka UA',
        search: function (params, onComplete) {
            var query = params.query || '';
            if (!query) return onComplete([]);
            var searchUrl = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);
            request(searchUrl, function (err, html) {
                if (err) return onComplete([]);
                onComplete(parseSearch(html).map(function(it) {
                    return { title: it.title, year: extractYear(it.info), url: it.url };
                }));
            });
        },
        getStream: function (movie, onComplete) {
            var title = movie.title || movie.name || '';
            var year = (movie.release_date || movie.first_air_date || movie.year || '').substring(0, 4);
            searchAndGetStream(title, year, function(result) {
                onComplete(result ? { url: result.url, quality: result.quality } : null);
            });
        },
        getEpisodes: function (movie, onComplete) { onComplete(null); }
    };

    function init() {
        console.log('[HDRezkaUA] Init started');
        
        try {
            if (Lampa.Source && typeof Lampa.Source.add === 'function') {
                Lampa.Source.add(hdrezkaSource);
                console.log('[HDRezkaUA] Source added successfully');
            } else {
                console.log('[HDRezkaUA] Lampa.Source not found!');
            }
        } catch (e) {
            console.error('[HDRezkaUA] Error adding source:', e);
        }

        // Оставляем кнопку в меню как запасной вариант
        try {
            Lampa.Manifest.plugins = {
                type: 'video',
                onContextMenu: function (card) { return { title: 'HDrezka UA (тест)' }; },
                onContextLauch: function (card) {
                    Lampa.Noty.show('Плагин работает! Ищем ' + card.title);
                    // Здесь можно оставить старую логику с ручным выбором
                }
            };
        } catch (e) {}
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
