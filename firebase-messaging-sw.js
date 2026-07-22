// ================================================
// RBF Planning — Service Worker Web Push
// Push vide : le SW lit le message depuis Firebase REST
// Compatible Chrome, Firefox, Edge, Safari iOS 16.4+
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

    // Push vide — lire le dernier message dans Firebase via REST
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

// ================================================
// MODE HORS-LIGNE (ajout)
// Strategie "reseau d'abord, cache en secours" :
// tant qu'il y a du reseau, tout le monde a TOUJOURS la derniere
// version. Le cache ne sert que si le reseau est absent.
// ================================================

var CACHE_NAME = 'rbf-planning-v1';
var APP_SHELL  = [
    '/planning-rbf/',
    '/planning-rbf/index.html',
    '/planning-rbf/icon.png.png'
];

self.addEventListener('fetch', function(event) {
    var req = event.request;

    // On ne gere que les GET de notre propre origine
    if (req.method !== 'GET') return;
    var url;
    try { url = new URL(req.url); } catch(e) { return; }
    if (url.origin !== self.location.origin) return;

    // Jamais de cache pour Firebase / APIs externes (deja exclu par l'origine)
    event.respondWith(
        fetch(req)
            .then(function(res) {
                // Reseau OK : on rafraichit le cache au passage
                if (res && res.status === 200 && res.type === 'basic') {
                    var copy = res.clone();
                    caches.open(CACHE_NAME).then(function(c) {
                        c.put(req, copy).catch(function(){});
                    });
                }
                return res;
            })
            .catch(function() {
                // Reseau absent : on sert la version en cache
                return caches.match(req).then(function(hit) {
                    if (hit) return hit;
                    // Navigation sans cache exact : on renvoie la page principale
                    if (req.mode === 'navigate') {
                        return caches.match('/planning-rbf/index.html');
                    }
                    return Response.error();
                });
            })
    );
});

// Activation immédiate (important pour les mises à jour)
self.addEventListener('install', function(event) {
    self.skipWaiting();
    // Pre-cache de l'appli (n'echoue pas l'installation si un fichier manque)
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(c) { return c.addAll(APP_SHELL).catch(function(){}); })
            .catch(function(){})
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            // Suppression des anciens caches (evite de servir une vieille version)
            return Promise.all(keys.map(function(k) {
                if (k !== CACHE_NAME) return caches.delete(k);
            }));
        }).then(function() { return clients.claim(); })
    );
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
