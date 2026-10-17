// IssuesListPage routing (Todo-Pilot §14 / UX-1). Written first (TDD).
// The open record and the list filters live in the URL.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIssueStore } from '@/lib/store'
import type { Issue, User } from '@/lib/types'

const nav = vi.hoisted(() => ({ pathname: '/issues', search: '' }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))

const undo = vi.hoisted(() => ({ runWithUndo: vi.fn() }))
vi.mock('@/lib/undo', () => undo)

// A fake API server (Todo-Pilot §22): the list is filtered and paged by the
// server now. Fixtures given to the store as `issues` become the server's data.
const server = vi.hoisted(() => ({ issues: [] as Issue[], today: () => new Date() }))
// Spy on the one shared `api` object: the store module is loaded by
// vitest.setup.ts before any vi.mock in this file could replace it.
import { api } from '@/lib/api-client'
const fakeApi = api as unknown as Record<'get' | 'getPage', ReturnType<typeof vi.fn>>

import { IssuesListPage } from './issues-list-page'

function issue(id: string, over: Partial<Issue> = {}): Issue {
  return {
    id, number: `ISS-2026-${id}`, title: `Issue ${id}`, description: 'desc', outlet: 'Jakarta',
    category: 'Maintenance', priority: 'medium', status: 'open', assignee: 'Budi', dueDate: null,
    createdDate: '2026-10-01', slaBreach: false, taskIds: [], approvalId: null, workOrderId: null,
    closureBlockers: [], ...over,
  }
}

function serverList(path: string) {
  const url = new URL(path, 'http://x')
  const p = (k: string) => url.searchParams.get(k)
  const today = server.today()
  const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const final = ['resolved', 'closed', 'cancelled']
  let rows = server.issues.filter((i) =>
    (!p('q') || [i.number, i.title, i.outlet].some((v) => v.toLowerCase().includes(p('q')!.toLowerCase())))
    && (!p('priority') || i.priority === p('priority')) && (!p('category') || i.category === p('category'))
    && (!p('outlet') || i.outlet === p('outlet')) && (!p('active') || !final.includes(i.status))
    && (!p('ready') || !!i.readyToClose)
    && (!p('late') || (!final.includes(i.status) && !!i.dueDate && i.dueDate < day)))
  const total = rows.length
  const offset = Number(p('offset') ?? 0), limit = Number(p('limit') ?? rows.length)
  rows = rows.slice(offset, offset + limit)
  return { items: rows, total }
}

// Fixtures set on the store become the server's data (the page then caches what it fetched).
const realSetState = useIssueStore.setState
useIssueStore.setState = ((partial: unknown, replace?: boolean) => {
  if (partial && typeof partial === 'object' && 'issues' in (partial as object)) server.issues = (partial as { issues: Issue[] }).issues
  return (realSetState as (p: unknown, r?: boolean) => void)(partial, replace)
}) as typeof useIssueStore.setState

/** Render and wait until the first page arrived from the (fake) server. */
async function renderList(ui = <IssuesListPage />) {
  const r = render(ui)
  await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
  return r
}

let pushState: ReturnType<typeof vi.spyOn>
let replaceState: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  server.today = () => new Date()
  vi.spyOn(api, 'getPage').mockImplementation((async (path: string) => serverList(path)) as never)
  vi.spyOn(api, 'get').mockImplementation((async (path: string) => {
    const one = path.match(/^\/api\/issues\/([^/?]+)$/)
    if (one) {
      const found = server.issues.find((i) => i.id === decodeURIComponent(one[1]))
      if (found) return found
      throw new Error(`API 404 ${path}: {"detail":"Issue not found"}`)
    }
    if (path.startsWith('/api/counts')) return { issuesInProgress: 0, tasksActive: 0, approvalsPending: 0 }
    return []                                     // an issue's tasks / approvals / work orders
  }) as never)
  nav.pathname = '/issues'
  nav.search = ''
  window.history.replaceState(null, '', '/issues')
  pushState = vi.spyOn(window.history, 'pushState')
  replaceState = vi.spyOn(window.history, 'replaceState')
  useIssueStore.setState({
    currentUser: { id: 'u1', name: 'Budi', permissions: { issues: 'manage' }, all_outlets: true } as unknown as User,
    issues: [issue('00001'), issue('00002', { priority: 'high', title: 'Freezer bocor' })],
    tasks: [], approvals: [], workOrders: [], outlets: [], pics: [], assets: [],
  })
})

