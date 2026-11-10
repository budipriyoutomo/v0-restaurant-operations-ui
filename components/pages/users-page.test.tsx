// Users: one KPI status bar (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/lib/use-ensure-loaded', () => ({ useEnsureLoaded: () => {} }))
vi.mock('next/navigation', () => ({ usePathname: () => '/users', useSearchParams: () => new URLSearchParams() }))

import { UsersPage } from './users-page'

beforeEach(() => {
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { users: 'manage' }, all_outlets: true } as unknown as User,
    roles: [], loadRoles: vi.fn().mockResolvedValue([]),
  })
})

describe('UsersPage', () => {
  it('while users load, the status bar shows placeholders — never a red 0 admins', () => {
    useIssueStore.setState({ allUsers: [], usersLoading: true })
    render(<UsersPage />)
    const kpi = screen.getByRole('region', { name: 'Users summary' })
    expect(kpi).toHaveAttribute('aria-busy', 'true')
    expect(within(kpi).queryByText('0')).not.toBeInTheDocument()
  })

  it('admins are a plain count, not an alarm', () => {
    useIssueStore.setState({ usersLoading: false, allUsers: [
      { id: 'a', name: 'A', email: 'a@x.test', role: 'admin', role_name: 'Admin', is_active: true, outlet_ids: [], all_outlets: true },
      { id: 'b', name: 'B', email: 'b@x.test', role: 'staff', role_name: 'Staff', is_active: true, outlet_ids: [], all_outlets: false },
    ] as never })
    render(<UsersPage />)
    const kpi = screen.getByRole('region', { name: 'Users summary' })
    for (const n of within(kpi).getAllByText(/^\d+$/)) expect(n).not.toHaveClass('text-destructive')
  })
})
