(function() {
    'use strict';

    Lampa.Platform.tv();
    
    // Убрана проверка происхождения приложения - теперь работает для всех
    // Включение использования парсера
    Lampa.Storage.set('parser_use', true);

    // Основные переменные
    var protocol = location.protocol === 'https:' ? 'https://' : 'http://';
    
    // Список URL парсеров
    var parserUrls = [
        '62.60.149.237:2601',
        '62.60.149.237:9117',
        'www.jacred.xyz',
        'jr.maxvol.pro',
        'jac-red.ru',
        'jacred.viewbox.dev',
        'jacred.pro',
        'jacblack.ru:9117'
    ];

    // Список названий парсеров
    var parserNames = [
        'Lampa32',
        'ByLampa Jackett',
        'Jacred.xyz',
        'Jacred Maxvol Pro',
        'Jacred RU',
        'Viewbox',
        'Jacred Pro',
        'Jac Black'
    ];

    // Функция проверки доступности парсера
    function checkParserAvailability(index) {
        setTimeout(function() {
            var apiKey = '';
            if (parserUrls[index] === '62.60.149.237:9117') {
                apiKey = '777';
            }
            
            var parserIndex = index + 2;
            
            if (parserUrls[index] === 'jr.maxvol.pro') {
                protocol = 'https://';
            } else {
                protocol = 'http://';
            }

            var selector = 'body > div.selectbox > div.selectbox__content.layer--height > div.selectbox__body.layer--wheight > div > div > div > div:nth-child(' + parserIndex + ') > div';
            
            if ($('body > div.selectbox > div.selectbox__content.layer--height > div.selectbox__body.layer--wheight > div > div > div > div:nth-child(1) > div').text() !== 'Свой вариант') {
                return;
            }

            var testUrl = protocol + parserUrls[index] + '/api/v2.0/indexers/status:healthy/results?apikey=' + apiKey;
            var xhr = new XMLHttpRequest();
            xhr.timeout = 3000;
            xhr.open('GET', testUrl, true);
            xhr.send();

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        if ($(selector).text() === parserNames[index]) {
                            $(selector).html('&#10004;&nbsp;&nbsp;' + $(selector).text()).css('color', '#64e364');
                        }
                    } else {
                        if ($(selector).text() === parserNames[index]) {
                            $(selector).html('&#10008;&nbsp;&nbsp;' + $(selector).text()).css('color', '#ff2121');
                        }
                    }
                }
            };

            xhr.onerror = function() {
                if ($(selector).text() === parserNames[index]) {
                    $(selector).html('&#10008;&nbsp;&nbsp;' + $(selector).text()).css('color', '#ff2121');
                }
            };

            xhr.ontimeout = function() {
                if ($(selector).text() === parserNames[index]) {
                    $(selector).html('&#10008;&nbsp;&nbsp;' + $(selector).text()).css('color', '#ff2121');
                }
            };
        }, 1000);
    }

    // Проверка всех парсеров
    function checkAllParsers() {
        for (var i = 0; i <= parserUrls.length - 1; i++) {
            checkParserAvailability(i);
        }
    }

    // Обработчик события выбора
    Lampa.Controller.listener.follow('toggle', function(event) {
        if (event.name === 'select') {
            setTimeout(function() {
                checkAllParsers();
            }, 10);
        }
    });

    // Функция настройки парсера
    function setupParser() {
        var currentParser = Lampa.Storage.get('jackett_urltwo');
        
        switch (currentParser) {
            case 'no_parser':
                Lampa.Storage.set('jackett_url', '');
                Lampa.Storage.set('jackett_key', '');
                Lampa.Storage.set('jackett_interview', 'all');
                Lampa.Storage.set('parse_in_search', false);
                Lampa.Storage.set('parse_lang', 'lg');
                break;
                
            case 'jac_lampa32_ru':
                Lampa.Storage.set('jackett_url', '62.60.149.237:2601');
                Lampa.Storage.set('jackett_key', '');
                Lampa.Storage.set('jackett_interview', 'all');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'lg');
                break;
                
            case 'jacred_pro':
                Lampa.Storage.set('jackett_url', 'jacred.pro');
                Lampa.Storage.set('jackett_key', '');
                Lampa.Storage.set('jackett_interview', 'all');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'lg');
                break;
                
            case 'jacred_xyz':
                Lampa.Storage.set('jackett_url', 'www.jacred.xyz');
                Lampa.Storage.set('jackett_key', '');
                Lampa.Storage.set('jackett_interview', 'healthy');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'lg');
                break;
                
            case 'jr_maxvol_pro':
                Lampa.Storage.set('jackett_url', 'jr.maxvol.pro');
                Lampa.Storage.set('jackett_key', '');
                Lampa.Storage.set('jackett_interview', 'healthy');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'df');
                break;
                
            case 'jac_black':
                Lampa.Storage.set('jackett_url', 'jacblack.ru:9117');
                Lampa.Storage.set('jackett_key', '');
                Lampa.Storage.set('jackett_interview', 'all');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'lg');
                break;
                
            case 'jacred_ru':
                Lampa.Storage.set('jackett_url', 'jac-red.ru');
                Lampa.Storage.set('jackett_key', '');
                Lampa.Storage.set('jackett_interview', 'all');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'lg');
                break;
                
            case 'jacred_viewbox_dev':
                Lampa.Storage.set('jackett_url', 'jacred.viewbox.dev');
                Lampa.Storage.set('jackett_key', '34DPECDY');
                Lampa.Storage.set('jackett_interview', 'all');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'lg');
                break;
                
            case 'bylampa_jackett':
                Lampa.Storage.set('jackett_url', '62.60.149.237:9117');
                Lampa.Storage.set('jackett_key', '777');
                Lampa.Storage.set('jackett_interview', 'all');
                Lampa.Storage.set('parse_in_search', true);
                Lampa.Storage.set('parse_lang', 'df');
                break;
        }
    }

    // Добавление параметров в настройки
    Lampa.Settings.addParam({
        'component': 'parser',
        'param': {
            'name': 'jackett_urltwo',
            'type': 'select',
            'values': {
                'no_parser': 'Свой вариант',
                'jac_lampa32_ru': 'Lampa32',
                'bylampa_jackett': 'ByLampa Jackett',
                'jacred_xyz': 'Jacred.xyz',
                'jr_maxvol_pro': 'Jacred Maxvol Pro',
                'jacred_ru': 'Jacred RU',
                'jacred_viewbox_dev': 'Viewbox',
                'jacred_pro': 'Jacred Pro',
                'jac_black': 'Jac Black'
            },
            'default': 'jacred_xyz'
        },
        'field': {
            'name': '<div class="settings-folder" style="padding:0!important"><div style="width:1.3em;height:1.3em;padding-right:.1em"><svg height="256px" width="256px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="#000000">...</svg></div><div style="font-size:1.0em"><div style="padding:0.3em 0.3em; padding-top:0;"><div style="background: #d99821; padding:0.5em; border-radius:0.4em;"><div style="line-height:0.3;">Выбрать парсер</div></div></div></div></div>',
            'description': 'Нажмите для выбора парсера из списка'
        },
        'onChange': function() {
            setupParser();
            Lampa.Settings.update();
        },
        'onRender': function(field) {
            setTimeout(function() {
                $('div[data-children="parser"]').on('hover:enter', function() {
                    Lampa.Settings.update();
                });

                if (localStorage.getItem('jackett_urltwo') !== 'no_parser') {
                    $('div[data-name="jackett_url"]').hide();
                    $('div[data-name="jackett_key"]').hide();
                    Lampa.Controller.toggle('parser_torrent_type');
                }

                if (Lampa.Storage.field('parser_use') && Lampa.Storage.field('parser') === 'jackett') {
                    field.show();
                    $('.settings-param__name', field).css('color', 'ffffff');
                    $('div[data-name="jackett_urltwo"]').insertAfter('div[data-name="parser_torrent_type"]');
                } else {
                    field.hide();
                }
            }, 5);
        }
    });

    // Обработчик открытия настроек
    Lampa.Settings.listener.follow('open', function(settings) {
        if (settings.name === 'parser') {
            settings.body.find('[data-name="jackett_url2"]').remove();
            settings.body.find('[data-name="jackett_url_two"]').remove();
        }
    });

    // Обработчик изменений в хранилище
    Lampa.Storage.listener.follow('change', function(event) {
        if (Lampa.Storage.field('parser') !== 'jackett') {
            $('div[data-name="jackett_urltwo"]').hide();
        } else {
            $('div[data-name="jackett_urltwo"]').show();
            $('div[data-name="jackett_urltwo"]').insertAfter('div[data-name="parser_torrent_type"]');
        }
    });

    // Инициализация
    var initInterval = setInterval(function() {
        if (typeof Lampa !== 'undefined') {
            clearInterval(initInterval);
            if (!Lampa.Storage.get('jack', 'false')) {
                initializeDefaults();
            }
        }
    }, 100);

    function initializeDefaults() {
        Lampa.Storage.set('jack', 'true');
        Lampa.Storage.set('jackett_url', 'www.jacred.xyz');
        Lampa.Storage.set('jackett_urltwo', 'jacred_xyz');
        Lampa.Storage.set('parse_in_search', true);
        Lampa.Storage.set('jackett_key', '');
        Lampa.Storage.set('jackett_interview', 'healthy');
        Lampa.Storage.set('parse_lang', 'lg');
    }

    // Функция выбора парсера
    function selectParser() {
        var currentActivity = Lampa.Controller.active().name;
        var parsers = [];

        parsers.push({
            'title': 'Lampa32',
            'url': '62.60.149.237:2601',
            'url_two': 'jac_lampa32_ru',
            'jac_key': '',
            'jac_int': 'all',
            'jac_lang': 'lg'
        });

        parsers.push({
            'title': 'ByLampa Jackett',
            'url': '62.60.149.237:9117',
            'url_two': 'bylampa_jackett',
            'jac_key': '777',
            'jac_int': 'all',
            'jac_lang': 'df'
        });

        parsers.push({
            'title': 'Jacred.xyz',
            'url': 'www.jacred.xyz',
            'url_two': 'jacred_xyz',
            'jac_key': '',
            'jac_int': 'healthy',
            'jac_lang': 'lg'
        });

        parsers.push({
            'title': 'Jacred Maxvol Pro',
            'url': 'jr.maxvol.pro',
            'url_two': 'jr_maxvol_pro',
            'jac_key': '',
            'jac_int': 'healthy',
            'jac_lang': 'lg'
        });

        parsers.push({
            'title': 'Jacred RU',
            'url': 'jac-red.ru',
            'url_two': 'jacred_ru',
            'jac_key': '',
            'jac_int': 'all',
            'jac_lang': 'lg'
        });

        parsers.push({
            'title': 'Viewbox',
            'url': 'jacred.viewbox.dev',
            'url_two': 'jacred_viewbox_dev',
            'jac_key': '34DPECDY',
            'jac_int': 'all',
            'jac_lang': 'lg'
        });

        parsers.push({
            'title': 'Jacred Pro',
            'url': 'jacred.pro',
            'url_two': 'jacred_pro',
            'jac_key': '',
            'jac_int': 'all',
            'jac_lang': 'lg'
        });

        parsers.push({
            'title': 'Jac Black',
            'url': 'jacblack.ru:9117',
            'url_two': 'jac_black',
            'jac_key': '',
            'jac_int': 'all',
            'jac_lang': 'lg'
        });

        checkParsersAvailability(parsers).then(function(availableParsers) {
            Lampa.Select.show({
                'title': 'Меню смены парсера',
                'items': availableParsers.map(function(parser) {
                    return {
                        'title': parser.title,
                        'url': parser.url,
                        'url_two': parser.url_two,
                        'jac_key': parser.jac_key,
                        'jac_int': parser.jac_int,
                        'jac_lang': parser.jac_lang
                    };
                }),
                'onBack': function() {
                    Lampa.Controller.toggle(currentActivity);
                },
                'onSelect': function(selectedParser) {
                    Lampa.Storage.set('jackett_url', selectedParser.url);
                    Lampa.Storage.set('jackett_urltwo', selectedParser.url_two);
                    Lampa.Storage.set('jackett_key', selectedParser.jac_key);
                    Lampa.Storage.set('jackett_interview', selectedParser.jac_int);
                    Lampa.Storage.set('parse_lang', selectedParser.jac_lang);
                    Lampa.Storage.set('parse_in_search', true);
                    
                    Lampa.Controller.toggle(currentActivity);
                    
                    var currentActivityState = Lampa.Storage.get('activity');
                    
                    setTimeout(function() {
                        window.history.back();
                    }, 1000);
                    
                    setTimeout(function() {
                        Lampa.Activity.push(currentActivityState);
                    }, 2000);
                }
            });
        }).catch(function(error) {
            console.error('Error:', error);
        });
    }

    // Проверка доступности парсеров
    function checkParsersAvailability(parsers) {
        var availabilityChecks = [];
        
        for (var i = 0; i < parsers.length; i++) {
            var parserUrl = parsers[i].url;
            availabilityChecks.push(checkParserStatus(parserUrl, parsers[i].title, parsers[i]));
        }
        
        return Promise.all(availabilityChecks);
    }

    // Проверка статуса парсера
    function checkParserStatus(url, title, parser) {
        return new Promise(function(resolve, reject) {
            var protocol = location.protocol === 'https:' ? 'https://' : 'http://';
            var apiKey = '';
            
            if (url === '62.60.149.237:9117') {
                apiKey = '777';
            }
            
            if (url === 'jr.maxvol.pro') {
                protocol = 'https://';
            } else {
                protocol = 'http://';
            }
            
            var testUrl = protocol + url + '/api/v2.0/indexers/status:healthy/results?apikey=' + apiKey;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', testUrl, true);
            xhr.timeout = 3000;
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    parser.title = '<span style="color: #64e364;">&#10004;&nbsp;&nbsp;' + title + '</span>';
                    resolve(parser);
                } else {
                    parser.title = '<span style="color: #ff2121;">&#10008;&nbsp;&nbsp;' + title + '</span>';
                    resolve(parser);
                }
            };
            
            xhr.onerror = function() {
                parser.title = '<span style="color: #ff2121;">&#10008;&nbsp;&nbsp;' + title + '</span>';
                resolve(parser);
            };
            
            xhr.ontimeout = function() {
                parser.title = '<span style="color: #ff2121;">&#10008;&nbsp;&nbsp;' + title + '</span>';
                resolve(parser);
            };
            
            xhr.send();
        });
    }

    // Наблюдатель за изменениями DOM
    var observer;
    
    Lampa.Storage.listener.follow('change', function(event) {
        if (event.name === 'activity') {
            if (Lampa.Activity.current().component === 'torrents') {
                enableObserver();
            } else {
                disableObserver();
            }
        }
    });

    function enableObserver() {
        disableObserver();
        
        var body = document.body;
        var config = {
            'childList': true,
            'subtree': true
        };
        
        observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if ($('.empty__title').length && Lampa.Storage.field('parser') === 'jackett') {
                    selectParser();
                    disableObserver();
                }
            });
        });
        
        observer.observe(body, config);
    }

    function disableObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }
})();
