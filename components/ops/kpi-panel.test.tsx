// Checklist compliance panel (Todo-Ops-Checklist Fase 3).
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpsKpiPanel, complianceTone } from './kpi-panel'
import { opsApi } from '@/lib/ops-checklist-api'
import type { OpsKpis } from '@/lib/types'

vi.mock('@/lib/ops-checklist-api', () => ({ opsApi: { kpis: vi.fn() } }))

const counts = { scheduled: 3, onTime: 1, late: 1, missed: 1, compliance: 33.3, avgScore: 75, excursions: 1, issuesCreated: 2 }
const data: OpsKpis = {
  from: '2026-10-10', to: '2026-10-16',
  outlets: [
    { ...counts, outlet: 'Dago', outletId: 'o1', topFailing: [{ title: 'Sabun', count: 2 }] },
    { ...counts, outlet: 'Bandung', outletId: 'o2', compliance: 100, onTime: 3, late: 0, missed: 0, excursions: 0, issuesCreated: 0, topFailing: [] },
  ],
  totals: { ...counts, scheduled: 6, onTime: 4, compliance: 66.7 },
  trend: Array.from({ length: 8 }, (_, i) => ({ weekStart: `2026-08-${10 + i}`, scheduled: 3, onTime: 2, compliance: 66.7 })),
}

describe('complianceTone', () => {
  it('bands the %', () => {
    expect(complianceTone(95)).toBe('good')
    expect(complianceTone(80)).toBe('warning')
    expect(complianceTone(50)).toBe('critical')
    expect(complianceTone(null)).toBe('none')
  })
})

describe('OpsKpiPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows totals and outlets worst first; a row opens that outlet', async () => {
    vi.mocked(opsApi.kpis).mockResolvedValue(data)
    const onOutlet = vi.fn()
    render(<OpsKpiPanel onOutlet={onOutlet} />)
    expect(await screen.findByText('66.7%')).toBeInTheDocument()
    const rows = screen.getAllByRole('button', { name: /open .* checklists/i })
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['Open Dago checklists', 'Open Bandung checklists'])
    expect(screen.getByText(/fails most/i)).toHaveTextContent('Sabun (2×)')
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(8)
    await userEvent.setup().click(rows[0])
    expect(onOutlet).toHaveBeenCalledWith('Dago')
  })

  it('switches to 30 days', async () => {
    vi.mocked(opsApi.kpis).mockResolvedValue(data)
    render(<OpsKpiPanel onOutlet={() => {}} />)
    await screen.findByText('66.7%')
    await userEvent.setup().click(screen.getByRole('button', { name: '30 days' }))
    await waitFor(() => expect(opsApi.kpis).toHaveBeenCalledTimes(2))
    const [from, to] = vi.mocked(opsApi.kpis).mock.calls[1] as [string, string]
    expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBe(29)
  })
})
