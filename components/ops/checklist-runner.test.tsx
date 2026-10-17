// Checklist runner on the phone (Todo-Ops-Checklist Fase 1 §1.8).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChecklistRunner } from './checklist-runner'
import { opsApi } from '@/lib/ops-checklist-api'
import { QueuedError } from '@/lib/api-client'
import type { OpsRunDetail, OpsRunItem } from '@/lib/types'

vi.mock('@/lib/ops-checklist-api', () => ({
  opsApi: { get: vi.fn(), answer: vi.fn(), uploadPhoto: vi.fn(), submit: vi.fn() },
}))
vi.mock('@/components/shared/authed-image', () => ({ AuthedImage: () => null }))

const hour = 3_600_000
const item = (over: Partial<OpsRunItem>): OpsRunItem => ({
  id: 'i', templateItemId: 't', title: 'Item', section: 'Dapur', itemType: 'check', minValue: null, maxValue: null,
  unit: '', requiresPhoto: false, isCritical: false, result: null, value: null, notes: '', correctiveAction: null,
  recordedAt: null, issueId: null, issueNumber: null, photos: [], ...over,
})

function run(items: OpsRunItem[], over: Partial<OpsRunDetail> = {}): OpsRunDetail {
  const now = Date.now()
  return {
    id: 'r1', number: 'OPS-2026-00001', scheduleId: 's', templateId: 't', templateName: 'Opening Checklist',
    shift: 'opening', outlet: 'Dago', outletId: 'o', runDate: '2026-10-16',
    opensAt: new Date(now - hour).toISOString(), dueAt: new Date(now + hour).toISOString(),
    closesAt: new Date(now + 3 * hour).toISOString(), status: 'in_progress', isLate: false, submittedByName: null,
    submittedAt: null, score: null, itemCount: items.length, answeredCount: 0, failedCount: 0, criticalFailed: false,
    items, ...over,
  }
}

const sabun = item({ id: 'sabun', title: 'Sabun di wastafel' })
const freezer = item({ id: 'freezer', title: 'Suhu freezer', itemType: 'temperature', minValue: -22, maxValue: -15, unit: '°C' })

function setup(r: OpsRunDetail) {
  vi.mocked(opsApi.get).mockResolvedValue(r)
  vi.mocked(opsApi.answer).mockImplementation(async (_r, id, body) => ({
    ...r.items.find((i) => i.id === id)!, ...body,
    result: body.result ?? (body.value !== undefined ? (body.value < -22 || body.value > -15 ? 'fail' : 'pass') : null),
  } as OpsRunItem))
  const onChanged = vi.fn()
  render(<ChecklistRunner runId={r.id} onClose={() => {}} onChanged={onChanged} />)
  return { user: userEvent.setup(), onChanged }
}

describe('ChecklistRunner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('answers a check item with the big buttons', async () => {
    const { user } = setup(run([sabun]))
    await user.click(await screen.findByRole('button', { name: /pass/i }))
    expect(opsApi.answer).toHaveBeenCalledWith('r1', 'sabun', { result: 'pass' })
    expect(await screen.findByText('1/1')).toBeInTheDocument()
  })

  it('a temperature out of range turns red and asks for a corrective action before submit', async () => {
    const { user } = setup(run([freezer]))
    const input = await screen.findByLabelText(/suhu freezer/i)
    await user.click(screen.getByRole('button', { name: /plus\/minus/i }))
    await user.type(input, '11')
    expect(input).toHaveValue('-11')
    await user.tab()
    expect(opsApi.answer).toHaveBeenCalledWith('r1', 'freezer', { value: -11 })
    expect(await screen.findByLabelText(/corrective action/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit checklist/i })).toBeDisabled()
    expect(screen.getByText(/corrective action required/i)).toBeInTheDocument()
  })

  it('previews the issue a failed item will raise', async () => {
    const { user } = setup(run([sabun]))
    await user.click(await screen.findByRole('button', { name: /fail/i }))
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent(/an issue will be raised/i)
    expect(within(note).getByText('Sabun di wastafel')).toBeInTheDocument()
  })

  it('submits and shows the score', async () => {
    const r = run([{ ...sabun, result: 'pass' }])
    vi.mocked(opsApi.submit).mockResolvedValue({ ...r, status: 'submitted', score: 100 })
    const { user, onChanged } = setup(r)
    await user.click(await screen.findByRole('button', { name: /submit checklist/i }))
    await waitFor(() => expect(opsApi.submit).toHaveBeenCalledWith('r1'))
    expect(await screen.findByText('100')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit checklist/i })).not.toBeInTheDocument()
    expect(onChanged).toHaveBeenCalled()
  })

  it('a submit queued offline locks the form and says it will be sent', async () => {
    vi.mocked(opsApi.submit).mockRejectedValue(new QueuedError('Kirim checklist'))
    const { user } = setup(run([{ ...sabun, result: 'pass' }]))
    await user.click(await screen.findByRole('button', { name: /submit checklist/i }))
    expect(await screen.findByText(/waiting for signal/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit checklist/i })).not.toBeInTheDocument()
  })

  it('a missed run is read-only', async () => {
    setup(run([sabun], { status: 'missed' }))
    expect(await screen.findByText(/window has closed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pass/i })).toBeDisabled()
  })
})
