(function () {
    'use strict';

    function bazon(component) {
        var network = new Lampa.Reguest();
        var object = {};
        var extract = {};
        var results = [];
        var filter_items = {};
        var choice = {
            season: 0
        };
        /**
         * РќР°С‡Р°С‚СЊ РїРѕРёСЃРє
         * @param {Object} _object 
         */

        this.search = function (_object, found) {
            object = _object;
            results = found;
            success(found);
            component.loading(false);
        };
        /**
         * РЎР±СЂРѕСЃ С„РёР»СЊС‚СЂР°
         */


        this.reset = function () {
            component.reset();
            choice = {
                season: 0,
                voice: 0
            };
            filter();
            append(filtred());
        };
        /**
         * РџСЂРёРјРµРЅРёС‚СЊ С„РёР»СЊС‚СЂ
         * @param {*} type 
         * @param {*} a 
         * @param {*} b 
         */


        this.filter = function (type, a, b) {
            choice[a.stype] = b.index;
            component.reset();
            filter();
            append(filtred());
        };
        /**
         * РЈРЅРёС‡С‚РѕР¶РёС‚СЊ
         */


        this.destroy = function () {
            network.clear();
            results = null;
        };
        /**
         * РЈСЃРїРµС€РЅРѕ, РµСЃС‚СЊ РґР°РЅРЅС‹Рµ
         * @param {Object} json 
         */


        function success(json) {
            results = json;
            filter();
            append(filtred());
        }
        /**
         * РџРѕСЃС‚СЂРѕРёС‚СЊ С„РёР»СЊС‚СЂ
         */


        function filter() {
            filter_items = {
                season: []
            };
            var movie = results
            if (movie.content) {
                var s = movie.content.length;

                while (s--) {
                    filter_items.season.push('РЎРµР·РѕРЅ ' + (movie.content.length - s));
                }
            }

            component.filter(filter_items, choice);
            
        }
        /**
         * РћС‚С„РёР»СЊС‚СЂРѕРІР°С‚СЊ С„Р°Р№Р»С‹
         * @returns array
         */


        function filtred() {
            var filtred = [];
            var filter_data = Lampa.Storage.get('onlinebazon_filter', '{}');
            var movie = results

            if (object.movie.number_of_seasons) {
                var episodes = movie.content[filter_data.season]
                episodes.folder.forEach(function (episode) {
                    filtred.push({
                        episode: episode.title,
                        season: filter_data.season + 1,
                        title: episode.title,
                        url: episode.media[episode.media.length - 1].url,
                        quality: episode.media[episode.media.length - 1].quality,
                        translation: movie.translation
                    });
                })
                // movie.content.forEach(function (season) {
                //     if (episode.season_num == filter_data.season + 1) {
                //         episode.media.forEach(function (media) {
                //             if (media.translation.id == filter_items.voice_info[filter_data.voice].id) {
                //                 filtred.push({
                //                     episode: parseInt(episode.num),
                //                     season: episode.season_num,
                //                     title: episode.num + ' - ' + episode.ru_title,
                //                     quality: media.max_quality + 'p',
                //                     translation: media.translation_id
                //                 });
                //             }
                //         });
                //     }
                // });
            } else {
                movie.media.forEach(function (element) {
                    //if(filter_items.voice_info[filter_data.voice].id == element.translation_id){
                    filtred.push({
                        title: movie.translation,
                        quality: element.quality,
                        url: element.url
                    }); //}
                });
            }

            return filtred;
        }
        /**
         * Р”РѕР±Р°РІРёС‚СЊ РІРёРґРµРѕ
         * @param {Array} items 
         */


        function append(items) {
            component.reset();
            items.forEach(function (element) {
                if (element.season) element.title = 'S' + element.season + ' / ' + element.title;
                element.info = element.season ? " / " + element.translation : ''
                var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
                var view = Lampa.Timeline.view(hash);
                var item = Lampa.Template.get('online', element);
                item.addClass('video--stream');
                element.timeline = view;
                item.append(Lampa.Timeline.render(view));
                item.on('hover:enter', function () {
                    if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);

                    var playlist = [];
                    var first = {
                        url: element.url,
                        timeline: view,
                        title: element.season ? element.title : object.movie.title + ' / ' + element.title
                    };
                    Lampa.Player.play(first);

                    if (element.season) {
                        items.forEach(function (elem) {
                            playlist.push({
                                title: elem.title,
                                url: elem.url,
                                timeline: elem.timeline
                            });
                        });
                    } else {
                        playlist.push(first);
                    }

                    Lampa.Player.playlist(playlist);
                });
                component.append(item);
            });
            component.start(true);
        }
    }

    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var files = new Lampa.Files(object);
        var filter = new Lampa.Filter(object);
        var sources = {
            bazon: new bazon(this),
        };
        var last;
        var last_filter;
        var filter_translate = {
            season: 'РЎРµР·РѕРЅ'
        };
        scroll.minus();
        scroll.body().addClass('torrent-list');
        /**
         * РџРѕРґРіРѕС‚РѕРІРєР°
         */

        this.create = function () {
            var _this = this;

            this.activity.loader(true);
            Lampa.Background.immediately(Lampa.Utils.cardImgBackground(object.movie));

            filter.onSearch = function (value) {
                Lampa.Activity.replace({
                    search: value,
                    clarification: true
                });
            };

            filter.onBack = function () {
                _this.start();
            };

            filter.render().find('.selector').on('hover:focus', function (e) {
                last_filter = e.target;
            });

            filter.onSelect = function (type, a, b) {
                if (type == 'filter') {
                    if (a.reset) {
                        sources["bazon"].reset();
                    } else {
                        sources["bazon"].filter(type, a, b);
                        setTimeout(Lampa.Select.close, 10);
                    }
                }
            };

            filter.render().find('.filter--sort').remove();
            filter.render().addClass('torrent-filter');
            files.append(scroll.render());
            scroll.append(filter.render());
            this.search();
            return this.render();
        };
        /**
         * РќР°С‡Р°С‚СЊ РїРѕРёСЃРє
         */


        this.search = function () {
            this.activity.loader(true);
            this.reset();
            this.find();
        };

        this.find = function () {
            var _this2 = this;

            var url = 'http://bazon.herokuapp.com/bazon/';
            var query = object.search;

            function isAnime(genres) {
                return genres.filter(function (gen) {
                    return gen.id == 16;
                }).length;
            }

            var type = object.movie.number_of_seasons ? 'tv-series' : 'movie';
            url += type
            console.log(object.movie)
            var year = object.movie.first_air_date ?? object.movie.release_date
            url = Lampa.Utils.addUrlComponent(url, 'title=' + encodeURIComponent(query));
            url = Lampa.Utils.addUrlComponent(url, 'year=' + encodeURIComponent(year));
            network.clear();
            network.silent(url, function (json) {

                if (json) {
                    if (json || object.clarification) {
                        console.log(sources)
                        sources["bazon"].search(object, json)
                    } else {
                        _this2.loading(false);
                    }
                } else _this2.empty('РџРѕ Р·Р°РїСЂРѕСЃСѓ (' + query + ') РЅРµС‚ СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ');
            }, function (a, c) {
                _this2.empty(network.errorDecode(a, c));
            });
        };

        /**
         * РћС‡РёСЃС‚РёС‚СЊ СЃРїРёСЃРѕРє С„Р°Р№Р»РѕРІ
         */


        this.reset = function () {
            last = false;
            scroll.render().find('.empty').remove();
            filter.render().detach();
            scroll.clear();
            scroll.append(filter.render());
        };
        /**
         * Р—Р°РіСЂСѓР·РєР°
         */


        this.loading = function (status) {
            if (status) this.activity.loader(true);
            else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };
        /**
         * РџРѕСЃС‚СЂРѕРёС‚СЊ С„РёР»СЊС‚СЂ
         */


        this.filter = function (filter_items, choice) {
            console.log(filter_items)
            var select = [];

            var add = function add(type, title) {
                var need = Lampa.Storage.get('onlinebazon_filter', '{}');
                var items = filter_items[type];
                var subitems = [];
                var value = need[type];
                items.forEach(function (name, i) {
                    subitems.push({
                        title: name,
                        selected: value == i,
                        index: i
                    });
                });
                select.push({
                    title: title,
                    subtitle: items[value],
                    items: subitems,
                    stype: type
                });
            };

            select.push({
                title: 'РЎР±СЂРѕСЃРёС‚СЊ С„РёР»СЊС‚СЂ',
                reset: true
            });
            Lampa.Storage.set('onlinebazon_filter', choice);
            if (filter_items.season && filter_items.season.length) add('season', 'РЎРµР·РѕРЅ');
            filter.set('filter', select);
            this.selected(filter_items);
        };
        /**
         * Р—Р°РєСЂС‹С‚СЊ С„РёР»СЊС‚СЂ
         */


        this.closeFilter = function () {
            if ($('body').hasClass('selectbox--open')) Lampa.Select.close();
        };
        /**
         * РџРѕРєР°Р·Р°С‚СЊ С‡С‚Рѕ РІС‹Р±СЂР°РЅРѕ РІ С„РёР»СЊС‚СЂРµ
         */


        this.selected = function (filter_items) {
            var need = Lampa.Storage.get('onlinebazon_filter', '{}'),
                select = [];

            for (var i in need) {
                if (filter_items[i]) {
                    if (filter_items.season.length >= 1) {
                        select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
                    }
                }
            }

            filter.chosen('filter', select);
        };
        /**
         * Р”РѕР±Р°РІРёС‚СЊ С„Р°Р№Р»
         */


        this.append = function (item) {
            item.on('hover:focus', function (e) {
                last = e.target;
                scroll.update($(e.target), true);
            });
            scroll.append(item);
        };
        /**
         * РџРѕРєР°Р·Р°С‚СЊ РїСѓСЃС‚РѕР№ СЂРµР·СѓР»СЊС‚Р°С‚
         */


        this.empty = function (msg) {
            var empty = Lampa.Template.get('list_empty');
            if (msg) empty.find('.empty__descr').text(msg);
            scroll.append(empty);
            this.loading(false);
        };
        /**
         * РќР°С‡Р°С‚СЊ РЅР°РІРёРіР°С†РёСЋ РїРѕ С„Р°Р№Р»Р°Рј
         */


        this.start = function (first_select) {
            if (first_select) {
                last = scroll.render().find('.selector').eq(2)[0];
            }

            Lampa.Controller.add('content', {
                toggle: function toggle() {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function up() {
                    if (Navigator.canmove('up')) {
                        if (scroll.render().find('.selector').slice(2).index(last) == 0 && last_filter) {
                            Lampa.Controller.collectionFocus(last_filter, scroll.render());
                        } else Navigator.move('up');
                    } else Lampa.Controller.toggle('head');
                },
                down: function down() {
                    Navigator.move('down');
                },
                right: function right() {
                    Navigator.move('right');
                },
                left: function left() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function () {
            return files.render();
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.pause = function () {};

        this.stop = function () {};

        this.destroy = function () {
            network.clear();
            files.destroy();
            scroll.destroy();
            network = null;
            sources.bazon.destroy();
        };
    }

    function resetTemplates() {
        Lampa.Template.add('online', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"64\" cy=\"64\" r=\"56\" stroke=\"white\" stroke-width=\"16\"/>\n                    <path d=\"M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z\" fill=\"white\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
        Lampa.Template.add('online_folder', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"/>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"/>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
    }

    var button = "<div class=\"full-start__button selector view--online\">\n    <svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:svgjs=\"http://svgjs.com/svgjs\" version=\"1.1\" width=\"512\" height=\"512\" x=\"0\" y=\"0\" viewBox=\"0 0 30.051 30.051\" style=\"enable-background:new 0 0 512 512\" xml:space=\"preserve\" class=\"\">\n    <g xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M19.982,14.438l-6.24-4.536c-0.229-0.166-0.533-0.191-0.784-0.062c-0.253,0.128-0.411,0.388-0.411,0.669v9.069   c0,0.284,0.158,0.543,0.411,0.671c0.107,0.054,0.224,0.081,0.342,0.081c0.154,0,0.31-0.049,0.442-0.146l6.24-4.532   c0.197-0.145,0.312-0.369,0.312-0.607C20.295,14.803,20.177,14.58,19.982,14.438z\" fill=\"currentColor\"/>\n        <path d=\"M15.026,0.002C6.726,0.002,0,6.728,0,15.028c0,8.297,6.726,15.021,15.026,15.021c8.298,0,15.025-6.725,15.025-15.021   C30.052,6.728,23.324,0.002,15.026,0.002z M15.026,27.542c-6.912,0-12.516-5.601-12.516-12.514c0-6.91,5.604-12.518,12.516-12.518   c6.911,0,12.514,5.607,12.514,12.518C27.541,21.941,21.937,27.542,15.026,27.542z\" fill=\"currentColor\"/>\n    </g></svg>\n\n    <span>Bazon</span>\n    </div>"; // РЅСѓР¶РЅР° Р·Р°РіР»СѓС€РєР°, Р° С‚Рѕ РїСЂРё СЃС‚СЂР°С‚Рµ Р»Р°РјРїС‹ РіРѕРІРѕСЂРёС‚ РїСѓСЃС‚Рѕ

    Lampa.Component.add('bazon', component); //С‚Рѕ Р¶Рµ СЃР°РјРѕРµ

    resetTemplates();
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
            var btn = $(button);
            btn.on('hover:enter', function () {
                resetTemplates();
                Lampa.Component.add('bazon', component);
                Lampa.Activity.push({
                    url: '',
                    title: 'Bazon',
                    component: 'bazon',
                    search: e.data.movie.title,
                    search_one: e.data.movie.title,
                    search_two: e.data.movie.original_title,
                    movie: e.data.movie,
                    page: 1
                });
            });
            e.object.activity.render().find('.view--torrent').after(btn);
        }
    });

})();
