import { describe, expect, it, vi } from 'vitest'
import { openNotification } from './notifications'

// Todo-Pilot §14 (UX-1): clicking a notification opens its record.
describe('openNotification', () => {
  const base = { id: 'n1', title: 't', message: 'm', type: 'info' as const, created_at: '2026-10-13T00:00:00Z' }

  it('marks an unread notification read and opens its record', () => {
    const markRead = vi.fn(), go = vi.fn()
    const opened = openNotification({ ...base, entity_type: 'approvals', entity_id: 'a1', read_at: null }, { markRead, go })
    expect(markRead).toHaveBeenCalledWith('n1')
    expect(go).toHaveBeenCalledWith('/approvals/a1')
    expect(opened).toBe(true)
  })

  it('does not mark an already-read notification again', () => {
    const markRead = vi.fn(), go = vi.fn()
    openNotification({ ...base, entity_type: 'work_orders', entity_id: 'w1', read_at: '2026-10-13T01:00:00Z' }, { markRead, go })
    expect(markRead).not.toHaveBeenCalled()
    expect(go).toHaveBeenCalledWith('/work-orders/w1')
  })

  it('only marks read when the notification has no record', () => {
    const markRead = vi.fn(), go = vi.fn()
    const opened = openNotification({ ...base, entity_type: null, entity_id: null, read_at: null }, { markRead, go })
    expect(markRead).toHaveBeenCalledWith('n1')
    expect(go).not.toHaveBeenCalled()
    expect(opened).toBe(false)
  })
})
