self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim())
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // Laisser passer les appels Supabase et API sans interception
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) return
  if (e.request.method !== 'GET') return

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
