// Kill switch: this service worker immediately unregisters itself
// and clears all caches left by the old SPA (pre-Astro migration).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.navigate(c.url));
  await self.registration.unregister();
});
