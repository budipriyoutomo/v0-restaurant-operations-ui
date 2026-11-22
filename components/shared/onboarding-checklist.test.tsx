// Onboarding checklist for a new company (Todo-Pilot §24 / UX-11). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

const api = vi.hoisted(() => ({ get: vi.fn(), createDemoData: vi.fn(), dismiss: vi.fn() }))
vi.mock('@/lib/onboarding-api', async (orig) => ({ ...(await orig<typeof import('@/lib/onboarding-api')>()), onboardingApi: api }))
const nav = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@/lib/use-route', async (orig) => ({ ...(await orig<typeof import('@/lib/use-route')>()), navigate: nav.navigate }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { OnboardingChecklist } from './onboarding-checklist'

const status = (done: string[], over = {}) => ({
  steps: ['outlets', 'users', 'masterData', 'assets', 'pm', 'approvalPolicy'].map((key) => ({ key, done: done.includes(key), count: 0 })),
  complete: done.length === 6, demoAvailable: false, dismissed: false, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  useIssueStore.setState({
    currentUser: { id: 'u1', permissions: { users: 'manage' } } as unknown as User,
    loadAll: vi.fn().mockResolvedValue(undefined),
  })
})

// Collapsed by default: one line under the page title (Todo-Modern-UI Fase 0).
const expand = async () => userEvent.click(await screen.findByRole('button', { expanded: false }))

describe('OnboardingChecklist', () => {
  it('starts as one line with the progress; the steps open on request', async () => {
    api.get.mockResolvedValue(status(['outlets']))
    render(<OnboardingChecklist />)
    const toggle = await screen.findByRole('button', { name: /set up your company.*1 of 6 done/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add demo data' })).not.toBeInTheDocument()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
  })

  it('lists the steps in order with progress; the next step opens its page', async () => {
    api.get.mockResolvedValue(status(['outlets']))
    render(<OnboardingChecklist />)
    expect(await screen.findByText('1 of 6 done')).toBeInTheDocument()
    await expand()
    const items = screen.getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringMatching(/outlets/i), expect.stringMatching(/users/i), expect.stringMatching(/categories/i),
      expect.stringMatching(/assets/i), expect.stringMatching(/preventive/i), expect.stringMatching(/approval/i),
    ])
    await userEvent.click(screen.getByRole('button', { name: /invite users/i }))
    expect(nav.navigate).toHaveBeenCalledWith('/users')
  })

  it('stays out of the way when setup is complete, hidden, or not the user\'s job', async () => {
    api.get.mockResolvedValue(status(['outlets', 'users', 'masterData', 'assets', 'pm', 'approvalPolicy']))
    const { container, unmount } = render(<OnboardingChecklist />)
    await vi.waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
    unmount()

    api.get.mockResolvedValue(status([], { dismissed: true }))
    const second = render(<OnboardingChecklist />)
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    expect(second.container).toBeEmptyDOMElement()
    second.unmount()

    useIssueStore.setState({ currentUser: { id: 'u2', permissions: { issues: 'view' } } as unknown as User })
    const third = render(<OnboardingChecklist />)
    expect(third.container).toBeEmptyDOMElement()
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('hide is remembered for the user', async () => {
    api.get.mockResolvedValue(status([]))
    api.dismiss.mockResolvedValue({})
    render(<OnboardingChecklist />)
    await userEvent.click(await screen.findByRole('button', { name: 'Hide checklist' }))
    expect(api.dismiss).toHaveBeenCalled()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('demo data after confirming, then reloads the app data', async () => {
    api.get.mockResolvedValueOnce(status([], { demoAvailable: true })).mockResolvedValue(status(['outlets', 'assets']))
    api.createDemoData.mockResolvedValue({ issues: ['ISS-1'], asset: 'AST-1', outlet: 'Demo' })
    render(<OnboardingChecklist />)
    await expand()
    await userEvent.click(await screen.findByRole('button', { name: 'Add demo data' }))
    expect(api.createDemoData).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Yes, add demo data' }))
    expect(api.createDemoData).toHaveBeenCalled()
    await vi.waitFor(() => expect(useIssueStore.getState().loadAll).toHaveBeenCalled())
    expect(await screen.findByText('2 of 6 done')).toBeInTheDocument()
  })
})
