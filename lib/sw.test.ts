// Service worker (Todo-PWA P1). public/sw.js is a plain script, so it runs here
// in a vm context with a fake `self`, Cache Storage and fetch — the routing
// rules and the install / fetch / activate handlers are checked as the browser
// would drive them.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const SOURCE = readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8')
const ORIGIN = 'https://ops.example.com'
const SHELL_HTML = '<html><script src="/_next/static/chunks/main-abc.js"></script>' +
  '<link rel="stylesheet" href="/_next/static/css/app-def.css"></html>'

type Store = Map<string, Map<string, Response>>
const keyOf = (req: Request | string) => {
  const u = new URL(typeof req === 'string' ? req : req.url, ORIGIN)
  return u.pathname + u.search
}

function fakeCaches(store: Store) {
  const open = async (name: string) => {
    if (!store.has(name)) store.set(name, new Map())
    const c = store.get(name)!
    return {
      match: async (req: Request | string) => c.get(keyOf(req))?.clone(),
      put: async (req: Request | string, res: Response) => { c.set(keyOf(req), res) },
      add: async (req: Request | string) => {
        const res = await sandbox.fetch(req)
        if (!res.ok) throw new TypeError('bad status')
        c.set(keyOf(req), res)
      },
      addAll: async (reqs: string[]) => { for (const r of reqs) await (await open(name)).add(r) },
    }
  }
  let sandbox: { fetch: (r: Request | string) => Promise<Response> }
  return {
    bind(s: typeof sandbox) { sandbox = s },
    api: {
      open,
      keys: async () => [...store.keys()],
      delete: async (name: string) => store.delete(name),
      match: async (req: Request | string) => {
        for (const c of store.values()) { const hit = c.get(keyOf(req)); if (hit) return hit.clone() }
      },
    },
  }
}

/** Boot sw.js as registered with `?v=<version>`. `network` answers fetch(); null = offline. */
function bootSw(version = 'b1', store: Store = new Map()) {
  const listeners: Record<string, (e: any) => void> = {}
  const network = { fn: null as null | ((url: string) => Response) }
  const fetch = vi.fn(async (req: Request | string) => {
    if (!network.fn) throw new TypeError('Failed to fetch')
    return network.fn(new URL(typeof req === 'string' ? req : req.url, ORIGIN).pathname)
  })
  const caches = fakeCaches(store)
  const self = {
    location: new URL(`/sw.js?v=${version}`, ORIGIN),
    addEventListener: (type: string, fn: (e: any) => void) => { listeners[type] = fn },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  }
  const sandbox: Record<string, unknown> = { self, caches: caches.api, fetch, Request, Response, URL, Promise, console }
  caches.bind(sandbox as never)
  vm.runInNewContext(SOURCE, sandbox)

  async function dispatch(type: string, extra: Record<string, unknown> = {}) {
    let waited: Promise<unknown> | undefined
    let responded: Promise<Response> | undefined
    listeners[type]({
      ...extra,
      waitUntil: (p: Promise<unknown>) => { waited = p },
      respondWith: (p: Promise<Response>) => { responded = p },
    })
    await waited
    return responded
  }
  const request = (p: string, init: { mode?: string; method?: string } = {}) => {
    const r = new Request(new URL(p, ORIGIN), { method: init.method ?? 'GET' })
    Object.defineProperty(r, 'mode', { value: init.mode ?? 'cors' })
    return r
  }
  return {
    sandbox, self, fetch, store, network,
    strategyFor: sandbox.strategyFor as (url: URL, req: { mode: string; method: string }) => string,
    install: () => dispatch('install'),
    activate: () => dispatch('activate'),
    message: (data: unknown) => dispatch('message', { data }),
    fetchEvent: (p: string, init?: { mode?: string; method?: string }) => dispatch('fetch', { request: request(p, init) }),
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0))
const html = (body = SHELL_HTML) => new Response(body, { headers: { 'content-type': 'text/html' } })
const online = (sw: ReturnType<typeof bootSw>, pages: Record<string, () => Response> = {}) => {
  sw.network.fn = (p) => pages[p]?.() ?? (p === '/' || p === '/offline.html' ? html() : new Response(`asset ${p}`))
}

describe('strategyFor', () => {
  const sw = bootSw()
  const s = (p: string, init: { mode?: string; method?: string; origin?: string } = {}) =>
    sw.strategyFor(new URL(p, init.origin ?? ORIGIN), { mode: init.mode ?? 'cors', method: init.method ?? 'GET' })

  it('page navigations: network first, cached app shell as fallback', () => {
    expect(s('/', { mode: 'navigate' })).toBe('page')
    expect(s('/issues/42?tab=log', { mode: 'navigate' })).toBe('page')
  })

  it('hashed build assets and brand icons: cache first', () => {
    expect(s('/_next/static/chunks/main-abc.js')).toBe('static')
    expect(s('/_next/static/media/inter.woff2')).toBe('static')
    expect(s('/icon-192.png')).toBe('static')
    expect(s('/icon-maskable-512.png')).toBe('static')
    expect(s('/apple-icon.png?apple-icon.0s0wro.png')).toBe('static')
    expect(s('/icon.svg?icon.0ww7n.svg')).toBe('static')
  })

  it('never touches API data, other origins, writes or the version probe', () => {
    expect(s('/api/issues')).toBe('network')
    expect(s('/api/auth/me', { mode: 'navigate' })).toBe('network')
    expect(s('https://api.example.com/api/issues', { origin: 'https://api.example.com' })).toBe('network')
    expect(s('https://api.example.com/', { mode: 'navigate', origin: 'https://api.example.com' })).toBe('network')
    expect(s('/_next/static/chunks/x.js', { method: 'POST' })).toBe('network')
    expect(s('/version.json')).toBe('network')
    expect(s('/manifest.webmanifest')).toBe('network')
    expect(s('/sw.js')).toBe('network')
  })
})

