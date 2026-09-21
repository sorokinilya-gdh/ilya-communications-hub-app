const CACHE = 'communications-hub-v1';
const BASE = '/ilya-communications-hub-app';
const SHELL = [`${BASE}/`, `${BASE}/manifest.webmanifest`, `${BASE}/hub-icon.svg`, `${BASE}/hub-icon-180.png`, `${BASE}/hub-icon-512.png`];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(match => match || caches.match('/'))));
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Needs My Attention', {
    body: data.body || 'A communication needs your attention.',
    icon: `${BASE}/hub-icon-180.png`,
    badge: `${BASE}/hub-icon-180.png`,
    data: { url: data.url || '/?view=attention' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
