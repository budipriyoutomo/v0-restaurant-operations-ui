// Platform admin helpers (Todo-Pilot §11). Written first (TDD).
import { describe, expect, it } from 'vitest'
import { slugify, validateNewCompany } from './platform'

describe('slugify (mirrors backend platform_service.slugify)', () => {
  it.each([
    ['PT Sate Senayan', 'pt-sate-senayan'],
    ['  Kopi & Roti — Bandung ', 'kopi-roti-bandung'],
    ['RM. Padang Sederhana', 'rm-padang-sederhana'],
    ['!!!', 'company'],
  ])('%j → %j', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })
})

describe('validateNewCompany', () => {
  const ok = { name: 'PT Sate', adminName: 'Rina', adminEmail: 'rina@sate.id', adminPassword: '', outletName: '' }

  it('accepts a complete form; password is optional', () => {
    expect(validateNewCompany(ok)).toEqual({})
  })
  it('requires name, admin name and a valid email', () => {
    expect(validateNewCompany({ ...ok, name: ' ', adminName: '', adminEmail: 'rina' })).toEqual({
      name: 'Company name is required',
      adminName: 'Admin name is required',
      adminEmail: 'Enter a valid email address',
    })
  })
  it('a chosen password needs at least 10 characters', () => {
    expect(validateNewCompany({ ...ok, adminPassword: 'short' })).toEqual({
      adminPassword: 'At least 10 characters, or leave empty to generate one',
    })
  })
})
