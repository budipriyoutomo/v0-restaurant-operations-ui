// HTTP status of a failed API call (the error text is `API <status> <path>: <body>`).
import { describe, expect, it } from 'vitest'
import { apiStatus } from './api-client'

describe('apiStatus', () => {
  it('reads the status of an API error', () => {
    expect(apiStatus(new Error('API 429 /api/auth/login: {"detail":"Too many attempts."}'))).toBe(429)
    expect(apiStatus(new Error('API 400 /api/auth/reset-password: {}'))).toBe(400)
  })
  it('null for anything else (network failure, non-errors)', () => {
    expect(apiStatus(new TypeError('Failed to fetch'))).toBeNull()
    expect(apiStatus('oops')).toBeNull()
  })
})
