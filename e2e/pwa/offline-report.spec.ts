// End-to-end: report a problem with no signal (Todo-PWA, verifikasi akhir).
//
//   Signal lost while the app is open: the staff member reports with a photo,
//   is told it is saved on the device; back online, the issue reaches the
//   server once, with its photo. App opened with no signal at all: "Lapor"
//   still opens the form (outlet and categories kept on the device) and the
//   report is sent when the signal returns.
//
// Production build only (service worker): npm run e2e:pwa
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = 'http://localhost:8001'
const STAFF = { email: 'staff@restaurant.com', password: 'staff123' }
const ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }
// Seeded ids (backend/scripts/seed.py): the staff role starts with no outlet.
const STAFF_ID = '00000000-0000-0000-0000-000000000003'
const KL_CENTRAL_ID = '44444444-0000-0000-0000-000000000001'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.use({ viewport: { width: 390, height: 844 } })

async function adminAuth(request: APIRequestContext) {
  const token = (await (await request.post(`${API}/api/auth/login`, { data: ADMIN })).json()).access_token
  return { Authorization: `Bearer ${token}` }
}

async function issuesTitled(request: APIRequestContext, auth: Record<string, string>, title: string) {
  const res = await request.get(`${API}/api/issues?q=${encodeURIComponent(title)}`, { headers: auth })
  return ((await res.json()) as { id: string; title: string }[]).filter((i) => i.title === title)
}

async function report(page: Page, title: string, photo: boolean) {
  const dialog = page.getByRole('dialog', { name: 'Lapor Masalah' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('KL Central', { exact: true })).toBeVisible()
  await dialog.getByLabel(/^Judul/).fill(title)
  await dialog.getByRole('radiogroup').getByText('Lainnya', { exact: true }).click()
  if (photo) await dialog.getByLabel('Foto', { exact: true }).setInputFiles({ name: 'bocor.png', mimeType: 'image/png', buffer: PNG })
  await dialog.getByRole('button', { name: 'Kirim laporan' }).click()
  await expect(dialog.getByText('Tersimpan di perangkat ini')).toBeVisible()
  await expect(dialog.getByText(/failed to fetch/i)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Selesai' }).click()
}

test('report with no signal: saved on the device, sent once with its photo when back online', async ({ page, context, request }) => {
  const auth = await adminAuth(request)
  const grant = await request.patch(`${API}/api/auth/users/${STAFF_ID}`, { headers: auth, data: { outlet_ids: [KL_CENTRAL_ID] } })
  expect(grant.ok(), await grant.text()).toBeTruthy()

  await page.goto('/')
  await page.getByLabel('Email').fill(STAFF.email)
  await page.getByLabel('Password', { exact: true }).fill(STAFF.password)
  await page.getByRole('button', { name: /^masuk$/i }).click()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await expect(page.getByRole('button', { name: 'Lapor', exact: true })).toBeVisible()
  await page.waitForFunction(() => localStorage.getItem('ro.masterData'))   // outlets and categories kept on the device

  // 1. Signal lost while the app is open.
  const warm = `E2E offline lapor ${Date.now()}`
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Lapor', exact: true }).click()
  await report(page, warm, true)
  await expect(page.getByText('2 aksi menunggu sinkron')).toBeVisible()      // the report and its photo

  await context.setOffline(false)
  await expect.poll(async () => (await issuesTitled(request, auth, warm)).length, { timeout: 30_000 }).toBe(1)
  const [sent] = await issuesTitled(request, auth, warm)
  await expect.poll(async () => (await (await request.get(`${API}/api/issues/${sent.id}`, { headers: auth })).json()).photoCount)
    .toBe(1)
  await expect(page.getByText(/aksi menunggu sinkron/)).toHaveCount(0)

  // 2. App opened with no signal at all.
  const cold = `E2E offline buka ${Date.now()}`
  await context.setOffline(true)
  await page.goto('/my-work')
  await expect(page.getByText('Menunggu sinyal')).toBeVisible()
  await page.getByRole('button', { name: 'Lapor', exact: true }).click()
  await report(page, cold, false)

  await context.setOffline(false)
  await expect.poll(async () => (await issuesTitled(request, auth, cold)).length, { timeout: 30_000 }).toBe(1)
})
