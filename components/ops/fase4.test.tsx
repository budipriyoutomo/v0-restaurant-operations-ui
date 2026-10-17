// Fase 4 components (Todo-Ops-Checklist): sensors, daily sign-off, PDF export,
// built-in templates, weekly / monthly schedules.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SensorPanel, isSensorOffline } from './sensor-panel'
import { DaySignoffList, ExportPdfButton, SignDayDialog } from './day-signoff'
import { PresetPicker } from './preset-picker'
import { OpsSchedulePanel } from './schedule-panel'
import { opsApi } from '@/lib/ops-checklist-api'
import { useIssueStore } from '@/lib/store'
import type { Asset, OpsDay, OpsTemplate, User } from '@/lib/types'

vi.mock('@/lib/ops-checklist-api', () => ({
  opsApi: {
    sensors: vi.fn(), createSensor: vi.fn(), revokeSensor: vi.fn(),
    day: vi.fn(), signDay: vi.fn(), signoffs: vi.fn(), exportPdf: vi.fn(),
    presets: vi.fn(), applyPreset: vi.fn(), createSchedule: vi.fn(),
  },
}))

const asset = { id: 'a1', name: 'Freezer', outlet: 'Dago', tempMonitored: true, tempMin: -22, tempMax: -15 } as Asset
const summary = { runs: 2, submitted: 1, late: 0, missed: 1, failedItems: 0, temperatureReadings: 3, excursions: 1 }
const day = (over: Partial<OpsDay> = {}): OpsDay => ({
  outlet: 'Dago', outletId: 'o1', date: '2026-10-15', summary, runs: [], signoff: null, canSign: true,
  problem: null, isIntact: null, ...over,
})
const signoff = { id: 's1', outlet: 'Dago', outletId: 'o1', businessDate: '2026-10-15', signedByName: 'Mgr Dago',
  signedAt: '2026-10-15T16:00:00Z', note: '', summary, digest: 'ab'.repeat(32) }

beforeEach(() => {
  vi.clearAllMocks()
  useIssueStore.setState({
    currentUser: { id: 'u', name: 'U', role: 'admin', all_outlets: true, permissions: { ops: 'manage' } } as unknown as User,
    outlets: [{ id: 'o1', name: 'Dago' }, { id: 'o2', name: 'Bandung' }] as never,
  })
})

describe('SensorPanel', () => {
  it('shows a new key once and revokes', async () => {
    vi.mocked(opsApi.sensors).mockResolvedValue([])
    vi.mocked(opsApi.createSensor).mockResolvedValue({
      id: 's', assetId: 'a1', name: 'Probe', keyPrefix: 'rsk_abcdefgh', isActive: true, lastSeenAt: null,
      lastValue: null, createdAt: '', key: 'rsk_abcdefgh_secret',
    })
    const user = userEvent.setup()
    render(<SensorPanel asset={asset} />)
    expect(await screen.findByText(/no sensors yet/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/sensor name/i), 'Probe')
    await user.click(screen.getByRole('button', { name: /add sensor/i }))
    expect(await screen.findByTestId('sensor-key')).toHaveTextContent('rsk_abcdefgh_secret')
    expect(opsApi.createSensor).toHaveBeenCalledWith('a1', 'Probe')
    await user.click(screen.getByRole('button', { name: /i've saved it/i }))
    expect(screen.queryByTestId('sensor-key')).toBeNull()
  })

  it('flags a silent sensor as offline', () => {
    const now = Date.parse('2026-10-16T10:00:00Z')
    expect(isSensorOffline({ isActive: true, lastSeenAt: '2026-10-16T09:50:00Z' }, now)).toBe(false)
    expect(isSensorOffline({ isActive: true, lastSeenAt: '2026-10-16T09:00:00Z' }, now)).toBe(true)
    expect(isSensorOffline({ isActive: true, lastSeenAt: null }, now)).toBe(true)
    expect(isSensorOffline({ isActive: false, lastSeenAt: null }, now)).toBe(false)
  })
})

describe('SignDayDialog', () => {
  it('signs a closed day with a note', async () => {
    vi.mocked(opsApi.day).mockResolvedValue(day())
    vi.mocked(opsApi.signDay).mockResolvedValue(signoff)
    const onSigned = vi.fn()
    const user = userEvent.setup()
    render(<SignDayDialog date="2026-10-15" outlet="Dago" onClose={() => {}} onSigned={onSigned} />)
    await user.type(await screen.findByLabelText(/note/i), 'Aman')
    await user.click(screen.getByRole('button', { name: /^sign$/i }))
    expect(opsApi.signDay).toHaveBeenCalledWith('2026-10-15', 'Dago', 'Aman')
    expect(await screen.findByText(/signed by mgr dago/i)).toBeInTheDocument()
    expect(onSigned).toHaveBeenCalled()
  })

  it('explains why it cannot be signed yet', async () => {
    vi.mocked(opsApi.day).mockResolvedValue(day({ canSign: false, problem: '1 checklist masih berjalan' }))
    render(<SignDayDialog date="2026-10-15" outlet="Dago" onClose={() => {}} onSigned={() => {}} />)
    expect(await screen.findByText('1 checklist masih berjalan')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^sign$/i })).toBeNull()
  })

  it('warns when the data changed after signing', async () => {
    vi.mocked(opsApi.day).mockResolvedValue(day({ canSign: false, signoff, isIntact: false }))
    render(<SignDayDialog date="2026-10-15" outlet="Dago" onClose={() => {}} onSigned={() => {}} />)
    expect(await screen.findByText(/changed after it was signed/i)).toBeInTheDocument()
  })
})

describe('DaySignoffList', () => {
  it('one row per day, newest first, with who signed', async () => {
    vi.mocked(opsApi.signoffs).mockResolvedValue([signoff])
    render(<DaySignoffList outlet="Dago" from="2026-10-14" to="2026-10-16" />)
    const rows = await screen.findAllByRole('button', { name: /open log/i })
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByText(/signed by mgr dago/i)).toBeInTheDocument()
    expect(within(rows[0]).getByText(/not signed/i)).toBeInTheDocument()
  })
})

