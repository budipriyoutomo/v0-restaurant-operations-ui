import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useIssueStore } from './store'
import { useEnsureLoaded } from './use-ensure-loaded'

describe('useEnsureLoaded', () => {
  it('asks the store for each module once on mount', () => {
    const ensureLoaded = vi.fn().mockResolvedValue(undefined)
    useIssueStore.setState({ ensureLoaded })
    const { rerender } = renderHook(() => useEnsureLoaded('cmms', 'vendors'))
    rerender()
    expect(ensureLoaded.mock.calls).toEqual([['cmms'], ['vendors']])
  })
})
