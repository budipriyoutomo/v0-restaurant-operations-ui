// CreateIssueDialog (Todo-Pilot §12, React Testing Library). Written first (TDD).
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreateIssueDialog } from './create-issue-dialog'
import type { Asset, CreateIssueInput } from '@/lib/types'
import { useIssueStore } from '@/lib/store'
import { SYSTEM_CATEGORIES } from '@/lib/categories.fixture'

// The assignee picker lists users of the chosen outlet (Todo-Pilot §17).
const budi = { id: 'u-budi', name: 'Budi', role_name: 'Technician', approval_tier: 'staff' }
useIssueStore.setState({
  categories: SYSTEM_CATEGORIES,   // master data (P1)
  assignableUsers: { Jakarta: [budi], Bandung: [] },
  loadAssignableUsers: async () => [budi],
})

const assets = [{ id: 'as-1', name: 'Kompor Utama', number: 'AST-001' }] as Asset[]

function setup(props: Partial<React.ComponentProps<typeof CreateIssueDialog>> = {}) {
  const onSubmit = vi.fn<(input: CreateIssueInput) => Promise<void>>().mockResolvedValue(undefined)
  const onOpenChange = vi.fn()
  const utils = render(
    <CreateIssueDialog open onOpenChange={onOpenChange} outlets={['Jakarta', 'Bandung']}
      assets={assets} onSubmit={onSubmit} {...props} />,
  )
  return { ...utils, onSubmit, onOpenChange, user: userEvent.setup() }
}

// The minimum on top (Todo-Modern-UI Fase 3): title and due date; outlet and
// category have defaults. The description is optional.
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/title/i), 'Kompor rusak')
  fireEvent.change(screen.getByLabelText(/^due date/i), { target: { value: '2026-10-10' } })
}

/** Everything that is not required sits under "More details". */
async function openDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /more details/i }))
}

