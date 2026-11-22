// "Pekerjaan Saya" (Todo-Pilot §19 / UX-6; one queue since Todo-Modern-UI Fase 3).
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
  it('puts the most urgent item on the rail as a ticket with its one action', async () => {
    get.mockResolvedValue({ ...WORK, workOrders: sec([]) })
    render(<MyWorkPage />)
    // The approval has waited since 13 Oct; the task and the issue have no date.
    const rail = await screen.findByRole('region', { name: 'Do this first' })
    const ticket = within(rail).getByRole('button', { name: /Ganti kompresor/ })
    expect(ticket).toHaveTextContent('Decide')
    expect(ticket).toHaveTextContent('APR-1')
    await userEvent.click(ticket)
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/approvals/a1')
  })

  it('lists the rest as one queue: dated work first, dateless last', async () => {
    get.mockResolvedValue(WORK)
    render(<MyWorkPage />)
    const queue = await screen.findByRole('region', { name: 'Work queue' })
    // WO-1 (scheduled 15 Oct, now late) leads on the rail; the approval follows.
    const rows = within(queue).getAllByRole('button').map((b) => b.textContent)
    expect(rows).toEqual([
      expect.stringMatching(/^Ganti kompresor.*Approval · APR-1/),
      expect.stringMatching(/^Resolve: Kompor.*Task · TSK-1/),
      expect.stringMatching(/^Lampu mati.*Ready to close · ISS-2/),
    ])
    expect(screen.queryByText(/Guest complaint/)).not.toBeInTheDocument()   // no permission → null
  })

  it('each item opens its record', async () => {
    get.mockResolvedValue(WORK)
    render(<MyWorkPage />)
    await userEvent.click(await screen.findByText('Servis AC'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/work-orders/w1')
    await userEvent.click(screen.getByText('Ganti kompresor'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/approvals/a1')
    await userEvent.click(screen.getByText('Resolve: Kompor'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues/i9')        // a task opens its issue
    await userEvent.click(screen.getByText('Lampu mati'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues/i2')
  })

  it('marks late work with its label, not colour alone', async () => {
    get.mockResolvedValue({ ...WORK, approvals: sec([]) })
    render(<MyWorkPage />)
    // WO-1 was scheduled for 15 Oct 2026, long past: it leads, labelled late.
    const rail = await screen.findByRole('region', { name: 'Do this first' })
    expect(within(rail).getByText('Late')).toHaveClass('text-destructive')
    expect(within(rail).getByRole('button')).toHaveTextContent('Start')
  })

  it('says so when nothing is waiting', async () => {
    get.mockResolvedValue({ approvals: sec([]), workOrders: sec([]), tasks: sec([]), readyToClose: null, guestWaiting: null })
    render(<MyWorkPage />)
    expect(await screen.findByText(/Nothing is waiting for you/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Do this first' })).not.toBeInTheDocument()
  })

  it('counts what the server did not list', async () => {
    get.mockResolvedValue({ ...WORK, workOrders: { count: 25, items: WORK.workOrders.items } })
    render(<MyWorkPage />)
    expect(await screen.findByText('Not shown yet: 24 work orders')).toBeInTheDocument()
  })
})
