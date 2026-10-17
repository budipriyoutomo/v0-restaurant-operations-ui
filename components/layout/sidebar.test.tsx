// Sidebar: fewer, foldable groups so a role only sees what it works with.
// Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'
import { Sidebar } from './sidebar'

function asUser(permissions: Record<string, string>) {
  useIssueStore.setState({ currentUser: { id: 'u', permissions } as unknown as User })
}

const nav = () => screen.getByRole('navigation', { name: 'Sidebar' })

beforeEach(() => {
  try { window.localStorage.clear() } catch { /* ignore */ }
  asUser({ issues: 'view', tasks: 'view', cmms: 'view', qa: 'view', users: 'view' })
})

describe('Sidebar', () => {
  it('hides groups the role has no page in', () => {
    render(<Sidebar collapsed={false} onToggle={() => {}} currentPage="my-work" onNavigate={() => {}} />)
    expect(within(nav()).queryByRole('button', { name: /^Insights/ })).not.toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: /^Operations Modules/ })).toBeInTheDocument()
  })

  it('keeps the core workflow open and folds the other groups', async () => {
    render(<Sidebar collapsed={false} onToggle={() => {}} currentPage="my-work" onNavigate={() => {}} />)
    expect(within(nav()).getByRole('button', { name: 'Issues' })).toBeInTheDocument()
    expect(within(nav()).queryByRole('button', { name: 'CMMS' })).not.toBeInTheDocument()

    const modules = within(nav()).getByRole('button', { name: /^Operations Modules/ })
    expect(modules).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(modules)
    expect(modules).toHaveAttribute('aria-expanded', 'true')
    expect(within(nav()).getByRole('button', { name: 'CMMS' })).toBeInTheDocument()
  })

  it('opens the group holding the current page', () => {
    render(<Sidebar collapsed={false} onToggle={() => {}} currentPage="cmms" onNavigate={() => {}} />)
    expect(within(nav()).getByRole('button', { name: 'CMMS' })).toHaveAttribute('aria-current', 'page')
  })

  it('no longer lists notifications (the bell has them)', () => {
    render(<Sidebar collapsed={false} onToggle={() => {}} currentPage="my-work" onNavigate={() => {}} />)
    expect(within(nav()).queryByRole('button', { name: /Notifications/ })).not.toBeInTheDocument()
  })

  it('navigates and shows counts', async () => {
    const onNavigate = vi.fn()
    render(<Sidebar collapsed={false} onToggle={() => {}} currentPage="my-work" onNavigate={onNavigate}
      badges={{ issues: 4, tasks: 0, approvals: 0, notifications: 0 }} />)
    const issues = within(nav()).getByRole('button', { name: /^Issues/ })
    expect(issues).toHaveTextContent('4')
    await userEvent.click(issues)
    expect(onNavigate).toHaveBeenCalledWith('issues')
  })

  it('shows every page as an icon when collapsed', () => {
    render(<Sidebar collapsed onToggle={() => {}} currentPage="my-work" onNavigate={() => {}} />)
    expect(within(nav()).getByRole('button', { name: 'CMMS' })).toBeInTheDocument()
  })
})
