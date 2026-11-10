// Guest Service in the Papan Servis pattern (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

const guest = vi.hoisted(() => ({ list: vi.fn(), kpis: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/guest-service-api', () => ({ guestApi: guest }))
vi.mock('next/navigation', () => ({ usePathname: () => '/guest-service', useSearchParams: () => new URLSearchParams() }))

import { GuestPage } from './guest-page'

const old = new Date(Date.now() - 3 * 3600_000).toISOString()
const kase = { id: 'g1', issueNumber: 'ISS-2026-00040', title: 'Makanan dingin', channel: 'walk-in', guestName: 'Pak Andi', outlet: 'Kemang',
  status: 'open', reportedAt: old, firstResponseAt: null, firstResponseMinutes: null, compensationType: 'none', compensationValue: 0 }

beforeEach(() => {
  guest.list.mockResolvedValue([kase])
  guest.kpis.mockResolvedValue({ targetMinutes: 60 })
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { 'guest-service': 'manage', issues: 'manage' }, all_outlets: true } as unknown as User,
    outlets: [{ id: 'o1', name: 'Kemang' }] as never,
  })
})

describe('GuestPage', () => {
  it('complaints are dense rows: channel as text, status and response time on the right', async () => {
    render(<GuestPage />)
    const row = await screen.findByRole('button', { name: 'ISS-2026-00040 Makanan dingin' })
    expect(row).toHaveAccessibleDescription(/Walk-in.*Pak Andi.*Kemang.*Open.*Overdue/i)
    expect(screen.getByText('Walk-in')).not.toHaveClass('bg-muted')
  })

  it('the overdue count on the tab is text in the action colour, not a pill', async () => {
    render(<GuestPage />)
    const count = await screen.findByText(/1 overdue/i, { selector: 'span' })
    expect(count).toHaveClass('text-destructive')
    expect(count).not.toHaveClass('rounded-full')
  })

  it('the new complaint dialog is named by its heading', async () => {
    render(<GuestPage />)
    await userEvent.click(screen.getByRole('button', { name: /new complaint/i }))
    expect(screen.getByRole('dialog', { name: /complaint/i })).toBeInTheDocument()
  })
})
