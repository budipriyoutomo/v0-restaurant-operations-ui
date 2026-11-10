// Training in the Papan Servis pattern (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { Issue, TrainingProgram, User } from '@/lib/types'

vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/lib/use-ensure-loaded', () => ({ useEnsureLoaded: () => {} }))
vi.mock('next/navigation', () => ({ usePathname: () => '/training', useSearchParams: () => new URLSearchParams() }))

import { TrainingPage } from './training-page'

const session = { id: 'i1', number: 'ISS-2026-00020', title: 'Pelatihan menu baru', description: '', outlet: 'Kemang', category: 'Training',
  priority: 'medium', status: 'open', assignee: 'Sari', dueDate: null, createdDate: '2026-11-01', taskIds: [], closureBlockers: [] } as unknown as Issue
const program = { id: 'p1', title: 'Keamanan pangan dasar', status: 'ongoing', target_role: 'all', enrolled_count: 5,
  max_participants: 10, attended_count: 3 } as unknown as TrainingProgram

beforeEach(() => {
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { issues: 'manage', training: 'manage' }, all_outlets: true } as unknown as User,
    issues: [session], approvals: [], trainingPrograms: [program], trainingLoading: false,
  })
})

describe('TrainingPage', () => {
  it('sums up in one status bar', () => {
    render(<TrainingPage />)
    const kpi = screen.getByRole('region', { name: 'Training summary' })
    expect(within(kpi).getByText('Total Sessions').closest('div')).toHaveTextContent('1')
  })

  it('no status bar before the first session or programme', () => {
    useIssueStore.setState({ issues: [], trainingPrograms: [] })
    render(<TrainingPage />)
    expect(screen.queryByRole('region', { name: 'Training summary' })).not.toBeInTheDocument()
  })

  it('sessions are dense rows that open the issue', () => {
    render(<TrainingPage />)
    const row = screen.getByRole('button', { name: 'ISS-2026-00020 Pelatihan menu baru' })
    expect(row).toHaveAccessibleDescription(/Kemang.*Sari/)
  })

  it('a programme status is a label, and attendance is translated', async () => {
    useIssueStore.setState({ locale: 'id' })
    render(<TrainingPage />)
    await userEvent.click(screen.getByRole('tab', { name: /program/i }))
    const status = screen.getByText('Berlangsung', { selector: 'span' })
    expect(status).toHaveClass('text-warning')
    expect(screen.getByText(/3 hadir/)).toBeInTheDocument()
    expect(screen.queryByText(/attended/)).not.toBeInTheDocument()
  })
})
