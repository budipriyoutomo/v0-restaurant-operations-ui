import { describe, expect, it } from 'vitest'
import { homePage } from './home'

// Todo-Pilot §19 (UX-6): every role lands on its own home page.

const u = (over: Record<string, unknown>) => ({ permissions: { dashboard: 'view', issues: 'view' }, ...over }) as never

describe('homePage', () => {
  it('uses the home page set on the role', () => {
    expect(homePage(u({ home_page: 'dashboard' }))).toBe('dashboard')
    expect(homePage(u({ home_page: 'issues' }))).toBe('issues')
  })

  it('falls back to My Work without a setting', () => {
    expect(homePage(u({}))).toBe('my-work')
    expect(homePage(u({ home_page: null }))).toBe('my-work')
  })

  it('never lands on a page the role cannot open', () => {
    expect(homePage(u({ home_page: 'cmms' }))).toBe('my-work')
  })
})
