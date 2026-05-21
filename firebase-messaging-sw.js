// ================================================
// RBF Planning — Service Worker Web Push
// ================================================

self.addEventListener('push', function(event) {
    var title = 'RBF Planning';
    var body  = 'Mise a jour du planning';
    var icon  = '/planning-rbf/icon.png.png';

    if (event.data) {
        try {
            var d = event.data.json();
            title = d.title || title;
            body  = d.body  || d.message || body;
        } catch(e) {
            try {
                var txt = event.data.text();
                if (txt) {
                    var d2 = JSON.parse(txt);
                    title = d2.title || title;
                    body  = d2.body  || body;
                }
            } catch(e2) {}
        }
    }

    // Détecter mobile directement dans le Service Worker
    var ua = (self.navigator && self.navigator.userAgent) || '';
    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    event.waitUntil(
        self.registration.showNotification(title, {
            body              : body,
            icon              : icon,
            badge             : icon,
            vibrate           : [200, 100, 200],
            requireInteraction: isMobile,
            data              : { url: 'https://bastien-rbf.github.io/planning-rbf/' }
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
