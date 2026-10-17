// Executive Dashboard — numbers counted by the server (Todo-Pilot §22), "still
// being worked on" vs "waiting to be closed" (Todo-Pilot §18). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

vi.mock('next/navigation', () => ({ usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))
const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/overview-api', () => ({ overviewApi: api }))
vi.mock('@/components/dashboard/outlet-comparison', () => ({ OutletComparison: () => null }))
vi.mock('@/components/shared/onboarding-checklist', () => ({ OnboardingChecklist: () => null }))

import { ExecutiveDashboardPage } from './executive-dashboard-page'

const OVERVIEW = {
  issues: {
    total: 5, inProgress: 1, awaitingClose: 2, slaBreached: 1,
    byCategory: { Maintenance: 4, Other: 1 }, byOutlet: { Jakarta: 5 },
    urgent: [{ id: 'i1', number: 'ISS-1', title: 'Gas bocor', outlet: 'Jakarta', priority: 'critical' }],
  },
  tasks: { active: 3 },
  approvals: { pending: 2, pendingByType: { procurement: 2 } },
}

const card = (title: string) => screen.getByText(title, { selector: 'p' }).closest('[data-kpi]') as HTMLElement

beforeEach(() => {
  api.get.mockResolvedValue(OVERVIEW)
  useIssueStore.setState({
    currentUser: { id: 'u1', permissions: { dashboard: 'view', issues: 'view' } } as unknown as User,
    issues: [], tasks: [], approvals: [],      // no lists needed any more
  })
})

afterEach(() => vi.restoreAllMocks())

describe('ExecutiveDashboardPage', () => {
  it('shows the server\'s numbers, separating work in progress from work waiting to be closed', async () => {
    render(<ExecutiveDashboardPage />)
    expect(await screen.findByText('Gas bocor')).toBeInTheDocument()
    expect(card('Total Issues')).toHaveTextContent('5')
    expect(card('In Progress')).toHaveTextContent('1')
    expect(card('Awaiting Close')).toHaveTextContent('2')
    expect(card('Active Tasks')).toHaveTextContent('3')
    expect(card('Pending Approvals')).toHaveTextContent('2')
  })

  it('shows placeholders, not zeros, while loading', () => {
    api.get.mockReturnValue(new Promise(() => {}))
    render(<ExecutiveDashboardPage />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Total Issues')).not.toBeInTheDocument()
  })

  it('drills down from "Awaiting Close" to the filtered Issues list', async () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    render(<ExecutiveDashboardPage />)
    await userEvent.click(await screen.findByRole('button', { name: /awaiting close/i }))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues?ready=1')
  })

  it('reloads when something changed', async () => {
    render(<ExecutiveDashboardPage />)
    await screen.findByText('Gas bocor')
    useIssueStore.getState().bumpLists()
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
  })

  it('follows the top bar outlet filter', async () => {
    useIssueStore.setState({
      currentUser: { id: 'u1', all_outlets: true, effective_outlet_ids: [], permissions: { dashboard: 'view' } } as unknown as User,
      outlets: [{ id: 'o1', name: 'Jakarta' }, { id: 'o2', name: 'Bandung' }] as never,
      outletFilter: 'Bandung',
    })
    render(<ExecutiveDashboardPage />)
    await screen.findByText('Gas bocor')
    expect(api.get).toHaveBeenLastCalledWith('Bandung')
    useIssueStore.setState({ outletFilter: null })
  })
})
