// "Pekerjaan Saya" (Todo-Pilot §19 / UX-6). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/my-work-api', () => ({ myWorkApi: { get } }))
vi.mock('next/navigation', () => ({ usePathname: () => '/my-work', useSearchParams: () => new URLSearchParams() }))

import { MyWorkPage } from './my-work-page'

const sec = <T,>(items: T[]) => ({ count: items.length, items })
const WORK = {
  approvals: sec([{ id: 'a1', number: 'APR-1', title: 'Ganti kompresor', type: 'maintenance', outlet: 'Jakarta',
    amount: 3_000_000, currency: 'IDR', stepOrder: 1, stepCount: 2, waitingSince: '2026-10-13T08:00:00Z', escalated: false }]),
  workOrders: sec([{ id: 'w1', number: 'WO-1', title: 'Servis AC', assetName: 'AC', outlet: 'Jakarta',
    status: 'scheduled', priority: 'high', scheduledDate: '2026-10-15' }]),
  tasks: sec([{ id: 't1', number: 'TSK-1', title: 'Resolve: Kompor', issueId: 'i9', issueNumber: 'ISS-9',
    outlet: 'Jakarta', status: 'open', priority: 'medium', dueDate: null }]),
  readyToClose: sec([{ id: 'i2', number: 'ISS-2', title: 'Lampu mati', outlet: 'Jakarta', status: 'open' }]),
  guestWaiting: null,
}

let pushState: ReturnType<typeof vi.spyOn>
beforeEach(() => { get.mockReset(); pushState = vi.spyOn(window.history, 'pushState') })
afterEach(() => vi.restoreAllMocks())

describe('MyWorkPage', () => {
  it('lists every section the role has, with counts', async () => {
    get.mockResolvedValue(WORK)
    render(<MyWorkPage />)
    expect(await screen.findByRole('region', { name: /Waiting for my decision/ })).toHaveTextContent('APR-1')
    expect(screen.getByRole('region', { name: /My work orders/ })).toHaveTextContent('WO-1')
    expect(screen.getByRole('region', { name: /My tasks/ })).toHaveTextContent('TSK-1')
    expect(screen.getByRole('region', { name: /Ready to close/ })).toHaveTextContent('ISS-2')
    expect(screen.queryByRole('region', { name: /Guest/ })).not.toBeInTheDocument()   // no permission → null
  })

  it('each item opens its record', async () => {
    get.mockResolvedValue(WORK)
    render(<MyWorkPage />)
    await userEvent.click(await screen.findByText('Ganti kompresor'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/approvals/a1')
    await userEvent.click(screen.getByText('Servis AC'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/work-orders/w1')
    await userEvent.click(screen.getByText('Resolve: Kompor'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues/i9')        // a task opens its issue
    await userEvent.click(screen.getByText('Lampu mati'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues/i2')
  })

  it('says so when nothing is waiting', async () => {
    get.mockResolvedValue({ approvals: sec([]), workOrders: sec([]), tasks: sec([]), readyToClose: null, guestWaiting: null })
    render(<MyWorkPage />)
    expect(await screen.findByText(/Nothing is waiting for you/)).toBeInTheDocument()
  })

  it('shows more than the listed items as a count', async () => {
    get.mockResolvedValue({ ...WORK, workOrders: { count: 25, items: WORK.workOrders.items } })
    render(<MyWorkPage />)
    const region = await screen.findByRole('region', { name: /My work orders/ })
    expect(within(region).getByText('25')).toBeInTheDocument()
  })
})
