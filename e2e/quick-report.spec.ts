// End-to-end: quick report from a phone (Todo-Pilot §20 / UX-7).
//
//   A staff member taps "Lapor" in the bottom bar, types a title, picks a
//   category, takes a photo and sends. They see the issue number; the photo is
//   on the issue (EXIF stripped server-side) and there was no due date to fill.
//
// Runs against the isolated stack in playwright.config.ts (fresh seeded DB).
import { expect, test } from '@playwright/test'

const API = 'http://localhost:8001'
const STAFF = { email: 'staff@restaurant.com', password: 'staff123' }
const ADMIN = { email: 'admin@restaurant.com', password: 'admin123' }
// Seeded ids (backend/scripts/seed.py): the staff role starts with no outlet.
const STAFF_ID = '00000000-0000-0000-0000-000000000003'
const KL_CENTRAL_ID = '44444444-0000-0000-0000-000000000001'

// 1×1 PNG — a real image, so the server's Pillow check accepts it.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.use({ viewport: { width: 390, height: 844 } })

test('staff report a problem with a photo in a few taps', async ({ page, request }) => {
  const title = `E2E lapor cepat ${Date.now()}`
  const token = (await (await request.post(`${API}/api/auth/login`, { data: ADMIN })).json()).access_token
  const auth = { Authorization: `Bearer ${token}` }

  // Arrange: the staff member works at one outlet.
  const grant = await request.patch(`${API}/api/auth/users/${STAFF_ID}`, { headers: auth, data: { outlet_ids: [KL_CENTRAL_ID] } })
  expect(grant.ok(), await grant.text()).toBeTruthy()

  await page.goto('/')
  await page.getByLabel('Email').fill(STAFF.email)
  await page.getByLabel('Password', { exact: true }).fill(STAFF.password)
  await page.getByRole('button', { name: /^masuk$/i }).click()

  await page.getByRole('button', { name: 'Lapor', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Lapor Masalah' })
  await expect(dialog).toBeVisible()

  // Advanced options are not offered to staff.
  await expect(dialog.getByLabel(/^Tenggat/)).toHaveCount(0)
  await expect(dialog.getByText('Buat Perintah Kerja (CMMS)')).toHaveCount(0)
  await expect(dialog.getByText('KL Central', { exact: true })).toBeVisible()   // only outlet → preselected

  await dialog.getByLabel(/^Judul/).fill(title)
  await dialog.getByRole('radio', { name: 'Lainnya' }).check({ force: true })
  await dialog.getByLabel('Foto', { exact: true }).setInputFiles({ name: 'masalah.png', mimeType: 'image/png', buffer: PNG })

  const [created] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/issues') && r.request().method() === 'POST'),
    dialog.getByRole('button', { name: 'Kirim laporan' }).click(),
  ])
  expect(created.status(), await created.text()).toBe(201)
  const issue = await created.json()
  await expect(dialog.getByText(`Laporan ${issue.number} terkirim`)).toBeVisible()

  // The photo reached the issue.
  await expect.poll(async () => (await (await request.get(`${API}/api/issues/${issue.id}`, { headers: auth })).json()).photoCount)
    .toBe(1)
  const saved = await (await request.get(`${API}/api/issues/${issue.id}`, { headers: auth })).json()
  expect(saved).toMatchObject({ title, outlet: 'KL Central', category: 'Other', priority: 'medium', dueDate: null })

  // "Lapor lagi" starts over.
  await dialog.getByRole('button', { name: 'Lapor lagi' }).click()
  await expect(dialog.getByLabel(/^Judul/)).toHaveValue('')
})