describe('install', () => {
  it('precaches the offline page, the app shell and the assets the shell loads', async () => {
    const sw = bootSw('b1')
    online(sw)
    await sw.install()
    expect([...sw.store.get('ro-static-b1')!.keys()].sort()).toEqual(
      ['/_next/static/chunks/main-abc.js', '/_next/static/css/app-def.css', '/offline.html'])
    expect([...sw.store.get('ro-pages-b1')!.keys()]).toEqual(['/'])
    expect(sw.self.skipWaiting).not.toHaveBeenCalled()      // an update waits for the user's "Reload"
  })

  it('still installs when the shell cannot be fetched (offline page only)', async () => {
    const sw = bootSw('b1')
    online(sw, { '/': () => new Response('down', { status: 503 }) })
    await sw.install()
    expect([...sw.store.get('ro-static-b1')!.keys()]).toEqual(['/offline.html'])
  })
})

describe('fetch', () => {
  it('leaves API calls alone (no respondWith)', async () => {
    const sw = bootSw()
    online(sw)
    expect(await sw.fetchEvent('/api/issues')).toBeUndefined()
    expect(await sw.fetchEvent('/api/issues', { method: 'POST' })).toBeUndefined()
  })

  it('navigation online: the network page, kept as the app shell', async () => {
    const sw = bootSw('b1')
    online(sw, { '/issues/42': () => html('<html>fresh</html>') })
    const res = await sw.fetchEvent('/issues/42', { mode: 'navigate' })
    expect(await res!.text()).toBe('<html>fresh</html>')
    await tick()                                            // the shell is written without delaying the page
    expect(await sw.store.get('ro-pages-b1')!.get('/')!.text()).toBe('<html>fresh</html>')
  })

  it('an error page is not kept as the app shell', async () => {
    const sw = bootSw('b1')
    online(sw)
    await sw.install()
    sw.network.fn = () => new Response('oops', { status: 500, headers: { 'content-type': 'text/html' } })
    const res = await sw.fetchEvent('/issues/42', { mode: 'navigate' })
    expect(res!.status).toBe(500)
    await tick()
    expect(await sw.store.get('ro-pages-b1')!.get('/')!.text()).toBe(SHELL_HTML)
  })

  it('navigation offline: the cached app shell for any route', async () => {
    const sw = bootSw('b1')
    online(sw)
    await sw.install()
    sw.network.fn = null
    const res = await sw.fetchEvent('/approvals/7', { mode: 'navigate' })
    expect(await res!.text()).toBe(SHELL_HTML)
  })

  it('navigation offline without a shell (logged out): the offline page', async () => {
    const sw = bootSw('b1')
    online(sw, { '/offline.html': () => html('<p>offline</p>') })
    await sw.install()
    sw.store.delete('ro-pages-b1')
    sw.network.fn = null
    const res = await sw.fetchEvent('/my-work', { mode: 'navigate' })
    expect(await res!.text()).toBe('<p>offline</p>')
  })

  it('static assets: cache first, fetched and stored once', async () => {
    const sw = bootSw('b1')
    online(sw)
    const first = await sw.fetchEvent('/_next/static/chunks/page-1.js')
    expect(await first!.text()).toBe('asset /_next/static/chunks/page-1.js')
    await tick()
    sw.network.fn = null
    const again = await sw.fetchEvent('/_next/static/chunks/page-1.js')
    expect(await again!.text()).toBe('asset /_next/static/chunks/page-1.js')
    expect(sw.fetch).toHaveBeenCalledTimes(1)
  })
})

describe('activate', () => {
  it('drops caches of other builds, keeps this build and foreign caches, takes control', async () => {
    const store: Store = new Map([
      ['ro-static-old', new Map()], ['ro-pages-old', new Map()],
      ['ro-static-b2', new Map()], ['ro-pages-b2', new Map()], ['someone-else', new Map()],
    ])
    const sw = bootSw('b2', store)
    await sw.activate()
    expect([...store.keys()].sort()).toEqual(['ro-pages-b2', 'ro-static-b2', 'someone-else'])
    expect(sw.self.clients.claim).toHaveBeenCalled()
  })
})

describe('message', () => {
  it('SKIP_WAITING activates the waiting update', async () => {
    const sw = bootSw()
    await sw.message({ type: 'SKIP_WAITING' })
    expect(sw.self.skipWaiting).toHaveBeenCalled()
  })
})