describe('ExportPdfButton', () => {
  it('needs an outlet and at most 31 days', () => {
    const { rerender } = render(<ExportPdfButton outlet="" from="2026-10-01" to="2026-10-02" />)
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled()
    rerender(<ExportPdfButton outlet="Dago" from="2026-09-01" to="2026-10-02" />)
    expect(screen.getByText(/at most 31 days/i)).toBeInTheDocument()
    rerender(<ExportPdfButton outlet="Dago" from="2026-10-01" to="2026-10-02" />)
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeEnabled()
  })

  it('downloads the PDF', async () => {
    vi.mocked(opsApi.exportPdf).mockResolvedValue('blob:pdf')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ExportPdfButton outlet="Dago" from="2026-10-01" to="2026-10-02" />)
    await userEvent.setup().click(screen.getByRole('button', { name: /export pdf/i }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(opsApi.exportPdf).toHaveBeenCalledWith('Dago', '2026-10-01', '2026-10-02')
  })
})

describe('PresetPicker', () => {
  it('applies the chosen set at an outlet', async () => {
    vi.mocked(opsApi.presets).mockResolvedValue([
      { key: 'cafe', label: 'Cafe', templates: [{ name: 'Opening Checklist', shift: 'opening', frequency: 'daily', dueTime: '07:30', itemCount: 9 }] },
      { key: 'resto', label: 'Restoran', templates: [{ name: 'Deep Cleaning Mingguan', shift: 'other', frequency: 'weekly', dueTime: '15:00', itemCount: 4 }] },
    ])
    vi.mocked(opsApi.applyPreset).mockResolvedValue({ preset: 'resto', created: ['Deep Cleaning Mingguan'], skipped: [], schedules: 1 })
    const onApplied = vi.fn()
    const user = userEvent.setup()
    render(<PresetPicker onApplied={onApplied} />)
    await user.click(await screen.findByRole('radio', { name: 'Restoran' }))
    expect(screen.getByText(/weekly · 15:00/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/schedule at outlet/i), 'Dago')
    await user.click(screen.getByRole('button', { name: /use these templates/i }))
    expect(opsApi.applyPreset).toHaveBeenCalledWith('resto', 'Dago')
    await waitFor(() => expect(onApplied).toHaveBeenCalled())
  })
})

describe('OpsSchedulePanel frequency', () => {
  const tpl = { id: 't1', name: 'Deep Cleaning', description: '', shift: 'other', isActive: true, items: [] } as unknown as OpsTemplate

  it('weekly picks one day and sends the window in minutes', async () => {
    vi.mocked(opsApi.createSchedule).mockResolvedValue({} as never)
    const user = userEvent.setup()
    render(<OpsSchedulePanel schedules={[]} templates={[tpl]} onChanged={() => {}} />)
    await user.click(screen.getByRole('radio', { name: 'Weekly' }))
    expect(screen.getByLabelText(/opens before \(days\)/i)).toHaveValue(2)
    await user.click(screen.getByText('Sun'))
    await user.click(screen.getByRole('button', { name: /add schedule/i }))
    expect(opsApi.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      frequency: 'weekly', daysOfWeek: [7], dayOfMonth: null, openMinutesBefore: 2880, graceMinutes: 1440,
    }))
  })

  it('a too-long window blocks saving with a reason', async () => {
    const user = userEvent.setup()
    render(<OpsSchedulePanel schedules={[]} templates={[tpl]} onChanged={() => {}} />)
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    const open = screen.getByLabelText(/opens before \(days\)/i)
    await user.clear(open)
    await user.type(open, '30')
    expect(screen.getByRole('alert')).toHaveTextContent(/too long/i)
    expect(screen.getByRole('button', { name: /add schedule/i })).toBeDisabled()
  })
})
