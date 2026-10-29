(function () {
    'use strict';

    function showUid() {
        var uid = Lampa.Storage.get('lampac_unic_id', '');
        var msg = uid ? ('UID: ' + uid) : 'UID не найден (lampac_unic_id пуст)';
        console.log('[UID]', msg);
        try { Lampa.Noty.show(msg); } catch (e) {}
    }

    if (window.appready) showUid();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') showUid();
    });
})();