afterEach(() => vi.restoreAllMocks())

describe('IssuesListPage — URL routing', () => {
  it('opens the drawer of the issue in the URL', async () => {
    nav.pathname = '/issues/00002'
    await renderList(<IssuesListPage />)
    expect(screen.getByRole('dialog', { name: /ISS-2026-00002/ })).toBeInTheDocument()
  })

  it('shows "not found" for an issue the user cannot see', async () => {
    nav.pathname = '/issues/someone-elses'
    render(<IssuesListPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i)   // after the API's 404
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking a card puts the issue in the URL, keeping the filters', async () => {
    nav.search = '?priority=high'
    window.history.replaceState(null, '', '/issues?priority=high')
    await renderList(<IssuesListPage />)
    await userEvent.click(screen.getByText('Freezer bocor'))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues/00002?priority=high')
  })

  it('closing the drawer goes back to the list URL', async () => {
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues')
  })

  it('reads the priority filter from the query string', async () => {
    nav.search = '?priority=high'
    await renderList(<IssuesListPage />)
    expect(screen.getByText('Freezer bocor')).toBeInTheDocument()
    expect(screen.queryByText('Issue 00001')).not.toBeInTheDocument()
  })

  it('writes the priority filter to the query string without a new history entry', async () => {
    await renderList(<IssuesListPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Priority: All' }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'High' }))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/issues?priority=high')
    expect(pushState).not.toHaveBeenCalled()
  })

  it('an embedded list (QA tab) keeps its selection out of the URL', async () => {
    useIssueStore.setState({ issues: [issue('00003', { category: 'Compliance', title: 'Suhu chiller' })] })
    nav.pathname = '/qa'
    await renderList(<IssuesListPage view="qa" />)
    await userEvent.click(screen.getByText('Suhu chiller'))
    expect(pushState).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: /ISS-2026-00003/ })).toBeInTheDocument()
  })
})

// "Siap ditutup" (Todo-Pilot §18 / UX-5, Option A). Written first (TDD).
describe('IssuesListPage — ready to close', () => {
  beforeEach(() => {
    useIssueStore.setState({
      issues: [
        issue('00001', { title: 'WO selesai', readyToClose: true }),
        issue('00002', { title: 'Masih dikerjakan' }),
        issue('00003', { title: 'Juga selesai', status: 'resolved', readyToClose: true }),
      ],
    })
  })

  it('badges issues whose work is finished', async () => {
    await renderList(<IssuesListPage />)
    expect(screen.getAllByText('Ready to close')).toHaveLength(2)
  })

  it('filters to ready issues from the query string', async () => {
    nav.search = '?ready=1'
    await renderList(<IssuesListPage />)
    expect(screen.getByText('WO selesai')).toBeInTheDocument()
    expect(screen.getByText('Juga selesai')).toBeInTheDocument()
    expect(screen.queryByText('Masih dikerjakan')).not.toBeInTheDocument()
  })

  it('the filter toggle writes ?ready=1', async () => {
    await renderList(<IssuesListPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Options' }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /ready to close only/i }))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/issues?ready=1')
  })

  it('closes every ready issue in the list after confirming', async () => {
    const bulkCloseIssues = vi.fn().mockResolvedValue({ closed: [{ id: '00001' }, { id: '00003' }], failed: [] })
    useIssueStore.setState({ bulkCloseIssues })
    nav.search = '?ready=1'
    await renderList(<IssuesListPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Close all 2' }))
    expect(bulkCloseIssues).not.toHaveBeenCalled()                  // asks first
    await userEvent.click(screen.getByRole('button', { name: 'Yes, close 2 issues' }))
    expect(bulkCloseIssues).toHaveBeenCalledWith(['00001', '00003'])
  })

  it('offers bulk close only to users who may change issue status', async () => {
    useIssueStore.setState({
      currentUser: { id: 'u2', name: 'Staff', permissions: { issues: 'view' }, all_outlets: true } as unknown as User,
    })
    nav.search = '?ready=1'
    await renderList(<IssuesListPage />)
    expect(screen.queryByRole('button', { name: /close all/i })).not.toBeInTheDocument()
  })
})

// Assignee is a user (Todo-Pilot §17 / UX-4). Written first (TDD).
describe('IssuesListPage — assignee', () => {
  const budi = { id: 'u-budi', name: 'Budi', role_name: 'Technician', approval_tier: 'staff' }

  beforeEach(() => {
    useIssueStore.setState({
      assignableUsers: { Jakarta: [budi] },
      loadAssignableUsers: vi.fn().mockResolvedValue([budi]),
      issues: [issue('00001', { assignee: 'Pak Joko', assigneeUserId: null })],
    })
  })

  it('a manager reassigns the issue to a user from the drawer', async () => {
    const assignIssue = vi.fn().mockResolvedValue({})
    useIssueStore.setState({ assignIssue })
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)
    await userEvent.selectOptions(screen.getByLabelText(/assigned to/i), 'u-budi')
    expect(assignIssue).toHaveBeenCalledWith('00001', 'u-budi')
  })

  it('warns that an unlinked assignee will not be notified', async () => {
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Pak Joko is not linked to a user account and will not be notified.')
  })

  it('read-only users see the name and the warning, not a picker', async () => {
    useIssueStore.setState({
      currentUser: { id: 'u2', name: 'Staff', permissions: { issues: 'view' }, all_outlets: true } as unknown as User,
    })
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)
    expect(screen.queryByLabelText(/assigned to/i)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/will not be notified/)
  })
})

