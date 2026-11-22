// Executive Dashboard — numbers counted by the server (Todo-Pilot §22), "still
// being worked on" vs "waiting to be closed" (Todo-Pilot §18). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

vi.mock('next/navigation', () => ({ usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))
const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/overview-api', () => ({ overviewApi: api }))
vi.mock('@/components/dashboard/outlet-comparison', () => ({ OutletComparison: () => null }))
const outlets = vi.hoisted(() => ({ compare: vi.fn() }))
vi.mock('@/lib/outlets-api', () => ({ outletsApi: outlets }))
const myWork = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/my-work-api', () => ({ myWorkApi: myWork }))
const getPage = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api-client', async (orig) => {
  const real = await orig<typeof import('@/lib/api-client')>()
  return { ...real, api: { ...real.api, getPage } }
})
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

const outletRow = (outlet: string, flags: string[] = [], over = {}) => ({
  outletId: outlet, outlet, openIssues: 2, slaBreached: 0, readyToClose: 1, qaScore: null, guestWaiting: 0,
  guestResponseMinutes: null, budgetPct: null, downtimeHours: 0, flags, ...over })
const COMPARE = { since: '2026-10-08', days: 30, thresholds: { qaMinScore: 80, downtimeMaxHours: 8, budgetMaxPct: 100 },
  outlets: [outletRow('Kemang', ['sla'], { slaBreached: 2 }), outletRow('Senopati', ['qa'], { qaScore: 72 }), outletRow('Bekasi')] }
const MY_WORK = { approvals: { count: 1, items: [{ id: 'a1', number: 'APR-1', title: 'Beli kompresor', type: 'maintenance',
  outlet: 'Kemang', amount: 3_000_000, currency: 'IDR', stepOrder: 1, stepCount: 2, waitingSince: '2026-11-06T08:00:00Z', escalated: false }] },
  workOrders: null, tasks: null, readyToClose: null, guestWaiting: null }
const DUE_TODAY = { items: [{ id: 'i7', number: 'ISS-7', title: 'Chiller panas', outlet: 'Bandung Dago', priority: 'high', status: 'open' }], total: 3 }

const card = (title: string) => screen.getByText(title, { selector: 'p' }).closest('[data-kpi]') as HTMLElement

beforeEach(() => {
  api.get.mockResolvedValue(OVERVIEW)
  outlets.compare.mockResolvedValue(COMPARE)
  myWork.get.mockResolvedValue(MY_WORK)
  getPage.mockResolvedValue(DUE_TODAY)
  useIssueStore.setState({
    currentUser: { id: 'u1', permissions: { dashboard: 'view', issues: 'view' } } as unknown as User,
    issues: [], tasks: [], approvals: [],      // no lists needed any more
  })
})

afterEach(() => vi.restoreAllMocks())

describe('ExecutiveDashboardPage — today first (Todo-Modern-UI Fase 3)', () => {
  it('titles the page with how today is going', async () => {
    render(<ExecutiveDashboardPage />)
    expect(await screen.findByRole('heading', { level: 1, name: '2 outlets need attention · 1 issues past due' })).toBeInTheDocument()
  })

  it('says all is well when it is', async () => {
    outlets.compare.mockResolvedValue({ ...COMPARE, outlets: [outletRow('Bekasi')] })
    api.get.mockResolvedValue({ ...OVERVIEW, issues: { ...OVERVIEW.issues, slaBreached: 0 } })
    render(<ExecutiveDashboardPage />)
    expect(await screen.findByRole('heading', { level: 1, name: 'All outlets within limits today' })).toBeInTheDocument()
  })

  it('puts one ticket per outlet on the rail, most urgent first, each opening its issues', async () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    render(<ExecutiveDashboardPage />)
    const rail = await screen.findByRole('region', { name: 'Outlets today' })
    const tickets = within(rail).getAllByRole('button')
    expect(tickets.map((b) => b.textContent)).toEqual([
      expect.stringMatching(/2 past due.*Kemang/), expect.stringMatching(/QA score 72.*Senopati/), expect.stringMatching(/Normal.*Bekasi/)])
    await userEvent.click(tickets[0])
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues?outlet=Kemang')
  })

  it('lists the decisions waiting for me, then what goes past due today', async () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    useIssueStore.setState({ currentUser: { id: 'u1', permissions: { dashboard: 'view', issues: 'view', approvals: 'manage' } } as unknown as User })
    render(<ExecutiveDashboardPage />)
    const decisions = await screen.findByRole('region', { name: 'Waiting for your decision' })
    await userEvent.click(within(decisions).getByRole('button', { name: /Beli kompresor/ }))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/approvals/a1')

    const due = screen.getByRole('region', { name: 'Going past due today' })
    expect(within(due).getByText('Chiller panas')).toBeInTheDocument()
    expect(getPage).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/issues\?due=today&limit=5/))
    await userEvent.click(within(due).getByRole('button', { name: /See all/ }))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues?due=today')
  })

  it('leaves out what the role cannot open', async () => {
    myWork.get.mockResolvedValue({ ...MY_WORK, approvals: null })
    useIssueStore.setState({ currentUser: { id: 'u1', permissions: { dashboard: 'view' } } as unknown as User })
    render(<ExecutiveDashboardPage />)
    await screen.findByRole('region', { name: 'Outlets today' })
    expect(screen.queryByRole('region', { name: 'Waiting for your decision' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Going past due today' })).not.toBeInTheDocument()
    expect(getPage).not.toHaveBeenCalled()
  })
})

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
