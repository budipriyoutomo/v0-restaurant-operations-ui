// End-to-end: the app keeps opening without a signal (Todo-PWA P1).
//
//   Signed in once online, the service worker is registered and controls the
//   page. With the network gone, a reload — and a route never opened before —
//   still shows the app frame, signed in, with the offline bar. No API answer
//   is ever stored. Logging out drops the cached pages.
//
// Needs a production build (the worker is not registered under `next dev`):
//   npm run e2e:pwa   (playwright.config.ts with E2E_PROD=1)
import { expect, test, type Page } from '@playwright/test'

const ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }

test.use({ viewport: { width: 390, height: 844 } })

async function signIn(page: Page) {
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: /^masuk$/i }).click()
}

const cacheNames = (page: Page) => page.evaluate(() => caches.keys())
const cachedUrls = (page: Page) => page.evaluate(async () => {
  const urls: string[] = []
  for (const name of await caches.keys()) {
    for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname)
  }
  return urls
})

test('installed app opens offline: shell, session and offline bar; logout drops cached pages', async ({ page, context }) => {
  await page.goto('/')
  await signIn(page)
  await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible()

  // The worker of this build controls the page.
  const scriptURL = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL)
  expect(scriptURL).toMatch(/\/sw\.js\?v=\w+/)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  // Online visit: network first, the page is kept as the app shell.
  const shell = await (await page.goto('/issues'))!.text()
  await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible()
  await expect.poll(() => page.evaluate(async () => {
    const name = (await caches.keys()).find((n) => n.startsWith('ro-pages-'))
    return name ? (await (await caches.open(name)).match('/'))?.text() : undefined
  })).toBe(shell)                                   // written after the response, so wait for it

  // Offline: reload and a route never opened both come from the worker.
  await context.setOffline(true)
  const reload = await page.reload()
  expect(reload?.fromServiceWorker()).toBe(true)
  await expect(page.getByText('Mode offline —')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible()     // still signed in
  await expect(page.getByLabel('Email')).toHaveCount(0)

  // Proof it is the cache, not a network the emulation let through: online,
  // /approvals and /issues get different HTML.
  const approvals = await page.goto('/approvals')
  expect(await approvals!.text()).toBe(shell)
  await expect(page.getByText('Mode offline —')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible()

  // Tenant data is never stored by the worker.
  expect((await cachedUrls(page)).filter((u) => u.startsWith('/api/'))).toEqual([])

  // Back online, then logout: cached pages go, static assets stay.
  await context.setOffline(false)
  await page.goto('/my-work')
  await page.getByRole('button', { name: 'Profil' }).click()
  await page.getByRole('menuitem', { name: 'Keluar' }).click()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect.poll(async () => (await cacheNames(page)).filter((n) => n.startsWith('ro-pages-'))).toEqual([])
  expect((await cacheNames(page)).some((n) => n.startsWith('ro-static-'))).toBe(true)
})
