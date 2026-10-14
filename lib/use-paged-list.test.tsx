import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getPage: vi.fn() }))
vi.mock('./api-client', async (orig) => ({ ...(await orig<typeof import('./api-client')>()), api }))

import { useIssueStore } from './store'
import { buildQuery, useDebounced, usePagedList } from './use-paged-list'

beforeEach(() => { api.getPage.mockReset(); useIssueStore.setState({ listVersion: 0 }) })

describe('buildQuery', () => {
  it('drops empty and false values', () => {
    expect(buildQuery({ q: '', priority: 'high', active: true, ready: false, outlet: null, limit: 20 }))
      .toBe('priority=high&active=true&limit=20')
  })
})

describe('usePagedList', () => {
  it('asks the server for one page and hands the rows to the cache', async () => {
    api.getPage.mockResolvedValue({ items: [{ id: 'a' }, { id: 'b' }], total: 31 })
    const onItems = vi.fn()
    const { result } = renderHook(() => usePagedList('/api/issues', { priority: 'high' }, { page: 2, pageSize: 2, onItems }))
    await waitFor(() => expect(result.current.ids).toEqual(['a', 'b']))
    expect(api.getPage).toHaveBeenCalledWith('/api/issues?priority=high&limit=2&offset=2')
    expect(result.current.total).toBe(31)
    expect(onItems).toHaveBeenCalledWith([{ id: 'a' }, { id: 'b' }])
  })

  it('refetches after a change anywhere (listVersion)', async () => {
    api.getPage.mockResolvedValue({ items: [], total: 0 })
    renderHook(() => usePagedList('/api/issues', {}, { page: 1, pageSize: 20 }))
    await waitFor(() => expect(api.getPage).toHaveBeenCalledTimes(1))
    useIssueStore.setState({ listVersion: 1 })
    await waitFor(() => expect(api.getPage).toHaveBeenCalledTimes(2))
  })
})

describe('useDebounced', () => {
  it('passes a value on only after it stopped changing', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 250), { initialProps: { v: '' } })
    rerender({ v: 'b' }); rerender({ v: 'bo' }); rerender({ v: 'bocor' })
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBe('')
    act(() => { vi.advanceTimersByTime(60) })
    expect(result.current).toBe('bocor')
    vi.useRealTimers()
  })
})
