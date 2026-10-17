// ⌘K search: jump to any page the role can open, or start a report.
// Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'
import { CommandMenu } from './command-menu'

beforeAll(() => {
  // cmdk measures and scrolls its list; jsdom has neither.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never
  Element.prototype.scrollIntoView ??= () => {}
})

let pushState: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  pushState = vi.spyOn(window.history, 'pushState')
  useIssueStore.setState({ currentUser: { id: 'u', permissions: { issues: 'view', cmms: 'view' } } as unknown as User })
})
afterEach(() => vi.restoreAllMocks())

describe('CommandMenu', () => {
  it('opens with Ctrl+K / ⌘K', async () => {
    render(<CommandMenu />)
    expect(screen.queryByPlaceholderText('Search pages or actions…')).not.toBeInTheDocument()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.getByPlaceholderText('Search pages or actions…')).toBeInTheDocument()
  })

  it('lists only pages the role can open', async () => {
    render(<CommandMenu open onOpenChange={() => {}} />)
    expect(screen.getByRole('option', { name: /CMMS/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Users & Roles/ })).not.toBeInTheDocument()
  })

  it('filters and navigates to the chosen page', async () => {
    const onOpenChange = vi.fn()
    render(<CommandMenu open onOpenChange={onOpenChange} />)
    await userEvent.type(screen.getByPlaceholderText('Search pages or actions…'), 'cmms')
    await userEvent.keyboard('{Enter}')
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/cmms')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('offers reporting a new issue', async () => {
    render(<CommandMenu open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('option', { name: /Report a new issue/ }))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues?new=1')
  })
})