// One interface language (Todo-Pilot §16): Indonesian is the default.
describe('IssuesListPage — Bahasa Indonesia', () => {
  it('speaks Indonesian, including enum labels and dates', async () => {
    useIssueStore.setState({
      locale: 'id', assignableUsers: { Jakarta: [] }, loadAssignableUsers: async () => [],
      issues: [issue('00001', { title: 'Kompor', readyToClose: true, status: 'in-progress' })],
    })
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)
    expect(screen.getByRole('heading', { name: 'Laporan', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Laporan Baru/ })).toBeInTheDocument()
    expect(screen.getAllByText('Siap ditutup').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dikerjakan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 Okt 2026').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ready to close')).not.toBeInTheDocument()
  })
})

// "Lapor" from the bottom navigation (Todo-Pilot §19): /issues?new=1 opens the form.
describe('IssuesListPage — ?new=1', () => {
  it('opens the create dialog and drops the flag from the URL', async () => {
    useIssueStore.setState({ locale: 'en', issues: [], assignableUsers: {}, loadAssignableUsers: async () => [] })
    nav.search = '?new=1'
    window.history.replaceState(null, '', '/issues?new=1')
    await renderList(<IssuesListPage />)
    expect(await screen.findByRole('heading', { name: 'New Issue' })).toBeInTheDocument()
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/issues')
  })
})

