// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { dismiss: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

import { runWithUndo } from './undo'

beforeEach(() => { vi.useFakeTimers(); toastMock.mockClear(); toastMock.mockReturnValue('t1') })
afterEach(() => vi.useRealTimers())

describe('runWithUndo (Todo-Pilot §23)', () => {
  it('runs the action after the undo window', () => {
    const run = vi.fn()
    runWithUndo({ message: 'Closing ISS-1', undoLabel: 'Undo', run, delayMs: 5000 })
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('Undo in the toast cancels it', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    runWithUndo({ message: 'Closing ISS-1', undoLabel: 'Undo', run, onUndo, delayMs: 5000 })
    const [message, opts] = toastMock.mock.calls[0]
    expect(message).toBe('Closing ISS-1')
    expect(opts.action.label).toBe('Undo')

    opts.action.onClick()
    vi.advanceTimersByTime(10_000)

    expect(run).not.toHaveBeenCalled()
    expect(onUndo).toHaveBeenCalled()
  })

  it('a reload or tab close before the window ends does not lose the action', () => {
    const run = vi.fn()
    runWithUndo({ message: 'Closing ISS-1', undoLabel: 'Undo', run, delayMs: 5000 })
    window.dispatchEvent(new Event('pagehide'))
    expect(run).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5000)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
