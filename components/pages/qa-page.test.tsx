// QA in the Papan Servis pattern (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'

const qa = vi.hoisted(() => ({ list: vi.fn(), templates: vi.fn(), scores: vi.fn(), start: vi.fn() }))
vi.mock('@/lib/qa-audit-api', () => ({ qaApi: qa }))
vi.mock('next/navigation', () => ({ usePathname: () => '/qa', useSearchParams: () => new URLSearchParams() }))

import { QAPage } from './qa-page'

const audit = (id: string, over: object) => ({ id, number: `QA-${id}`, templateName: 'Audit dapur', outlet: 'Kemang', auditDate: '2026-11-01',
  auditor: 'Sari', status: 'submitted', score: 92, failedCount: 1, repeatCount: 0, progress: { answered: 10, total: 10 }, ...over })

beforeEach(() => {
  qa.list.mockResolvedValue([audit('1', {}), audit('2', { status: 'in_progress', score: null, progress: { answered: 3, total: 10 } })])
  qa.templates.mockResolvedValue([{ id: 't1', name: 'Audit dapur', items: [{}, {}], isActive: true }])
  useIssueStore.setState({
    locale: 'en',
    currentUser: { id: 'u1', permissions: { qa: 'manage' }, all_outlets: true } as unknown as User,
    outlets: [{ id: 'o1', name: 'Kemang' }] as never,
  })
})

describe('QAPage', () => {
  it('audits are dense rows, in progress and submitted each in their own list', async () => {
    render(<QAPage />)
    const submitted = await screen.findByRole('list', { name: 'Submitted' })
    const row = within(submitted).getByRole('button', { name: 'QA-1 Audit dapur' })
    expect(row).toHaveAccessibleDescription(/Kemang.*Sari.*92/)
    const open = screen.getByRole('list', { name: 'In progress' })
    expect(within(open).getByRole('button', { name: 'QA-2 Audit dapur' })).toHaveTextContent('3/10')
  })

  it('the start dialog is named and its checklist options are translated', async () => {
    useIssueStore.setState({ locale: 'id' })
    render(<QAPage />)
    await userEvent.click(await screen.findByRole('button', { name: /mulai audit/i }))
    const dialog = screen.getByRole('dialog', { name: /mulai audit/i })
    expect(within(dialog).getByRole('option', { name: /Audit dapur/ })).toHaveTextContent('2 butir')
  })
})