describe('IssuesListPage — informative cards (Todo-Pilot §21)', () => {
  const card = (title: string) => screen.getByRole('button', { name: new RegExp(title) })

  it('a card is named by its number and title only — badges are its description', async () => {
    useIssueStore.setState({ issues: [issue('00001', { title: 'Siap', readyToClose: true })] })
    await renderList(<IssuesListPage />)
    const c = card('Siap')
    expect(c).toHaveAccessibleName('ISS-2026-00001 Siap')
    expect(c).toHaveAccessibleDescription(/Ready to close/)
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('counts down to the SLA, then shows how late it is', async () => {
    useIssueStore.setState({
      issues: [
        issue('00001', { title: 'Three days', dueDate: '2026-10-17' }),
        issue('00002', { title: 'Due now', dueDate: '2026-10-14' }),
        issue('00003', { title: 'Late one', dueDate: '2026-10-12', slaBreach: true }),
        issue('00004', { title: 'Finished', dueDate: '2026-10-12', status: 'closed' }),
      ],
    })
    await renderList(<IssuesListPage />)
    expect(card('Three days')).toHaveTextContent('3 days left')
    expect(card('Due now')).toHaveTextContent('Due today')
    expect(card('Late one')).toHaveTextContent('2 days overdue')
    expect(card('Finished')).not.toHaveTextContent(/left|overdue|due today/i)
  })

  it('shows how long ago it was reported', async () => {
    useIssueStore.setState({ issues: [issue('00001', { title: 'Fresh', createdAt: '2026-10-14T09:00:00+07:00' } as Partial<Issue>)] })
    vi.setSystemTime(new Date('2026-10-14T11:00:00+07:00'))
    await renderList(<IssuesListPage />)
    expect(card('Fresh')).toHaveTextContent('2 h ago')
  })

  it('shows the approval step it waits on, or that it was rejected', async () => {
    const approval = (id: string, issueId: string, over: object) => ({
      id, number: `APR-${id}`, issueId, status: 'pending', currentStepOrder: 1, escalated: false,
      steps: [{}, {}], ...over,
    })
    useIssueStore.setState({
      issues: [issue('00001', { title: 'Waiting money' }), issue('00002', { title: 'Said no' })],
      approvals: [approval('a1', '00001', { currentStepOrder: 2 }), approval('a2', '00002', { status: 'rejected' })] as never,
    })
    await renderList(<IssuesListPage />)
    expect(card('Waiting money')).toHaveTextContent('Approval step 2/2')
    expect(card('Said no')).toHaveTextContent('Approval rejected')
  })

  it('shows the linked work order and its status', async () => {
    useIssueStore.setState({
      issues: [issue('00001', { title: 'AC rusak', workOrderId: 'w1' })],
      workOrders: [{ id: 'w1', number: 'WO-2026-00007', issueId: '00001', status: 'in-progress' }] as never,
    })
    await renderList(<IssuesListPage />)
    expect(card('AC rusak')).toHaveTextContent('WO-2026-00007')
    expect(card('AC rusak')).toHaveTextContent('In progress')
  })

  it('cards open with the keyboard', async () => {
    vi.useRealTimers()
    useIssueStore.setState({ issues: [issue('00001', { title: 'Keyboard user' })] })
    await renderList(<IssuesListPage />)
    card('Keyboard user').focus()
    await userEvent.keyboard('{Enter}')
    expect(pushState).toHaveBeenCalledWith(null, '', '/issues/00001')
  })
})

describe('IssuesListPage — closing from the drawer (Todo-Pilot §23)', () => {
  it('closing waits a moment with Undo before it is sent', async () => {
    const updateIssueStatus = vi.fn()
    useIssueStore.setState({ issues: [issue('00001', { status: 'resolved' })], updateIssueStatus })
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)

    await userEvent.click(screen.getByRole('button', { name: /resolved/i, expanded: false }))
    await userEvent.click(screen.getByRole('option', { name: 'Closed' }))

    expect(updateIssueStatus).not.toHaveBeenCalled()
    const opts = undo.runWithUndo.mock.calls.at(-1)![0]
    expect(opts).toMatchObject({ message: 'Closing ISS-2026-00001…', undoLabel: 'Undo' })
    opts.run()
    expect(updateIssueStatus).toHaveBeenCalledWith('00001', 'closed')
  })

  it('other status changes happen at once', async () => {
    const updateIssueStatus = vi.fn()
    useIssueStore.setState({ issues: [issue('00001')], updateIssueStatus })
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)
    await userEvent.click(screen.getByRole('button', { name: /^open$/i, expanded: false }))
    await userEvent.click(screen.getByRole('option', { name: 'In progress' }))
    expect(updateIssueStatus).toHaveBeenCalledWith('00001', 'in-progress')
  })

  it('says what still blocks resolving or closing, without hovering', async () => {
    useIssueStore.setState({
      issues: [issue('00001', { closureBlockers: [{ type: 'task', id: 't1', number: 'TSK-1', status: 'open' }] })],
    })
    nav.pathname = '/issues/00001'
    await renderList(<IssuesListPage />)
    expect(screen.getByText('Still open: TSK-1')).toBeInTheDocument()
  })
})