describe('CreateIssueDialog', () => {
  it('labels every field so it can be found by its label', async () => {
    const { user } = setup()
    for (const label of [/title/i, /outlet/i, /category/i, /priority/i, /^due date/i]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument()   // folded away
    await openDetails(user)
    for (const label of [/description/i, /assign to/i]) expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('a disabled Create says what is still missing', async () => {
    const { user } = setup()
    const create = screen.getByRole('button', { name: 'Create Issue' })
    expect(create).toBeDisabled()
    expect(create).toHaveAccessibleDescription('Fill in first: title, due date')
    await user.type(screen.getByLabelText(/title/i), 'Kompor rusak')
    expect(create).toHaveAccessibleDescription('Fill in first: due date')
    fireEvent.change(screen.getByLabelText(/^due date/i), { target: { value: '2026-10-10' } })
    expect(create).toBeEnabled()
    expect(create).not.toHaveAccessibleDescription(/fill in/i)
  })

  it('every role picks the category from big buttons, and the priority from four', async () => {
    const { user, onSubmit } = setup()
    expect(screen.getByRole('radio', { name: 'Maintenance' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'IT Support' }))
    await user.click(screen.getByRole('radio', { name: 'Critical' }))
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ category: 'IT Support', priority: 'critical', description: '' })
  })

  it('shows the common categories first; the rest are one tap away', async () => {
    const { user } = setup()
    expect(screen.getAllByRole('radio', { name: /^(Maintenance|IT Support|Compliance|Food Safety|Training|Other)$/ })).toHaveLength(6)
    expect(screen.queryByRole('radio', { name: 'Marketing' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More categories (4)' }))
    await user.click(screen.getByRole('radio', { name: 'Marketing' }))
    expect(screen.getByRole('radio', { name: 'Marketing' })).toBeChecked()
  })

  it('quick due dates fill the date: today, tomorrow, 3 days, 1 week', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 28, 9, 0))   // 28 Nov
    try {
      const { user } = setup()
      const due = screen.getByLabelText(/^due date/i)
      const quickPick = screen.getByRole('group', { name: 'Quick pick' })
      for (const [name, value] of [['Today', '2026-11-28'], ['Tomorrow', '2026-11-29'], ['3 days', '2026-12-01'], ['1 week', '2026-12-05']]) {
        await user.click(within(quickPick).getByRole('button', { name }))
        expect(due).toHaveValue(value)
        expect(within(quickPick).getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('folded details still say what will be created from the category defaults', async () => {
    const { user } = setup()
    expect(screen.getByText('Will create: task')).toBeInTheDocument()
    await openDetails(user)
    await user.click(screen.getByLabelText(/create work order/i))
    await user.click(screen.getByRole('button', { name: /more details/i }))   // fold again
    expect(screen.getByText('Will create: task · work order')).toBeInTheDocument()
  })

  it('submits a maintenance issue with a work order, then closes', async () => {
    const { user, onSubmit, onOpenChange } = setup()
    await fillRequired(user)
    await user.selectOptions(screen.getByLabelText(/outlet/i), 'Bandung')
    await openDetails(user)
    await user.click(screen.getByLabelText(/create work order/i))
    await user.selectOptions(screen.getByLabelText(/^asset$/i), 'as-1')
    await user.type(screen.getByLabelText(/^estimated cost/i), '2000000')
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Kompor rusak', outlet: 'Bandung', category: 'Maintenance', dueDate: '2026-10-10',
      generateWorkOrder: true, assetId: 'as-1', estimatedCost: 2_000_000,
    })
    expect(onSubmit.mock.calls[0][0].idempotencyKey).toEqual(expect.any(String))
  })

  it('drops work-order fields when the work order is switched off again', async () => {
    const { user, onSubmit } = setup()
    await fillRequired(user)
    await openDetails(user)
    const toggle = screen.getByLabelText(/create work order/i)
    await user.click(toggle)
    await user.type(screen.getByLabelText(/^estimated cost/i), '2000000')
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ generateWorkOrder: false, estimatedCost: undefined, assetId: undefined })
  })

  it('shows the server’s reason and stays open when creating fails', async () => {
    const { user, onSubmit, onOpenChange } = setup()
    onSubmit.mockRejectedValueOnce(new Error('API 422 /api/issues: {"detail":"Outlet not found"}'))
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Outlet not found')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByLabelText(/title/i)).toHaveValue('Kompor rusak')   // nothing typed is lost
  })

  describe('approval warning follows the outlet threshold (Todo-Pilot §5)', () => {
    const thresholds = { Jakarta: 5_000_000, Bandung: 1_000_000 }

    it('warns only above the selected outlet’s threshold', async () => {
      const { user } = setup({ approvalThresholds: thresholds })
      await openDetails(user)
      await user.click(screen.getByLabelText(/create work order/i))
      const cost = screen.getByLabelText(/^estimated cost/i)

      await user.type(cost, '2000000')                    // Jakarta: 2 jt ≤ 5 jt
      expect(screen.queryByText(/approval will be created/i)).not.toBeInTheDocument()

      await user.selectOptions(screen.getByLabelText(/outlet/i), 'Bandung')   // 2 jt > 1 jt
      expect(screen.getByText(/above rp 1\.000\.000/i)).toBeInTheDocument()

      await user.selectOptions(screen.getByLabelText(/outlet/i), 'Jakarta')
      await user.clear(cost)
      await user.type(cost, '6000000')
      expect(screen.getByText(/above rp 5\.000\.000/i)).toBeInTheDocument()
    })

    it('the threshold itself does not need approval (strictly above, like the backend)', async () => {
      const { user } = setup({ approvalThresholds: thresholds })
      await openDetails(user)
      await user.click(screen.getByLabelText(/create work order/i))
      await user.type(screen.getByLabelText(/^estimated cost/i), '5000000')
      expect(screen.queryByText(/approval will be created/i)).not.toBeInTheDocument()
    })

    it('falls back to Rp 1.000.000 when thresholds are not given', async () => {
      const { user } = setup()
      await openDetails(user)
      await user.click(screen.getByLabelText(/create work order/i))
      await user.type(screen.getByLabelText(/^estimated cost/i), '1500000')
      expect(screen.getByText(/above rp 1\.000\.000/i)).toBeInTheDocument()
    })
  })

  describe('duplicate protection (Todo-Pilot §3)', () => {
    it('a double submit creates only one issue', async () => {
      const { user, onSubmit, container } = setup()
      onSubmit.mockImplementation(() => new Promise(() => {}))   // request still in flight
      await fillRequired(user)
      const form = container.querySelector('form')!
      fireEvent.submit(form)
      fireEvent.submit(form)
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('a retry after a failure reuses the same idempotency key', async () => {
      const { user, onSubmit } = setup()
      onSubmit.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
      await fillRequired(user)
      const create = screen.getByRole('button', { name: 'Create Issue' })
      await user.click(create)
      await waitFor(() => expect(create).toBeEnabled())
      await user.click(create)
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
      expect(onSubmit.mock.calls[1][0].idempotencyKey).toBe(onSubmit.mock.calls[0][0].idempotencyKey)
    })

    it('reopening the dialog starts a new key', async () => {
      const { user, onSubmit, rerender, onOpenChange } = setup()
      await fillRequired(user)
      await user.click(screen.getByRole('button', { name: 'Create Issue' }))
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      const props = { onOpenChange, outlets: ['Jakarta'], onSubmit }
      rerender(<CreateIssueDialog open={false} {...props} />)
      rerender(<CreateIssueDialog open {...props} />)
      await fillRequired(user)
      await user.click(screen.getByRole('button', { name: 'Create Issue' }))
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
      expect(onSubmit.mock.calls[1][0].idempotencyKey).not.toBe(onSubmit.mock.calls[0][0].idempotencyKey)
    })
  })

  it('assigns to a user of the outlet and sends their id (Todo-Pilot §17)', async () => {
    const { user, onSubmit } = setup()
    await fillRequired(user)
    await openDetails(user)
    await user.selectOptions(screen.getByLabelText(/assign to/i), 'u-budi')
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ assignee: 'Budi', assigneeUserId: 'u-budi' })
  })

  it('changing outlet drops an assignee who cannot work there', async () => {
    const { user, onSubmit } = setup()
    await fillRequired(user)
    await openDetails(user)
    await user.selectOptions(screen.getByLabelText(/assign to/i), 'u-budi')
    await user.selectOptions(screen.getByLabelText(/outlet/i), 'Bandung')
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ assignee: 'Unassigned', assigneeUserId: null })
  })
})

