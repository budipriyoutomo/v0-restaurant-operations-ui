// Platform admin page (Todo-Pilot §11, React Testing Library). Written first (TDD).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlatformCompany } from '@/lib/platform-api'

const { logout, platformApi } = vi.hoisted(() => ({
  logout: vi.fn(),
  platformApi: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
vi.mock('@/lib/store', () => ({
  useIssueStore: () => ({ currentUser: { name: 'Ops', email: 'ops@platform.id', is_platform_admin: true }, logout }),
}))
vi.mock('@/lib/platform-api', () => ({ platformApi }))

import { PlatformPage } from './platform-page'

const company = (over: Partial<PlatformCompany> = {}): PlatformCompany => ({
  id: 'c1', name: 'Default Company', slug: 'default', is_active: true, created_at: '2026-06-01T00:00:00Z',
  user_count: 12, outlet_count: 6, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  platformApi.list.mockResolvedValue([company()])
})

const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

describe('PlatformPage', () => {
  it('lists every company with its counts and status', async () => {
    platformApi.list.mockResolvedValue([company(), company({ id: 'c2', name: 'PT Beta', slug: 'pt-beta', is_active: false, user_count: 3, outlet_count: 1 })])
    render(<PlatformPage />)
    expect(await screen.findByRole('row', { name: /Default Company/ })).toBeInTheDocument()
    expect(within(row('Default Company')).getByText('12')).toBeInTheDocument()
    expect(within(row('Default Company')).getByText('Active')).toBeInTheDocument()
    expect(within(row('PT Beta')).getByText('Inactive')).toBeInTheDocument()
  })

  it('creates a company and shows the generated admin password once', async () => {
    const user = userEvent.setup()
    platformApi.create.mockResolvedValue({
      company: company({ id: 'c9', name: 'PT Sate Senayan', slug: 'pt-sate-senayan', user_count: 1, outlet_count: 1 }),
      admin_email: 'rina@sate.id', admin_password: 'Gen3rated-Pass',
    })
    render(<PlatformPage />)
    await screen.findByRole('row', { name: /Default Company/ })
    await user.click(screen.getByRole('button', { name: /new company/i }))
    await user.type(screen.getByLabelText(/company name/i), 'PT Sate Senayan')
    expect(screen.getByText('pt-sate-senayan')).toBeInTheDocument()        // slug preview
    await user.type(screen.getByLabelText(/admin name/i), 'Rina')
    await user.type(screen.getByLabelText(/admin email/i), 'rina@sate.id')
    await user.type(screen.getByLabelText(/first outlet/i), 'Senayan City')
    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => expect(platformApi.create).toHaveBeenCalledTimes(1))
    expect(platformApi.create.mock.calls[0][0]).toMatchObject({ name: 'PT Sate Senayan', adminEmail: 'rina@sate.id', outletName: 'Senayan City' })
    const result = await screen.findByRole('status')
    expect(result).toHaveTextContent('rina@sate.id')
    expect(result).toHaveTextContent('Gen3rated-Pass')
    expect(screen.getByRole('row', { name: /PT Sate Senayan/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /done/i }))
    expect(screen.queryByText('Gen3rated-Pass')).not.toBeInTheDocument()   // never shown again
  })

  it('validates before calling the server', async () => {
    const user = userEvent.setup()
    render(<PlatformPage />)
    await screen.findByRole('row', { name: /Default Company/ })
    await user.click(screen.getByRole('button', { name: /new company/i }))
    await user.type(screen.getByLabelText(/admin email/i), 'rina')
    await user.click(screen.getByRole('button', { name: /create company/i }))
    expect(screen.getByText('Company name is required')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(platformApi.create).not.toHaveBeenCalled()
  })

  it('shows the server’s reason when creating fails', async () => {
    const user = userEvent.setup()
    platformApi.create.mockRejectedValue(new Error('API 409 /api/platform/companies: {"detail":"Email \'rina@sate.id\' is already registered"}'))
    render(<PlatformPage />)
    await screen.findByRole('row', { name: /Default Company/ })
    await user.click(screen.getByRole('button', { name: /new company/i }))
    await user.type(screen.getByLabelText(/company name/i), 'PT Sate')
    await user.type(screen.getByLabelText(/admin name/i), 'Rina')
    await user.type(screen.getByLabelText(/admin email/i), 'rina@sate.id')
    await user.click(screen.getByRole('button', { name: /create company/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already registered')
  })

  it('deactivating asks for confirmation first', async () => {
    const user = userEvent.setup()
    platformApi.update.mockResolvedValue(company({ is_active: false }))
    render(<PlatformPage />)
    await screen.findByRole('row', { name: /Default Company/ })
    await user.click(within(row('Default Company')).getByRole('button', { name: /deactivate/i }))
    expect(platformApi.update).not.toHaveBeenCalled()
    expect(screen.getByText(/users of default company will be signed out/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /yes, deactivate/i }))
    await waitFor(() => expect(platformApi.update).toHaveBeenCalledWith('c1', { is_active: false }))
    expect(await within(row('Default Company')).findByText('Inactive')).toBeInTheDocument()
  })

  it('reactivates without confirmation', async () => {
    const user = userEvent.setup()
    platformApi.list.mockResolvedValue([company({ is_active: false })])
    platformApi.update.mockResolvedValue(company({ is_active: true }))
    render(<PlatformPage />)
    await screen.findByRole('row', { name: /Default Company/ })
    await user.click(within(row('Default Company')).getByRole('button', { name: /activate/i }))
    await waitFor(() => expect(platformApi.update).toHaveBeenCalledWith('c1', { is_active: true }))
  })

  it('renames a company', async () => {
    const user = userEvent.setup()
    platformApi.update.mockResolvedValue(company({ name: 'PT Resto Pilot' }))
    render(<PlatformPage />)
    await screen.findByRole('row', { name: /Default Company/ })
    await user.click(within(row('Default Company')).getByRole('button', { name: /rename/i }))
    const input = screen.getByLabelText(/new name/i)
    await user.clear(input)
    await user.type(input, 'PT Resto Pilot')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(platformApi.update).toHaveBeenCalledWith('c1', { name: 'PT Resto Pilot' }))
    expect(await screen.findByRole('row', { name: /PT Resto Pilot/ })).toBeInTheDocument()
  })

  it('signs out', async () => {
    const user = userEvent.setup()
    render(<PlatformPage />)
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(logout).toHaveBeenCalled()
  })
})
