// Todo-Review P1 #5 — browser error tracking. Off without NEXT_PUBLIC_SENTRY_DSN;
// whatever is sent carries no token, email, phone number or request body.
import { describe, expect, it, vi } from 'vitest'
import { errorTrackingOptions, scrubEvent } from './error-tracking'

const event = () => ({
  message: 'Login failed for rina@satesenayan.test',
  request: {
    url: 'https://app.example.com/issues/1?token=abc&email=rina@satesenayan.test',
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.abc.def', 'User-Agent': 'Mozilla/5.0' },
    cookies: { session: '1' },
    data: { password: 'hunter2' },
    query_string: 'token=abc',
  },
  user: { id: 'u-1', email: 'rina@satesenayan.test', ip_address: '10.0.0.1' },
  exception: { values: [{ type: 'Error', value: 'WA to 6281234567890 failed (Bearer abc.def.ghi)' }] },
  breadcrumbs: [
    { category: 'fetch', data: { url: 'https://api.example.com/api/users?email=a@b.co', method: 'GET' } },
  ],
})

describe('scrubEvent', () => {
  it('drops auth headers, cookies, bodies and query strings', () => {
    const req = scrubEvent(event()).request!
    expect(Object.keys(req.headers!)).toEqual(['User-Agent'])
    expect(req).not.toHaveProperty('cookies')
    expect(req).not.toHaveProperty('data')
    expect(req).not.toHaveProperty('query_string')
    expect(req.url).toBe('https://app.example.com/issues/1')
  })

  it('keeps only the user id', () => {
    expect(scrubEvent(event()).user).toEqual({ id: 'u-1' })
  })

  it('masks emails, phone numbers and tokens everywhere, URLs lose their query', () => {
    const out = JSON.stringify(scrubEvent(event()))
    for (const secret of ['rina@satesenayan.test', 'a@b.co', '6281234567890', 'abc.def.ghi', 'hunter2', 'token=abc']) {
      expect(out).not.toContain(secret)
    }
    expect(out).toContain('[email]')
    expect(out).toContain('[phone]')
    expect(out).toContain('https://api.example.com/api/users')
  })

  it('leaves ordinary text alone', () => {
    expect(scrubEvent({ message: 'Work order WO-0012 total 1500000 IDR' }).message).toBe(
      'Work order WO-0012 total 1500000 IDR',
    )
  })
})

describe('errorTrackingOptions', () => {
  it('is null without a DSN', () => {
    expect(errorTrackingOptions(undefined, 'b1')).toBeNull()
    expect(errorTrackingOptions('', 'b1')).toBeNull()
  })

  it('sends no default PII, no tracing, and scrubs every event and breadcrumb', () => {
    const opts = errorTrackingOptions('https://k@o1.ingest.sentry.io/1', 'b1')!
    expect(opts.dsn).toBe('https://k@o1.ingest.sentry.io/1')
    expect(opts.release).toBe('b1')
    expect(opts.sendDefaultPii).toBe(false)
    expect(opts.tracesSampleRate).toBe(0)
    expect(opts.beforeSend).toBe(scrubEvent)
    const crumb = opts.beforeBreadcrumb!({ message: 'to rina@satesenayan.test' })
    expect(crumb).toEqual({ message: 'to [email]' })
  })

  it('init does nothing without a DSN (no SDK download)', async () => {
    const load = vi.fn()
    const { initErrorTracking } = await import('./error-tracking')
    await initErrorTracking(undefined, 'b1', load)
    expect(load).not.toHaveBeenCalled()
  })

  it('init loads the SDK and calls init with the options when a DSN is set', async () => {
    const init = vi.fn()
    const { initErrorTracking } = await import('./error-tracking')
    await initErrorTracking('https://k@o1.ingest.sentry.io/1', 'b1', async () => ({ init }))
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false, release: 'b1' }))
  })
})
