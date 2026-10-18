// Opened with no signal and nothing loaded yet (Todo-PWA, verifikasi akhir):
// the screen says so, and "Lapor" still opens the form with the outlets and
// categories kept on this device.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import { SYSTEM_CATEGORIES } from '@/lib/categories.fixture'
import type { Outlet, User } from '@/lib/types'

const nav = vi.hoisted(() => ({ search: '' }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/issues',
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import { OfflineHome } from './offline-home'

const staff = { id: 'u1', name: 'Sari', all_outlets: false, effective_outlet_ids: ['o1'], permissions: { issues: 'view' } } as unknown as User

beforeEach(() => {
  nav.search = ''
  useIssueStore.setState({
    currentUser: staff,
    outlets: [{ id: 'o1', name: 'KL Central' }, { id: 'o2', name: 'Bangsar' }] as Outlet[],
    categories: SYSTEM_CATEGORIES,
  })
})

describe('OfflineHome', () => {
  it('explains the wait and offers to report', async () => {
    render(<OfflineHome />)
    expect(screen.getByText('Waiting for a connection')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Report a problem' }))
    const dialog = screen.getByRole('dialog', { name: 'Report a problem' })
    expect(dialog).toHaveTextContent('KL Central')          // the staff member's own outlet
    expect(dialog).not.toHaveTextContent('Bangsar')
    expect(screen.getByRole('radio', { name: 'Maintenance' })).toBeChecked()
  })

  it('"Lapor" in the bottom bar (/issues?new=1) opens the form straight away', () => {
    nav.search = 'new=1'
    render(<OfflineHome />)
    expect(screen.getByRole('dialog', { name: 'Report a problem' })).toBeInTheDocument()
  })

  it('no report button for a role that cannot see issues', () => {
    useIssueStore.setState({ currentUser: { ...staff, permissions: { dashboard: 'view' } } as unknown as User })
    render(<OfflineHome />)
    expect(screen.queryByRole('button', { name: 'Report a problem' })).not.toBeInTheDocument()
  })
})
