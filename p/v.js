!function () {
  "use strict";

  function e(e) {
    var t, i, n = new Lampa.Reguest, a = new Lampa.Scroll({mask: !0, over: !0}), o = new Lampa.Files(e),
       r = new Lampa.Filter(e), l = [], s = [], c = {}, d = {season: [], voice: [], voice_info: []},
       u = {season: "РЎРµР·РѕРЅ", voice: "РџРµСЂРµРІРѕРґ"};
    a.minus(), a.body().addClass("torrent-list"), this.create = function () {
      var t = this;
      this.activity.loader(!0), Lampa.Background.immediately(Lampa.Utils.cardImgBackground(e.movie));
      var a = "https://videocdn.tv/api/" + (e.movie.number_of_seasons ? "tv-series" : "movies");
      return a = Lampa.Utils.addUrlComponent(a, "api_token=LTfGg6oweWEzZDHrNZ4bJvDqxvvsmsM6"), a = Lampa.Utils.addUrlComponent(a, "query=" + encodeURIComponent(e.search)), e.movie.release_date && "0000" !== e.movie.release_date && (a = Lampa.Utils.addUrlComponent(a, "year=" + (e.movie.release_date + "").slice(0, 4))), n.silent(a, (function (i) {
        i.data && i.data.length ? (l = i.data, t.build(), t.activity.loader(!1), t.activity.toggle()) : t.empty("РћР№, РјС‹ РЅРµ РЅР°С€Р»Рё (" + e.search + ")")
      }), (function (e, i) {
        t.empty("РћС‚РІРµС‚: " + n.errorDecode(e, i))
      })), r.onSearch = function (e) {
        Lampa.Activity.replace({search: e, clarification: !0})
      }, r.onBack = function () {
        t.start()
      }, r.render().find(".selector").on("hover:focus", (function (e) {
        i = e.target
      })), r.render().find(".filter--sort").remove(), this.render()
    }, this.empty = function (e) {
      var t = new Lampa.Empty({descr: e});
      o.append(t.render(r.empty())), this.start = t.start, this.activity.loader(!1), this.activity.toggle()
    }, this.buildFilterd = function (t) {
      var i = [], n = function (e, t) {
        var n = Lampa.Storage.get("online_filter", "{}"), a = d[e], o = [], r = n[e];
        a.forEach((function (e, t) {
          o.push({title: e, selected: r === t, index: t})
        })), i.push({title: t, subtitle: a[r], items: o, stype: e})
      };
      d.voice = [], d.season = [], d.voice_info = [];
      var a = {season: 0, voice: 0};
      l.slice(0, 1).forEach((function (e) {
        if (e.season_count) {
          for (var i = e.season_count; i--;) d.season.push("РЎРµР·РѕРЅ " + (e.season_count - i));
          a.season = void 0 === t ? d.season.length - 1 : t
        }
        d.season.length ? e.episodes.forEach((function (e) {
          e.season_num === a.season + 1 && e.media.forEach((function (e) {
            -1 === d.voice.indexOf(e.translation.title) && (d.voice.push(e.translation.title), d.voice_info.push({id: e.translation.id}))
          }))
        })) : e.translations.forEach((function (e) {
          2 !== e.id && (d.voice.push(e.title), d.voice_info.push({id: e.id}))
        }))
      })), Lampa.Storage.set("online_filter", e.movie.number_of_seasons ? a : {}), i.push({
        title: "РЎР±СЂРѕСЃРёС‚СЊ С„РёР»СЊС‚СЂ",
        reset: !0
      }), e.movie.number_of_seasons ? (n("voice", "РџРµСЂРµРІРѕРґ"), n("season", "РЎРµР·РѕРЅ")) : n("voice", "РџРµСЂРµРІРѕРґ"), r.set("filter", i), this.selectedFilter()
    }, this.selectedFilter = function () {
      var e = Lampa.Storage.get("online_filter", "{}"), t = [];
      for (var i in e) t.push(u[i] + ": " + d[i][e[i]]);
      r.chosen("filter", t)
    }, this.extractFile = function (e, t) {
      var i = "";
      try {
        var n = e.split(",").map((function (e) {
          return {
            quality: parseInt(e.match(/\[(\d+)p\]/)[1]),
            file: e.replace(/\[\d+p\]/, "").split(" or ")[0]
          }
        }));
        n.sort((function (e, t) {
          return t.quality - e.quality
        })), i = "http:" + (i = n[0].file).slice(0, i.lastIndexOf("/")) + "/" + (t || n[0].quality) + ".mp4"
      } catch (e) {
      }
      return i
    }, this.extractData = function () {
      var e = this;
      n.timeout(5e3);
      var t = l.slice(0, 1)[0];
      if (c = {}, t) {
        var i = t.iframe_src;
        n.native("http:" + i, (function (i) {
          var n = i.replace(/\n/g, "").match(/id="files" value="(.*?)"/);
          if (n) {
            var a = Lampa.Arrays.decodeJson(n[1].replace(/&quot;/g, '"'), {}),
               o = document.createElement("textarea"), r = function (i) {
                 var n, r;
                 if (0 == i - 0) return "continue";
                 o.innerHTML = a[i], Lampa.Arrays.decodeJson(o.value, {});
                 var l, s,
                    d = null === (n = t.media) || void 0 === n || null === (r = n.filter((function (e) {
                      return e.translation_id === i - 0
                    }))[0]) || void 0 === r ? void 0 : r.max_quality;
                 d || (d = null === (l = t.translations) || void 0 === l || null === (s = l.filter((function (e) {
                   return e.id === i - 0
                 }))[0]) || void 0 === s ? void 0 : s.max_quality);
                 for (var u in c[i] = {
                   json: Lampa.Arrays.decodeJson(o.value, {}),
                   file: e.extractFile(a[i], d)
                 }, c[i].json) {
                   var f = c[i].json[u];
                   if (f.folder) for (var v in f.folder) {
                     var p = f.folder[v];
                     p.file = e.extractFile(p.file, d)
                   } else f.file = e.extractFile(f.file, d)
                 }
               };
            for (var l in a) r(l)
          }
        }), !1, !1, {dataType: "text"})
      }
    }, this.build = function () {
      var e = this;
      this.buildFilterd(), this.filtred(), this.extractData(), r.onSelect = function (t, i, n) {
        if ("filter" == t) if (i.reset) e.buildFilterd(); else if ("season" == i.stype) e.buildFilterd(n.index); else {
          var a = Lampa.Storage.get("online_filter", "{}");
          a[i.stype] = n.index, i.subtitle = n.title, Lampa.Storage.set("online_filter", a)
        }
        e.applyFilter(), e.start()
      }, this.showResults()
    }, this.filtred = function () {
      s = [];
      var t = Lampa.Storage.get("online_filter", "{}");
      e.movie.number_of_seasons ? l.slice(0, 1).forEach((function (e) {
        e.episodes.forEach((function (e) {
          e.season_num == t.season + 1 && e.media.forEach((function (i) {
            i.translation.id == d.voice_info[t.voice].id && s.push({
              episode: parseInt(e.num),
              season: e.season_num,
              title: e.num + " - " + e.ru_title,
              quality: i.max_quality + "p",
              translation: i.translation_id
            })
          }))
        }))
      })) : (l.slice(0, 1).forEach((function (e) {
        e.media.forEach((function (e) {
          2 !== e.translation.id && (t.voice ? e.translation.id === d.voice_info[t.voice].id && s.push({
            title: e.translation.title,
            quality: e.max_quality + "p",
            translation: e.translation_id
          }) : s.push({
            title: e.translation.title,
            quality: e.max_quality + "p",
            translation: e.translation_id
          }))
        }))
      })), 0 === s.length && this.empty("Р’РёРґРµРѕ РµС‰Рµ РЅРµ РїРѕСЏРІРёР»РѕСЃСЊ, РїСЂРёС…РѕРґРёС‚Рµ Р·Р°РІС‚СЂР°."))
    }, this.applyFilter = function () {
      this.filtred(), this.selectedFilter(), this.reset(), this.showResults(), t = a.render().find(".torrent-item:eq(0)")[0]
    }, this.showResults = function (e) {
      r.render().addClass("torrent-filter"), a.append(r.render()), this.append(s), o.append(a.render())
    }, this.reset = function () {
      t = !1, r.render().detach(), a.clear()
    }, this.getFile = function (e, t) {
      var i = c[e.translation], n = e.season + "_" + e.episode;
      if (i) {
        if (!e.season) return i.file;
        for (var a in i.json) {
          var o = i.json[a];
          if (o.folder) for (var r in o.folder) {
            var l = o.folder[r];
            if (l.id == n) return l.file
          } else if (o.id == n) return o.file
        }
      }
      t && Lampa.Noty.show("РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РІР»РµС‡СЊ СЃСЃС‹Р»РєСѓ")
    }, this.append = function (i) {
      var n = this;
      i.forEach((function (o) {
        var r = Lampa.Utils.hash(o.season ? [o.season, o.episode, e.movie.original_title].join("") : e.movie.original_title),
           l = Lampa.Timeline.view(r), s = Lampa.Template.get("online_vcd", o);
        s.append(Lampa.Timeline.render(l)), s.on("hover:focus", (function (e) {
          t = e.target, a.update($(e.target), !0)
        })).on("hover:enter", (function () {
          var t = n.getFile(o, !0);
          if (t) {
            n.start();
            var a = [],
               r = {url: t, timeline: l, title: o.season ? o.title : e.movie.title + " / " + o.title};
            Lampa.Player.play(r), o.season ? i.forEach((function (e) {
              a.push({title: e.title, url: n.getFile(e)})
            })) : a.push(r), Lampa.Player.playlist(a)
          }
        })), a.append(s)
      }))
    }, this.back = function () {
      Lampa.Activity.backward()
    }, this.start = function () {
      Lampa.Controller.add("content", {
        toggle: function () {
          Lampa.Controller.collectionSet(a.render(), o.render()), Lampa.Controller.collectionFocus(t || !1, a.render())
        }, up: function () {
          Navigator.canmove("up") ? 0 == a.render().find(".selector").slice(2).index(t) && i ? Lampa.Controller.collectionFocus(i, a.render()) : Navigator.move("up") : Lampa.Controller.toggle("head")
        }, down: function () {
          Navigator.move("down")
        }, right: function () {
          Navigator.move("right")
        }, left: function () {
          Navigator.canmove("left") ? Navigator.move("left") : Lampa.Controller.toggle("menu")
        }, back: this.back
      }), Lampa.Controller.toggle("content")
    }, this.pause = function () {
    }, this.stop = function () {
    }, this.render = function () {
      return o.render()
    }, this.destroy = function () {
      n.clear(), o.destroy(), a.destroy(), l = null, n = null
    }
  }

  window.plugin_videocdn_ready || (window.plugin_videocdn_ready = !0, Lampa.Component.add("videocdn", e), Lampa.Template.add("button_videocdn", '<div class="full-start__button selector view--online">\n    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 122.88 122.88" style="enable-background:new 0 0 122.88 122.88" xml:space="preserve">\n    <style type="text/css">\n    .st0{fill-rule:evenodd;clip-rule:evenodd;fill:#262829;}\n    .st1{fill-rule:evenodd;clip-rule:evenodd;fill:#FFFFFF;}\n    </style><g><path class="st0" d="M61.44,0c33.93,0,61.44,27.51,61.44,61.44s-27.51,61.44-61.44,61.44S0,95.37,0,61.44S27.51,0,61.44,0L61.44,0 L61.44,0z"/><path class="st1" d="M84.32,65.41c3.31-2.13,3.3-4.51,0-6.4L50.13,39.36c-2.7-1.69-5.51-0.7-5.43,2.82l0.11,39.7 c0.23,3.82,2.41,4.86,5.62,3.1L84.32,65.41L84.32,65.41L84.32,65.41z"/></g></svg>\n\n    <span>VideoCDN</span>\n    </div>'), Lampa.Template.add("online_vcd", '<div class="online selector">\n        <div class="online__body">\n            <div class="online__title">{title}</div>\n            <div class="online__quality">VideoCDN / {quality}</div>\n        </div>\n    </div>'), Lampa.Listener.follow("full", (function (e) {
    if ("complite" == e.type) {
      var t = Lampa.Template.get("button_videocdn");
      t.on("hover:enter", (function () {
        Lampa.Activity.push({
          url: "",
          title: "VideoCDN",
          component: "videocdn",
          search: e.data.movie.title,
          search_one: e.data.movie.title,
          search_two: e.data.movie.original_title,
          movie: e.data.movie,
          page: 1
        })
      })), e.object.activity.render().find(".view--torrent").after(t)
    }
  })))
}();
