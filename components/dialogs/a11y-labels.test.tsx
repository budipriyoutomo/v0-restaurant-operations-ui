// Every form field in every dialog has a name a screen reader can read
// (Todo-Pilot §26 / UX-13): label ↔ input audit, kept as a test so new
// fields cannot slip in unlabelled.
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { User } from '@/lib/types'
import { CreateIssueDialog } from './create-issue-dialog'
import { CreateWorkOrderDialog } from './create-work-order-dialog'
import { CreateAssetDialog } from './create-asset-dialog'
import { NewCategoryDialog } from './new-category-dialog'
import { NewOutletDialog } from './new-outlet-dialog'
import { NewPICDialog } from './new-pic-dialog'

beforeEach(() => {
  useIssueStore.setState({
    currentUser: { id: 'u1', permissions: { issues: 'manage', cmms: 'manage' }, all_outlets: true } as unknown as User,
    assignableUsers: { Jakarta: [] }, loadAssignableUsers: vi.fn().mockResolvedValue([]),
  })
})

function unlabelled() {
  const dialog = screen.getByRole('dialog')
  const fields = Array.from(dialog.querySelectorAll<HTMLElement>('input:not([type=hidden]), select, textarea'))
  // A visually hidden radio is named by its label text; file inputs by their label too.
  return fields.filter((el) => {
    const role = el.getAttribute('type') === 'radio' ? 'radio' : el.getAttribute('type') === 'checkbox' ? 'checkbox' : null
    const name = (role ? screen.queryAllByRole(role, { hidden: true }) : [el]).includes(el)
      ? computeName(el) : ''
    return !name
  }).map((el) => el.outerHTML.slice(0, 120))
}

function computeName(el: HTMLElement): string {
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')!
  const by = el.getAttribute('aria-labelledby')
  if (by) return by.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim()
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (label?.textContent?.trim()) return label.textContent.trim()
  }
  const wrap = el.closest('label')
  return wrap?.textContent?.trim() ?? ''
}

const noop = vi.fn()

describe('dialogs — every field is labelled', () => {
  it.each([
    ['Create Issue (full)', () => <CreateIssueDialog open onOpenChange={noop} outlets={['Jakarta', 'Bandung']} assets={[]} onSubmit={noop} />],
    ['Create Issue (quick)', () => <CreateIssueDialog open quick onOpenChange={noop} outlets={['Jakarta', 'Bandung']} onSubmit={noop} onUploadPhoto={noop} />],
    ['Create Work Order', () => <CreateWorkOrderDialog open onOpenChange={noop} assets={[{ id: 'a1', name: 'Freezer', number: 'AST-1', outlet: 'Jakarta' } as never]} onSubmit={noop} />],
    ['Create Asset', () => <CreateAssetDialog open onOpenChange={noop} outlets={['Jakarta']} onSubmit={noop} />],
    ['Category', () => <NewCategoryDialog open onOpenChange={noop} />],
    ['Outlet', () => <NewOutletDialog open onOpenChange={noop} />],
    ['PIC', () => <NewPICDialog open onOpenChange={noop} categories={[{ id: 'c1', name: 'Dapur', type: 'operations' } as never]} />],
  ])('%s', (_, ui) => {
    render(ui())
    expect(unlabelled()).toEqual([])
  })
})

describe('the audit itself', () => {
  it('catches a field without a label', () => {
    render(<div role="dialog"><label>Name</label><input /><label><input type="checkbox" /> Urgent</label></div>)
    expect(unlabelled()).toHaveLength(1)
  })
})
