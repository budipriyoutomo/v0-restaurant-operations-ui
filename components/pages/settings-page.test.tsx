// Settings — outlet summary opt-in (Todo-Pilot §25) and named switches (§26).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api-client', async (orig) => ({ ...(await orig<typeof import('@/lib/api-client')>()), api }))
// One theme source for the app: next-themes (top bar menu and this switch).
const theme = vi.hoisted(() => ({ resolvedTheme: 'light', setTheme: vi.fn() }))
vi.mock('next-themes', () => ({ useTheme: () => theme }))

import { SettingsPage } from './settings-page'

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockResolvedValue({})
  api.patch.mockResolvedValue({})
})

describe('SettingsPage', () => {
  it('a GM turns on the daily outlet summary', async () => {
    useIssueStore.setState({ currentUser: { id: 'u1', permissions: { dashboard: 'view' } } as unknown as User })
    render(<SettingsPage />)
    const daily = await screen.findByRole('switch', { name: 'Daily outlet summary' })
    expect(daily).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Weekly outlet summary' })).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(daily)

    expect(api.patch).toHaveBeenCalledWith('/api/auth/me/preferences', { preferences: expect.objectContaining({ digestDaily: true }) })
  })

  it('no summary for users who cannot open the dashboard', async () => {
    useIssueStore.setState({ currentUser: { id: 'u2', permissions: { issues: 'view' } } as unknown as User })
    render(<SettingsPage />)
    await screen.findByRole('switch', { name: 'Dark Mode' })
    expect(screen.queryByRole('switch', { name: /outlet summary/ })).not.toBeInTheDocument()
  })

  it('Dark Mode follows the app theme and does not overwrite it on open', async () => {
    useIssueStore.setState({ currentUser: { id: 'u3', name: 'Sari Dewi', email: 'sari@x.test', role_name: 'Manager', permissions: {} } as unknown as User })
    api.get.mockResolvedValue({ darkMode: false })
    document.documentElement.classList.add('dark')
    theme.resolvedTheme = 'dark'
    render(<SettingsPage />)
    const sw = await screen.findByRole('switch', { name: 'Dark Mode' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)     // the stored pref did not flip it
    await userEvent.click(sw)
    expect(theme.setTheme).toHaveBeenCalledWith('light')
    document.documentElement.classList.remove('dark')
    theme.resolvedTheme = 'light'
  })

  it('shows who is signed in', async () => {
    useIssueStore.setState({ currentUser: { id: 'u3', name: 'Sari Dewi', email: 'sari@x.test', role_name: 'Manager', company_name: 'PT Rasa', permissions: {} } as unknown as User })
    render(<SettingsPage />)
    const profile = await screen.findByRole('region', { name: 'Profile' })
    expect(profile).toHaveTextContent('Sari Dewi')
    expect(profile).toHaveTextContent('sari@x.test')
    expect(profile).toHaveTextContent('PT Rasa')
  })
})
