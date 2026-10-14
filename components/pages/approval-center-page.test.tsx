// ApprovalCenterPage routing (Todo-Pilot §14 / UX-1). Written first (TDD).
// WhatsApp/email link to /approvals/{id}: the approver must land on that request.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { ApprovalRequest, User } from '@/lib/types'

const nav = vi.hoisted(() => ({ pathname: '/approvals', search: '' }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import { ApprovalCenterPage } from './approval-center-page'

function approval(id: string, over: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id, number: `APR-2026-${id}`, title: `Approval ${id}`, type: 'maintenance', description: 'd',
    requester: 'Budi', outlet: 'Jakarta', requestedDate: '2026-10-01', amount: 2_000_000, currency: 'IDR',
    status: 'pending', issueId: null, issueNumber: null, currentStepOrder: 1, escalated: false, steps: [],
    ...over,
  }
}

// A fake API server (Todo-Pilot §22): the list is filtered and paged by the
// server. Fixtures given to the store as `approvals` become the server's data;
// spied on the shared `api` object (the store is loaded before vi.mock could apply).
import { api } from '@/lib/api-client'
const server = { approvals: [] as ApprovalRequest[] }
const realSetState = useIssueStore.setState
useIssueStore.setState = ((partial: unknown, replace?: boolean) => {
  if (partial && typeof partial === 'object' && 'approvals' in (partial as object)) server.approvals = (partial as { approvals: ApprovalRequest[] }).approvals
  return (realSetState as (p: unknown, r?: boolean) => void)(partial, replace)
}) as typeof useIssueStore.setState

function serverList(path: string) {
  const url = new URL(path, 'http://x')
  const p = (k: string) => url.searchParams.get(k)
  const rows = server.approvals.filter((a) => (!p('status') || a.status === p('status')) && (!p('type') || a.type === p('type'))
    && (!p('q') || [a.number, a.title, a.requester].some((v) => v.toLowerCase().includes(p('q')!.toLowerCase()))))
  const offset = Number(p('offset') ?? 0), limit = Number(p('limit') ?? rows.length)
  return { items: rows.slice(offset, offset + limit), total: rows.length }
}

async function renderPage() {
  const r = render(<ApprovalCenterPage />)
  await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
  return r
}

let pushState: ReturnType<typeof vi.spyOn>
let replaceState: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.spyOn(api, 'getPage').mockImplementation((async (path: string) => serverList(path)) as never)
  vi.spyOn(api, 'get').mockImplementation((async (path: string) => {
    const one = path.match(/^\/api\/approvals\/([^/?]+)$/)
    const found = one && server.approvals.find((a) => a.id === decodeURIComponent(one[1]))
    if (found) return found
    if (path.startsWith('/api/counts')) return { issuesInProgress: 0, tasksActive: 0, approvalsPending: 0 }
    throw new Error(`API 404 ${path}: {"detail":"Approval not found"}`)
  }) as never)
  nav.pathname = '/approvals'
  nav.search = ''
  window.history.replaceState(null, '', '/approvals')
  pushState = vi.spyOn(window.history, 'pushState')
  replaceState = vi.spyOn(window.history, 'replaceState')
  useIssueStore.setState({
    currentUser: { id: 'u1', name: 'Budi', permissions: { approvals: 'manage' } } as unknown as User,
    approvals: [approval('00001'), approval('00002', { status: 'approved', title: 'Sudah disetujui' })],
    allUsers: [],
  })
})

afterEach(() => vi.restoreAllMocks())

describe('ApprovalCenterPage — URL routing', () => {
  it('opens the approval in the URL, even one hidden by the default "pending" filter', async () => {
    nav.pathname = '/approvals/00002'
    await renderPage()
    expect(screen.getByRole('dialog', { name: /APR-2026-00002/ })).toBeInTheDocument()
  })

  it('shows "not found" for an approval the user cannot see', async () => {
    nav.pathname = '/approvals/nope'
    render(<ApprovalCenterPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i)   // after the API's 404
  })

  it('clicking a card puts the approval in the URL', async () => {
    await renderPage()
    await userEvent.click(screen.getByText('Approval 00001'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/approvals/00001')
  })

  it('lists pending approvals by default and others via the status filter in the URL', async () => {
    await renderPage()
    expect(screen.queryByText('Sudah disetujui')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^approved$/i }))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/approvals?status=approved')
  })

  it('reads the status filter from the query string ("" = all)', async () => {
    nav.search = '?status='
    await renderPage()
    expect(screen.getByText('Sudah disetujui')).toBeInTheDocument()
    expect(screen.getByText('Approval 00001')).toBeInTheDocument()
  })
})

describe('ApprovalCenterPage — confirm before deciding (Todo-Pilot §23)', () => {
  const steps = [
    { id: 's1', stepOrder: 1, approverRole: 'manager', status: 'pending' },
    { id: 's2', stepOrder: 2, approverRole: 'admin', status: 'pending' },
  ] as never

  beforeEach(() => {
    nav.pathname = '/approvals/00001'
    useIssueStore.setState({
      currentUser: { id: 'u1', name: 'Budi', approval_tier: 'manager', permissions: { approvals: 'manage' } } as unknown as User,
      approvals: [approval('00001', { steps })],
      decideApproval: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('says what approving does, and decides only after "Yes"', async () => {
    const { decideApproval } = useIssueStore.getState()
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Approve Step 1' }))

    expect(decideApproval).not.toHaveBeenCalled()
    expect(screen.getByText('Approve this step — the request then goes to step 2/2.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Yes, approve' }))
    expect(decideApproval).toHaveBeenCalledWith('00001', 'approved', undefined)
  })

  it('rejecting can be called off', async () => {
    const { decideApproval } = useIssueStore.getState()
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
    expect(screen.getByText(/the issue waits for a revised cost/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(decideApproval).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
  })
})

describe('ApprovalCenterPage — empty (Todo-Pilot §24)', () => {
  it('a new company learns where approvals come from', async () => {
    useIssueStore.setState({ approvals: [] })
    await renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/created automatically/i)
  })
})

describe('ApprovalCenterPage — server lists (Todo-Pilot §22)', () => {
  it('pages on the server and counts each status there, not in the browser', async () => {
    useIssueStore.setState({ approvals: Array.from({ length: 25 }, (_, n) => approval(String(n).padStart(5, '0'))) })
    await renderPage()
    expect(api.getPage).toHaveBeenCalledWith('/api/approvals?status=pending&limit=20&offset=0')
    expect(api.getPage).toHaveBeenCalledWith('/api/approvals?status=approved&limit=1')
    expect(screen.getAllByText(/^Approval \d{5}$/)).toHaveLength(20)
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
  })
})
