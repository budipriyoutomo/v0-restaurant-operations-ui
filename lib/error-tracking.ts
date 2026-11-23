// Browser error tracking with Sentry (Todo-Review P1 #5).
//
// Off unless NEXT_PUBLIC_SENTRY_DSN is set at build time; the SDK is then
// loaded with a dynamic import, so builds without a DSN ship none of it.
// Privacy: no default PII, no tracing/replay, and every event and breadcrumb
// goes through scrubEvent — auth headers, cookies, bodies and query strings
// are dropped, only the user id is kept, and emails, phone numbers and
// bearer/JWT tokens are masked. Mirrors backend app/core/observability.py.

type Json = string | number | boolean | null | undefined | Json[] | { [key: string]: Json }

export interface ScrubbableEvent {
  message?: string
  request?: {
    url?: string
    headers?: Record<string, string>
    cookies?: unknown
    data?: unknown
    query_string?: unknown
    [key: string]: unknown
  }
  user?: Record<string, unknown>
  [key: string]: unknown
}

const DROP_HEADERS = new Set([
  'authorization', 'proxy-authorization', 'cookie', 'set-cookie',
  'x-sensor-key', 'x-api-key', 'idempotency-key',
])

const URL_QUERY = /(https?:\/\/[^\s?#"']+)\?[^\s#"']*/g
const BEARER = /bearer\s+[\w.~+/=-]+/gi
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
// Indonesian mobile numbers (08…, 628…, +628…) and any +international number.
const PHONE = /(?<![\w])(?:\+?62|0)8\d{7,12}(?!\d)|\+\d{10,15}(?!\d)/g

function mask(text: string): string {
  return text
    .replace(URL_QUERY, '$1')
    .replace(BEARER, 'Bearer [token]')
    .replace(JWT, '[token]')
    .replace(EMAIL, '[email]')
    .replace(PHONE, '[phone]')
}

function walk(value: unknown): unknown {
  if (typeof value === 'string') return mask(value)
  if (Array.isArray(value)) return value.map(walk)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
  }
  return value
}

/** Sentry beforeSend: strip credentials and personal data. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const out: ScrubbableEvent = { ...event }
  if (out.request) {
    const { cookies: _c, data: _d, query_string: _q, headers, ...rest } = out.request
    out.request = { ...rest }
    if (headers) {
      out.request.headers = Object.fromEntries(
        Object.entries(headers).filter(([k]) => !DROP_HEADERS.has(k.toLowerCase())),
      )
    }
  }
  if (out.user) out.user = 'id' in out.user ? { id: out.user.id } : {}
  return walk(out) as T
}

export interface ErrorTrackingOptions {
  dsn: string
  release: string
  environment: string
  sendDefaultPii: false
  tracesSampleRate: 0
  beforeSend: typeof scrubEvent
  beforeBreadcrumb: (crumb: Record<string, Json>) => Record<string, Json>
}

export function errorTrackingOptions(dsn: string | undefined, release: string): ErrorTrackingOptions | null {
  if (!dsn) return null
  return {
    dsn,
    release,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: (crumb) => walk(crumb) as Record<string, Json>,
  }
}

type Loader = () => Promise<{ init: (options: never) => unknown }>

const loadSdk: Loader = () => import('@sentry/browser')

/** Start Sentry in the browser when a DSN is configured; otherwise a no-op. */
export async function initErrorTracking(
  dsn: string | undefined,
  release: string,
  load: Loader = loadSdk,
): Promise<void> {
  const options = errorTrackingOptions(dsn, release)
  if (!options) return
  try {
    const sdk = await load()
    sdk.init(options as never)
  } catch {
    // Error tracking must never break the app (offline, blocked by an ad blocker…).
  }
}
