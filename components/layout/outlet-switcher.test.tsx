// Outlet switcher in the top bar: narrows every list and badge to one outlet.
// Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { Outlet, User } from '@/lib/types'
import { OutletSwitcher } from './outlet-switcher'

const outlets = [
  { id: 'o1', name: 'Dago', code: 'DGO', status: 'operational' },
  { id: 'o2', name: 'Riau', code: 'RIA', status: 'warning' },
] as Outlet[]

/** In-memory Storage: Node's own experimental localStorage shadows jsdom's. */
function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k) },
    setItem: (k, v) => { m.set(k, String(v)) },
  }
}

let loadCounts: ReturnType<typeof vi.fn>
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true })
  loadCounts = vi.fn()
  useIssueStore.setState({
    currentUser: { id: 'u', all_outlets: true, effective_outlet_ids: [], permissions: {} } as unknown as User,
    outlets, outletFilter: null, loadCounts,
  })
})

describe('OutletSwitcher', () => {
  it('starts on all outlets and narrows to the chosen one', async () => {
    render(<OutletSwitcher />)
    await userEvent.click(screen.getByRole('button', { name: /Outlet: All my outlets/ }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Riau/ }))
    expect(useIssueStore.getState().outletFilter).toBe('Riau')
    expect(window.localStorage.getItem('ro.outletFilter')).toBe('Riau')
    expect(screen.getByRole('button', { name: /Outlet: Riau/ })).toBeInTheDocument()
    expect(loadCounts).toHaveBeenCalled()          // badges follow the filter
  })

  it('goes back to all outlets', async () => {
    useIssueStore.setState({ outletFilter: 'Dago' })
    render(<OutletSwitcher />)
    await userEvent.click(screen.getByRole('button', { name: /Outlet: Dago/ }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: /All my outlets/ }))
    expect(useIssueStore.getState().outletFilter).toBeNull()
  })

  it('is hidden for a user with a single outlet', () => {
    useIssueStore.setState({ currentUser: { id: 'u', all_outlets: false, effective_outlet_ids: ['o1'], permissions: {} } as unknown as User })
    render(<OutletSwitcher />)
    expect(screen.queryByRole('button', { name: /Outlet:/ })).not.toBeInTheDocument()
  })
})
