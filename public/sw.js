// Self-destructing Service Worker to break cache lock-in loops
self.addEventListener('install', () => {
  console.log('[Service Worker] Install: skipping waiting to self-destruct');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate: clearing all caches and unregistering');
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
      .then(() => {
        return self.registration.unregister();
      })
      .then(() => {
        console.log('[Service Worker] Unregistered and caches wiped successfully.');
      })
  );
});
