// Service Worker for Suimfx PWA
// Minimal implementation — required for install prompt eligibility.
// Strategy: network-first for API, cache-first for static assets.

const CACHE_NAME = 'suimfx-pwa-v2'
const STATIC_ASSETS = ['/suimfxLogo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never cache API calls, websockets, or non-GET
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/socket.io/')) return
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return

  // Network-first for HTML navigations and the PWA manifest so per-admin
  // branding (title/OG tags + install name/icon) always stays fresh and never
  // gets pinned to a stale "Suimfx" cache.
  if (request.mode === 'navigate' || url.pathname === '/manifest.json' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match(request).then((c) => c || caches.match('/index.html')))
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          // Only cache valid responses from same origin
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match('/index.html'))
    })
  )
})
