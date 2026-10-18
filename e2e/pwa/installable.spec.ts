// End-to-end: Chrome considers the production build installable (Todo-PWA,
// verifikasi akhir). Lighthouse 12 dropped its PWA category; these are the
// same checks DevTools → Application → Manifest shows, read over CDP.
// A persistent profile: Playwright's default context counts as incognito,
// where Chrome never offers to install.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium, expect, test } from '@playwright/test'

test('Chrome finds no installability or manifest errors', async ({ baseURL, channel }) => {
  const profile = mkdtempSync(path.join(tmpdir(), 'ro-pwa-'))
  const context = await chromium.launchPersistentContext(profile, { channel, baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)

    const cdp = await context.newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    expect(installabilityErrors).toEqual([])

    const manifest = await cdp.send('Page.getAppManifest')
    expect(manifest.url).toMatch(/\/manifest\.webmanifest$/)
    expect(manifest.errors).toEqual([])

    // Every icon and shortcut icon the manifest names is served as a PNG.
    const parsed = JSON.parse(manifest.data!)
    const icons = [...parsed.icons, ...parsed.shortcuts.flatMap((s: { icons: unknown[] }) => s.icons)]
    for (const { src } of icons as { src: string }[]) {
      const res = await page.request.get(src)
      expect(res.status(), src).toBe(200)
      expect(res.headers()['content-type'], src).toBe('image/png')
    }
  } finally {
    await context.close()
    rmSync(profile, { recursive: true, force: true })
  }
})
