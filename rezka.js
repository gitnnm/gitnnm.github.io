(function () {
    'use strict';

    if (window.hdrezka_ua_ready) return;
    window.hdrezka_ua_ready = true;

    var BASE = 'https://rezka-ua.tv';
    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // ---------- HTTP ----------
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

    // ---------- Парсинг ----------
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
        var result = { translators: [], streams: [], subtitles: [] };

        var transRe = /<li[^>]*data-translator_id="(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;
        var tm;
        while ((tm = transRe.exec(html)) !== null) {
            var name = tm[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (name && !name.includes('Premium')) {
                result.translators.push({ id: tm[1], name: name });
            }
        }

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
                if (data.subtitle) {
                    var subRe = /\[([^\]]+)\](https?:\/\/[^,\[]+)/g;
                    var subm;
                    while ((subm = subRe.exec(data.subtitle)) !== null) {
                        result.subtitles.push({ lang: subm[1], url: subm[2] });
                    }
                }
            } catch (e) {
                console.log('[HDRezkaUA] JSON parse error:', e);
            }
        }

        return result;
    }

    // ---------- Основной поиск и получение ссылки ----------
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
            
            // Берем первый результат из поиска
            var bestMatch = items[0];

            request(BASE + bestMatch.url, function (err2, movieHtml) {
                if (err2) return onComplete(null);
                var parsed = parseMoviePage(movieHtml);
                if (!parsed.streams.length) return onComplete(null);

                // Ищем 720p или 1080p, иначе берем первое доступное
                var stream = parsed.streams.find(function(s) { return s.quality === '720p'; }) || 
                             parsed.streams.find(function(s) { return s.quality === '1080p'; }) || 
                             parsed.streams[0];

                onComplete({
                    url: stream.url,
                    quality: stream.quality,
                    title: bestMatch.title
                });
            });
        });
    }

    // ---------- Source API ----------
    var hdrezkaSource = {
        name: 'hdrezka_ua',
        title: 'HDrezka UA',
        search: function (params, onComplete) {
            var query = params.query || '';
            if (!query) return onComplete([]);
            
            var searchUrl = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);
            request(searchUrl, function (err, html) {
                if (err) return onComplete([]);
                var items = parseSearch(html);
                var results = items.map(function(it) {
                    return {
                        title: it.title,
                        year: extractYear(it.info),
                        url: it.url
                    };
                });
                onComplete(results);
            });
        },
        getStream: function (movie, onComplete) {
            var title = movie.title || movie.name || '';
            var year = (movie.release_date || movie.first_air_date || movie.year || '').substring(0, 4);
            
            searchAndGetStream(title, year, function(result) {
                if (result) {
                    onComplete({ url: result.url, quality: result.quality });
                } else {
                    onComplete(null);
                }
            });
        },
        getEpisodes: function (movie, onComplete) {
            // Заглушка для сериалов (пока не поддерживается)
            onComplete(null);
        }
    };

    // ---------- Регистрация в Lampa ----------
    function init() {
        // 1. Добавляем в список источников (кнопка "Смотреть")
        Lampa.Source.add(hdrezkaSource);

        // 2. Добавляем в контекстное меню (ручной выбор качества/озвучки)
        Lampa.Manifest.plugins = {
            type: 'video',
            onContextMenu: function (card) {
                return { title: 'HDrezka UA (выбор)' };
            },
            onContextLauch: function (card) {
                var title = card.title || card.name || '';
                var year = (card.release_date || card.first_air_date || '').substring(0, 4);
                
                Lampa.Noty.show('Поиск на HDrezka...');
                var searchUrl = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(title + ' ' + year);
                
                request(searchUrl, function (err, html) {
                    if (err) { Lampa.Noty.show('Ошибка поиска'); return; }
                    var items = parseSearch(html);
                    if (!items.length) { Lampa.Noty.show('Ничего не найдено'); return; }
                    
                    Lampa.Select.show({
                        title: 'HDrezka — выберите фильм',
                        items: items.map(function (it) {
                            return { title: it.title, subtitle: it.info, _data: it };
                        }),
                        onSelect: function (item) {
                            Lampa.Select.close();
                            Lampa.Noty.show('Загружаем страницу...');
                            request(BASE + item._data.url, function (err2, movieHtml) {
                                if (err2) { Lampa.Noty.show('Ошибка загрузки'); return; }
                                var parsed = parseMoviePage(movieHtml);
                                if (!parsed.streams.length) {
                                    Lampa.Noty.show('Нет доступных потоков');
                                    return;
                                }
                                
                                // Простейшее меню выбора качества
                                Lampa.Select.show({
                                    title: item._data.title + ' — качество',
                                    items: parsed.streams.map(function (s) {
                                        return { title: s.quality, _data: s };
                                    }),
                                    onSelect: function (sItem) {
                                        Lampa.Select.close();
                                        Lampa.Player.play({
                                            title: item._data.title,
                                            url: sItem._data.url,
                                            quality: sItem._data.quality
                                        });
                                    },
                                    onBack: function () { Lampa.Controller.toggle('content'); }
                                });
                            });
                        },
                        onBack: function () { Lampa.Controller.toggle('content'); }
                    });
                });
            }
        };

        console.log('[HDRezkaUA] Plugin initialized');
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
