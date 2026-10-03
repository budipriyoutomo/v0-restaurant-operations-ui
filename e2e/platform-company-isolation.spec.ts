// End-to-end: onboarding a customer company and keeping it isolated (Todo-Pilot §11).
//
//   The platform admin creates a company (first outlet + first admin) → that
//   admin signs in and sees only their own, empty company — none of the
//   Default Company's issues or outlets → the platform admin deactivates the
//   company → its admin can no longer sign in.
//
// The platform admin is created by scripts.e2e_reset_db (E2E database only).
import { expect, test, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:8001'
const PLATFORM = { email: 'platform@e2e.test', password: 'platform-e2e-pass' }
const DEFAULT_ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }

async function openLogin(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage()
  await page.goto('/')
  return page
}

async function submitLogin(page: Page, who: { email: string; password: string }) {
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password', { exact: true }).fill(who.password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

test('platform admin onboards a company that sees only its own data, then deactivates it', async ({ browser, request }) => {
  const stamp = Date.now()
  const company = `PT E2E Kopi ${stamp}`
  const admin = { email: `kopi-${stamp}@e2e.test`, password: 'kopi-admin-pass1' }

  // Something that belongs to the Default Company and must stay invisible.
  const token = (await (await request.post(`${API}/api/auth/login`, { data: DEFAULT_ADMIN })).json()).access_token
  const defaultIssues = await (await request.get(`${API}/api/issues`, { headers: { Authorization: `Bearer ${token}` } })).json()
  expect(defaultIssues.length).toBeGreaterThan(0)
  const foreignTitle: string = defaultIssues[0].title

  // 1. Platform admin creates the company.
  const platform = await openLogin(browser)
  await submitLogin(platform, PLATFORM)
  await expect(platform.getByRole('heading', { name: 'Companies' })).toBeVisible()
  await expect(platform.getByRole('row', { name: /Default Company/ })).toBeVisible()
  await platform.getByRole('button', { name: /new company/i }).click()
  const dialog = platform.getByRole('dialog', { name: 'New company' })
  await dialog.getByLabel('Company name').fill(company)
  await dialog.getByLabel(/first outlet/i).fill('Kopi Senopati')
  await dialog.getByLabel('Admin name').fill('Sari')
  await dialog.getByLabel('Admin email').fill(admin.email)
  await dialog.getByLabel(/password/i).fill(admin.password)
  await dialog.getByRole('button', { name: 'Create company' }).click()
  await expect(platform.getByRole('status')).toContainText(admin.email)
  await platform.getByRole('button', { name: 'Done' }).click()
  const row = platform.getByRole('row', { name: new RegExp(company) })
  await expect(row).toContainText('Active')

  // 2. Its admin signs in to an empty company of their own.
  const tenant = await openLogin(browser)
  await submitLogin(tenant, admin)
  await tenant.getByRole('button', { name: /^Issues( \d+)?$/ }).click()
  await expect(tenant.getByRole('button', { name: 'New Issue' })).toBeVisible()
  await expect(tenant.getByText(foreignTitle)).toHaveCount(0)
  await tenant.getByRole('button', { name: 'New Issue' }).click()
  const outletOptions = await tenant.getByLabel('Outlet').locator('option').allTextContents()
  expect(outletOptions).toEqual(['Kopi Senopati'])

  // 3. Deactivated: the company's admin is locked out.
  await row.getByRole('button', { name: /deactivate/i }).click()
  await platform.getByRole('button', { name: /yes, deactivate/i }).click()
  await expect(row).toContainText('Inactive')

  const lockedOut = await openLogin(browser)
  await submitLogin(lockedOut, admin)
  await expect(lockedOut.getByText(/account is inactive/i)).toBeVisible()
})
