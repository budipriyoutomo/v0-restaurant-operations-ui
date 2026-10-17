// Daily Ops page shell: tabs are real tabs and live in the URL. Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { OpsRun, User } from '@/lib/types'
import { opsApi } from '@/lib/ops-checklist-api'
import { OpsChecklistPage } from './ops-checklist-page'

// The URL is the tab's state; read it back from the jsdom location.
vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}))
vi.mock('@/lib/ops-checklist-api', () => ({
  opsApi: { runs: vi.fn(), runNow: vi.fn(), kpis: vi.fn(() => new Promise(() => {})) },
}))

const run = {
  id: 'r1', number: 'OPS-1', templateName: 'Opening Checklist', outlet: 'Dago', shift: 'opening',
  status: 'pending', dueAt: new Date(Date.now() + 3_600_000).toISOString(), runDate: '2026-10-17',
  itemCount: 4, answeredCount: 1, failedCount: 0, criticalFailed: false, isLate: false, score: null,
} as unknown as OpsRun

beforeEach(() => {
  window.history.replaceState(null, '', '/ops')
  vi.mocked(opsApi.runs).mockResolvedValue([run])
  useIssueStore.setState({ currentUser: { id: 'u', permissions: { ops: 'view' } } as unknown as User })
})

describe('OpsChecklistPage', () => {
  it('shows today’s runs under the Today tab', async () => {
    render(<OpsChecklistPage />)
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Opening Checklist')).toBeInTheDocument()
    expect(screen.getByText('1/4')).toBeInTheDocument()
  })

  it('switches tab and keeps it in the URL', async () => {
    const { rerender } = render(<OpsChecklistPage />)
    await userEvent.click(screen.getByRole('tab', { name: 'History' }))
    expect(window.location.search).toContain('tab=history')
    rerender(<OpsChecklistPage />)
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true')
  })

  it('lists today’s runs of the top bar outlet only', async () => {
    useIssueStore.setState({
      currentUser: { id: 'u', all_outlets: true, effective_outlet_ids: [], permissions: { ops: 'view' } } as unknown as User,
      outlets: [{ id: 'o1', name: 'Dago' }, { id: 'o2', name: 'Riau' }] as never,
      outletFilter: 'Dago',
    })
    render(<OpsChecklistPage />)
    expect(await screen.findByText('Opening Checklist')).toBeInTheDocument()
    expect(opsApi.runs).toHaveBeenLastCalledWith({ outlet: 'Dago' })
    useIssueStore.setState({ outletFilter: null })
  })

  it('hides the setup tab from roles that cannot manage ops', () => {
    render(<OpsChecklistPage />)
    expect(screen.queryByRole('tab', { name: 'Templates & Schedules' })).not.toBeInTheDocument()
  })
})
