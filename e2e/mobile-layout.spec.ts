// End-to-end: phone layout (Todo-Pilot §15 / UX-2).
//
//   Staff and technicians work from mid-range Android phones (~360px wide).
//   The page must not scroll sideways, the menu must not eat the screen, detail
//   drawers fill the screen, and the main action is a ≥44px target that stays
//   on screen while the drawer scrolls.
//
// Runs against the isolated stack in playwright.config.ts (fresh seeded DB).
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'

const API = 'http://localhost:8001'
const ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }
const MANAGER = { id: '00000000-0000-0000-0000-000000000002', email: 'manager@restaurant.com', password: 'manager123' }
const OUTLET_ID = '44444444-0000-0000-0000-000000000001'   // KL Central
const PHONE = { width: 360, height: 740 }
const SHOTS = 'test-results/mobile'

test.use({ viewport: PHONE, hasTouch: true, isMobile: true })

async function apiToken(request: APIRequestContext, who: { email: string; password: string } = ADMIN) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email: who.email, password: who.password } })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).access_token as string
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

async function expectTouchTargetOnScreen(button: Locator) {
  const box = await button.boundingBox()
  expect(box, 'button is rendered').not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height)   // visible without scrolling
  expect(box!.y).toBeGreaterThanOrEqual(0)
}

test('phone: menu, list, drawers and main actions fit a 360px screen', async ({ page, request }) => {
  const auth = { Authorization: `Bearer ${await apiToken(request)}` }
  const res = await request.post(`${API}/api/issues`, {
    headers: auth,
    data: {
      title: `E2E HP ${Date.now()}`, description: 'Kompor tidak menyala sama sekali sejak pagi', outlet: 'KL Central',
      category: 'Maintenance', priority: 'high', generateTask: false, generateWorkOrder: true, estimatedCost: 2_500_000,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const issue = await res.json()
  const approval = await (await request.get(`${API}/api/approvals/${issue.approvalId}`, { headers: auth })).json()

  await page.goto('/issues')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: /^masuk$/i }).click()

  // 1. The list owns the screen: the menu is behind a button.
  await expect(page.locator('main').getByRole('heading', { name: 'Laporan', level: 1 })).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/1-issues.png`, fullPage: false })
  await expectNoSidewaysScroll(page)
  const main = await page.locator('main').boundingBox()
  expect(main!.width).toBeGreaterThanOrEqual(PHONE.width - 1)
  await expectTouchTargetOnScreen(page.getByRole('button', { name: 'Laporan Baru' }))

  // 1b. Bottom navigation (Todo-Pilot §19): "Lapor" opens the report form from
  //     anywhere; "Pekerjaan" opens My Work. Both thumb-sized.
  const bottom = page.getByRole('navigation', { name: 'Navigasi utama' })
  await expectTouchTargetOnScreen(bottom.getByRole('button', { name: 'Lapor' }))
  await bottom.getByRole('button', { name: 'Lapor' }).click()
  await expect(page.getByRole('heading', { name: 'Laporan Baru', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Tutup' }).first().click()
  await bottom.getByRole('button', { name: 'Pekerjaan' }).click()
  await expect(page).toHaveURL(/\/my-work$/)
  await expect(page.locator('main').getByRole('heading', { name: 'Pekerjaan Saya', level: 1 })).toBeVisible()
  await expectNoSidewaysScroll(page)
  await page.goto('/issues')

  // 2. The menu opens over the page and navigates.
  await page.getByRole('button', { name: 'Buka menu' }).click()
  const nav = page.locator('aside').getByRole('navigation')   // the sidebar's menu, not the bottom navigation
  await expect(nav).toBeInViewport({ ratio: 1 })
  await page.waitForTimeout(350)                                   // let the slide-in finish for the screenshot
  await page.screenshot({ path: `${SHOTS}/2-menu.png` })
  await page.getByRole('button', { name: /^Persetujuan( \d+)?$/ }).click()
  await expect(page).toHaveURL(/\/approvals$/)
  await expect(page.getByRole('button', { name: /^Persetujuan( \d+)?$/ })).toBeHidden()   // menu closed again

  // 3. Approval drawer fills the screen; the decision stays reachable.
  await page.goto(`/approvals/${issue.approvalId}`)
  const drawer = page.getByRole('dialog', { name: `Persetujuan ${approval.number}` })
  await expect(drawer).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/3-approval.png` })
  expect((await drawer.boundingBox())!.width).toBeGreaterThanOrEqual(PHONE.width - 1)
  await expectNoSidewaysScroll(page)

  // 3b. After the manager's step 1, the admin decides step 2: the Approve
  //     button is a thumb-sized target on screen without scrolling.
  const grant = await request.patch(`${API}/api/auth/users/${MANAGER.id}`, { headers: auth, data: { outlet_ids: [OUTLET_ID] } })
  expect(grant.ok(), await grant.text()).toBeTruthy()
  const managerAuth = { Authorization: `Bearer ${await apiToken(request, MANAGER)}` }
  const step1 = await request.patch(`${API}/api/approvals/${issue.approvalId}/decide`, { headers: managerAuth, data: { decision: 'approved' } })
  expect(step1.ok(), await step1.text()).toBeTruthy()
  await page.reload()
  await expect(drawer.getByText(/giliran anda — langkah 2/i)).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/3b-approval-decide.png` })
  await expectTouchTargetOnScreen(drawer.getByRole('button', { name: 'Setujui', exact: true }))
  await expectTouchTargetOnScreen(drawer.getByRole('button', { name: 'Tolak', exact: true }))

  // 4. Work order drawer: "Waiting for Approval" bar sits at the bottom of the screen.
  await page.goto(`/work-orders/${issue.workOrderId}`)
  const woDrawer = page.getByRole('dialog', { name: /^Perintah Kerja WO-/ })
  await expect(woDrawer).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/4-work-order.png` })
  expect((await woDrawer.boundingBox())!.width).toBeGreaterThanOrEqual(PHONE.width - 1)
  await expectTouchTargetOnScreen(woDrawer.getByRole('button', { name: 'Menunggu Persetujuan' }))

  // 5. Issue drawer fills the screen.
  await page.goto(`/issues/${issue.id}`)
  const issueDrawer = page.getByRole('dialog', { name: `Laporan ${issue.number}` })
  await expect(issueDrawer).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/5-issue.png` })
  expect((await issueDrawer.boundingBox())!.width).toBeGreaterThanOrEqual(PHONE.width - 1)
  await expectNoSidewaysScroll(page)
})
