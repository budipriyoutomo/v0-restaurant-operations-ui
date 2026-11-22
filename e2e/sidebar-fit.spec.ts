// End-to-end: the sidebar fits a 900px-high laptop screen (Todo-Modern-UI Fase 2).
// Folded, every group header is on screen without scrolling the menu; the group
// holding the current page opens and still fits.
//
// Runs against the isolated stack in playwright.config.ts (fresh seeded DB).
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('sidebar groups fit a 900px screen', async ({ page }) => {
  await page.goto('/my-work')
  await page.getByLabel('Email').fill('admin@restaurant.com')
  await page.getByLabel('Password', { exact: true }).fill('admin123')
  await page.getByRole('button', { name: /^masuk$/i }).click()

  const nav = page.locator('aside').getByRole('navigation')
  const fits = () => nav.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)
  for (const group of ['Peralatan', 'Belanja', 'Tim & Kualitas', 'Analitik', 'Pengaturan']) {
    await expect(nav.getByRole('button', { name: group })).toBeInViewport()
  }
  expect(await fits()).toBe(true)

  // The biggest folded group, opened by its current page.
  await page.goto('/training')
  await expect(nav.getByRole('button', { name: 'Pelatihan' })).toHaveAttribute('aria-current', 'page')
  expect(await fits()).toBe(true)
})
