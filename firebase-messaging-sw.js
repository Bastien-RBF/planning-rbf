// ================================================
// RBF Planning — Service Worker Web Push
// ================================================

// Stocker le dernier message recu via postMessage
var lastNotifData = { title: 'RBF Planning', body: 'Mise a jour du planning' };

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SET_NOTIF_DATA') {
        lastNotifData = event.data.payload;
    }
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Push recu (vide ou avec data)
self.addEventListener('push', function(event) {
    var title = lastNotifData.title || 'RBF Planning';
    var body  = lastNotifData.body  || 'Mise a jour du planning';

    if (event.data) {
        try {
            var d = event.data.json();
            title = d.title || title;
            body  = d.body  || d.message || body;
        } catch(e) {
            var txt = event.data.text();
            if (txt) body = txt;
        }
    }

    event.waitUntil(
        self.registration.showNotification(title, {
            body             : body,
            icon             : '/planning-rbf/icon.png.png',
            badge            : '/planning-rbf/icon.png.png',
            vibrate          : [200, 100, 200],
            requireInteraction: true,
            data             : { url: 'https://bastien-rbf.github.io/planning-rbf/' }
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
