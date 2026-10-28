(function () {
    'use strict';

    if (window.hdrezka_ua_only) return;
    window.hdrezka_ua_only = true;

    var BASE = 'https://rezka-ua.tv';
    var COMPONENT = 'hdrezka_ua';
    var COOKIE_KEY = 'hdrezka_ua_cookie';
    var ANUBIS_API = BASE + '/.within.website/x/cmd/anubis/api';

    // запасной cookie (если Anubis уже пройден вручную / остался в Storage)
    var COOKIE_FALLBACK = '';

    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    var QUALITY_REMAP = {
        '1080p Ultra': '1080p',
        '1080p': '720p',
        '720p': '480p',
        '480p': '360p',
        '360p': '240p'
    };
    var PICK_ORDER = ['1080p', '720p', '480p', '360p'];

    Lampa.Template.add('hdrezka_ua_item',
        '<div class="online selector">' +
        '  <div class="online__body">' +
        '    <div style="position:absolute;left:0;top:-0.3em;width:2.4em;height:2.4em">' +
        '      <svg style="height:2.4em;width:2.4em" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '        <circle cx="64" cy="64" r="56" stroke="white" stroke-width="16"/>' +
        '        <path d="M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z" fill="white"/>' +
        '      </svg>' +
        '    </div>' +
        '    <div class="online__title" style="padding-left:2.1em">{title}</div>' +
        '    <div class="online__quality" style="padding-left:3.4em">{quality}{info}</div>' +
        '  </div>' +
        '</div>'
    );

    $('#hdrezka_ua_css').remove();

    // ===================== Cookie / Anubis =====================

    function loadCookie() {
        var c = (Lampa.Storage.get(COOKIE_KEY, '') || '') + '';
        if (!c && COOKIE_FALLBACK) c = COOKIE_FALLBACK;
        return c;
    }

    function saveCookie(c) {
        if (c) Lampa.Storage.set(COOKIE_KEY, c);
    }

    function clearAnubisCookie() {
        var c = loadCookie();
        if (!c) return;
        c = c.split(';').map(function (s) { return s.trim(); }).filter(function (p) {
            return p && p.indexOf('techaro.lol-anubis-auth') !== 0;
        }).join('; ');
        Lampa.Storage.set(COOKIE_KEY, c);
    }

    function sha256Hex(text) {
        if (!window.crypto || !crypto.subtle) {
            return Promise.reject(new Error('no crypto.subtle'));
        }
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
            return Array.from(new Uint8Array(buf)).map(function (b) {
                return b.toString(16).padStart(2, '0');
            }).join('');
        });
    }

    function hasLeadingZeroNibbles(hex, difficulty) {
        for (var j = 0; j < difficulty; j++) {
            var byteIndex = Math.floor(j / 2);
            var nibbleIndex = j % 2;
            var byte = parseInt(hex.substr(byteIndex * 2, 2), 16);
            if (isNaN(byte)) return false;
            var nibble = (byte >> (nibbleIndex === 0 ? 4 : 0)) & 0x0f;
            if (nibble !== 0) return false;
        }
        return true;
    }

    function solvePoW(challenge, difficulty) {
        difficulty = difficulty || 4;
        var nonce = 0;
        function step() {
            return sha256Hex(String(challenge) + String(nonce)).then(function (hash) {
                if (hasLeadingZeroNibbles(hash, difficulty)) {
                    return { hash: hash, nonce: nonce };
                }
                nonce++;
                if (nonce % 250 === 0) {
                    return new Promise(function (resolve) {
                        setTimeout(function () { resolve(step()); }, 0);
                    });
                }
                return step();
            });
        }
        return step();
    }

    function parseSetCookie(headers) {
        if (!headers) return '';
        var list = headers['set-cookie'] || headers['Set-Cookie'] || headers['SET-COOKIE'] || [];
        if (typeof list === 'string') list = [list];
        if (!list || !list.length) return '';
        var map = {};
        list.forEach(function (line) {
            var pair = String(line).split(';')[0];
            var i = pair.indexOf('=');
            if (i > 0) {
                var name = pair.substring(0, i).trim();
                var val = pair.substring(i + 1).trim();
                if (val === 'deleted') delete map[name];
                else map[name] = val;
            }
        });
        return Object.keys(map).map(function (k) { return k + '=' + map[k]; }).join('; ');
    }

    function mergeCookie(oldStr, newStr) {
        var map = {};
        function eat(s) {
            (s || '').split(';').forEach(function (p) {
                p = p.trim();
                var i = p.indexOf('=');
                if (i > 0) map[p.substring(0, i)] = p.substring(i + 1);
            });
        }
        eat(oldStr);
        eat(newStr);
        return Object.keys(map).map(function (k) { return k + '=' + map[k]; }).join('; ');
    }

    function isAnubisDeny(html) {
        html = html || '';
        return /Доступ запрещён/i.test(html) ||
            /anubis_challenge["'\s]*>\s*null/i.test(html) ||
            (/О нет!/i.test(html) && /Anubis/i.test(html));
    }

    function isAnubisPage(html) {
        html = html || '';
        if (isAnubisDeny(html)) return true;
        return /Проверяем, что вы не бот/i.test(html) ||
            (/anubis/i.test(html) && /make-challenge|pass-challenge|techaro/i.test(html));
    }

    function baseHeaders(cookie) {
        var h = {
            'User-Agent': UA,
            'Referer': BASE + '/',
            'Origin': BASE,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
        };
        if (cookie) h['Cookie'] = cookie;
        return h;
    }

    function netReq(url, body, opts, onok, onerr) {
        opts = opts || {};
        var network = new Lampa.Reguest();
        network.timeout(opts.timeout || 25000);
        var m = network.native ? 'native' : 'silent';
        var args = {
            dataType: opts.dataType || 'text',
            headers: opts.headers || baseHeaders(loadCookie()),
            returnHeaders: !!opts.returnHeaders
        };
        if (body !== undefined && body !== null && body !== false) {
            network[m](url, onok, onerr, body, args);
        } else {
            network[m](url, onok, onerr, false, args);
        }
    }

    /**
     * ensureAnubis(ok, fail)
     * ok(cookieString)
     */
    function ensureAnubis(ok, fail) {
        var cur = loadCookie();
        if (cur && cur.indexOf('techaro.lol-anubis-auth') !== -1) {
            ok(cur);
            return;
        }

        if (!window.crypto || !crypto.subtle) {
            fail && fail('no_crypto');
            return;
        }

        Lampa.Noty.show('Anubis: challenge…');

        var h = baseHeaders(cur);
        h['Accept'] = 'application/json, text/plain, */*';
        h['X-Requested-With'] = 'XMLHttpRequest';

        netReq(ANUBIS_API + '/make-challenge', false, {
            dataType: 'text',
            headers: h,
            returnHeaders: true,
            timeout: 20000
        }, function (raw, status, headers) {
            var json = raw;
            if (typeof raw === 'string') {
                try { json = JSON.parse(raw); } catch (e) { json = {}; }
            } else if (raw && raw.body) {
                try { json = JSON.parse(raw.body); } catch (e) { json = raw; }
            }

            // иногда make-challenge кладёт test-cookie
            var fromHdr = parseSetCookie(headers) || parseSetCookie(raw && raw.headers);
            if (fromHdr) {
                cur = mergeCookie(cur, fromHdr);
                saveCookie(cur);
            }

            if (!json || !json.challenge) {
                fail && fail('no_challenge');
                return;
            }

            var challenge = json.challenge;
            var difficulty = json.difficulty || 4;
            Lampa.Noty.show('Anubis: PoW d=' + difficulty + '…');

            solvePoW(challenge, difficulty).then(function (res) {
                var passUrl = ANUBIS_API + '/pass-challenge'
                    + '?response=' + encodeURIComponent(res.hash)
                    + '&nonce=' + encodeURIComponent(res.nonce)
                    + '&redir=' + encodeURIComponent(BASE + '/')
                    + '&elapsedTime=1';

                netReq(passUrl, false, {
                    dataType: 'text',
                    headers: baseHeaders(cur),
                    returnHeaders: true,
                    timeout: 20000
                }, function (body, st, hdrs) {
                    var sc = parseSetCookie(hdrs) || parseSetCookie(body && body.headers) || '';
                    try {
                        if (!sc && typeof document !== 'undefined' && document.cookie) {
                            sc = document.cookie.split(';').map(function (s) { return s.trim(); }).filter(Boolean).join('; ');
                        }
                    } catch (e) {}

                    if (sc && /anubis/i.test(sc)) {
                        var merged = mergeCookie(cur, sc);
                        saveCookie(merged);
                        Lampa.Noty.show('Anubis: OK');
                        ok(merged);
                        return;
                    }

                    // PoW ок, но Set-Cookie не виден плагину
                    if (cur && cur.indexOf('anubis') !== -1) {
                        ok(cur);
                        return;
                    }
                    fail && fail('no_set_cookie');
                }, function () {
                    fail && fail('pass_fail');
                });
            }).catch(function () {
                fail && fail('pow_fail');
            });
        }, function () {
            fail && fail('make_fail');
        });
    }

    // ===================== HTTP с авто-Anubis =====================

    function reqGet(url, onok, onerr, _retry) {
        _retry = _retry || 0;
        ensureAnubis(function (cookie) {
            netReq(url, false, {
                dataType: 'text',
                headers: baseHeaders(cookie),
                timeout: 25000
            }, function (html) {
                if (typeof html !== 'string') html = (html && html.body) ? html.body : String(html || '');

                if (isAnubisDeny(html)) {
                    onerr && onerr('deny');
                    return;
                }
                if (isAnubisPage(html) && _retry < 1) {
                    clearAnubisCookie();
                    reqGet(url, onok, onerr, _retry + 1);
                    return;
                }
                if (isAnubisPage(html)) {
                    onerr && onerr('anubis');
                    return;
                }
                onok && onok(html);
            }, function () {
                onerr && onerr('net');
            });
        }, function (reason) {
            onerr && onerr(reason || 'anubis');
        });
    }

    function reqPost(url, body, onok, onerr, _retry) {
        _retry = _retry || 0;
        ensureAnubis(function (cookie) {
            var h = baseHeaders(cookie);
            h['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            h['X-Requested-With'] = 'XMLHttpRequest';
            netReq(url, body, {
                dataType: 'text',
                headers: h,
                timeout: 20000
            }, function (json) {
                var text = typeof json === 'string' ? json : (json && json.body ? json.body : '');
                if (isAnubisDeny(text)) {
                    onerr && onerr('deny');
                    return;
                }
                if (isAnubisPage(text) && _retry < 1) {
                    clearAnubisCookie();
                    reqPost(url, body, onok, onerr, _retry + 1);
                    return;
                }
                onok && onok(json);
            }, function () {
                onerr && onerr('net');
            });
        }, function (reason) {
            onerr && onerr(reason || 'anubis');
        });
    }

    // ===================== Streams =====================

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

    function normalizeLabel(q) {
        q = (q || '').trim();
        if (/ultra/i.test(q)) return '1080p Ultra';
        var num = (q.match(/(\d{3,4})/) || [])[1];
        return num ? (num + 'p') : q;
    }

    function realQuality(siteLabel) {
        var key = normalizeLabel(siteLabel);
        return QUALITY_REMAP[key] || key;
    }

    function bestStream(str) {
        str = decodeStream(str);
        if (!str) return null;
        var map = {};
        var re = /\[([^\]]+)\](https?:\/\/[^,\s]+)/g, m;
        while ((m = re.exec(str)) !== null) {
            var label = normalizeLabel(m[1]);
            if (/2160|1440|ultra|4k|2k/i.test(label)) continue;
            map[label] = m[2].trim();
        }
        for (var i = 0; i < PICK_ORDER.length; i++) {
            if (map[PICK_ORDER[i]]) {
                return { url: map[PICK_ORDER[i]], quality: realQuality(PICK_ORDER[i]) };
            }
        }
        return null;
    }

    function episodeTitle(ep) {
        var s = String(ep.season_id || '');
        var e = String(ep.episode_id || '');
        var title = 'Сезон ' + s + ' · Серия ' + e;
        var name = (ep.name || '').trim();
        if (name) {
            var low = name.toLowerCase();
            var dup = low === ('серия ' + e) || low === ('episode ' + e) || low === e;
            if (!dup) title += ' — ' + name;
        }
        return title;
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
            voices: [], episodes: [],
            def_voice_id: '', pageStreamRaw: ''
        };
        var favs = html.match(/id="ctrl_favs"\s+value="([^"]*)"/);
        if (favs) info.favs = favs[1];

        var cdnSeries 
