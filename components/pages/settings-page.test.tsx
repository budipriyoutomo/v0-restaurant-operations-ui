// Settings — outlet summary opt-in (Todo-Pilot §25) and named switches (§26).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api-client', async (orig) => ({ ...(await orig<typeof import('@/lib/api-client')>()), api }))

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
})
