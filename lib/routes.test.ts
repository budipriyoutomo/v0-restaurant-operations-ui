import { describe, expect, it } from 'vitest'
import { notificationPath, pagePath, parseRoute, recordPath, withSearch } from './routes'

// Todo-Pilot §14 (UX-1): every page and record has a URL.

describe('parseRoute', () => {
  it('maps / to the role\'s home page (Todo-Pilot §19)', () => {
    expect(parseRoute('/')).toEqual({ page: 'home', recordId: null, notFound: false })
    expect(parseRoute('')).toEqual({ page: 'home', recordId: null, notFound: false })
    expect(parseRoute('/dashboard')).toEqual({ page: 'dashboard', recordId: null, notFound: false })
  })

  it('maps a page path to its page id', () => {
    expect(parseRoute('/issues')).toEqual({ page: 'issues', recordId: null, notFound: false })
    expect(parseRoute('/master-data')).toEqual({ page: 'master-data', recordId: null, notFound: false })
    expect(parseRoute('/guest-service')).toEqual({ page: 'guest-service', recordId: null, notFound: false })
  })

  it('ignores a trailing slash', () => {
    expect(parseRoute('/approvals/')).toEqual({ page: 'approvals', recordId: null, notFound: false })
  })

  it('reads the record id of record pages', () => {
    expect(parseRoute('/issues/abc-1')).toEqual({ page: 'issues', recordId: 'abc-1', notFound: false })
    expect(parseRoute('/approvals/abc-2')).toEqual({ page: 'approvals', recordId: 'abc-2', notFound: false })
    expect(parseRoute('/it-support/abc-3')).toEqual({ page: 'it-support', recordId: 'abc-3', notFound: false })
  })

  it('serves work orders from the CMMS page', () => {
    expect(parseRoute('/work-orders/wo-1')).toEqual({ page: 'cmms', recordId: 'wo-1', notFound: false })
    expect(parseRoute('/work-orders')).toEqual({ page: 'cmms', recordId: null, notFound: false })
  })

  it('decodes the record id', () => {
    expect(parseRoute('/issues/a%20b').recordId).toBe('a b')
  })

  it('flags unknown pages as not found', () => {
    expect(parseRoute('/nope')).toMatchObject({ notFound: true, recordId: null })
  })

  it('flags a record under a page without records as not found', () => {
    expect(parseRoute('/settings/x')).toMatchObject({ notFound: true })
    expect(parseRoute('/issues/a/b')).toMatchObject({ notFound: true })
  })
})

describe('pagePath / recordPath', () => {
  it('builds page paths', () => {
    expect(pagePath('dashboard')).toBe('/dashboard')
    expect(pagePath('home')).toBe('/')
    expect(pagePath('issues')).toBe('/issues')
  })

  it('builds record paths', () => {
    expect(recordPath('issues', 'x1')).toBe('/issues/x1')
    expect(recordPath('cmms', 'w1')).toBe('/work-orders/w1')
    expect(recordPath('it-support', 'i1')).toBe('/it-support/i1')
  })

  it('round-trips through parseRoute', () => {
    for (const [page, id] of [['issues', 'a'], ['approvals', 'b'], ['cmms', 'c']] as const) {
      expect(parseRoute(recordPath(page, id))).toEqual({ page, recordId: id, notFound: false })
    }
  })
})

describe('notificationPath', () => {
  it('links the entity of a notification to its record', () => {
    expect(notificationPath('issues', 'i1')).toBe('/issues/i1')
    expect(notificationPath('approvals', 'a1')).toBe('/approvals/a1')
    expect(notificationPath('work_orders', 'w1')).toBe('/work-orders/w1')
  })

  it('has no link for unknown or missing entities', () => {
    expect(notificationPath('budgets', 'b1')).toBeNull()
    expect(notificationPath(null, null)).toBeNull()
    expect(notificationPath('issues', null)).toBeNull()
  })
})

describe('withSearch', () => {
  it('appends a non-empty query string', () => {
    expect(withSearch('/issues', '?status=open')).toBe('/issues?status=open')
    expect(withSearch('/issues', 'status=open')).toBe('/issues?status=open')
    expect(withSearch('/issues', '')).toBe('/issues')
    expect(withSearch('/issues', '?')).toBe('/issues')
  })
})

describe('my-work route (Todo-Pilot §19)', () => {
  it('has its own path', () => {
    expect(parseRoute('/my-work')).toEqual({ page: 'my-work', recordId: null, notFound: false })
    expect(pagePath('my-work')).toBe('/my-work')
  })
})
