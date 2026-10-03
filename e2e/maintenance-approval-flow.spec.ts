// End-to-end: the Issue Core happy path across three modules (Todo-Pilot §12).
//
//   Manager reports a Maintenance Issue with a work order estimated above
//   Rp 1.000.000 → a 2-step approval is created (manager → admin) and the WO
//   waits on-hold → manager approves step 1 → admin approves step 2 → the WO
//   starts → manager completes it → the Issue rolls up to Resolved → manager
//   closes it.
//
// Runs against the isolated stack in playwright.config.ts (fresh seeded DB).
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:8001'
const OUTLET = { id: '44444444-0000-0000-0000-000000000001', name: 'KL Central' }
const MANAGER = { id: '00000000-0000-0000-0000-000000000002', email: 'manager@restaurant.com', password: 'manager123' }
const ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }

async function apiToken(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).access_token as string
}

async function signIn(browser: Browser, who: { email: string; password: string }): Promise<Page> {
  const page = await (await browser.newContext()).newPage()
  await page.goto('/')
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password', { exact: true }).fill(who.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(menuItem(page, 'Issues')).toBeVisible()
  return page
}

// Sidebar entries; the accessible name carries the badge count ("Issues 6").
const menuItem = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}( \\d+)?$`) })

async function goTo(page: Page, menu: string) {
  await menuItem(page, menu).click()
}

test('maintenance issue > Rp 1 juta: 2-step approval → work order completed → issue closed', async ({ browser, request }) => {
  const title = `E2E kompor bocor gas ${Date.now()}`

  // Arrange: a fresh DB gives managers no outlets (migration 031) — grant one.
  const adminToken = await apiToken(request, ADMIN.email, ADMIN.password)
  const auth = { Authorization: `Bearer ${adminToken}` }
  const grant = await request.patch(`${API}/api/auth/users/${MANAGER.id}`, { headers: auth, data: { outlet_ids: [OUTLET.id] } })
  expect(grant.ok(), await grant.text()).toBeTruthy()

  // 1. Manager reports the issue.
  const manager = await signIn(browser, MANAGER)
  await goTo(manager, 'Issues')
  await manager.getByRole('button', { name: 'New Issue' }).click()
  const dialog = manager.locator('form').filter({ has: manager.getByRole('button', { name: 'Create Issue' }) })
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByLabel('Description').fill('Bau gas di dapur utama, kompor harus diganti selangnya')
  await dialog.getByLabel('Outlet').selectOption(OUTLET.name)
  await dialog.getByLabel('Category').selectOption('Maintenance')
  await dialog.getByLabel('Due Date').fill('2026-12-31')
  await dialog.getByLabel(/create task/i).uncheck()
  await dialog.getByLabel(/create work order/i).check()
  await dialog.getByLabel(/^estimated cost/i).fill('2500000')
  await expect(dialog.getByText(/above rp 1\.000\.000 — 2-step approval/i)).toBeVisible()
  await dialog.getByRole('button', { name: 'Create Issue' }).click()
  await expect(dialog).toBeHidden()
  await expect(manager.getByText(title).first()).toBeVisible()

  // 2. Manager approves step 1.
  await goTo(manager, 'Approvals')
  await manager.getByText(title).first().click()
  await expect(manager.getByText(/your turn — step 1 \(manager\)/i)).toBeVisible()
  await manager.getByRole('button', { name: 'Approve Step 1' }).click()
  await expect(manager.getByText(/waiting for admin approval/i)).toBeVisible()

  // 3. Admin approves step 2 (final).
  const admin = await signIn(browser, ADMIN)
  await goTo(admin, 'Approvals')
  await admin.getByText(title).first().click()
  await expect(admin.getByText(/your turn — step 2 \(admin\)/i)).toBeVisible()
  await admin.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(admin.getByRole('button', { name: 'Approve', exact: true })).toBeHidden()

  // 4. Manager completes the work order, which approval moved to in-progress.
  await manager.reload()
  await goTo(manager, 'CMMS')
  await manager.getByText(title).first().click()
  await manager.getByRole('button', { name: 'Mark Completed' }).click()
  await expect(manager.getByRole('button', { name: 'Mark Completed' })).toBeHidden()
  await expect(manager.getByText('Completed').first()).toBeVisible()
  await manager.mouse.click(400, 300)                              // click the dimmed backdrop to close the drawer

  // 5. Every derived record is finished. With no Task the Issue does not
  //    auto-resolve (roll-up needs ≥1 Task, Todo-Next §2.1) — the manager closes it.
  await goTo(manager, 'Issues')
  await manager.getByText(title).first().click()
  const linked = manager.getByText('Linked Records').locator('..')
  await expect(linked.getByText('approved')).toBeVisible()
  await expect(linked.getByText('Completed')).toBeVisible()           // the WO is listed too
  await expect(manager.getByText(/cannot be closed|must be finished first/i)).toHaveCount(0)
  const statusMenu = manager.getByText('Update Status').locator('..')
  await statusMenu.getByRole('button').first().click()
  // The status change is optimistic — wait for the server to accept it.
  const [closeRes] = await Promise.all([
    manager.waitForResponse((r) => r.request().method() === 'PATCH' && /\/api\/issues\/[^/]+$/.test(r.url())),
    statusMenu.getByRole('button', { name: 'Closed' }).click(),
  ])
  expect(closeRes.status(), await closeRes.text()).toBe(200)
  await expect(manager.getByText('Update Status')).toBeHidden()      // closed is final: no status menu

  // Assert the server state, not only the screen.
  const issues = await (await request.get(`${API}/api/issues`, { headers: auth })).json()
  const issue = issues.find((i: { title: string }) => i.title === title)
  expect(issue.status).toBe('closed')
  expect(issue.closureBlockers).toEqual([])
  const approvalRes = await request.get(`${API}/api/approvals/${issue.approvalId}`, { headers: auth })
  const approval = await approvalRes.json()
  expect(approval.status).toBe('approved')
  expect(approval.steps.map((s: { approverRole: string; status: string }) => `${s.approverRole}:${s.status}`))
    .toEqual(['manager:approved', 'admin:approved'])
  const wo = await (await request.get(`${API}/api/work-orders/${issue.workOrderId}`, { headers: auth })).json()
  expect(wo.status).toBe('completed')
  expect(wo.requiresApproval).toBe(true)
})
