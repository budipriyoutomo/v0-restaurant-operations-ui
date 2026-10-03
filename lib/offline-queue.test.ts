// Offline queue replay rules (cross-check fixes 2026-10-03). The IndexedDB plumbing
// is not exercised here — only the pure decisions flush() is built on.
import { describe, expect, it } from 'vitest'
import { belongsTo, pendingFor, replayOutcome, tokenOwner } from './offline-queue'

/** Unsigned JWT with the given payload — enough for tokenOwner(), which never verifies. */
function jwt(payload: object): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`
}

describe('tokenOwner', () => {
  it('reads the user id from the JWT sub claim', () => {
    expect(tokenOwner(jwt({ sub: 'user-a', exp: 1 }))).toBe('user-a')
  })

  it('is null without a usable token', () => {
    expect(tokenOwner(null)).toBeNull()
    expect(tokenOwner('not-a-jwt')).toBeNull()
    expect(tokenOwner(jwt({ email: 'x@y' }))).toBeNull()
  })
})

describe('belongsTo', () => {
  it('replays an item only for the user who queued it', () => {
    expect(belongsTo({ owner: 'user-a' }, 'user-a')).toBe(true)
    expect(belongsTo({ owner: 'user-a' }, 'user-b')).toBe(false)
  })

  it('never replays an owned item when signed out', () => {
    expect(belongsTo({ owner: 'user-a' }, null)).toBe(false)
  })

  it('still replays items queued before owners were recorded', () => {
    expect(belongsTo({}, 'user-b')).toBe(true)
  })
})

describe('replayOutcome', () => {
  it('removes the item on success', () => {
    expect(replayOutcome(200)).toBe('sent')
    expect(replayOutcome(201)).toBe('sent')
  })

  it('keeps the item and stops on 401 — the session expired, the work is still valid', () => {
    expect(replayOutcome(401)).toBe('stop')
  })

  it('drops other client errors — they would fail forever', () => {
    expect(replayOutcome(404)).toBe('drop')
    expect(replayOutcome(409)).toBe('drop')
    expect(replayOutcome(422)).toBe('drop')
  })

  it('keeps the item and stops on transient failures', () => {
    expect(replayOutcome(408)).toBe('stop')
    expect(replayOutcome(429)).toBe('stop')
    expect(replayOutcome(500)).toBe('stop')
    expect(replayOutcome(503)).toBe('stop')
  })
})

describe('pendingFor', () => {
  it('counts only what the signed-in user can actually sync', () => {
    const items = [{ owner: 'user-a' }, { owner: 'user-b' }, {}, { owner: 'user-a' }]
    expect(pendingFor(items, 'user-a')).toHaveLength(3)   // own two + one legacy
    expect(pendingFor(items, 'user-b')).toHaveLength(2)
    expect(pendingFor(items, null)).toHaveLength(1)
  })
})
