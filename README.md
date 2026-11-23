# RestaurantOps — Frontend

Antarmuka web RestaurantOps: laporan (issue) → tugas → persetujuan → perintah
kerja, aset & perawatan, checklist harian & log suhu, pengadaan, QA, layanan
tamu, pelatihan, pemasaran, multi-outlet dan multi-perusahaan. Dipakai di
desktop (GM, admin) dan di HP (staf outlet, bisa dipasang sebagai PWA dan
bekerja offline).

Backend-nya FastAPI + PostgreSQL di repo terpisah. Semua data berasal dari API
backend; frontend ini tidak punya database sendiri.

## Stack

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Routing | Satu route catch-all `app/[[...slug]]/page.tsx`; path ↔ halaman di `lib/routes.ts` (`/issues/{id}` dst. bisa di-deep-link) |
| State | Zustand (`lib/store.ts`), data dari API lewat `lib/api-client.ts` |
| UI | Tailwind CSS v4 (token di `app/globals.css`), Radix UI, lucide-react, font Plus Jakarta Sans |
| Bahasa | Indonesia & Inggris (`lib/i18n/id.ts`, `en.ts`, hook `useT`) |
| HP & offline | Service worker `public/sw.js`, antrean offline `lib/offline-queue.ts` (pakai idempotency key yang sama dengan backend) |
| Tes | Vitest + Testing Library (unit & komponen), Playwright (e2e) |
| Error tracking | Sentry, opsional (`lib/error-tracking.ts`) |

## Struktur

```
app/                 layout, route catch-all, manifest PWA, globals.css (token desain)
components/
  pages/             satu file per halaman (issues-list-page, my-work-page, …)
  layout/            app shell, sidebar, top bar, navigasi bawah HP
  shared/            komponen bersama (StatusLabel, RecordId, Select, ServiceRail, skeleton, …)
  dialogs/, issues/, cmms/, ops/, …   komponen per modul
lib/                 logika tanpa UI + tesnya (*.test.ts): api-client, routes, tone, i18n, …
e2e/                 Playwright; e2e/pwa untuk build produksi
public/              ikon, sw.js, offline.html
```

Logika yang bisa diuji ditaruh di `lib/` sebagai fungsi murni, lalu dipakai
komponen. Warna status hanya lewat `lib/tone.ts` dan token; `lib/contrast.test.ts`
menolak warna Tailwind mentah dan memeriksa kontras terang/gelap.

## Menjalankan

Butuh Node 22+ dan backend yang jalan di `http://localhost:8000`.

```bash
npm ci
cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                          # http://localhost:3000
```

Dari folder induk yang berisi `backend/` dan `frontend/`, `make dev` menjalankan
keduanya sekaligus.

### Environment

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ya | URL backend tanpa garis miring di akhir; `https` di produksi |
| `NEXT_PUBLIC_SENTRY_DSN` | tidak | Error tracking browser; kosong = mati dan SDK tidak ikut diunduh |
| `NEXT_PUBLIC_SW` | tidak | `off` mematikan service worker di build produksi (debug); di `npm run dev` service worker memang tidak aktif |

Semua `NEXT_PUBLIC_*` ditanam saat build: ubah lalu build ulang.

## Tes & pemeriksaan

```bash
npx tsc --noEmit        # tipe
npm run lint            # ESLint (flat config, eslint.config.mjs)
npm test                # Vitest: unit (lib/) + komponen (jsdom)
npm run e2e             # Playwright, stack terisolasi :3001 / :8001, DB restaurantops_e2e
npm run e2e:pwa         # Playwright terhadap build produksi (service worker, offline)
```

`npm run e2e` menyalakan backend sendiri dari `../backend` (butuh venv dan
database `restaurantops_e2e`, URL bisa diganti dengan `E2E_DATABASE_URL`) dan
mereset database itu setiap kali jalan. Di Mac yang sedang sibuk, tes bisa
timeout; jalankan ulang spec yang gagal sendirian.

CI (`.github/workflows/ci.yml`) menjalankan tsc, lint, Vitest dan `next build`
di setiap PR; `main` hanya bisa di-merge bila CI hijau. Build gagal bila ada
error tipe.

## Deploy

Vercel atau Netlify, build `npm run build`. Isi `NEXT_PUBLIC_API_URL` (dan
opsional `NEXT_PUBLIC_SENTRY_DSN`) di dashboard, lalu tambahkan domain frontend
ke `CORS_ORIGINS` di backend. Langkah lengkap ada di `DEPLOY.md` repo backend
(bagian 2, Frontend on Vercel or Netlify).

## Kontribusi

- Satu perbaikan atau satu layar per PR, dengan pesan commit yang menjelaskan isinya.
- Teks yang berubah diperbarui di `lib/i18n/id.ts`, `en.ts` dan tesnya di PR yang sama.
- Logika baru ditulis dengan TDD: tes di `lib/*.test.ts` dulu.
