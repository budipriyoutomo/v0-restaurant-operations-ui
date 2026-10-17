// CreateIssueDialog (Todo-Pilot §12, React Testing Library). Written first (TDD).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/title/i), 'Kompor rusak')
  await user.type(screen.getByLabelText(/description/i), 'Api tidak menyala')
  fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-10' } })
}

describe('CreateIssueDialog', () => {
  it('labels every field so it can be found by its label', () => {
    setup()
    for (const label of [/title/i, /description/i, /outlet/i, /category/i, /priority/i, /assign to/i, /due date/i]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('keeps Create disabled until the required fields are filled', async () => {
    const { user } = setup()
    const create = screen.getByRole('button', { name: 'Create Issue' })
    expect(create).toBeDisabled()
    await fillRequired(user)
    expect(create).toBeEnabled()
  })

  it('submits a maintenance issue with a work order, then closes', async () => {
    const { user, onSubmit, onOpenChange } = setup()
    await fillRequired(user)
    await user.selectOptions(screen.getByLabelText(/outlet/i), 'Bandung')
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
      await user.click(screen.getByLabelText(/create work order/i))
      await user.type(screen.getByLabelText(/^estimated cost/i), '5000000')
      expect(screen.queryByText(/approval will be created/i)).not.toBeInTheDocument()
    })

    it('falls back to Rp 1.000.000 when thresholds are not given', async () => {
      const { user } = setup()
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
    await user.selectOptions(screen.getByLabelText(/assign to/i), 'u-budi')
    await user.click(screen.getByRole('button', { name: 'Create Issue' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ assignee: 'Budi', assigneeUserId: 'u-budi' })
  })

  it('changing outlet drops an assignee who cannot work there', async () => {
    const { user, onSubmit } = setup()
    await fillRequired(user)
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

  it('hides the advanced options', () => {
    quick()
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

  it('without any outlet says who to ask instead of offering free text', () => {
    quick({ outlets: [] })
    expect(screen.getByRole('alert')).toHaveTextContent(/not assigned to an outlet/i)
    expect(screen.queryByRole('textbox', { name: /outlet/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled()
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
    await waitFor(() => expect(screen.getByLabelText(/^asset$/i)).toHaveValue('as-1'))
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
