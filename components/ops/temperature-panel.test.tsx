// Asset temperature panel (Todo-Ops-Checklist Fase 2).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TemperaturePanel } from './temperature-panel'
import { opsApi } from '@/lib/ops-checklist-api'
import { useIssueStore } from '@/lib/store'
import type { Asset, TemperatureLog, User } from '@/lib/types'

// recharts' ResponsiveContainer needs it; jsdom has none.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

vi.mock('@/lib/ops-checklist-api', () => ({ opsApi: { temperatureLogs: vi.fn(), recordTemperature: vi.fn() } }))

const freezer = { id: 'a1', name: 'Freezer Dago', outlet: 'Dago', tempMonitored: true, tempMin: -22, tempMax: -15 } as Asset
const log = (over: Partial<TemperatureLog>): TemperatureLog => ({
  id: 'l', assetId: 'a1', outlet: 'Dago', value: -18, minValue: -22, maxValue: -15, inRange: true,
  correctiveAction: null, source: 'checklist', runItemId: null, issueId: null, recordedAt: '2026-10-15T03:00:00Z', ...over,
})

function setup(asset: Asset, perms: Record<string, string> = { ops: 'view' }) {
  useIssueStore.setState({ currentUser: { id: 'u', name: 'U', permissions: perms } as unknown as User, assets: [asset] })
  render(<TemperaturePanel asset={asset} />)
  return userEvent.setup()
}

describe('TemperaturePanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('summarises readings and excursions, with a table view', async () => {
    vi.mocked(opsApi.temperatureLogs).mockResolvedValue([
      log({ id: '1' }), log({ id: '2', value: -11, inRange: false, recordedAt: '2026-10-16T03:00:00Z' }),
    ])
    setup(freezer)
    expect(await screen.findByText(/2 readings in 30 days/i)).toBeInTheDocument()
    expect(screen.getByText(/1 out of range/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /freezer dago temperature chart/i })).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('-11')               // newest first
    expect(rows[1]).toHaveTextContent(/out of range/i)
  })

  it('a manual reading out of range needs a corrective action', async () => {
    vi.mocked(opsApi.temperatureLogs).mockResolvedValue([])
    vi.mocked(opsApi.recordTemperature).mockResolvedValue(log({ value: -12, inRange: false }))
    const user = setup(freezer)
    await screen.findByText(/no temperature readings/i)
    await user.click(screen.getByRole('button', { name: /plus\/minus/i }))
    await user.type(screen.getByLabelText(/^temperature \(°c\)$/i), '12')
    const record = screen.getByRole('button', { name: /^record$/i })
    expect(record).toBeDisabled()
    await user.type(screen.getByLabelText(/corrective action/i), 'Produk dipindah')
    await user.click(record)
    await waitFor(() => expect(opsApi.recordTemperature).toHaveBeenCalledWith('a1', { value: -12, correctiveAction: 'Produk dipindah' }))
  })

  it('shows nothing for an unmonitored asset to someone who cannot manage assets', () => {
    const { container } = render(<TemperaturePanel asset={{ ...freezer, tempMonitored: false }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lets an asset manager switch monitoring on', async () => {
    vi.mocked(opsApi.temperatureLogs).mockResolvedValue([])
    const updateAsset = vi.fn().mockResolvedValue(freezer)
    useIssueStore.setState({ updateAsset })
    const user = setup({ ...freezer, tempMonitored: false, tempMin: null, tempMax: null }, { cmms: 'manage' })
    await user.click(screen.getByLabelText(/monitor temperature/i))
    await user.type(screen.getByLabelText(/^min/i), '0')
    await user.type(screen.getByLabelText(/^max/i), '4')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(updateAsset).toHaveBeenCalledWith('a1', { tempMonitored: true, tempMin: 0, tempMax: 4 })
  })
})
