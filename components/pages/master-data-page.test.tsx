// Master Data in the Papan Servis pattern (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import { SYSTEM_CATEGORIES } from '@/lib/categories.fixture'
import type { Outlet, PIC, User } from '@/lib/types'

vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/master-data', useSearchParams: () => new URLSearchParams() }))

import { MasterDataPage } from './master-data-page'

beforeEach(() => {
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { 'master-data': 'manage' }, all_outlets: true } as unknown as User,
    masterDataLoading: false,
    outlets: [{ id: 'o1', name: 'Kemang', code: 'KMG', status: 'warning', approvalThreshold: null, approvalThresholdDefault: 1_000_000 }] as unknown as Outlet[],
    categories: SYSTEM_CATEGORIES,
    pics: [{ id: 'p1', name: 'Rudi', email: 'r@x.test', phone: '0812', categories: ['cat-maintenance', 'cat-other'] }] as unknown as PIC[],
    approvalPolicies: [], assignmentRules: [],
  })
})

const noPill = (el: HTMLElement) => expect(el.closest('span')!.className).not.toMatch(/rounded-full|px-2/)

describe('MasterDataPage', () => {
  it('an outlet status is a label with its signal', () => {
    render(<MasterDataPage />)
    const status = screen.getByText('Warning')
    expect(status.closest('span')).toHaveClass('text-warning')
    noPill(status)
  })

  it('a category names its module and system lock as plain text — maintenance is not a warning', async () => {
    render(<MasterDataPage />)
    await userEvent.click(screen.getByRole('tab', { name: /^Categories/ }))
    const module = screen.getAllByText('Maintenance', { selector: 'span' })[0]
    expect(module).not.toHaveClass('text-warning')
    noPill(module)
    noPill(screen.getAllByText('System')[0])
  })

  it('a PIC lists its categories as text, not pills', async () => {
    render(<MasterDataPage />)
    await userEvent.click(screen.getByRole('tab', { name: /^PIC/ }))
    expect(screen.getByText('Maintenance · Other')).toBeInTheDocument()
  })
})
