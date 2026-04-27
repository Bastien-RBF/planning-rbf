/* ══════════════════════════════════════════════
   RBF Planning — Service Worker
   • Cache offline des assets statiques
   • Prêt pour les notifications push (FCM)
══════════════════════════════════════════════ */

const CACHE_NAME = 'rbf-planning-v1';

// Fichiers à mettre en cache pour le mode hors-ligne
const ASSETS_TO_CACHE = [
  '/planning-rbf/',
  '/planning-rbf/index.html',
  '/planning-rbf/manifest.json',
  '/planning-rbf/logo.png',
  '/planning-rbf/icon.png.png',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-database-compat.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js'
];

/* ── INSTALLATION : mise en cache des assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('Cache miss:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

/* ── ACTIVATION : nettoyage des anciens caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── FETCH : stratégie Network First avec fallback cache ── */
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes Firebase ou Cloudinary (temps réel)
  const url = event.request.url;
  if (
    url.includes('firebasedatabase') ||
    url.includes('firebaseio')       ||
    url.includes('cloudinary')       ||
    url.includes('emailjs')          ||
    url.includes('api.gouv.fr')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        // Hors ligne → retourner depuis le cache
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Si c'est une page HTML → renvoyer index.html
          if (event.request.destination === 'document') {
            return caches.match('/planning-rbf/index.html');
          }
        })
      )
  );
});

/* ── NOTIFICATIONS PUSH ── */
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'RBF Planning', body: event.data.text() };
  }

  const options = {
    body   : data.body  || 'Vous avez une mise à jour de planning.',
    icon   : '/planning-rbf/icon.png.png',
    badge  : '/planning-rbf/icon.png.png',
    vibrate: [200, 100, 200],
    data   : { url: data.url || './' },
    actions: [
      { action: 'open',   title: 'Voir le planning' },
      { action: 'close',  title: 'Fermer' }
    ]
  };

  event.waitUntil(
    Promise.resolve(self.registration.showNotification(data.title || 'RBF Planning', options))
      .catch(function(e) { console.warn('Notification impossible (permission ?) :', e); })
  );
});

/* ── CLIC SUR NOTIFICATION ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si l'app est déjà ouverte → la mettre au premier plan
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
