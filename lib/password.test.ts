// Password change / reset helpers. Written first (TDD).
import { describe, expect, it } from 'vitest'
import { resetTokenFrom, validateChangePassword, validateNewPassword, validateResetPassword } from './password'

describe('validateChangePassword', () => {
  const ok = { current: 'OldPass123', next: 'BrandNewPass99', confirm: 'BrandNewPass99' }

  it('accepts a complete form', () => {
    expect(validateChangePassword(ok)).toEqual({})
  })
  it('requires the current password', () => {
    expect(validateChangePassword({ ...ok, current: '' })).toEqual({
      current: 'Enter your current password',
    })
  })
  it('the new password needs at least 10 characters (same rule as the backend)', () => {
    expect(validateChangePassword({ ...ok, next: 'short', confirm: 'short' })).toEqual({
      next: 'At least 10 characters',
    })
  })
  it('the confirmation must match', () => {
    expect(validateChangePassword({ ...ok, confirm: 'Different123' })).toEqual({
      confirm: 'Passwords do not match',
    })
  })
  it('the new password must differ from the current one', () => {
    expect(validateChangePassword({ current: ok.next, next: ok.next, confirm: ok.next })).toEqual({
      next: 'Must differ from your current password',
    })
  })
  it('speaks Indonesian', () => {
    expect(validateChangePassword({ ...ok, next: 'short', confirm: 'short' }, 'id')).toEqual({
      next: 'Minimal 10 karakter',
    })
  })
})

describe('validateResetPassword', () => {
  it('empty = let the server generate one', () => {
    expect(validateResetPassword('')).toBeNull()
  })
  it('a chosen password needs at least 10 characters', () => {
    expect(validateResetPassword('short')).toBe('At least 10 characters, or leave empty to generate one')
    expect(validateResetPassword('LongEnough1')).toBeNull()
  })
})

describe('validateNewPassword (reset link page)', () => {
  it('accepts a matching password of 10+ characters', () => {
    expect(validateNewPassword({ next: 'BrandNewPass99', confirm: 'BrandNewPass99' })).toEqual({})
  })
  it('checks length first, then the confirmation', () => {
    expect(validateNewPassword({ next: 'short', confirm: '' })).toEqual({ next: 'At least 10 characters' })
    expect(validateNewPassword({ next: 'BrandNewPass99', confirm: 'x' })).toEqual({ confirm: 'Passwords do not match' })
  })
})

describe('resetTokenFrom', () => {
  it('reads the token from the email link query string', () => {
    expect(resetTokenFrom('?token=abc_DEF-123')).toBe('abc_DEF-123')
  })
  it('missing or empty = null', () => {
    expect(resetTokenFrom('')).toBeNull()
    expect(resetTokenFrom('?token=')).toBeNull()
    expect(resetTokenFrom('?other=1')).toBeNull()
  })
})
