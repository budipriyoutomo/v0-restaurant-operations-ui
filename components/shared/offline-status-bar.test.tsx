// Offline clarity (Todo-Pilot §27 / UX-14): how old the data on screen is, and
// what happened to queued changes the server refused.
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'

const queue = vi.hoisted(() => ({
  state: { pending: 0, conflicts: [] as object[] },
  listener: null as null | ((s: object) => void),
  flush: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
  discardConflict: vi.fn().mockResolvedValue(undefined),
  retryConflict: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/offline-queue', async (orig) => ({
  ...(await orig<typeof import('@/lib/offline-queue')>()),
  subscribe: (l: (s: object) => void) => { queue.listener = l; l(queue.state); return () => {} },
  flush: queue.flush, discardConflict: queue.discardConflict, retryConflict: queue.retryConflict,
}))
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()), initOfflineSync: vi.fn(), authToken: { get: () => 'token', set: vi.fn(), clear: vi.fn() },
}))

import { OfflineStatusBar } from './offline-status-bar'

const setOnline = (v: boolean) => Object.defineProperty(window.navigator, 'onLine', { value: v, configurable: true })

beforeEach(() => {
  queue.state = { pending: 0, conflicts: [] }
  setOnline(true)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-14T07:20:00Z'))
  useIssueStore.setState({ lastSyncedAt: '2026-10-14T07:05:00Z', loadAll: vi.fn().mockResolvedValue(undefined) })
})
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('OfflineStatusBar — how fresh is the data', () => {
  it('stays hidden while online with fresh data and nothing queued', () => {
    useIssueStore.setState({ lastSyncedAt: '2026-10-14T07:18:00Z' })
    const { container } = render(<OfflineStatusBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('offline: says the screen shows data from the last sync', () => {
    setOnline(false)
    render(<OfflineStatusBar />)
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i)
    expect(screen.getByRole('status')).toHaveTextContent(/last synced 07:05|last synced \d{2}:05/i)
  })

  it('online but old: says it may be out of date and reloads on request', async () => {
    useIssueStore.setState({ lastSyncedAt: '2026-10-14T06:30:00Z' })
    render(<OfflineStatusBar />)
    expect(screen.getByRole('status')).toHaveTextContent(/may be out of date/i)
    vi.useRealTimers()
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(useIssueStore.getState().loadAll).toHaveBeenCalled()
  })

  it('coming back online sends the queue, then reloads the data', async () => {
    setOnline(false)
    render(<OfflineStatusBar />)
    setOnline(true)
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(queue.flush).toHaveBeenCalled()
    expect(useIssueStore.getState().loadAll).toHaveBeenCalled()
  })
})

describe('OfflineStatusBar — changes the server refused', () => {
  const conflict = { id: 'q1', label: 'Checklist WO-2026-00007', conflict: { status: 409, detail: "Cannot transition work order from 'completed'.", at: 1 } }

  it('lists them with a plain reason and lets the user retry or discard', async () => {
    queue.state = { pending: 0, conflicts: [conflict] }
    useIssueStore.setState({ lastSyncedAt: '2026-10-14T07:18:00Z' })
    vi.useRealTimers()
    render(<OfflineStatusBar />)
    expect(screen.getByRole('status')).toHaveTextContent('1 change was not saved')

    await userEvent.click(screen.getByRole('button', { name: 'Review' }))
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('Checklist WO-2026-00007')
    expect(item).toHaveTextContent(/changed on the server/i)
    expect(item).toHaveTextContent("Cannot transition work order from 'completed'.")

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(queue.retryConflict).toHaveBeenCalledWith('q1')
    expect(queue.flush).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Discard my change' }))
    expect(queue.discardConflict).toHaveBeenCalledWith('q1')
  })
})
