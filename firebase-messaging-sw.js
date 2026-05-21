// ================================================
// RBF Planning — Service Worker Web Push
// Push vide : le SW lit le message depuis Firebase REST
// ================================================

var FIREBASE_DB_URL = 'https://rbf-transport-default-rtdb.europe-west1.firebasedatabase.app';

self.addEventListener('push', function(event) {
    var defaultTitle = 'RBF Planning';
    var defaultBody  = 'Mise a jour du planning';
    var icon         = '/planning-rbf/icon.png.png';

    function showNotif(title, body) {
        var ua       = (self.navigator && self.navigator.userAgent) || '';
        var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        return self.registration.showNotification(title, {
            body              : body,
            icon              : icon,
            badge             : icon,
            vibrate           : [200, 100, 200],
            requireInteraction: isMobile,
            data              : { url: 'https://bastien-rbf.github.io/planning-rbf/' }
        });
    }

    // Si le push contient déjà un payload (test DevTools), l'utiliser directement
    if (event.data) {
        try {
            var d = event.data.json();
            event.waitUntil(showNotif(d.title || defaultTitle, d.body || d.message || defaultBody));
            return;
        } catch(e) {
            try {
                var txt = event.data.text();
                if (txt) {
                    var d2 = JSON.parse(txt);
                    event.waitUntil(showNotif(d2.title || defaultTitle, d2.body || defaultBody));
                    return;
                }
            } catch(e2) {}
        }
    }

    // Push vide — lire le dernier message dans Firebase via REST (pas de SDK nécessaire)
    event.waitUntil(
        fetch(FIREBASE_DB_URL + '/last_push.json')
        .then(function(r) { return r.json(); })
        .then(function(d) {
            var title = (d && d.title)   || defaultTitle;
            var body  = (d && d.message) || defaultBody;
            return showNotif(title, body);
        })
        .catch(function() {
            return showNotif(defaultTitle, defaultBody);
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
            for (var c of list) { if ('focus' in c) return c.focus(); }
            if (clients.openWindow) return clients.openWindow('https://bastien-rbf.github.io/planning-rbf/');
        })
    );
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
