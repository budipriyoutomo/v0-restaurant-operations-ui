// End-to-end: every record has a URL (Todo-Pilot §14 / UX-1).
//
//   A WhatsApp/email link to /approvals/{id} opened while signed out lands on
//   that approval after sign-in; refresh and Back keep the user in place;
//   /work-orders/{id} and /issues/{id} open their drawers; a link to a record
//   the user can't see shows "not found".
//
// Runs against the isolated stack in playwright.config.ts (fresh seeded DB).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = 'http://localhost:8001'
const OUTLET = 'KL Central'
const ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }

async function apiToken(request: APIRequestContext) {
  const res = await request.post(`${API}/api/auth/login`, { data: ADMIN })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).access_token as string
}

async function signIn(page: Page) {
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: /^masuk$/i }).click()
}

test('deep links open the record, survive sign-in, refresh and Back', async ({ page, request }) => {
  // Arrange: a maintenance issue whose work order needs a 2-step approval.
  const auth = { Authorization: `Bearer ${await apiToken(request)}` }
  const res = await request.post(`${API}/api/issues`, {
    headers: auth,
    data: {
      title: `E2E deep link ${Date.now()}`, description: 'Freezer tidak dingin', outlet: OUTLET,
      category: 'Maintenance', priority: 'high', generateTask: false,
      generateWorkOrder: true, estimatedCost: 2_500_000,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const issue = await res.json()
  expect(issue.approvalId).toBeTruthy()
  expect(issue.workOrderId).toBeTruthy()
  const approval = await (await request.get(`${API}/api/approvals/${issue.approvalId}`, { headers: auth })).json()
  const wo = await (await request.get(`${API}/api/work-orders/${issue.workOrderId}`, { headers: auth })).json()

  // 1. The link from a notification, opened while signed out.
  await page.goto(`/approvals/${issue.approvalId}`)
  await signIn(page)
  const approvalDrawer = page.getByRole('dialog', { name: `Persetujuan ${approval.number}` })
  await expect(approvalDrawer).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/approvals/${issue.approvalId}$`))

  // 2. Refresh keeps the record open.
  await page.reload()
  await expect(approvalDrawer).toBeVisible()

  // 3. Close → the list; Back → the record again.
  await approvalDrawer.getByRole('button', { name: 'Tutup' }).click()
  await expect(page).toHaveURL(/\/approvals$/)
  await expect(approvalDrawer).toBeHidden()
  await page.goBack()
  await expect(approvalDrawer).toBeVisible()

  // 4. Work order link opens the CMMS drawer.
  await page.goto(`/work-orders/${issue.workOrderId}`)
  await expect(page.getByRole('dialog', { name: `Perintah Kerja ${wo.number}` })).toBeVisible()

  // 5. Issue link, then its linked approval.
  await page.goto(`/issues/${issue.id}`)
  const issueDrawer = page.getByRole('dialog', { name: `Laporan ${issue.number}` })
  await expect(issueDrawer).toBeVisible()
  await issueDrawer.getByRole('button', { name: new RegExp(approval.number) }).click()
  await expect(page).toHaveURL(new RegExp(`/approvals/${issue.approvalId}$`))
  await expect(approvalDrawer).toBeVisible()

  // 6. Sidebar navigation changes the URL; Back walks the same way back.
  await approvalDrawer.getByRole('button', { name: 'Tutup' }).click()
  await page.getByRole('button', { name: /^Laporan( \d+)?$/ }).click()
  await expect(page).toHaveURL(/\/issues$/)
  await expect(page.getByRole('heading', { name: 'Laporan', level: 1 }).first()).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/approvals$/)
  await page.goBack()
  await expect(approvalDrawer).toBeVisible()

  // 7. Unknown / inaccessible records and pages. (Filtered by text: Next's
  //    route announcer is an alert too.)
  await page.goto('/issues/00000000-0000-0000-0000-000000000000')
  await expect(page.getByRole('alert').filter({ hasText: 'Laporan tidak ditemukan' })).toBeVisible()
  await page.goto('/work-orders/00000000-0000-0000-0000-000000000000')
  await expect(page.getByRole('alert').filter({ hasText: 'Perintah kerja tidak ditemukan' })).toBeVisible()
  await page.goto('/no-such-page')
  await expect(page.getByRole('alert').filter({ hasText: 'Halaman tidak ditemukan' })).toBeVisible()
})
