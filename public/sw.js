// RestaurantOps service worker (Todo-PWA P1). Plain script, no library.
// Registered by components/shared/sw-register.tsx as /sw.js?v=<build id>, so
// every deploy installs a new worker with its own caches. Tested in
// lib/sw.test.ts.
//
//   page navigations    network first; the last good page is kept as the app
//                       shell (one catch-all route: the same HTML serves every
//                       URL) and served offline; else /offline.html
//   /_next/static, icons cache first (file names are hashed per build)
//   /api/*, other origins, non-GET, everything else
//                       not touched: tenant and per-user data is never cached
//
// A new build waits until the page asks it to take over (SKIP_WAITING) — the
// user chooses when to reload, never in the middle of a form.

var VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
var STATIC_CACHE = 'ro-static-' + VERSION
var PAGES_CACHE = 'ro-pages-' + VERSION
var SHELL = '/'
var OFFLINE = '/offline.html'
var ICON = /^\/(icon-[\w-]+\.png|apple-icon\.png|icon\.svg)$/
var SHELL_ASSET = /(?:src|href)="(\/_next\/static\/[^"]+)"/g

function strategyFor(url, request) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return 'network'
  if (url.pathname.startsWith('/api/')) return 'network'
  if (request.mode === 'navigate') return 'page'
  if (url.pathname.startsWith('/_next/static/') || ICON.test(url.pathname)) return 'static'
  return 'network'
}

function isPage(res) {
  return res.ok && (res.headers.get('content-type') || '').includes('text/html')
}

async function precache() {
  var statics = await caches.open(STATIC_CACHE)
  await statics.add(OFFLINE)
  // The shell and what it loads, so the very first offline start works even
  // though this page was loaded before the worker existed.
  try {
    var res = await fetch(SHELL, { cache: 'reload' })
    if (!isPage(res)) return
    var html = await res.clone().text()
    await (await caches.open(PAGES_CACHE)).put(SHELL, res)
    var assets = new Set(Array.from(html.matchAll(SHELL_ASSET), function (m) { return m[1] }))
    await Promise.all(Array.from(assets, function (a) { return statics.add(a).catch(function () {}) }))
  } catch (e) { /* offline during install: the offline page is enough */ }
}

async function pageFirst(request) {
  try {
    var res = await fetch(request)
    if (isPage(res)) {
      var copy = res.clone()
      caches.open(PAGES_CACHE).then(function (c) { return c.put(SHELL, copy) })
    }
    return res
  } catch (e) {
    var shell = await (await caches.open(PAGES_CACHE)).match(SHELL)
    return shell || (await caches.match(OFFLINE)) || Response.error()
  }
}

async function staticFirst(request) {
  var cache = await caches.open(STATIC_CACHE)
  var hit = await cache.match(request)
  if (hit) return hit
  var res = await fetch(request)
  if (res.ok) {
    var copy = res.clone()
    cache.put(request, copy)
  }
  return res
}

self.addEventListener('install', function (event) {
  event.waitUntil(precache())
})

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var keep = [STATIC_CACHE, PAGES_CACHE]
    var names = await caches.keys()
    await Promise.all(names
      .filter(function (n) { return n.startsWith('ro-') && keep.indexOf(n) < 0 })
      .map(function (n) { return caches.delete(n) }))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', function (event) {
  var request = event.request
  var strategy = strategyFor(new URL(request.url), request)
  if (strategy === 'page') event.respondWith(pageFirst(request))
  else if (strategy === 'static') event.respondWith(staticFirst(request))
})

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
