// ================================================
// RBF Planning — Service Worker Web Push natif
// ================================================

// Gestion des notifications push natives
self.addEventListener('push', function(event) {
    var data = {};
    try { data = event.data.json(); } catch(e) { data = { title: 'RBF Planning', body: event.data ? event.data.text() : 'Mise a jour planning' }; }
    
    var options = {
        body   : data.body  || data.message || 'Mise a jour du planning',
        icon   : '/planning-rbf/icon.png.png',
        badge  : '/planning-rbf/icon.png.png',
        vibrate: [200, 100, 200],
        data   : { url: 'https://bastien-rbf.github.io/planning-rbf/' },
        requireInteraction: true
    };
    event.waitUntil(
        self.registration.showNotification(data.title || 'RBF Planning', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function(list) {
            for (var c of list) { if ('focus' in c) return c.focus(); }
            if (clients.openWindow) return clients.openWindow('https://bastien-rbf.github.io/planning-rbf/');
        })
    );
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