// ---------------------------------------------------------------------------
// Quick report (Todo-Pilot §20 / UX-7): staff report a problem in seconds —
// title, category, photo. No due date, toggles, cost or assignee.
// ---------------------------------------------------------------------------

describe('quick report mode (Todo-Pilot §20)', () => {
  const created = { id: 'iss-9', number: 'ISS-2026-00009' }

  function quick(props: Partial<React.ComponentProps<typeof CreateIssueDialog>> = {}) {
    const onUploadPhoto = vi.fn().mockResolvedValue({ id: 'p1' })
    const utils = setup({ quick: true, outlets: ['Jakarta'], onUploadPhoto, ...props })
    utils.onSubmit.mockResolvedValue(created as never)
    return { ...utils, onUploadPhoto }
  }

  it('hides the advanced options', async () => {
    const { user } = quick()
    await openDetails(user)
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Quick pick' })).not.toBeInTheDocument()
    expect(screen.queryByText(/will create/i)).not.toBeInTheDocument()
    for (const label of [/assign to/i, /due date/i, /create work order/i, /send for approval/i, /create task/i]) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
  })

  it('picks the only outlet automatically and shows big category buttons', () => {
    quick()
    expect(screen.queryByRole('combobox', { name: /outlet/i })).not.toBeInTheDocument()
    expect(screen.getByText('Jakarta')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Maintenance' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'IT Support' })).toBeInTheDocument()
  })

  it('picks the outlet when the outlet list arrives after the dialog opened', () => {
    const { rerender, onSubmit, onOpenChange } = quick({ outlets: [] })
    rerender(<CreateIssueDialog open quick onOpenChange={onOpenChange} outlets={['Jakarta']} assets={assets} onSubmit={onSubmit} />)
    expect(screen.getByText('Jakarta')).toBeInTheDocument()
  })

  it('without any outlet says who to ask instead of offering free text', () => {
    quick({ outlets: [] })
    expect(screen.getByRole('alert')).toHaveTextContent(/not assigned to an outlet/i)
    expect(screen.queryByRole('textbox', { name: /outlet/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send report' })).toHaveAccessibleDescription('Fill in first: title, outlet')
  })

  it('offline before the outlet list ever loaded: says to connect once, not "ask your manager"', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    quick({ outlets: [] })
    expect(screen.getByRole('alert')).toHaveTextContent(/connect to the internet once/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/ask your manager/i)
    onLine.mockRestore()
  })

  it('sends with only a title — no due date needed — and shows the issue number', async () => {
    const { user, onSubmit, onOpenChange } = quick()
    await user.type(screen.getByLabelText(/title/i), 'Wastafel bocor')
    await user.click(screen.getByRole('radio', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByText(/ISS-2026-00009/)).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Wastafel bocor', outlet: 'Jakarta', category: 'Other', priority: 'medium', dueDate: '',
      assignee: 'Unassigned', assigneeUserId: null, generateWorkOrder: false, generateApproval: false,
    })
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument()
  })

  it('promises a WhatsApp update only to users who opted in', async () => {
    const { user } = quick({ whatsappOptIn: true })
    await user.type(screen.getByLabelText(/title/i), 'Wastafel bocor')
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText(/we.ll keep you posted on whatsapp/i)).toBeInTheDocument()
  })

  it('uploads the photo to the new issue', async () => {
    const { user, onUploadPhoto } = quick()
    const photo = new File(['x'], 'bocor.jpg', { type: 'image/jpeg' })
    await user.type(screen.getByLabelText(/title/i), 'Wastafel bocor')
    await user.upload(screen.getByLabelText(/photo/i), photo)
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    await screen.findByText(/ISS-2026-00009/)
    expect(onUploadPhoto).toHaveBeenCalledWith('iss-9', photo)
  })

  it('says a queued photo will upload later — the report is still sent', async () => {
    const { QueuedError } = await import('@/lib/api-client')
    const { user, onUploadPhoto } = quick()
    onUploadPhoto.mockRejectedValueOnce(new QueuedError('Foto laporan'))
    await user.type(screen.getByLabelText(/title/i), 'Wastafel bocor')
    await user.upload(screen.getByLabelText(/photo/i), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText(/photo will upload when there is signal/i)).toBeInTheDocument()
  })

  // No signal (Todo-PWA, verifikasi akhir): the report waits in the device's
  // queue — its photo waits for it — and the reporter is told so plainly.
  it('no signal: says the report is saved on the device and will send itself', async () => {
    const { QueuedError } = await import('@/lib/api-client')
    const { user, onSubmit, onUploadPhoto } = quick({ whatsappOptIn: true })
    onSubmit.mockRejectedValueOnce(new QueuedError('Laporan: Wastafel bocor'))
    onUploadPhoto.mockRejectedValueOnce(new QueuedError('Foto laporan'))
    const photo = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    await user.type(screen.getByLabelText(/title/i), 'Wastafel bocor')
    await user.upload(screen.getByLabelText(/photo/i), photo)
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByText(/saved on this device/i)).toBeInTheDocument()
    expect(screen.getByText(/sends itself when there is signal/i)).toBeInTheDocument()
    expect(screen.queryByText(/failed to fetch/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument()     // nothing sent yet
    const key = onSubmit.mock.calls[0][0].idempotencyKey
    expect(onUploadPhoto).toHaveBeenCalledWith({ afterKey: key }, photo)
  })

  it('no signal in the full form: a notice, then it closes', async () => {
    const { QueuedError } = await import('@/lib/api-client')
    const { user, onSubmit, onOpenChange } = setup()
    onSubmit.mockRejectedValueOnce(new QueuedError('Laporan'))
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('"Report another" starts a fresh report', async () => {
    const { user } = quick()
    await user.type(screen.getByLabelText(/title/i), 'Wastafel bocor')
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    await user.click(await screen.findByRole('button', { name: 'Report another' }))
    expect(screen.getByLabelText(/title/i)).toHaveValue('')
  })

  it('a scanned asset QR fills the outlet and the description', async () => {
    const asset = { id: 'as-7', name: 'Freezer 2', number: 'AST-007', outlet: 'Bandung' } as Asset
    const resolveQr = vi.fn().mockResolvedValue({ asset, activeWorkOrderId: null, openWorkOrderCount: 0 })
    const { user, onSubmit } = quick({ outlets: ['Jakarta', 'Bandung'], resolveQr })
    await user.click(screen.getByRole('button', { name: /scan asset qr/i }))
    await user.type(screen.getByPlaceholderText(/code from the sticker/i), 'tok-7')
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(resolveQr).toHaveBeenCalledWith('tok-7'))
    expect(screen.getByLabelText(/outlet/i)).toHaveValue('Bandung')
    expect(screen.getByLabelText(/description/i)).toHaveValue('Freezer 2 (AST-007): ')
    await user.type(screen.getByLabelText(/title/i), 'Tidak dingin')
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ outlet: 'Bandung', category: 'Maintenance' })
  })
})

describe('full form extras (Todo-Pilot §20)', () => {
  it('a scanned asset QR picks the work-order asset', async () => {
    const asset = { id: 'as-1', name: 'Kompor Utama', number: 'AST-001', outlet: 'Bandung' } as Asset
    const resolveQr = vi.fn().mockResolvedValue({ asset, activeWorkOrderId: null, openWorkOrderCount: 0 })
    const { user } = setup({ resolveQr })
    await user.click(screen.getByRole('button', { name: /scan asset qr/i }))
    await user.type(screen.getByPlaceholderText(/code from the sticker/i), 'tok-1')
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(screen.getByLabelText(/^asset$/i)).toHaveValue('as-1'))   // details open by themselves
    expect(screen.getByLabelText(/create work order/i)).toBeChecked()
    expect(screen.getByLabelText(/outlet/i)).toHaveValue('Bandung')
  })

  it('still closes after creating, uploading the photo first', async () => {
    const onUploadPhoto = vi.fn().mockResolvedValue({ id: 'p1' })
    const { user, onSubmit, onOpenChange } = setup({ onUploadPhoto })
    onSubmit.mockResolvedValue({ id: 'iss-3', number: 'ISS-3' } as never)
    await fillRequired(user)
    const photo = new File(['x'], 'k.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText(/photo/i), photo)
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onUploadPhoto).toHaveBeenCalledWith('iss-3', photo)
  })
})
