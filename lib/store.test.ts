// Issue Core store actions (Todo-Pilot §12): createIssue, decideApproval,
// transitionWorkOrder. Written first (TDD). The REST client is mocked — these
// tests pin down what each action sends and how it updates the local cache.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api-client')>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), mutateOrQueue: vi.fn() },
  authToken: { get: () => null, set: vi.fn(), clear: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { toast } from 'sonner'
import { api, cachedMasterData, QueuedError } from './api-client'
import { useIssueStore } from './store'
import type { ApprovalRequest, Asset, Issue, User, WorkOrder } from './types'

const mocked = api as unknown as Record<'get' | 'post' | 'patch' | 'delete' | 'mutateOrQueue', ReturnType<typeof vi.fn>>
const initial = useIssueStore.getState()
const COUNTS = { issuesInProgress: 1, tasksActive: 0, approvalsPending: 0 }

/** GET routes for one issue's derived records (Todo-Pilot §22: never the whole lists). */
function children(id: string, over: { tasks?: unknown[]; approvals?: unknown[]; workOrders?: unknown[] } = {}) {
  return {
    [`/api/tasks?issue_id=${id}`]: over.tasks ?? [],
    [`/api/approvals?issue_id=${id}`]: over.approvals ?? [],
    [`/api/work-orders?issue_id=${id}`]: over.workOrders ?? [],
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function user(permissions: User['permissions'] = { issues: 'manage', tasks: 'manage', approvals: 'manage', cmms: 'manage' }): User {
  return {
    id: 'u1', email: 'gm@test', name: 'GM Jakarta', role: 'manager', is_active: true, outlet_ids: [],
    role_name: 'Manager', approval_tier: 'manager', permissions, all_outlets: true, effective_outlet_ids: [],
  }
}

function issue(over: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-1', number: 'ISS-2026-00001', title: 'Kompor rusak', description: '', outlet: 'Jakarta',
    category: 'Maintenance', priority: 'high', status: 'open', assignee: 'Unassigned', dueDate: null,
    createdDate: '2026-10-01', slaBreach: false, taskIds: [], approvalId: null, workOrderId: null,
    closureBlockers: [], ...over,
  } as Issue
}

function approval(over: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: 'apr-1', number: 'APR-2026-00001', title: 'Kompor rusak', type: 'maintenance', description: '',
    requester: 'Staff', outlet: 'Jakarta', requestedDate: '2026-10-01', amount: 2_000_000, status: 'pending',
    issueId: 'iss-1', issueNumber: 'ISS-2026-00001', currentStepOrder: 1, escalated: false, steps: [], ...over,
  }
}

function wo(over: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1', number: 'WO-2026-00001', assetId: 'as-1', issueId: 'iss-1', status: 'on-hold',
    requiresApproval: true, approvalId: 'apr-1', ...over,
  } as WorkOrder
}

function asset(over: Partial<Asset> = {}): Asset {
  return { id: 'as-1', name: 'Kompor', status: 'operational', ...over } as Asset
}