describe('IssuesListPage — empty states (Todo-Pilot §24)', () => {
  it('with no issues yet, explains where issues come from and offers to create one', async () => {
    useIssueStore.setState({ issues: [] })
    await renderList(<IssuesListPage />)
    const empty = screen.getByRole('status', { name: 'No issues yet' })
    expect(empty).toHaveTextContent(/staff report problems from their phone/i)
    await userEvent.click(within(empty).getByRole('button', { name: 'Create the first issue' }))
    expect(screen.getByRole('dialog', { name: 'New Issue' })).toBeInTheDocument()
  })

  it('when filters hide everything, says so and clears them', async () => {
    nav.search = '?priority=critical'
    window.history.replaceState(null, '', '/issues?priority=critical')
    await renderList(<IssuesListPage />)
    const empty = screen.getByRole('status', { name: 'No issues match these filters' })
    await userEvent.click(within(empty).getByRole('button', { name: 'Clear filters' }))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/issues')
  })
})

describe('IssuesListPage — drill-down from the GM view (Todo-Pilot §25)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
    useIssueStore.setState({
      issues: [
        issue('00001', { title: 'Dago late', outlet: 'Dago', dueDate: '2026-10-10' }),
        issue('00002', { title: 'Dago on time', outlet: 'Dago', dueDate: '2026-10-20' }),
        issue('00003', { title: 'Riau late', outlet: 'Riau', dueDate: '2026-10-10' }),
      ],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('?outlet= shows one outlet, ?late=1 only issues past SLA — and says so', async () => {
    nav.search = '?outlet=Dago&late=1'
    await renderList(<IssuesListPage />)
    expect(screen.getByText('Dago late')).toBeInTheDocument()
    expect(screen.queryByText('Dago on time')).not.toBeInTheDocument()
    expect(screen.queryByText('Riau late')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Outlet: Dago/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Past SLA/ })).toBeInTheDocument()
  })

  it('follows the top bar outlet filter (Todo-UI)', async () => {
    useIssueStore.setState({
      currentUser: { ...useIssueStore.getState().currentUser!, all_outlets: true },
      outlets: [{ id: 'o-dago', name: 'Dago' }, { id: 'o-riau', name: 'Riau' }] as never,
      outletFilter: 'Riau',
    })
    await renderList(<IssuesListPage />)
    expect(screen.getByText('Riau late')).toBeInTheDocument()
    expect(screen.queryByText('Dago late')).not.toBeInTheDocument()
    useIssueStore.setState({ outletFilter: null })
  })

  it('the chips remove their filter', async () => {
    vi.useRealTimers()
    nav.search = '?outlet=Dago'
    window.history.replaceState(null, '', '/issues?outlet=Dago')
    await renderList(<IssuesListPage />)
    await userEvent.click(screen.getByRole('button', { name: /Outlet: Dago/ }))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/issues')
  })
})

describe('IssuesListPage — keyboard (Todo-Pilot §26)', () => {
  it('Escape closes the drawer and puts the issue out of the URL', async () => {
    nav.pathname = '/issues/00002'
    await renderList(<IssuesListPage />)
    expect(screen.getByRole('dialog', { name: /ISS-2026-00002/ })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/issues')
  })
})

describe('IssuesListPage — server paging (Todo-Pilot §22)', () => {
  it('asks the server for one page with the filters, and pages through the total', async () => {
    useIssueStore.setState({ issues: Array.from({ length: 30 }, (_, n) => issue(String(n + 1).padStart(5, '0'), { priority: 'high' })) })
    nav.search = '?priority=high&open=1'
    await renderList()
    expect(fakeApi.getPage).toHaveBeenLastCalledWith('/api/issues?priority=high&active=true&limit=12&offset=0')
    expect(screen.getByText(/Showing 1–12 of 30 issues/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /next/i })[0])
    await waitFor(() => expect(fakeApi.getPage).toHaveBeenLastCalledWith('/api/issues?priority=high&active=true&limit=12&offset=12'))
  })

  it('opens an issue that is not on the page by reading it from the server', async () => {
    useIssueStore.setState({ issues: [] })
    server.issues = [issue('00042', { title: 'Far away' })]
    fakeApi.getPage.mockResolvedValue({ items: [], total: 0 })
    nav.pathname = '/issues/00042'
    render(<IssuesListPage />)
    expect(await screen.findByRole('dialog', { name: /ISS-2026-00042/ })).toBeInTheDocument()
    expect(fakeApi.get).toHaveBeenCalledWith('/api/issues/00042')
  })

})
