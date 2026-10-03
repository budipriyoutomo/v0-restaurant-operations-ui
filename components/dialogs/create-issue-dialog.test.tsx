// CreateIssueDialog (Todo-Pilot §12, React Testing Library). Written first (TDD).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreateIssueDialog } from './create-issue-dialog'
import type { Asset, CreateIssueInput } from '@/lib/types'

const assets = [{ id: 'as-1', name: 'Kompor Utama', number: 'AST-001' }] as Asset[]

function setup(props: Partial<React.ComponentProps<typeof CreateIssueDialog>> = {}) {
  const onSubmit = vi.fn<(input: CreateIssueInput) => Promise<void>>().mockResolvedValue(undefined)
  const onOpenChange = vi.fn()
  const utils = render(
    <CreateIssueDialog open onOpenChange={onOpenChange} outlets={['Jakarta', 'Bandung']}
      assignees={['Unassigned', 'Budi']} assets={assets} onSubmit={onSubmit} {...props} />,
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
})