/** Route mocked GETs by path; unknown paths fail loudly. */
function serveGets(routes: Record<string, unknown>) {
  mocked.get.mockImplementation(async (path: string) => {
    if (path in routes) return routes[path]
    throw new Error(`unexpected GET ${path}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  useIssueStore.setState(initial, true)
  useIssueStore.setState({ currentUser: user() })
})

// ---------------------------------------------------------------------------
// createIssue
// ---------------------------------------------------------------------------

const input = {
  title: 'Kompor rusak', description: 'Api tidak menyala', outlet: 'Jakarta', category: 'Maintenance' as const,
  priority: 'high' as const, assignee: 'Unassigned', dueDate: '2026-10-10', generateTask: false, generateApproval: false,
  generateWorkOrder: true, estimatedCost: 2_000_000,
}

describe('createIssue', () => {
  // Through the offline queue (Todo-PWA, verifikasi akhir): the dialog's
  // idempotency key is the queue key, so a replay never makes a second issue.
  it('sends the issue with the dialog\'s idempotency key as the queue key', async () => {
    mocked.mutateOrQueue.mockResolvedValue(issue())
    serveGets({ ...children('iss-1'), '/api/counts': COUNTS })

    await useIssueStore.getState().createIssue({ ...input, idempotencyKey: 'key-1' })

    const [spec] = mocked.mutateOrQueue.mock.calls[0]
    expect(spec).toMatchObject({ method: 'POST', path: '/api/issues', key: 'key-1', label: 'Laporan: Kompor rusak' })
    expect(spec.body).toMatchObject({ title: 'Kompor rusak', category: 'Maintenance', generateWorkOrder: true, estimatedCost: 2_000_000 })
    expect(spec.body).not.toHaveProperty('idempotencyKey')
  })

  it('sends the picked assignee as a user id (Todo-Pilot §17)', async () => {
    mocked.mutateOrQueue.mockResolvedValue(issue())
    serveGets({ ...children('iss-1'), '/api/counts': COUNTS })
    await useIssueStore.getState().createIssue({ ...input, assignee: 'Budi', assigneeUserId: 'u-budi' })
    expect(mocked.mutateOrQueue.mock.calls[0][0].body).toMatchObject({ assignee: 'Budi', assigneeUserId: 'u-budi' })
  })

  it('without a key the queue mints one', async () => {
    mocked.mutateOrQueue.mockResolvedValue(issue())
    serveGets({ ...children('iss-1'), '/api/counts': COUNTS })
    await useIssueStore.getState().createIssue(input)
    expect(mocked.mutateOrQueue.mock.calls[0][0].key).toBeUndefined()
  })

  it('prepends the issue and picks up the generated approval and work order', async () => {
    useIssueStore.setState({ issues: [issue({ id: 'old', number: 'ISS-OLD' })] })
    mocked.mutateOrQueue.mockResolvedValue(issue({ approvalId: 'apr-1', workOrderId: 'wo-1' }))
    serveGets({ ...children('iss-1', { approvals: [approval()], workOrders: [wo()] }), '/api/counts': COUNTS })

    const created = await useIssueStore.getState().createIssue(input)

    const s = useIssueStore.getState()
    expect(created.id).toBe('iss-1')
    expect(s.issues.map((i) => i.id)).toEqual(['iss-1', 'old'])
    expect(s.approvals.map((a) => a.id)).toEqual(['apr-1'])
    expect(s.workOrders.map((w) => w.id)).toEqual(['wo-1'])
  })

  it('a replayed request (same idempotency key → same issue) does not duplicate it', async () => {
    useIssueStore.setState({ issues: [issue()] })
    mocked.mutateOrQueue.mockResolvedValue(issue())
    serveGets({ ...children('iss-1'), '/api/counts': COUNTS })
    await useIssueStore.getState().createIssue({ ...input, idempotencyKey: 'key-1' })
    expect(useIssueStore.getState().issues).toHaveLength(1)
  })

  it('only re-reads the lists the user may read — and only this issue\'s records', async () => {
    useIssueStore.setState({ currentUser: user({ issues: 'manage' }), tasks: [], workOrders: [wo({ id: 'cached' })] })
    mocked.mutateOrQueue.mockResolvedValue(issue())
    serveGets({ '/api/counts': COUNTS })                      // any other GET would throw

    await useIssueStore.getState().createIssue(input)

    expect(mocked.get.mock.calls.map(([p]) => p)).toEqual(['/api/counts'])
    expect(useIssueStore.getState().workOrders.map((w) => w.id)).toEqual(['cached'])
  })

  it('leaves the cache alone when the API refuses', async () => {
    useIssueStore.setState({ issues: [issue({ id: 'old' })] })
    mocked.mutateOrQueue.mockRejectedValue(new Error('API 422 /api/issues: bad'))
    await expect(useIssueStore.getState().createIssue(input)).rejects.toThrow('422')
    expect(useIssueStore.getState().issues.map((i) => i.id)).toEqual(['old'])
  })

  it('no signal: queued — the caller learns it, nothing is reloaded', async () => {
    useIssueStore.setState({ issues: [issue({ id: 'old' })] })
    mocked.mutateOrQueue.mockRejectedValue(new QueuedError('Laporan: Kompor rusak'))
    await expect(useIssueStore.getState().createIssue({ ...input, idempotencyKey: 'key-1' })).rejects.toBeInstanceOf(QueuedError)
    expect(mocked.get).not.toHaveBeenCalled()
    expect(useIssueStore.getState().issues.map((i) => i.id)).toEqual(['old'])
  })
})

describe('uploadIssuePhoto', () => {
  const file = new File(['x'], 'bocor.jpg', { type: 'image/jpeg' })

  it('to an existing issue', async () => {
    mocked.mutateOrQueue.mockResolvedValue({ id: 'p1' })
    await useIssueStore.getState().uploadIssuePhoto('iss-1', file)
    expect(mocked.mutateOrQueue.mock.calls[0][0]).toMatchObject({ path: '/api/issues/iss-1/photos', file })
    expect(mocked.mutateOrQueue.mock.calls[0][0].after).toBeUndefined()
  })

  it('to a report still in the offline queue: waits for it', async () => {
    mocked.mutateOrQueue.mockRejectedValue(new QueuedError('Foto laporan'))
    await expect(useIssueStore.getState().uploadIssuePhoto({ afterKey: 'key-1' }, file)).rejects.toBeInstanceOf(QueuedError)
    expect(mocked.mutateOrQueue.mock.calls[0][0]).toMatchObject({ path: '/api/issues/{parent}/photos', after: 'key-1' })
  })
})

describe('loadMasterData without a signal', () => {
  it('falls back to the outlets and categories kept on this device', async () => {
    const me = user({ issues: 'view' })
    useIssueStore.setState({ currentUser: me, outlets: [], categories: [] })
    const get = vi.spyOn(cachedMasterData, 'get').mockReturnValue({
      outlets: [{ id: 'o1', name: 'KL Central' }] as never, categories: [{ id: 'c1', name: 'Other' }] as never,
    })
    mocked.get.mockRejectedValue(new TypeError('Failed to fetch'))

    await useIssueStore.getState().loadMasterData()

    expect(get).toHaveBeenCalledWith(me.id)
    expect(useIssueStore.getState().outlets.map((o) => o.name)).toEqual(['KL Central'])
    expect(useIssueStore.getState().categories.map((c) => c.name)).toEqual(['Other'])
    get.mockRestore()
  })

  it('keeps what it loaded online for the next offline start', async () => {
    const me = user({ issues: 'view' })
    useIssueStore.setState({ currentUser: me })
    const set = vi.spyOn(cachedMasterData, 'set').mockImplementation(() => {})
    serveGets({ '/api/outlets': [{ id: 'o1', name: 'KL Central' }], '/api/categories': [], '/api/pics': [] })

    await useIssueStore.getState().loadMasterData()

    expect(set).toHaveBeenCalledWith(me.id, { outlets: [{ id: 'o1', name: 'KL Central' }], categories: [] })
    set.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// decideApproval
// ---------------------------------------------------------------------------

describe('decideApproval', () => {
  beforeEach(() => {
    useIssueStore.setState({
      issues: [issue({ status: 'waiting', approvalId: 'apr-1', workOrderId: 'wo-1' })],
      approvals: [approval()],
      workOrders: [wo(), wo({ id: 'wo-other', approvalId: 'apr-9' })],
    })
  })

  it('sends the decision with the current user as decider', async () => {
    mocked.patch.mockResolvedValue(approval({ currentStepOrder: 2 }))
    await useIssueStore.getState().decideApproval('apr-1', 'approved', 'OK dari GM')
    expect(mocked.patch).toHaveBeenCalledWith('/api/approvals/apr-1/decide',
      { decision: 'approved', comment: 'OK dari GM', decidedBy: 'GM Jakarta' })
  })

  it('an intermediate step only updates the approval', async () => {
    mocked.patch.mockResolvedValue(approval({ currentStepOrder: 2 }))
    await useIssueStore.getState().decideApproval('apr-1', 'approved')

    const s = useIssueStore.getState()
    expect(s.approvals[0].currentStepOrder).toBe(2)
    expect(s.workOrders[0].status).toBe('on-hold')
    // the Issue did not change (only the menu badges are refreshed)
    expect(mocked.get.mock.calls.filter(([p]) => String(p).startsWith('/api/issues'))).toEqual([])
  })

  it('final approval starts the linked work order and re-reads the issue', async () => {
    mocked.patch.mockResolvedValue(approval({ status: 'approved', currentStepOrder: 2 }))
    serveGets({ '/api/issues/iss-1': issue({ status: 'in-progress', approvalId: 'apr-1', workOrderId: 'wo-1' }) })

    await useIssueStore.getState().decideApproval('apr-1', 'approved')

    const s = useIssueStore.getState()
    expect(s.approvals[0].status).toBe('approved')
    expect(s.workOrders.find((w) => w.id === 'wo-1')?.status).toBe('in-progress')
    expect(s.workOrders.find((w) => w.id === 'wo-other')?.status).toBe('on-hold')
    expect(s.issues[0].status).toBe('in-progress')       // server's version, not a guess
  })

  it('final rejection cancels the linked work order, as the backend does', async () => {
    mocked.patch.mockResolvedValue(approval({ status: 'rejected' }))
    serveGets({ '/api/issues/iss-1': issue({ status: 'waiting' }) })

    await useIssueStore.getState().decideApproval('apr-1', 'rejected', 'Terlalu mahal')

    const s = useIssueStore.getState()
    expect(s.workOrders.find((w) => w.id === 'wo-1')?.status).toBe('cancelled')
    expect(s.workOrders.find((w) => w.id === 'wo-other')?.status).toBe('on-hold')
    expect(s.issues[0].status).toBe('waiting')
  })

  it('a work order that never needed approval is not touched', async () => {
    useIssueStore.setState({ workOrders: [wo({ requiresApproval: false, status: 'scheduled' })] })
    mocked.patch.mockResolvedValue(approval({ status: 'approved' }))
    serveGets({ '/api/issues/iss-1': issue() })
    await useIssueStore.getState().decideApproval('apr-1', 'approved')
    expect(useIssueStore.getState().workOrders[0].status).toBe('scheduled')
  })

  it('a purchase-request approval (no issue) does not re-read any issue', async () => {
    useIssueStore.setState({ approvals: [approval({ issueId: null, issueNumber: null, purchaseRequestId: 'pr-1' })] })
    mocked.patch.mockResolvedValue(approval({ status: 'approved', issueId: null, issueNumber: null }))
    await useIssueStore.getState().decideApproval('apr-1', 'approved')
    expect(mocked.get.mock.calls.filter(([p]) => String(p).startsWith('/api/issues'))).toEqual([])
  })

  it('a refused decision (e.g. not your step) rejects and changes nothing', async () => {
    mocked.patch.mockRejectedValue(new Error('API 403 /api/approvals/apr-1/decide: not your step'))
    await expect(useIssueStore.getState().decideApproval('apr-1', 'approved')).rejects.toThrow('403')
    expect(useIssueStore.getState().approvals[0].status).toBe('pending')
  })
})

// ---------------------------------------------------------------------------
// transitionWorkOrder
// ---------------------------------------------------------------------------

describe('transitionWorkOrder', () => {
  beforeEach(() => {
    useIssueStore.setState({
      issues: [issue({ status: 'in-progress', workOrderId: 'wo-1' })],
      workOrders: [wo({ status: 'scheduled', requiresApproval: false, approvalId: null })],
      assets: [asset(), asset({ id: 'as-2', name: 'Freezer' })],
    })
  })

  it('posts the target status and merges the returned detail', async () => {
    mocked.patch.mockResolvedValue({ ...wo({ status: 'in-progress', requiresApproval: false, approvalId: null }), checklist: [] })
    serveGets({ '/api/issues/iss-1': issue({ status: 'in-progress' }) })

    const detail = await useIssueStore.getState().transitionWorkOrder('wo-1', 'in-progress')

    expect(mocked.patch).toHaveBeenCalledWith('/api/work-orders/wo-1/transition', { targetStatus: 'in-progress' })
    expect(detail.status).toBe('in-progress')
    expect(useIssueStore.getState().workOrders[0].status).toBe('in-progress')
  })

  it('starting work puts the asset under maintenance', async () => {
    mocked.patch.mockResolvedValue(wo({ status: 'in-progress' }))
    serveGets({ '/api/issues/iss-1': issue() })
    await useIssueStore.getState().transitionWorkOrder('wo-1', 'in-progress')
    const s = useIssueStore.getState()
    expect(s.assets.find((a) => a.id === 'as-1')?.status).toBe('maintenance')
    expect(s.assets.find((a) => a.id === 'as-2')?.status).toBe('operational')
  })

  it('completing the last open work order returns the asset to operational', async () => {
    useIssueStore.setState({ assets: [asset({ status: 'maintenance' })], workOrders: [wo({ status: 'in-progress' })] })
    mocked.patch.mockResolvedValue(wo({ status: 'completed' }))
    serveGets({ '/api/issues/iss-1': issue({ status: 'resolved' }) })

    await useIssueStore.getState().transitionWorkOrder('wo-1', 'completed')

    const s = useIssueStore.getState()
    expect(s.assets[0].status).toBe('operational')
    expect(s.issues[0].status).toBe('resolved')          // roll-up picked up from the server
  })

  it('the asset stays under maintenance while another work order is still open', async () => {
    useIssueStore.setState({
      assets: [asset({ status: 'maintenance' })],
      workOrders: [wo({ status: 'in-progress' }), wo({ id: 'wo-2', issueId: null, status: 'on-hold' })],
    })
    mocked.patch.mockResolvedValue(wo({ status: 'completed' }))
    serveGets({ '/api/issues/iss-1': issue() })
    await useIssueStore.getState().transitionWorkOrder('wo-1', 'completed')
    expect(useIssueStore.getState().assets[0].status).toBe('maintenance')
  })

  it('a standalone work order (no issue) does not re-read any issue', async () => {
    useIssueStore.setState({ workOrders: [wo({ issueId: null, status: 'scheduled' })] })
    mocked.patch.mockResolvedValue(wo({ issueId: null, status: 'in-progress' }))
    await useIssueStore.getState().transitionWorkOrder('wo-1', 'in-progress')
    expect(mocked.get).not.toHaveBeenCalled()
  })

  it('an illegal transition rejects and leaves the cache alone', async () => {
    mocked.patch.mockRejectedValue(new Error('API 409 /api/work-orders/wo-1/transition: illegal'))
    await expect(useIssueStore.getState().transitionWorkOrder('wo-1', 'completed')).rejects.toThrow('409')
    const s = useIssueStore.getState()
    expect(s.workOrders[0].status).toBe('scheduled')
    expect(s.assets[0].status).toBe('operational')
  })
})

// ---------------------------------------------------------------------------
// login (Todo-Pilot §11: an inactive company is refused with 403)
// ---------------------------------------------------------------------------

describe('login', () => {
  beforeEach(() => useIssueStore.setState({ currentUser: null }))

  it('wrong credentials read as such', async () => {
    mocked.post.mockRejectedValue(new Error('API 401 /api/auth/login: {"detail":"Invalid email or password"}'))
    await expect(useIssueStore.getState().login('a@b.c', 'x')).rejects.toThrow()
    expect(useIssueStore.getState().authError).toBe('Invalid email or password')
  })

  it('an inactive company shows the server’s reason, not raw JSON', async () => {
    mocked.post.mockRejectedValue(new Error(
      'API 403 /api/auth/login: {"detail":"Your company\'s account is inactive. Contact support."}'))
    await expect(useIssueStore.getState().login('a@b.c', 'x')).rejects.toThrow()
    expect(useIssueStore.getState().authError).toBe("Your company's account is inactive. Contact support.")
  })
})

// ---------------------------------------------------------------------------
// logout (cross-check fix 2026-10-03): nothing of the previous session may
// survive for the next user — loadAll skips modules the new user can't read,
// so a leftover slice would never be overwritten.
// ---------------------------------------------------------------------------

describe('logout', () => {
  it('clears every data slice back to its initial value', () => {
    const dirty = {
      issues: [issue()], approvals: [approval()], workOrders: [wo()], assets: [asset()],
      auditLogs: [{}], allUsers: [user()], roles: [{}], modules: [{}], vendors: [{}],
      trainingPrograms: [{}], campaigns: [{}], parts: [{}], pmSchedules: [{}],
      purchaseRequests: [{}], purchaseOrders: [{}], approvalPolicies: [{}],
      notifications: [{}], unreadCount: 7, cmmsAnalytics: {},
    }
    useIssueStore.setState(dirty as never)

    useIssueStore.getState().logout()

    const s = useIssueStore.getState() as unknown as Record<string, unknown>
    expect(s.currentUser).toBeNull()
    for (const key of Object.keys(dirty)) {
      expect(s[key], key).toEqual((initial as unknown as Record<string, unknown>)[key])
    }
  })

  it('drops pages the service worker cached (Todo-PWA P1: shared devices)', async () => {
    const names = new Set(['ro-pages-b1', 'ro-static-b1'])
    vi.stubGlobal('caches', { keys: async () => [...names], delete: async (n: string) => names.delete(n) })
    useIssueStore.getState().logout()
    await vi.waitFor(() => expect([...names]).toEqual(['ro-static-b1']))
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// markNotificationRead (cross-check fix 2026-10-03)
// ---------------------------------------------------------------------------

describe('markNotificationRead', () => {
  const notif = (over = {}) => ({
    id: 'n1', title: 't', message: 'm', type: 'info', entity_type: null, entity_id: null,
    read_at: null, created_at: '2026-10-01T00:00:00Z', ...over,
  })

  it('decrements the unread count for an unread notification', async () => {
    useIssueStore.setState({ notifications: [notif()] as never, unreadCount: 2 })
    mocked.patch.mockResolvedValue(notif({ read_at: '2026-10-02T00:00:00Z' }))
    await useIssueStore.getState().markNotificationRead('n1')
    expect(useIssueStore.getState().unreadCount).toBe(1)
  })

  it('leaves the count alone for one that was already read', async () => {
    const read = notif({ read_at: '2026-10-02T00:00:00Z' })
    useIssueStore.setState({ notifications: [read] as never, unreadCount: 2 })
    mocked.patch.mockResolvedValue(read)
    await useIssueStore.getState().markNotificationRead('n1')
    expect(useIssueStore.getState().unreadCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// bulkCloseIssues — "Siap ditutup" (Todo-Pilot §18 / UX-5, Option A)
// ---------------------------------------------------------------------------

describe('bulkCloseIssues', () => {
  it('posts the ids and puts the closed issues in the cache, leaving failures as they were', async () => {
    const a = issue({ id: 'a', readyToClose: true })
    const b = issue({ id: 'b', number: 'ISS-2026-00002', readyToClose: true })
    useIssueStore.setState({ currentUser: user(), issues: [a, b] })
    const closedA = { ...a, status: 'closed', readyToClose: false }
    const failure = { id: 'b', number: 'ISS-2026-00002', reason: 'Issue cannot be closed while…' }
    mocked.post.mockResolvedValue({ closed: [closedA], failed: [failure] })

    const result = await useIssueStore.getState().bulkCloseIssues(['a', 'b'])

    expect(mocked.post).toHaveBeenCalledWith('/api/issues/bulk-close', { ids: ['a', 'b'] })
    expect(result).toEqual({ closed: [closedA], failed: [failure] })
    expect(useIssueStore.getState().issues).toEqual([closedA, b])
  })
})

// ---------------------------------------------------------------------------
// Assignees are users (Todo-Pilot §17 / UX-4)
// ---------------------------------------------------------------------------

describe('assignees', () => {
  const budi = { id: 'u-budi', name: 'Budi', role_name: 'Technician', approval_tier: 'staff' }

  it('loads the assignable users of an outlet once and caches them', async () => {
    useIssueStore.setState({ currentUser: user(), assignableUsers: {} })
    mocked.get.mockResolvedValue([budi])
    await useIssueStore.getState().loadAssignableUsers('Jakarta')
    await useIssueStore.getState().loadAssignableUsers('Jakarta')
    expect(mocked.get).toHaveBeenCalledTimes(1)
    expect(mocked.get).toHaveBeenCalledWith('/api/auth/users/assignable?outlet=Jakarta')
    expect(useIssueStore.getState().assignableUsers.Jakarta).toEqual([budi])
  })

  it('assigns an issue to a user, or unassigns it', async () => {
    useIssueStore.setState({ currentUser: user(), issues: [issue()] })
    const assigned = issue({ assignee: 'Budi', assigneeUserId: 'u-budi' })
    mocked.patch.mockResolvedValue(assigned)
    await useIssueStore.getState().assignIssue('iss-1', 'u-budi')
    expect(mocked.patch).toHaveBeenLastCalledWith('/api/issues/iss-1', { assigneeUserId: 'u-budi' })
    expect(useIssueStore.getState().issues[0]).toEqual(assigned)

    mocked.patch.mockResolvedValue(issue())
    await useIssueStore.getState().assignIssue('iss-1', null)
    expect(mocked.patch).toHaveBeenLastCalledWith('/api/issues/iss-1', { assignee: 'Unassigned' })
  })

  it('assigns a work order and a task', async () => {
    useIssueStore.setState({ currentUser: user(), workOrders: [wo()], tasks: [{ id: 't1', assignee: 'Unassigned' } as never] })
    mocked.patch.mockResolvedValueOnce(wo({ assignee: 'Budi', assigneeUserId: 'u-budi' } as never))
    await useIssueStore.getState().assignWorkOrder('wo-1', 'u-budi')
    expect(mocked.patch).toHaveBeenLastCalledWith('/api/work-orders/wo-1', { assigneeUserId: 'u-budi' })
    expect(useIssueStore.getState().workOrders[0]).toMatchObject({ assigneeUserId: 'u-budi' })

    mocked.patch.mockResolvedValueOnce({ id: 't1', assignee: 'Budi', assigneeUserId: 'u-budi' })
    await useIssueStore.getState().assignTask('t1', 'u-budi')
    expect(mocked.patch).toHaveBeenLastCalledWith('/api/tasks/t1', { assigneeUserId: 'u-budi' })
    expect(useIssueStore.getState().tasks[0]).toMatchObject({ assigneeUserId: 'u-budi' })
  })
})

// ---------------------------------------------------------------------------
// uploadIssuePhoto (Todo-Pilot §20) — through the offline queue
// ---------------------------------------------------------------------------

describe('uploadIssuePhoto', () => {
  it('queues the photo upload so it survives a no-signal room', async () => {
    const queued = (api as unknown as { mutateOrQueue: ReturnType<typeof vi.fn> }).mutateOrQueue
    queued.mockResolvedValue({ id: 'p1' })
    const file = new File(['x'], 'kompor.jpg', { type: 'image/jpeg' })

    await useIssueStore.getState().uploadIssuePhoto('iss-1', file, 'Api mati')

    expect(queued).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', path: '/api/issues/iss-1/photos', file, fileName: 'kompor.jpg',
      formParts: [{ field: 'caption', value: 'Api mati' }],
    }))
  })
})

// ---------------------------------------------------------------------------
// Loading on outlet connections (Todo-Pilot §22 / UX-9)
// ---------------------------------------------------------------------------

describe('loadAll — only what every screen needs', () => {
  it('loads counts, master data and notifications — no list of issues, tasks, approvals or other modules', async () => {
    useIssueStore.setState({
      currentUser: user({ issues: 'manage', tasks: 'manage', approvals: 'manage', cmms: 'manage', assets: 'manage',
        vendors: 'manage', training: 'manage', campaigns: 'manage', users: 'manage', reports: 'view' }),
    })
    mocked.get.mockImplementation(async (p: string) => (p === '/api/counts' ? COUNTS : []))

    await useIssueStore.getState().loadAll()

    const paths = mocked.get.mock.calls.map(([p]) => String(p).split('?')[0])
    expect(paths).toEqual(expect.arrayContaining(['/api/counts', '/api/outlets']))
    for (const lazy of ['/api/issues', '/api/tasks', '/api/approvals', '/api/work-orders', '/api/assets', '/api/vendors',
      '/api/training-programs', '/api/campaigns', '/api/auth/users', '/api/audit-logs']) {
      expect(paths).not.toContain(lazy)
    }
    expect(useIssueStore.getState().counts).toEqual(COUNTS)
  })

  it('pages that aggregate everything load the full lists on demand', async () => {
    serveGets({ '/api/issues': [issue()], '/api/tasks': [], '/api/approvals': [approval()] })
    await useIssueStore.getState().ensureLoaded('core')
    expect(useIssueStore.getState().issues.map((i) => i.id)).toEqual(['iss-1'])
    expect(useIssueStore.getState().approvals.map((a) => a.id)).toEqual(['apr-1'])
  })
})

describe('server lists (Todo-Pilot §22)', () => {
  it('fetchIssue reads one issue into the cache; unknown → null', async () => {
    useIssueStore.setState({ issues: [issue({ id: 'other', number: 'ISS-9' })] })
    mocked.get.mockImplementation(async (p: string) => {
      if (p === '/api/issues/iss-1') return issue()
      throw new Error('API 404 /api/issues/x: {"detail":"Issue not found"}')
    })
    expect((await useIssueStore.getState().fetchIssue('iss-1'))?.id).toBe('iss-1')
    expect(useIssueStore.getState().issues.map((i) => i.id).sort()).toEqual(['iss-1', 'other'])
    expect(await useIssueStore.getState().fetchIssue('nope')).toBeNull()
  })

  it('upserting a page keeps the rest of the cache', () => {
    useIssueStore.setState({ issues: [issue({ id: 'a', title: 'old' }), issue({ id: 'b' })] })
    useIssueStore.getState().upsertIssues([issue({ id: 'a', title: 'new' }), issue({ id: 'c' })])
    const byId = Object.fromEntries(useIssueStore.getState().issues.map((i) => [i.id, i.title]))
    expect(byId).toEqual({ a: 'new', b: 'Kompor rusak', c: 'Kompor rusak' })
  })

  it('a change bumps the list version so lists on screen refetch, and refreshes the badges', async () => {
    mocked.mutateOrQueue.mockResolvedValue(issue())
    serveGets({ ...children('iss-1'), '/api/counts': { ...COUNTS, issuesInProgress: 7 } })
    const before = useIssueStore.getState().listVersion
    await useIssueStore.getState().createIssue(input)
    expect(useIssueStore.getState().listVersion).toBeGreaterThan(before)
    await vi.waitFor(() => expect(useIssueStore.getState().counts?.issuesInProgress).toBe(7))
  })

  it('cancelling re-reads only that issue\'s tasks, approval and work orders', async () => {
    mocked.post.mockResolvedValue(issue({ status: 'cancelled' }))
    serveGets({ ...children('iss-1', { tasks: [{ id: 't1', issueId: 'iss-1', status: 'cancelled' }] }), '/api/counts': COUNTS })
    await useIssueStore.getState().cancelIssue('iss-1', 'dobel')
    expect(mocked.get).not.toHaveBeenCalledWith('/api/tasks')
    expect(useIssueStore.getState().tasks.map((t) => t.id)).toEqual(['t1'])
  })
})

describe('ensureLoaded', () => {
  it('loads a module the first time a page needs it, and only once', async () => {
    serveGets({ '/api/assets': [asset()], '/api/work-orders': [wo()] })

    await useIssueStore.getState().ensureLoaded('cmms')
    await useIssueStore.getState().ensureLoaded('cmms')

    expect(useIssueStore.getState().workOrders).toHaveLength(1)
    expect(mocked.get.mock.calls.filter(([p]) => p === '/api/work-orders')).toHaveLength(1)
  })

  it('logout forgets what was loaded, so the next user loads their own', async () => {
    serveGets({ '/api/assets': [], '/api/work-orders': [] })
    await useIssueStore.getState().ensureLoaded('cmms')
    useIssueStore.getState().logout()
    useIssueStore.setState({ currentUser: user() })

    await useIssueStore.getState().ensureLoaded('cmms')

    expect(mocked.get.mock.calls.filter(([p]) => p === '/api/work-orders')).toHaveLength(2)
  })

  it('tries again after a failed load', async () => {
    mocked.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
    await useIssueStore.getState().ensureLoaded('vendors')
    await useIssueStore.getState().ensureLoaded('vendors')
    expect(mocked.get.mock.calls.filter(([p]) => String(p).startsWith('/api/vendors'))).toHaveLength(2)
  })
})

describe('a failed update re-reads only that record', () => {
  it('issue status: GET /api/issues/{id}, not the whole list', async () => {
    useIssueStore.setState({ issues: [issue()] })
    mocked.patch.mockRejectedValue(new Error('409'))
    serveGets({ '/api/issues/iss-1': issue({ status: 'open' }) })

    useIssueStore.getState().updateIssueStatus('iss-1', 'closed')
    await vi.waitFor(() => expect(mocked.get).toHaveBeenCalledWith('/api/issues/iss-1'))

    expect(mocked.get).not.toHaveBeenCalledWith('/api/issues')
    expect(useIssueStore.getState().issues[0].status).toBe('open')
  })

  it('task status: re-reads the task and its issue', async () => {
    const task = { id: 'tsk-1', issueId: 'iss-1', status: 'open' }
    useIssueStore.setState({ issues: [issue()], tasks: [task] as never })
    mocked.patch.mockRejectedValue(new Error('409'))
    serveGets({ '/api/tasks/tsk-1': task, '/api/issues/iss-1': issue() })

    useIssueStore.getState().updateTaskStatus('tsk-1', 'closed')
    await vi.waitFor(() => expect(mocked.get).toHaveBeenCalledWith('/api/tasks/tsk-1'))

    expect(mocked.get).not.toHaveBeenCalledWith('/api/tasks')
    expect(useIssueStore.getState().tasks[0].status).toBe('open')
  })
})

describe('loadAll — sync time and failed refreshes', () => {
  it('records when the data was last synced', async () => {
    mocked.get.mockResolvedValue([])
    await useIssueStore.getState().loadAll()
    expect(Date.parse(useIssueStore.getState().lastSyncedAt ?? '')).not.toBeNaN()
  })

  it('a failed refresh keeps what is on screen instead of an error page', async () => {
    useIssueStore.setState({ issues: [issue()], lastSyncedAt: '2026-10-14T05:00:00.000Z' })
    mocked.get.mockRejectedValue(new Error('offline'))

    await useIssueStore.getState().loadAll()

    const s = useIssueStore.getState()
    expect(s.issues).toHaveLength(1)
    expect(s.error).toBeNull()
    expect(s.lastSyncedAt).toBe('2026-10-14T05:00:00.000Z')
    expect(toast.error).toHaveBeenCalled()
  })

  it('the very first load failing still reports the error', async () => {
    mocked.get.mockRejectedValue(new Error('offline'))
    await useIssueStore.getState().loadAll()
    expect(useIssueStore.getState().error).toMatch(/offline/)
  })
})
