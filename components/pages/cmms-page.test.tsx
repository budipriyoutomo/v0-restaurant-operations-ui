// CMMS page in the Papan Servis pattern (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { Asset, User, WorkOrder } from '@/lib/types'

vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/lib/use-ensure-loaded', () => ({ useEnsureLoaded: () => {} }))
vi.mock('next/navigation', () => ({ usePathname: () => '/cmms', useSearchParams: () => new URLSearchParams() }))

import { CMMSPage } from './cmms-page'

const asset = (id: string, over: Partial<Asset> = {}) => ({
  id, number: `AST-${id}`, name: `Asset ${id}`, outlet: 'Kemang', status: 'operational',
  lastPM: '2026-10-01', nextPM: '2026-12-01', ...over }) as Asset
const wo = (id: string, over: Partial<WorkOrder> = {}) => ({
  id, number: `WO-${id}`, assetId: 'a1', assetName: 'Freezer', outlet: 'Kemang', type: 'corrective',
  status: 'scheduled', priority: 'high', assignee: 'Rudi Hartono', scheduledDate: '2099-01-01', ...over }) as unknown as WorkOrder

beforeEach(() => {
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { cmms: 'manage', assets: 'manage' }, all_outlets: true } as unknown as User,
    assets: [asset('a1', { name: 'Freezer', status: 'critical' })], workOrders: [wo('1'), wo('2', { scheduledDate: '2020-01-01' })],
    cmmsLoading: false, pmSchedules: [], parts: [], vendors: [],
  })
})

describe('CMMSPage', () => {
  it('sums up in one status bar: open work orders with how many are late', () => {
    render(<CMMSPage />)
    const kpi = screen.getByRole('region', { name: 'Assets & maintenance summary' })
    expect(within(kpi).getByText('Open Work Orders').closest('div')).toHaveTextContent('2')
    expect(within(kpi).getByText('1 overdue')).toBeInTheDocument()
  })

  it('shows no status bar before the first asset or work order', () => {
    useIssueStore.setState({ assets: [], workOrders: [] })
    render(<CMMSPage />)
    expect(screen.queryByRole('region', { name: 'Assets & maintenance summary' })).not.toBeInTheDocument()
    expect(screen.getByText('No assets registered yet.')).toBeInTheDocument()
  })

  it('an asset status is a label with its signal, not a pill', () => {
    render(<CMMSPage />)
    const status = within(screen.getByRole('table')).getByText('Critical')
    expect(status.closest('span')).toHaveClass('text-destructive')
    expect(status.closest('span')).not.toHaveClass('border')
  })

  it('an asset row opens with the keyboard', async () => {
    render(<CMMSPage />)
    const open = within(screen.getByRole('table')).getByRole('button', { name: /Freezer/ })
    expect(open).toHaveAttribute('aria-expanded', 'false')
    open.focus()
    await userEvent.keyboard('{Enter}')
    expect(open).toHaveAttribute('aria-expanded', 'true')
  })

  it('a work order is one button named by its number and asset', async () => {
    const push = vi.spyOn(window.history, 'pushState')
    render(<CMMSPage />)
    const list = screen.getByRole('list', { name: 'Work Orders' })
    await userEvent.click(within(list).getByRole('button', { name: /WO-1 Freezer/ }))
    expect(push).toHaveBeenCalledWith(null, '', '/work-orders/1')
  })
})
