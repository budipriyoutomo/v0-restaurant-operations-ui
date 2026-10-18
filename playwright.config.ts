import { defineConfig } from '@playwright/test'

// End-to-end tests (Todo-Pilot §12). Runs against its own stack so it never
// touches the dev database or the dev servers on :3000 / :8000:
//   backend  :8001 — DB restaurantops_e2e, rebuilt by scripts.e2e_reset_db
//                     (alembic upgrade head + seed) on every run
//   frontend :3001 — next dev with a separate distDir (.next-e2e)
// `npm run e2e`. On macOS 13 Playwright's bundled Chromium is unsupported, so
// the installed Google Chrome is used there (override with PLAYWRIGHT_CHANNEL).
const API_PORT = 8001
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3001)   // override when :3001 is taken
const DB_URL = process.env.E2E_DATABASE_URL ?? 'postgresql+psycopg://postgres:@localhost:5432/restaurantops_e2e'
// E2E_PROD=1 (`npm run e2e:pwa`): the same stack, but the frontend is a
// production build — the service worker only registers there (Todo-PWA P1).
const PROD = process.env.E2E_PROD === '1'
const channel = process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'darwin' ? 'chrome' : undefined)

export default defineConfig({
  testDir: PROD ? './e2e/pwa' : './e2e',
  testIgnore: PROD ? undefined : '**/pwa/**',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,                       // one shared database
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `venv/bin/python -m scripts.e2e_reset_db && venv/bin/python -m uvicorn app.main:app --port ${API_PORT}`,
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: DB_URL,
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
        APP_URL: `http://localhost:${WEB_PORT}`,
        RATE_LIMIT_DEFAULT: '1000/minute',
        RATE_LIMIT_WRITE: '1000/minute',
        EMAIL_BACKEND: 'disabled',
        WHATSAPP_BACKEND: 'disabled',  // never message real phones from a test run
        WUZAPI_URL: '',
      },
    },
    {
      command: PROD
        ? `npx next build && npx next start --port ${WEB_PORT}`
        : `npx next dev --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: PROD ? 600_000 : 180_000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`, NEXT_DIST_DIR: PROD ? '.next-e2e-prod' : '.next-e2e' },
    },
  ],
})
