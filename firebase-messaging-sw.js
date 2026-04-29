// ================================================
// RBF Planning — Firebase Messaging Service Worker
// ================================================
importScripts('https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey           : "AIzaSyB8f5_NGtHX6iPp-reUolnxHH6Du2mUJks",
  authDomain       : "rbf-transport.firebaseapp.com",
  databaseURL      : "https://rbf-transport-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId        : "rbf-transport",
  storageBucket    : "rbf-transport.firebasestorage.app",
  messagingSenderId: "857293034627",
  appId            : "1:857293034627:web:dfa3390ee0a798638f77b6"
});

const messaging = firebase.messaging();

// Notification en arriere-plan
messaging.onBackgroundMessage(function(payload) {
  console.log('Message recu en arriere-plan:', payload);
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'RBF Planning', {
    body : body  || 'Mise a jour du planning',
    icon : '/planning-rbf/icon.png.png',
    badge: '/planning-rbf/icon.png.png',
    data : { url: 'https://bastien-rbf.github.io/planning-rbf/' }
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var c of clientList) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('https://bastien-rbf.github.io/planning-rbf/');
    })
  );
});
