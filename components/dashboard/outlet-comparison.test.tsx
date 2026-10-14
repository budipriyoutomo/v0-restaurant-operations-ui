// GM multi-outlet comparison (Todo-Pilot §25 / UX-12). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ compare: vi.fn() }))
vi.mock('@/lib/outlets-api', () => ({ outletsApi: api }))
const nav = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@/lib/use-route', async (orig) => ({ ...(await orig<typeof import('@/lib/use-route')>()), navigate: nav.navigate }))

import { OutletComparison } from './outlet-comparison'

const row = (outlet: string, over = {}) => ({
  outletId: outlet, outlet, openIssues: 0, slaBreached: 0, readyToClose: 0, qaScore: null, guestWaiting: 0,
  guestResponseMinutes: null, budgetPct: null, downtimeHours: 0, flags: [], ...over,
})
const data = (rows: object[]) => ({ since: '2026-09-14', days: 30, outlets: rows,
  thresholds: { qaMinScore: 80, downtimeMaxHours: 8, budgetMaxPct: 100 } })

beforeEach(() => {
  vi.clearAllMocks()
  api.compare.mockResolvedValue(data([
    row('Dago', { openIssues: 5, slaBreached: 2, qaScore: 72, flags: ['sla', 'qa'] }),
    row('Riau', { openIssues: 1, qaScore: 91 }),
  ]))
})

describe('OutletComparison', () => {
  it('puts outlets side by side with exceptions marked', async () => {
    render(<OutletComparison />)
    const table = await screen.findByRole('table', { name: 'Outlet comparison' })
    const [, dago, riau] = within(table).getAllByRole('row')
    expect(dago).toHaveTextContent('Dago')
    expect(within(dago).getByRole('button', { name: '2 past SLA at Dago' })).toHaveAttribute('data-flag', 'true')
    expect(within(dago).getByText('72')).toHaveAttribute('data-flag', 'true')
    expect(within(riau).getByText('91')).not.toHaveAttribute('data-flag')
    expect(screen.getByText('1 outlet needs attention')).toBeInTheDocument()
  })

  it('every number opens the list behind it', async () => {
    render(<OutletComparison />)
    await userEvent.click(await screen.findByRole('button', { name: '2 past SLA at Dago' }))
    expect(nav.navigate).toHaveBeenCalledWith('/issues?outlet=Dago&late=1')
    await userEvent.click(screen.getByRole('button', { name: '5 open issues at Dago' }))
    expect(nav.navigate).toHaveBeenCalledWith('/issues?outlet=Dago&open=1')
  })

  it('can show only the outlets with exceptions, and switch the period', async () => {
    render(<OutletComparison />)
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Exceptions only' }))
    expect(screen.queryByText('Riau')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '7 days' }))
    expect(api.compare).toHaveBeenLastCalledWith(7)
  })

  it('stays quiet with a single outlet', async () => {
    api.compare.mockResolvedValue(data([row('Dago')]))
    const { container } = render(<OutletComparison />)
    await vi.waitFor(() => expect(api.compare).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
