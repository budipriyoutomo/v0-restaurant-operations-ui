// End-to-end: "Siap ditutup" (Todo-Pilot §18 / UX-5, Option A).
//
//   A Maintenance Issue with only a work order does not auto-resolve when the
//   WO is completed. It must show up as "Awaiting Close" on the dashboard (not
//   as open work), and the manager closes it from the filtered Issues list.
//
// Runs against the isolated stack in playwright.config.ts (fresh seeded DB).
import { expect, test, type APIRequestContext } from '@playwright/test'

const API = 'http://localhost:8001'
const ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }

async function apiToken(request: APIRequestContext) {
  const res = await request.post(`${API}/api/auth/login`, { data: ADMIN })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).access_token as string
}

test('finished work order → "Awaiting Close" on the dashboard → bulk close', async ({ page, request }) => {
  const auth = { Authorization: `Bearer ${await apiToken(request)}` }
  const title = `E2E siap ditutup ${Date.now()}`

  // Arrange: WO-only Maintenance Issue under the approval threshold, WO completed.
  const res = await request.post(`${API}/api/issues`, {
    headers: auth,
    data: {
      title, description: 'Lampu dapur mati', outlet: 'KL Central', category: 'Maintenance', priority: 'medium',
      generateTask: false, generateWorkOrder: true, estimatedCost: 100_000,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const issue = await res.json()
  for (const targetStatus of ['in-progress', 'completed']) {
    const t = await request.patch(`${API}/api/work-orders/${issue.workOrderId}/transition`, { headers: auth, data: { targetStatus } })
    expect(t.ok(), await t.text()).toBeTruthy()
  }
  const after = await (await request.get(`${API}/api/issues/${issue.id}`, { headers: auth })).json()
  expect(after.status).not.toBe('resolved')                       // no Task → no roll-up
  expect(after.readyToClose).toBe(true)

  // 1. Dashboard counts it as awaiting close and drills down to the list.
  await page.goto('/')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: /^masuk$/i }).click()
  await page.getByRole('button', { name: /menunggu ditutup/i }).click()
  await expect(page).toHaveURL(/\/issues\?ready=1$/)
  const card = page.getByText(title).locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
  await expect(card.getByText('Siap ditutup', { exact: true })).toBeVisible()

  // 2. Bulk close, after confirming.
  await page.getByRole('button', { name: /^Tutup semua \(\d+\)$/ }).click()
  const [closeRes] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/issues/bulk-close')),
    page.getByRole('button', { name: /^Ya, tutup \d+ laporan$/ }).click(),
  ])
  expect(closeRes.status()).toBe(200)
  await expect(page.getByText(title)).toBeHidden()                 // left the "ready" list

  const closed = await (await request.get(`${API}/api/issues/${issue.id}`, { headers: auth })).json()
  expect(closed.status).toBe('closed')
  expect(closed.readyToClose).toBe(false)
})
