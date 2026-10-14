// Work order drawer opened from a link (Todo-Pilot §14 / UX-1). Written first (TDD).
// /work-orders/{id} for a WO the API refuses (404) shows "not found", not an empty drawer.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  api: { get, post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/work-orders/wo-x',
  useSearchParams: () => new URLSearchParams(),
}))

import { WorkOrderDetailDrawer } from './cmms-page'

beforeEach(() => {
  get.mockReset()
  useIssueStore.setState({
    currentUser: { id: 'u1', permissions: { cmms: 'manage' } } as unknown as User,
    parts: [{ id: 'p1' }] as never, approvals: [], vendors: [],
    loadWorkOrderParts: vi.fn().mockResolvedValue([]),
  })
})

describe('WorkOrderDetailDrawer', () => {
  it('shows "not found" when the API answers 404', async () => {
    get.mockRejectedValue(new Error('API 404 /api/work-orders/wo-x: {"detail":"Work order not found"}'))
    render(<WorkOrderDetailDrawer woId="wo-x" onClose={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i)
  })

  it('is a labelled dialog with a close button', async () => {
    get.mockRejectedValue(new Error('API 404 /api/work-orders/wo-x'))
    render(<WorkOrderDetailDrawer woId="wo-x" onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })
})

// Assignee is a user (Todo-Pilot §17 / UX-4).
describe('WorkOrderDetailDrawer — assignee', () => {
  const budi = { id: 'u-budi', name: 'Budi', role_name: 'Technician', approval_tier: 'staff' }
  const detail = {
    id: 'wo-x', number: 'WO-2026-00009', title: 'Ganti kompresor', status: 'scheduled', priority: 'high',
    type: 'corrective', outlet: 'Jakarta', assetName: 'Freezer', assignee: 'Pak Joko', assigneeUserId: null,
    checklistItems: [], attachments: [], laborHours: 0, laborCost: 0, partsCost: 0, totalCost: 0, requiresApproval: false,
  }

  it('reassigns to a user and warns about the unlinked name before', async () => {
    get.mockResolvedValue(detail)
    const assignWorkOrder = vi.fn().mockResolvedValue({ ...detail, assignee: 'Budi', assigneeUserId: 'u-budi' })
    useIssueStore.setState({
      assignableUsers: { Jakarta: [budi] }, loadAssignableUsers: vi.fn().mockResolvedValue([budi]), assignWorkOrder,
    })
    render(<WorkOrderDetailDrawer woId="wo-x" onClose={() => {}} />)
    expect(await screen.findByRole('status')).toHaveTextContent(/Pak Joko is not linked/)
    await userEvent.selectOptions(screen.getByLabelText(/assignee/i), 'u-budi')
    expect(assignWorkOrder).toHaveBeenCalledWith('wo-x', 'u-budi')
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })
})

// Reasons before the click (Todo-Pilot §23 / UX-10).
describe('WorkOrderDetailDrawer — why an action is not possible', () => {
  const base = {
    id: 'wo-x', number: 'WO-2026-00009', title: 'Ganti kompresor', status: 'on-hold', priority: 'high',
    type: 'corrective', outlet: 'Jakarta', assetName: 'Freezer', assignee: 'Budi', assigneeUserId: 'u-budi',
    checklistItems: [], attachments: [], laborHours: 0, laborCost: 0, partsCost: 0, totalCost: 0,
    requiresApproval: true, approvalId: 'a1',
  }

  it('names the approval the work waits for', async () => {
    get.mockResolvedValue(base)
    useIssueStore.setState({
      approvals: [{ id: 'a1', number: 'APR-2026-00007', status: 'pending', currentStepOrder: 1, steps: [{}, {}] }] as never,
    })
    render(<WorkOrderDetailDrawer woId="wo-x" onClose={() => {}} />)
    const button = await screen.findByRole('button', { name: 'Waiting for Approval' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(/APR-2026-00007 \(step 1\/2\)/)
  })

  it('shows viewers the next step and who may take it, instead of nothing', async () => {
    get.mockResolvedValue({ ...base, status: 'scheduled', requiresApproval: false, approvalId: null })
    useIssueStore.setState({ currentUser: { id: 'u2', permissions: { cmms: 'view' } } as unknown as User })
    render(<WorkOrderDetailDrawer woId="wo-x" onClose={() => {}} />)
    const button = await screen.findByRole('button', { name: 'Start Work Order' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(/only users who manage cmms/i)
  })

  it('warns about open checklist items but still lets the manager complete', async () => {
    get.mockResolvedValue({
      ...base, status: 'in-progress', requiresApproval: false, approvalId: null,
      checklistItems: [{ id: 'c1', title: 'Cek', isDone: false }, { id: 'c2', title: 'Uji', isDone: true }],
    })
    render(<WorkOrderDetailDrawer woId="wo-x" onClose={() => {}} />)
    const button = await screen.findByRole('button', { name: 'Mark Completed' })
    expect(button).toBeEnabled()
    expect(button).toHaveAccessibleDescription(/1 of 2 checklist items are still open/)
  })
})
