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

    function filterByYear(items, year) {
        if (!year) return items;
        var exact = items.filter(function (it) {
            return extractYear(it.info) === year;
        });
        return exact.length ? exact : items;
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

    // ---------- UI ----------
    function showSearchResults(items, callback) {
        if (!items.length) {
            Lampa.Noty.show('Ничего не найдено на HDrezka');
            return;
        }

        Lampa.Select.show({
            title: 'HDrezka — выберите фильм',
            items: items.map(function (it) {
                return { title: it.title, subtitle: it.info, _data: it };
            }),
            onSelect: function (item) {
                Lampa.Select.close();
                callback(item._data);
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function showStreams(movieTitle, parsed) {
        if (!parsed.streams.length) {
            Lampa.Noty.show('Для этого фильма нет доступных потоков без авторизации');
            return;
        }

        var proceedToQuality = function (translatorName) {
            Lampa.Select.show({
                title: movieTitle + (translatorName ? ' — ' + translatorName : '') + ' — качество',
                items: parsed.streams.map(function (s) {
                    return { title: s.quality, _data: s };
                }),
                onSelect: function (item) {
                    Lampa.Select.close();
                    playStream(movieTitle, item._data);
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        if (parsed.translators.length > 1) {
            Lampa.Select.show({
                title: 'HDrezka — озвучка',
                items: parsed.translators.map(function (t) {
                    return { title: t.name, _data: t };
                }),
                onSelect: function (item) {
                    Lampa.Select.close();
                    proceedToQuality(item._data.name);
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        } else {
            proceedToQuality(parsed.translators[0] ? parsed.translators[0].name : '');
        }
    }

    function playStream(title, stream) {
        console.log('[HDRezkaUA] playing:', stream.url);
        Lampa.Player.play({
            title: title,
            url: stream.url,
            quality: stream.quality
        });
    }

    // ---------- Ручной ввод ----------
    function askManualTitle(callback) {
        Lampa.Input.edit({
            title: 'Введите название фильма',
            value: '',
            free: true,
            nosave: true
        }, function (value) {
            if (!value || !value.trim()) {
                Lampa.Noty.show('Название не введено');
                return;
            }
            callback(value.trim());
        });
    }

    // ---------- Основной сценарий ----------
    function startFlow(card) {
        var titles = [];
        if (card.title) titles.push(card.title);
        if (card.name && card.name !== card.title) titles.push(card.name);
        if (card.original_title) titles.push(card.original_title);
        if (card.original_name && card.original_name !== card.original_title) titles.push(card.original_name);

        var year = (card.release_date || card.first_air_date || '').substring(0, 4);

        titles = titles.filter(function (t, i, arr) { return t && arr.indexOf(t) === i; });

        if (!titles.length) {
            askManualTitle(function (manual) {
                searchAndShow(manual, '');
            });
            return;
        }

        tryNextTitle(0);

        function tryNextTitle(index) {
            if (index >= titles.length) {
                Lampa.Noty.show('HDrezka: ничего не найдено. Введите название вручную.');
                askManualTitle(function (manual) {
                    searchAndShow(manual, '');
                });
                return;
            }

            var query = titles[index] + (year ? ' ' + year : '');
            Lampa.Noty.show('Ищем: ' + query);

            var searchUrl = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);

            request(searchUrl, function (err, html) {
                if (err) { tryNextTitle(index + 1); return; }
                var items = parseSearch(html);
                items = filterByYear(items, year);
                if (!items.length) { tryNextTitle(index + 1); return; }
                showSearchResults(items, function (selected) {
                    loadAndPlay(selected);
                });
            });
        }

        function searchAndShow(query, yearOverride) {
            var searchUrl = BASE + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);
            request(searchUrl, function (err, html) {
                if (err) { Lampa.Noty.show('Ошибка поиска'); return; }
                var items = parseSearch(html);
                if (yearOverride) items = filterByYear(items, yearOverride);
                if (!items.length) { Lampa.Noty.show('Ничего не найдено'); return; }
                showSearchResults(items, function (selected) {
                    loadAndPlay(selected);
                });
            });
        }

        function loadAndPlay(selected) {
            Lampa.Noty.show('Загружаем страницу...');
            request(BASE + selected.url, function (err2, movieHtml) {
                if (err2) { Lampa.Noty.show('Ошибка загрузки страницы'); return; }
                var parsed = parseMoviePage(movieHtml);
                showStreams(selected.title, parsed);
            });
        }
    }

    // ---------- Регистрация в Lampa ----------
    function init() {
        Lampa.Manifest.plugins = {
            type: 'video',
            onContextMenu: function (card) {
                return { title: 'HDrezka UA' };
            },
            onContextLauch: function (card) {
                startFlow(card);
            }
        };

        console.log('[HDRezkaUA] plugin registered');
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
