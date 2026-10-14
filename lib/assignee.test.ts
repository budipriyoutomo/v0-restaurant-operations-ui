import { describe, expect, it } from 'vitest'
import { isUnassigned, unlinkedAssigneeWarning } from './assignee'

// Todo-Pilot §17 (UX-4): an assignee who is not a user is never notified.

describe('isUnassigned', () => {
  it('treats empty and "Unassigned" (any case/space) as nobody', () => {
    for (const v of [null, undefined, '', '  ', 'Unassigned', ' unassigned ']) expect(isUnassigned(v)).toBe(true)
    expect(isUnassigned('Budi')).toBe(false)
  })
})

describe('unlinkedAssigneeWarning', () => {
  it('warns when a named assignee is not linked to a user', () => {
    expect(unlinkedAssigneeWarning({ assignee: 'Budi', assigneeUserId: null }))
      .toBe('Budi is not linked to a user account and will not be notified.')
    expect(unlinkedAssigneeWarning({ assignee: 'Budi' })).not.toBeNull()
  })

  it('is quiet for linked or unassigned records', () => {
    expect(unlinkedAssigneeWarning({ assignee: 'Budi', assigneeUserId: 'u1' })).toBeNull()
    expect(unlinkedAssigneeWarning({ assignee: 'Unassigned', assigneeUserId: null })).toBeNull()
  })
})
