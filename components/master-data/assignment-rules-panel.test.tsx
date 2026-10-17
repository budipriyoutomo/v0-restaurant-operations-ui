// Assignment rules panel (Todo-Ops-Checklist P2). Written first (TDD).
// Category × outlet → user; outlet empty = every outlet.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssignmentRulesPanel } from './assignment-rules-panel'
import { useIssueStore } from '@/lib/store'
import { SYSTEM_CATEGORIES } from '@/lib/categories.fixture'
import type { AssignmentRule, Outlet, User } from '@/lib/types'

const outlets = [
  { id: 'o-dago', name: 'Dago', code: 'DAGO', status: 'operational' },
  { id: 'o-bdg', name: 'Bandung', code: 'BDG', status: 'operational' },
] as Outlet[]
const budi = { id: 'u-budi', name: 'Budi', role_name: 'Teknisi', approval_tier: 'staff' }
const andi = { id: 'u-andi', name: 'Andi', role_name: 'Teknisi', approval_tier: 'staff' }
const rule: AssignmentRule = {
  id: 'r1', categoryId: 'cat-maintenance', categoryName: 'Maintenance', outletId: 'o-dago', outlet: 'Dago',
  assigneeUserId: 'u-budi', assigneeName: 'Budi', assigneeActive: true,
}

function setup(over: Partial<ReturnType<typeof useIssueStore.getState>> = {}) {
  const createAssignmentRule = vi.fn().mockResolvedValue(rule)
  const updateAssignmentRule = vi.fn().mockResolvedValue(rule)
  const deleteAssignmentRule = vi.fn().mockResolvedValue(undefined)
  const loadAssignableUsers = vi.fn(async (outlet: string) => (outlet === 'Dago' ? [budi, andi] : [andi]))
  useIssueStore.setState({
    currentUser: { id: 'u1', name: 'Admin', permissions: { 'master-data': 'manage' } } as unknown as User,
    categories: SYSTEM_CATEGORIES, outlets,
    assignmentRules: [rule], loadAssignmentRules: vi.fn().mockResolvedValue(undefined),
    createAssignmentRule, updateAssignmentRule, deleteAssignmentRule, loadAssignableUsers,
    ...over,
  })
  render(<AssignmentRulesPanel />)
  return { createAssignmentRule, updateAssignmentRule, deleteAssignmentRule, loadAssignableUsers, user: userEvent.setup() }
}

describe('AssignmentRulesPanel', () => {
  beforeEach(() => { useIssueStore.setState({ assignmentRules: [] }) })

  it('lists rules with category, outlet and assignee', () => {
    setup()
    const row = screen.getByRole('row', { name: /maintenance/i })
    expect(within(row).getByText('Dago')).toBeInTheDocument()
    expect(within(row).getByText('Budi')).toBeInTheDocument()
  })

  it('shows "all outlets" for a rule without outlet and warns about an inactive assignee', () => {
    setup({ assignmentRules: [{ ...rule, outletId: null, outlet: null, assigneeActive: false }] })
    const row = screen.getByRole('row', { name: /maintenance/i })
    expect(within(row).getByText(/all outlets/i)).toBeInTheDocument()
    expect(within(row).getByText(/inactive/i)).toBeInTheDocument()
  })

  it('adds a rule — the assignee list follows the outlet', async () => {
    const { user, createAssignmentRule, loadAssignableUsers } = setup()
    await user.selectOptions(screen.getByLabelText(/^category$/i), 'cat-it_support')
    await user.selectOptions(screen.getByLabelText(/^outlet$/i), 'o-dago')
    await waitFor(() => expect(loadAssignableUsers).toHaveBeenCalledWith('Dago'))
    await user.selectOptions(await screen.findByLabelText(/^assign to$/i), 'u-budi')
    await user.click(screen.getByRole('button', { name: /add rule/i }))
    expect(createAssignmentRule).toHaveBeenCalledWith({ categoryId: 'cat-it_support', outletId: 'o-dago', assigneeUserId: 'u-budi' })
  })

  it('an empty outlet makes an all-outlets rule', async () => {
    const { user, createAssignmentRule, loadAssignableUsers } = setup()
    await user.selectOptions(screen.getByLabelText(/^category$/i), 'cat-compliance')
    await waitFor(() => expect(loadAssignableUsers).toHaveBeenCalledWith(''))
    await user.selectOptions(await screen.findByLabelText(/^assign to$/i), 'u-andi')
    await user.click(screen.getByRole('button', { name: /add rule/i }))
    expect(createAssignmentRule).toHaveBeenCalledWith({ categoryId: 'cat-compliance', outletId: null, assigneeUserId: 'u-andi' })
  })

  it('deletes a rule', async () => {
    const { user, deleteAssignmentRule } = setup()
    const row = screen.getByRole('row', { name: /maintenance/i })
    await user.click(within(row).getByRole('button', { name: /delete/i }))
    expect(deleteAssignmentRule).toHaveBeenCalledWith('r1')
  })

  it('is read-only without master-data:manage', () => {
    setup({ currentUser: { id: 'u2', name: 'Staff', permissions: { 'master-data': 'view' } } as unknown as User })
    expect(screen.queryByRole('button', { name: /add rule/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})
