// Bottom navigation on phones (Todo-Pilot §19 / UX-6). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'
import { BottomNav } from './bottom-nav'

let pushState: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  pushState = vi.spyOn(window.history, 'pushState')
  useIssueStore.setState({ currentUser: { id: 'u', permissions: { issues: 'view' } } as unknown as User, unreadCount: 3 })
})
afterEach(() => vi.restoreAllMocks())

describe('BottomNav', () => {
  it('has the five thumb-sized entries', () => {
    render(<BottomNav currentPage="my-work" />)
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    for (const name of [/^Home$/, /^Report$/, /^My Work$/, /^Alerts/, /^Account$/]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(nav.className).toContain('md:hidden')
    expect(screen.getByRole('button', { name: /^My Work$/ })).toHaveAttribute('aria-current', 'page')
  })

  it('Report opens the new-issue form from anywhere', async () => {
    render(<BottomNav currentPage="dashboard" />)
    await userEvent.click(screen.getByRole('button', { name: /^Report$/ }))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues?new=1')
  })

  it('shows unread notifications', () => {
    render(<BottomNav currentPage="dashboard" />)
    expect(screen.getByRole('button', { name: /^Alerts/ })).toHaveTextContent('3')
  })

  it('hides Report from roles that cannot report issues', () => {
    useIssueStore.setState({ currentUser: { id: 'u', permissions: {} } as unknown as User })
    render(<BottomNav currentPage="my-work" />)
    expect(screen.queryByRole('button', { name: /^Report$/ })).not.toBeInTheDocument()
  })
})
