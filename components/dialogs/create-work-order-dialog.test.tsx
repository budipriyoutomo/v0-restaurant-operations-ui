// CreateWorkOrderDialog — assignee is a user of the asset's outlet (Todo-Pilot §17).
// Written first (TDD). Also: every field reachable by its label (UX-13).
import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { Asset, CreateWorkOrderInput } from '@/lib/types'
import { CreateWorkOrderDialog } from './create-work-order-dialog'

const assets = [
  { id: 'a-jkt', name: 'Kompor JKT', number: 'AST-1', category: 'Kitchen', outlet: 'Jakarta' },
  { id: 'a-bdg', name: 'Kompor BDG', number: 'AST-2', category: 'Kitchen', outlet: 'Bandung' },
] as Asset[]
const budi = { id: 'u-budi', name: 'Budi', role_name: 'Technician', approval_tier: 'staff' }
const siti = { id: 'u-siti', name: 'Siti', role_name: 'Technician', approval_tier: 'staff' }

function setup() {
  useIssueStore.setState({
    assignableUsers: { Jakarta: [budi], Bandung: [siti] },
    loadAssignableUsers: async (o: string) => (o === 'Jakarta' ? [budi] : [siti]),
  })
  const onSubmit = vi.fn<(i: CreateWorkOrderInput) => Promise<void>>().mockResolvedValue(undefined)
  render(<CreateWorkOrderDialog open onOpenChange={() => {}} assets={assets} onSubmit={onSubmit} />)
  return { onSubmit, user: userEvent.setup() }
}

describe('CreateWorkOrderDialog', () => {
  it('labels every field', () => {
    setup()
    for (const l of [/^asset/i, /^title/i, /description/i, /priority/i, /assign to/i, /scheduled date/i]) {
      expect(screen.getByLabelText(l)).toBeInTheDocument()
    }
  })

  it('offers the users of the selected asset\'s outlet and sends the chosen id', async () => {
    const { user, onSubmit } = setup()
    expect(screen.getByRole('option', { name: 'Budi — Technician' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/^asset/i), 'a-bdg')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Siti — Technician' })).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: 'Budi — Technician' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/assign to/i), 'u-siti')
    await user.type(screen.getByLabelText(/^title/i), 'Ganti burner')
    await user.click(screen.getByRole('button', { name: /create work order/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ assetId: 'a-bdg', assignee: 'Siti', assigneeUserId: 'u-siti' })
  })
})
