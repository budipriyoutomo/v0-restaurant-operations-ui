// Marketing in the Papan Servis pattern (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { Campaign, Issue, User } from '@/lib/types'

vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  api: { get: vi.fn().mockResolvedValue(null), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/lib/use-ensure-loaded', () => ({ useEnsureLoaded: () => {} }))
vi.mock('next/navigation', () => ({ usePathname: () => '/marketing', useSearchParams: () => new URLSearchParams() }))

import { MarketingPage } from './marketing-page'

const issue = { id: 'i1', number: 'ISS-2026-00030', title: 'Spanduk promo rusak', description: '', outlet: 'Senopati', category: 'Marketing',
  priority: 'low', status: 'open', assignee: 'Dewi', dueDate: null, createdDate: '2026-11-01', taskIds: [], closureBlockers: [] } as unknown as Issue
const campaign = { id: 'c1', title: 'Promo akhir tahun', status: 'completed', type: 'promotion', outlet: null, pic: null, budget: null,
  budget_legacy: null, actual_cost: null, result_revenue: null, result_transactions: null, currency: 'IDR', start_date: null, end_date: null,
  metrics: {} } as unknown as Campaign

beforeEach(() => {
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { issues: 'manage', campaigns: 'manage' }, all_outlets: true } as unknown as User,
    issues: [issue], approvals: [], campaigns: [campaign], campaignsLoading: false,
  })
})

describe('MarketingPage', () => {
  it('sums up in one status bar', () => {
    render(<MarketingPage />)
    const kpi = screen.getByRole('region', { name: 'Marketing summary' })
    expect(within(kpi).getByText('Total Campaigns').closest('div')).toHaveTextContent('1')
  })

  it('no status bar before the first campaign', () => {
    useIssueStore.setState({ campaigns: [] })
    render(<MarketingPage />)
    expect(screen.queryByRole('region', { name: 'Marketing summary' })).not.toBeInTheDocument()
  })

  it('a campaign status is a label and its type plain text — no pills', () => {
    render(<MarketingPage />)
    const status = screen.getByText('Completed', { selector: 'span' })
    expect(status).toHaveClass('text-success')
    expect(screen.getByText('Promotion')).not.toHaveClass('bg-primary/10')
  })

  it('marketing issues are dense rows that open the issue', async () => {
    render(<MarketingPage />)
    await userEvent.click(screen.getByRole('tab', { name: /issues/i }))
    expect(screen.getByRole('button', { name: 'ISS-2026-00030 Spanduk promo rusak' })).toHaveAccessibleDescription(/Senopati.*Dewi/)
  })
})
