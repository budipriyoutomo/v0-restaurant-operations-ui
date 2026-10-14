// AssigneePicker (Todo-Pilot §17 / UX-4). Written first (TDD).
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import { AssigneePicker } from './assignee-picker'

const users = [
  { id: 'u1', name: 'Budi', role_name: 'Technician', approval_tier: 'staff' },
  { id: 'u2', name: 'Siti', role_name: 'Manager', approval_tier: 'manager' },
]

let load: ReturnType<typeof vi.fn>
beforeEach(() => {
  load = vi.fn().mockResolvedValue(users)
  useIssueStore.setState({ assignableUsers: { Jakarta: users }, loadAssignableUsers: load })
})

describe('AssigneePicker', () => {
  it('offers the users who can work at the outlet, with their role', () => {
    render(<AssigneePicker id="a" outlet="Jakarta" value={null} onChange={() => {}} />)
    expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Budi — Technician' })).toBeInTheDocument()
    expect(load).toHaveBeenCalledWith('Jakarta')
  })

  it('reports the chosen user id and name', async () => {
    const onChange = vi.fn()
    render(<><label htmlFor="a">Assign To</label><AssigneePicker id="a" outlet="Jakarta" value={null} onChange={onChange} /></>)
    await userEvent.selectOptions(screen.getByLabelText('Assign To'), 'u2')
    expect(onChange).toHaveBeenLastCalledWith('u2', 'Siti')
    await userEvent.selectOptions(screen.getByLabelText('Assign To'), '')
    expect(onChange).toHaveBeenLastCalledWith(null, 'Unassigned')
  })

  it('keeps a legacy free-text assignee visible and warns it gets no notifications', () => {
    render(<AssigneePicker id="a" outlet="Jakarta" value={null} legacyName="Pak Joko" onChange={() => {}} />)
    expect(screen.getByRole('option', { name: 'Pak Joko (not a user)' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Pak Joko is not linked to a user account and will not be notified.')
  })

  it('loads the list when the outlet changes', async () => {
    const { rerender } = render(<AssigneePicker id="a" outlet="Jakarta" value={null} onChange={() => {}} />)
    rerender(<AssigneePicker id="a" outlet="Bandung" value={null} onChange={() => {}} />)
    await waitFor(() => expect(load).toHaveBeenLastCalledWith('Bandung'))
  })
})
