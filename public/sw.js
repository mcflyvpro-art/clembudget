/*
 * Service worker « Mon Budget »
 *
 * Objectif : que l'app installée démarre instantanément, comme une app
 * native, au lieu de retélécharger tout le JS/CSS à chaque ouverture — et
 * qu'elle affiche un écran propre hors ligne au lieu de l'erreur Safari.
 *
 * Règles :
 *   • les assets figés (_next/static, images, polices, splash) → cache d'abord
 *   • les pages HTML → réseau d'abord, écran hors ligne en secours
 *   • Supabase, /api/ et les requêtes RSC → jamais interceptés
 */

const VERSION = 'budget-v2'
const ASSET_CACHE = `${VERSION}-assets`
const SHELL_CACHE = `${VERSION}-shell`
const OFFLINE_URL = '/offline.html'

const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => {}) // un asset manquant ne doit pas bloquer l'installation
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Purge des caches des versions précédentes
      const keys = await caches.keys()
      await Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      )
      // Laisse le navigateur lancer la requête réseau en parallèle du SW
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => {})
      }
      await self.clients.claim()
    })()
  )
})

/** Ressource figée et versionnée → on peut la servir depuis le cache. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/splash/') ||
    url.pathname.startsWith('/pictures/') ||
    /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Hors de notre origine (Supabase, Google Fonts…) : on laisse passer
  if (url.origin !== self.location.origin) return
  // API, auth et payloads React Server Components : jamais de cache
  if (url.pathname.startsWith('/api/')) return
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return

  /* ── Pages : réseau d'abord, écran hors ligne en secours ─────────── */
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse
          if (preloaded) return preloaded
          return await fetch(request)
        } catch {
          const cache = await caches.open(SHELL_CACHE)
          return (
            (await cache.match(OFFLINE_URL)) ||
            new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          )
        }
      })()
    )
    return
  }

  /* ── Assets figés : cache d'abord (démarrage instantané) ─────────── */
  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE)
        const hit = await cache.match(request)
        if (hit) return hit
        try {
          const res = await fetch(request)
          if (res.ok && res.status === 200) cache.put(request, res.clone())
          return res
        } catch {
          return hit || Response.error()
        }
      })()
    )
    return
  }

  /* ── Le reste : réseau, cache en secours ─────────────────────────── */
  event.respondWith(
    fetch(request).catch(async () => {
      const hit = await caches.match(request)
      return hit || Response.error()
    })
  )
})

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  // Appelé à la déconnexion : on ne garde rien de la session précédente
  if (event.data === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))))
  }
})
