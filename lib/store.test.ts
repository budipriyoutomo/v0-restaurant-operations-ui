// Issue Core store actions (Todo-Pilot §12): createIssue, decideApproval,
// transitionWorkOrder. Written first (TDD). The REST client is mocked — these
// tests pin down what each action sends and how it updates the local cache.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api-client', async (importOriginal) => ({
  apiErrorMessage: (await importOriginal<typeof import('./api-client')>()).apiErrorMessage,
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  authToken: { get: () => null, set: vi.fn(), clear: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { api } from './api-client'
import { useIssueStore } from './store'
import type { ApprovalRequest, Asset, Issue, User, WorkOrder } from './types'

const mocked = api as unknown as Record<'get' | 'post' | 'patch' | 'delete', ReturnType<typeof vi.fn>>
const initial = useIssueStore.getState()

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
  it('posts the issue and sends the Idempotency-Key header when given', async () => {
    mocked.post.mockResolvedValue(issue())
    serveGets({ '/api/tasks': [], '/api/approvals': [], '/api/work-orders': [] })

    await useIssueStore.getState().createIssue({ ...input, idempotencyKey: 'key-1' })

    const [path, body, headers] = mocked.post.mock.calls[0]
    expect(path).toBe('/api/issues')
    expect(body).toMatchObject({ title: 'Kompor rusak', category: 'Maintenance', generateWorkOrder: true, estimatedCost: 2_000_000 })
    expect(body).not.toHaveProperty('idempotencyKey')
    expect(headers).toEqual({ 'Idempotency-Key': 'key-1' })
  })

  it('sends no extra header without a key', async () => {
    mocked.post.mockResolvedValue(issue())
    serveGets({ '/api/tasks': [], '/api/approvals': [], '/api/work-orders': [] })
    await useIssueStore.getState().createIssue(input)
    expect(mocked.post.mock.calls[0][2]).toBeUndefined()
  })

  it('prepends the issue and picks up the generated approval and work order', async () => {
    useIssueStore.setState({ issues: [issue({ id: 'old', number: 'ISS-OLD' })] })
    mocked.post.mockResolvedValue(issue({ approvalId: 'apr-1', workOrderId: 'wo-1' }))
    serveGets({ '/api/tasks': [], '/api/approvals': [approval()], '/api/work-orders': [wo()] })

    const created = await useIssueStore.getState().createIssue(input)

    const s = useIssueStore.getState()
    expect(created.id).toBe('iss-1')
    expect(s.issues.map((i) => i.id)).toEqual(['iss-1', 'old'])
    expect(s.approvals.map((a) => a.id)).toEqual(['apr-1'])
    expect(s.workOrders.map((w) => w.id)).toEqual(['wo-1'])
  })

  it('a replayed request (same idempotency key → same issue) does not duplicate it', async () => {
    useIssueStore.setState({ issues: [issue()] })
    mocked.post.mockResolvedValue(issue())
    serveGets({ '/api/tasks': [], '/api/approvals': [], '/api/work-orders': [] })
    await useIssueStore.getState().createIssue({ ...input, idempotencyKey: 'key-1' })
    expect(useIssueStore.getState().issues).toHaveLength(1)
  })

  it('only re-reads the lists the user may read', async () => {
    useIssueStore.setState({ currentUser: user({ issues: 'manage' }), tasks: [], workOrders: [wo({ id: 'cached' })] })
    mocked.post.mockResolvedValue(issue())
    serveGets({})                                            // any GET would throw

    await useIssueStore.getState().createIssue(input)

    expect(mocked.get).not.toHaveBeenCalled()
    expect(useIssueStore.getState().workOrders.map((w) => w.id)).toEqual(['cached'])
  })

  it('leaves the cache alone when the API refuses', async () => {
    useIssueStore.setState({ issues: [issue({ id: 'old' })] })
    mocked.post.mockRejectedValue(new Error('API 422 /api/issues: bad'))
    await expect(useIssueStore.getState().createIssue(input)).rejects.toThrow('422')
    expect(useIssueStore.getState().issues.map((i) => i.id)).toEqual(['old'])
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
    expect(mocked.get).not.toHaveBeenCalled()             // the Issue did not change
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
    expect(mocked.get).not.toHaveBeenCalled()
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
