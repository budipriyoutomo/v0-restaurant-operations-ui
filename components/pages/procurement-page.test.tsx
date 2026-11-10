// Procurement in the Papan Servis pattern (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { ApprovalRequest, Issue, User, Vendor } from '@/lib/types'

vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  api: { get: vi.fn().mockResolvedValue([]), getPage: vi.fn().mockResolvedValue({ items: [], total: 0 }), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/lib/use-ensure-loaded', () => ({ useEnsureLoaded: () => {} }))
vi.mock('next/navigation', () => ({ usePathname: () => '/procurement', useSearchParams: () => new URLSearchParams() }))

import { ProcurementPage } from './procurement-page'

const request = { id: 'i1', number: 'ISS-2026-00010', title: 'Beli kompor baru', description: '', outlet: 'Kemang', category: 'Procurement',
  priority: 'high', status: 'open', assignee: 'Budi', dueDate: null, createdDate: '2026-11-01', taskIds: [], closureBlockers: [] } as unknown as Issue
const approval = { id: 'a1', number: 'APR-2026-00004', type: 'procurement', title: 'Kompor 2 tungku', outlet: 'Kemang', requester: 'Budi',
  amount: 4_500_000, currency: 'IDR', status: 'pending', steps: [], currentStepOrder: 1 } as unknown as ApprovalRequest
const vendor = { id: 'v1', name: 'CV Dapur Jaya', category: 'Peralatan', is_active: true, outlet: null } as unknown as Vendor

beforeEach(() => {
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { issues: 'manage', vendors: 'manage', budgets: 'view', approvals: 'view' }, all_outlets: true } as unknown as User,
    issues: [request], approvals: [approval], vendors: [vendor], vendorsLoading: false, purchaseRequests: [], procurementLoading: false,
  })
})

describe('ProcurementPage', () => {
  it('sums up in one status bar, pending approvals as waiting', () => {
    render(<ProcurementPage />)
    const kpi = screen.getByRole('region', { name: 'Procurement summary' })
    expect(within(kpi).getByText('Pending Approval').nextElementSibling).toHaveClass('text-warning')
    expect(within(kpi).getByText('Active Vendors').closest('div')).toHaveTextContent('1')
  })

  it('no status bar for a company without requests, approvals or vendors', () => {
    useIssueStore.setState({ issues: [], approvals: [], vendors: [] })
    render(<ProcurementPage />)
    expect(screen.queryByRole('region', { name: 'Procurement summary' })).not.toBeInTheDocument()
  })

  it('requests are dense rows that open the issue', async () => {
    const push = vi.spyOn(window.history, 'pushState')
    render(<ProcurementPage />)
    const row = within(screen.getByRole('list', { name: /requests/i })).getByRole('button', { name: 'ISS-2026-00010 Beli kompor baru' })
    expect(row).toHaveAccessibleDescription(/Kemang.*Budi/)
    await userEvent.click(row)
    expect(push).toHaveBeenCalledWith(null, '', '/issues/i1')
  })

  it('approvals show the amount and the status as text, without a type pill or a second icon', async () => {
    render(<ProcurementPage />)
    await userEvent.click(screen.getByRole('tab', { name: /approvals/i }))
    const row = screen.getByRole('button', { name: 'APR-2026-00004 Kompor 2 tungku' })
    expect(row).toHaveTextContent('Pending')
    expect(row).toHaveTextContent(/4\.500\.000/)
    expect(row.querySelector('svg')).toBeNull()
  })

  it('a vendor says active as a label, not a pill', async () => {
    render(<ProcurementPage />)
    await userEvent.click(screen.getByRole('tab', { name: /vendors/i }))
    const active = screen.getByText('Active', { selector: 'span' })
    expect(active).toHaveClass('text-success')
    expect(active).not.toHaveClass('bg-success/15')
  })
})
