// =====================================================================
// ISSUE CORE — Central store (Zustand)
//
// All state is now backed by the REST API (PostgreSQL via FastAPI).
// Local Zustand state is a client-side cache that mirrors the server.
// Each action calls the API first, then updates the local cache from
// the API response — no stale local state.
// =====================================================================

import { create } from 'zustand'
import { toast } from 'sonner'
import { api, apiErrorMessage, authToken } from './api-client'
import { canListUsers, canRead, hasPermission } from './access'
import { rememberLocale, storedLocale, type Locale } from './i18n/locale'
import { translate } from './i18n/translate'
import { effectiveOutlet, outletQuery, rememberOutletFilter, storedOutletFilter } from './outlet-filter'
import {
  AppNotification,
  ApprovalRequest,
  ApproverRole,
  Asset,
  AssignableUser,
  AuditLog,
  BulkCloseResult,
  Campaign,
  CampaignResultsInput,
  CreateAssetInput,
  CreateCampaignInput,
  CreateIssueInput,
  CreateTrainingProgramInput,
  CreateVendorInput,
  CreateWorkOrderInput,
  Issue,
  IssuePhoto,
  MasterCategory,
  Outlet,
  PIC,
  Task,
  TrainingProgram,
  UpdateAssetInput,
  UpdateCampaignInput,
  UpdateTrainingProgramInput,
  UpdateVendorInput,
  User,
  RoleDef,
  ModuleDef,
  AccessLevel,
  Vendor,
  WorkOrder,
  WorkOrderCostUpdateInput,
  WorkOrderDetail,
  WorkOrderStatus,
  VendorPerformance,
  CreateOutletInput,
  UpdateOutletInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreatePICInput,
  UpdatePICInput,
  PMSchedule,
  CreatePMScheduleInput,
  UpdatePMScheduleInput,
  RunPMGeneratorResult,
  ApprovalPolicy,
  AssignmentRule,
  IssueComment,
  CreateAssignmentRuleInput,
  UpdateAssignmentRuleInput,
  CreateApprovalPolicyInput,
  UpdateApprovalPolicyInput,
  CMMSAnalytics,
  Part,
  CreatePartInput,
  UpdatePartInput,
  WorkOrderPart,
  PurchaseRequest,
  CreatePurchaseRequestInput,
  PurchaseOrder,
  ScanLowStockResult,
  VendorPerformanceSummary,
  PartPriceHistoryEntry,
  Budget,
  BudgetStatusEntry,
  ChecklistItem,
  WorkOrderAttachment,
  AssetHistory,
  AssetSummary,
  QRResolveResult,
} from './types'

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------


export interface RoleInput {
  name: string
  description?: string | null
  permissions: Record<string, AccessLevel>
  all_outlets: boolean
  outlet_ids: string[]
  approval_tier: 'staff' | 'manager' | 'admin'
  home_page?: string | null   // Todo-Pilot §19
}

interface IssueCoreState {
  // Auth
  currentUser: User | null
  authLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  // Interface language (Todo-Pilot §16). Kept across logout on this device.
  locale: Locale
  setLocale: (locale: Locale, opts?: { persist?: boolean }) => void

  // Issue core
  issues: Issue[]
  tasks: Task[]
  approvals: ApprovalRequest[]
  auditLogs: AuditLog[]
  isLoading: boolean
  error: string | null
  // When the issue core last loaded from the server (Todo-Pilot §22/§27); null = never
  lastSyncedAt: string | null

  // Notifications
  notifications: AppNotification[]
  unreadCount: number
  notificationsLoading: boolean
  loadNotifications: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>

  // Master data
  outlets: Outlet[]
  categories: MasterCategory[]
  pics: PIC[]
  masterDataLoading: boolean
  masterDataError: string | null

  // Users management
  allUsers: User[]
  usersLoading: boolean
  loadUsers: () => Promise<boolean>
  inviteUser: (email: string, name: string, role: string, password: string) => Promise<User>
  updateUser: (id: string, patch: { name?: string; role?: string; is_active?: boolean; outlet_ids?: string[]; whatsapp_number?: string }) => Promise<User>
  deleteUser: (id: string) => Promise<void>

  // Roles (dynamic RBAC)
  roles: RoleDef[]
  modules: ModuleDef[]
  rolesLoading: boolean
  loadRoles: () => Promise<void>
  createRole: (input: RoleInput & { key: string }) => Promise<RoleDef>
  updateRole: (key: string, patch: Partial<RoleInput>) => Promise<RoleDef>
  deleteRole: (key: string) => Promise<void>

  // Issue core actions
  loadAll: () => Promise<void>
  loadCore: () => Promise<boolean>
  // Modules loaded the first time a page needs them, not at login (Todo-Pilot §22)
  loaded: Partial<Record<LazyModule, 'loading' | 'done'>>
  ensureLoaded: (module: LazyModule) => Promise<void>
  // Server lists (Todo-Pilot §22): issues/tasks/approvals/workOrders are a cache of
  // what has been fetched (pages, records, an issue's children) — not "everything".
  counts: Counts | null
  loadCounts: () => Promise<void>
  // Top bar outlet filter (outlet name, or null = all my outlets); read it through
  // useOutletFilter(), which drops an outlet this user cannot see.
  outletFilter: string | null
  setOutletFilter: (name: string | null) => void
  listVersion: number                      // bumped by every change → lists on screen refetch
  bumpLists: () => void
  upsertIssues: (items: Issue[]) => void
  upsertTasks: (items: Task[]) => void
  upsertApprovals: (items: ApprovalRequest[]) => void
  fetchIssue: (id: string) => Promise<Issue | null>
  fetchApproval: (id: string) => Promise<ApprovalRequest | null>
  loadIssueChildren: (issue: Pick<Issue, 'id'>) => Promise<void>
  loadAuditLogs: () => Promise<void>
  createIssue: (input: CreateIssueInput) => Promise<Issue>
  uploadIssuePhoto: (issueId: string, file: File, caption?: string) => Promise<IssuePhoto>
  loadIssuePhotos: (issueId: string) => Promise<IssuePhoto[]>
  loadIssueComments: (issueId: string) => Promise<IssueComment[]>
  addIssueComment: (issueId: string, body: string) => Promise<IssueComment>
  updateIssueStatus: (issueId: string, status: Issue['status']) => void
  cancelIssue:       (issueId: string, reason?: string) => Promise<Issue>
  bulkCloseIssues:   (issueIds: string[]) => Promise<BulkCloseResult>
  // Assignees are users (Todo-Pilot §17). userId null = unassign.
  assignableUsers:   Record<string, AssignableUser[]>   // by outlet name; '' = shared
  loadAssignableUsers: (outlet: string) => Promise<AssignableUser[]>
  assignIssue:       (issueId: string, userId: string | null) => Promise<Issue>
  assignTask:        (taskId: string, userId: string | null) => Promise<Task>
  assignWorkOrder:   (woId: string, userId: string | null) => Promise<WorkOrder>
  reopenIssue:       (issueId: string, reason: string) => Promise<Issue>
  reviseApproval:    (issueId: string, amount: number, reason?: string) => Promise<Issue>
  updateTaskStatus:  (taskId: string,  status: Task['status'])  => void
  refreshIssue:      (issueId: string) => Promise<void>
  refreshTask:       (taskId: string) => Promise<void>
  refreshIssueChildren: (issue: Issue) => Promise<void>
  decideApproval: (approvalId: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>
  delegateApproval: (approvalId: string, target: { toUserId?: string; toRole?: ApproverRole }) => Promise<void>
  escalateStaleApprovals: (thresholdDays?: number) => Promise<number>

  // CMMS
  assets: Asset[]
  workOrders: WorkOrder[]
  cmmsLoading: boolean
  cmmsError: string | null
  loadCMMS: () => Promise<boolean>
  createAsset: (input: CreateAssetInput) => Promise<Asset>
  updateAsset: (id: string, input: UpdateAssetInput) => Promise<Asset>
  deleteAsset: (id: string) => Promise<void>
  createWorkOrder: (input: CreateWorkOrderInput) => Promise<WorkOrder>
  updateWorkOrderStatus: (woId: string, status: WorkOrderStatus) => void
  transitionWorkOrder: (woId: string, targetStatus: WorkOrderStatus) => Promise<WorkOrderDetail>
  updateWorkOrderCost: (woId: string, input: WorkOrderCostUpdateInput) => Promise<WorkOrderDetail>
  toggleChecklistItem: (woId: string, itemId: string, isDone: boolean) => Promise<WorkOrderDetail>
  deleteWorkOrder: (id: string) => Promise<void>
  assignWorkOrderVendor: (woId: string, vendorId: string, slaDue?: string) => Promise<WorkOrderDetail>
  loadVendorPerformance: (vendorId: string) => Promise<VendorPerformance>
  addChecklistItem: (woId: string, title: string, orderIndex?: number) => Promise<ChecklistItem>
  addWorkOrderAttachment: (woId: string, fileUrl: string, caption?: string) => Promise<WorkOrderAttachment>
  uploadWorkOrderPhoto: (woId: string, file: File, caption?: string) => Promise<WorkOrderAttachment>
  loadWorkOrderParts: (woId: string) => Promise<WorkOrderPart[]>
  loadAssetHistory: (assetId: string) => Promise<AssetHistory>
  loadAssetSummary: (assetId: string) => Promise<AssetSummary>
  resolveQr: (token: string) => Promise<QRResolveResult>

  // Preventive Maintenance schedules (Tier 2.1)
  pmSchedules: PMSchedule[]
  pmLoading: boolean
  loadPMSchedules: () => Promise<void>
  createPMSchedule: (input: CreatePMScheduleInput) => Promise<PMSchedule>
  updatePMSchedule: (id: string, input: UpdatePMScheduleInput) => Promise<PMSchedule>
  deletePMSchedule: (id: string) => Promise<void>
  runPMGenerator: () => Promise<RunPMGeneratorResult>
  recordMeterReading: (assetId: string, value: number, note?: string) => Promise<void>

  // CMMS analytics (Tier 3)
  cmmsAnalytics: CMMSAnalytics | null
  cmmsAnalyticsLoading: boolean
  loadCMMSAnalytics: (outlet?: string) => Promise<void>

  // Spare parts & inventory (Tier 3)
  parts: Part[]
  partsLoading: boolean
  loadParts: () => Promise<void>
  createPart: (input: CreatePartInput) => Promise<Part>
  updatePart: (id: string, input: UpdatePartInput) => Promise<Part>
  deletePart: (id: string) => Promise<void>
  consumePart: (woId: string, partId: string, quantity: number) => Promise<WorkOrderPart>

  // Procurement (Tier 6.1)
  purchaseRequests: PurchaseRequest[]
  purchaseOrders: PurchaseOrder[]
  procurementLoading: boolean
  loadPurchaseRequests: () => Promise<void>
  loadPurchaseOrders: () => Promise<void>
  createPurchaseRequest: (input: CreatePurchaseRequestInput) => Promise<PurchaseRequest>
  scanLowStock: () => Promise<ScanLowStockResult>
  orderPurchaseRequest: (prId: string, vendorId: string) => Promise<PurchaseOrder>
  receivePurchaseOrder: (poId: string, lines: { purchaseOrderItemId: string; quantityReceived: number }[]) => Promise<void>
  loadVendorPerformanceSummary: () => Promise<VendorPerformanceSummary[]>
  loadPartPriceHistory: (partId: string) => Promise<PartPriceHistoryEntry[]>
  loadBudgetStatus: (period: string) => Promise<BudgetStatusEntry[]>
  createBudget: (outletId: string, period: string, amount: number) => Promise<Budget>
  updateBudget: (id: string, amount: number) => Promise<Budget>
  deleteBudget: (id: string) => Promise<void>

  // Assignee routing rules (Todo-Ops-Checklist P2)
  assignmentRules: AssignmentRule[]
  loadAssignmentRules: () => Promise<void>
  createAssignmentRule: (input: CreateAssignmentRuleInput) => Promise<AssignmentRule>
  updateAssignmentRule: (id: string, input: UpdateAssignmentRuleInput) => Promise<AssignmentRule>
  deleteAssignmentRule: (id: string) => Promise<void>

  // Approval policies (Tier 2.2)
  approvalPolicies: ApprovalPolicy[]
  policiesLoading: boolean
  loadApprovalPolicies: () => Promise<void>
  createApprovalPolicy: (input: CreateApprovalPolicyInput) => Promise<ApprovalPolicy>
  updateApprovalPolicy: (id: string, input: UpdateApprovalPolicyInput) => Promise<ApprovalPolicy>
  deleteApprovalPolicy: (id: string) => Promise<void>

  // Vendors (Procurement)
  vendors: Vendor[]
  vendorsLoading: boolean
  loadVendors: () => Promise<boolean>
  createVendor: (input: CreateVendorInput) => Promise<Vendor>
  updateVendor: (id: string, input: UpdateVendorInput) => Promise<Vendor>
  deleteVendor: (id: string) => Promise<void>

  // Training Programs
  trainingPrograms: TrainingProgram[]
  trainingLoading: boolean
  loadTrainingPrograms: () => Promise<boolean>
  createTrainingProgram: (input: CreateTrainingProgramInput) => Promise<TrainingProgram>
  updateTrainingProgram: (id: string, input: UpdateTrainingProgramInput) => Promise<TrainingProgram>
  deleteTrainingProgram: (id: string) => Promise<void>

  // Campaigns (Marketing)
  campaigns: Campaign[]
  campaignsLoading: boolean
  loadCampaigns: () => Promise<boolean>
  createCampaign: (input: CreateCampaignInput) => Promise<Campaign>
  updateCampaign: (id: string, input: UpdateCampaignInput) => Promise<Campaign>
  recordCampaignResults: (id: string, input: CampaignResultsInput) => Promise<Campaign>
  deleteCampaign: (id: string) => Promise<void>

  // Master data actions
  loadMasterData: () => Promise<void>
  createOutlet: (input: CreateOutletInput) => Promise<Outlet>
  updateOutlet: (id: string, input: UpdateOutletInput) => Promise<Outlet>
  deleteOutlet: (id: string) => Promise<void>
  createCategory: (input: CreateCategoryInput) => Promise<MasterCategory>
  updateCategory: (id: string, input: UpdateCategoryInput) => Promise<MasterCategory>
  deleteCategory: (id: string) => Promise<void>
  createPIC: (input: CreatePICInput) => Promise<PIC>
  updatePIC: (id: string, input: UpdatePICInput) => Promise<PIC>
  deletePIC: (id: string) => Promise<void>
}

/** Update/insert by id, keeping everything else in the cache (Todo-Pilot §22). */
function mergeById<T extends { id: string }>(list: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return list
  const fresh = new Map(incoming.map((x) => [x.id, x]))
  const kept = list.map((x) => fresh.get(x.id) ?? x)
  const known = new Set(list.map((x) => x.id))
  return [...kept, ...incoming.filter((x) => !known.has(x.id))]
}

// ---------------------------------------------------------------------------
// Lazy modules (Todo-Pilot §22): loaded by ensureLoaded() when a page needs them.
// ---------------------------------------------------------------------------

export type LazyModule = 'core' | 'cmms' | 'vendors' | 'training' | 'campaigns' | 'users'

/** Menu badges — GET /api/counts; null where the role cannot open that list. */
export interface Counts { issuesInProgress: number | null; tasksActive: number | null; approvalsPending: number | null }

const LAZY_ALLOWED: Record<LazyModule, (me: User | null) => boolean> = {
  // Every issue, task and approval — only for pages that aggregate them all
  // (analytics, reports, module pages filtering by category).
  core:      (me) => canRead(me, 'issues') || canRead(me, 'tasks') || canRead(me, 'approvals'),
  cmms:      (me) => canRead(me, 'assets') || canRead(me, 'workOrders'),
  vendors:   (me) => canRead(me, 'vendors'),
  training:  (me) => canRead(me, 'training'),
  campaigns: (me) => canRead(me, 'campaigns'),
  users:     (me) => canListUsers(me),
}

const LAZY_LOADERS: Record<LazyModule, (s: IssueCoreState) => Promise<boolean>> = {
  core:      (s) => s.loadCore(),
  cmms:      (s) => s.loadCMMS(),
  vendors:   (s) => s.loadVendors(),
  training:  (s) => s.loadTrainingPrograms(),
  campaigns: (s) => s.loadCampaigns(),
  users:     (s) => s.loadUsers(),
}

// ---------------------------------------------------------------------------
// Session data — the initial state, and what logout() resets to. One object
// so a new slice can't be forgotten on logout: loadAll skips modules the next
// user can't read, so a leftover slice would leak the previous session's data.
// ---------------------------------------------------------------------------

const EMPTY_DATA = {
  loaded:    {} as Partial<Record<LazyModule, 'loading' | 'done'>>,
  issues:    [],
  tasks:     [],
  approvals: [],
  auditLogs: [],
  isLoading: false,
  error:     null,
  lastSyncedAt: null as string | null,
  counts: null as Counts | null,
  listVersion: 0,
  outletFilter: storedOutletFilter(),

  outlets:           [],
  categories:        [],
  pics:              [],
  masterDataLoading: false,
  masterDataError:   null,

  assets:      [],
  workOrders:  [],
  cmmsLoading: false,
  cmmsError:   null,

  pmSchedules: [],
  pmLoading:   false,

  purchaseRequests:  [],
  purchaseOrders:    [],
  procurementLoading: false,

  approvalPolicies: [],
  policiesLoading:  false,

  assignmentRules: [],

  cmmsAnalytics:        null,
  cmmsAnalyticsLoading: false,

  parts:        [],
  partsLoading: false,

  allUsers:     [],
  assignableUsers: {},
  usersLoading: false,
  roles:        [],
  modules:      [],
  rolesLoading: false,

  notifications:        [],
  unreadCount:          0,
  notificationsLoading: false,

  vendors:         [],
  vendorsLoading:  false,
  trainingPrograms:   [],
  trainingLoading:    false,
  campaigns:          [],
  campaignsLoading:   false,
} satisfies Partial<IssueCoreState>

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useIssueStore = create<IssueCoreState>((set, get) => ({
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  currentUser:  null,
  authLoading:  false,
  authError:    null,

  login: async (email, password) => {
    set({ authLoading: true, authError: null })
    try {
      const { access_token } = await api.post<{ access_token: string; token_type: string; expires_in: number }>(
        '/api/auth/login',
        { email, password }
      )
      authToken.set(access_token)
      const user = await api.get<User>('/api/auth/me')
      set({ currentUser: user, authLoading: false })
    } catch (e) {
      authToken.clear()
      // The server's reason: wrong credentials (401) or an inactive company (403, Todo-Pilot §11).
      set({ currentUser: null, authLoading: false, authError: apiErrorMessage(e, translate(get().locale, 'login.failed')) })
      throw e
    }
  },

  logout: () => {
    authToken.clear()
    set({ currentUser: null, ...EMPTY_DATA })
  },

  locale: storedLocale(),
  setLocale: (locale, { persist = true } = {}) => {
    rememberLocale(locale)
    set({ locale })
    // Saved on the account so it follows the user to other devices.
    if (persist && get().currentUser) {
      api.patch('/api/auth/me/preferences', { preferences: { language: locale } }).catch(() => {})
    }
  },

  ...EMPTY_DATA,

  // -------------------------------------------------------------------------
  // loadAll — initial hydration from the API (issue core + master data)
  // -------------------------------------------------------------------------
  loadAll: async () => {
    // Login no longer downloads every issue, task and approval (Todo-Pilot §22):
    // badges come from /api/counts, lists page on the server, aggregate pages
    // call ensureLoaded('core').
    set({ isLoading: true, error: null })
    try {
      const counts = await api.get<Counts>('/api/counts')
      set({ counts, isLoading: false, lastSyncedAt: new Date().toISOString() })
    } catch (e) {
      // Already showing data: keep it (it is only stale) rather than an error page.
      if (get().lastSyncedAt) {
        set({ isLoading: false })
        toast.error(translate(get().locale, 'shell.syncFailed'))
      } else {
        set({ isLoading: false, error: String(e) })
      }
    }
    get().loadMasterData()
    get().loadNotifications()
    // Everything else loads when its page opens (ensureLoaded) — an outlet
    // phone should not pull CMMS, vendors, training… just to report a leak.
    if (get().loaded.core === 'done') get().loadCore()     // Retry / refresh keeps an aggregate page current
  },

  loadCore: async () => {
    const me = get().currentUser
    try {
      const [issues, tasks, approvals] = await Promise.all([
        canRead(me, 'issues')    ? api.get<Issue[]>('/api/issues')                : Promise.resolve([]),
        canRead(me, 'tasks')     ? api.get<Task[]>('/api/tasks')                  : Promise.resolve([]),
        canRead(me, 'approvals') ? api.get<ApprovalRequest[]>('/api/approvals')   : Promise.resolve([]),
      ])
      set({ issues, tasks, approvals })
      return true
    } catch {
      return false
    }
  },

  loadCounts: async () => {
    const q = outletQuery(effectiveOutlet(get().outletFilter, get().currentUser, get().outlets))
    try { set({ counts: await api.get<Counts>(q ? `/api/counts?${q}` : '/api/counts') }) } catch { /* badges keep their last value */ }
  },

  setOutletFilter: (name) => {
    rememberOutletFilter(name)
    set({ outletFilter: name })
    get().loadCounts()
  },

  bumpLists: () => {
    set((s) => ({ listVersion: s.listVersion + 1 }))
    get().loadCounts()
  },

  upsertIssues: (items) => set((s) => ({ issues: mergeById(s.issues, items) })),
  upsertTasks: (items) => set((s) => ({ tasks: mergeById(s.tasks, items) })),
  upsertApprovals: (items) => set((s) => ({ approvals: mergeById(s.approvals, items) })),

  fetchIssue: async (id) => {
    try {
      const issue = await api.get<Issue>(`/api/issues/${encodeURIComponent(id)}`)
      get().upsertIssues([issue])
      return issue
    } catch (e) {
      if (/API 40[34]|API 422/.test(String(e))) return null
      throw e
    }
  },

  fetchApproval: async (id) => {
    try {
      const approval = await api.get<ApprovalRequest>(`/api/approvals/${encodeURIComponent(id)}`)
      get().upsertApprovals([approval])
      return approval
    } catch (e) {
      if (/API 40[34]|API 422/.test(String(e))) return null
      throw e
    }
  },

  // An issue's tasks, approval and work orders — for its drawer and after a
  // change that touches them server-side. Never the whole lists.
  loadIssueChildren: async (issue) => {
    const me = get().currentUser
    const q = `issue_id=${encodeURIComponent(issue.id)}`
    const [tasks, approvals, workOrders] = await Promise.all([
      canRead(me, 'tasks')      ? api.get<Task[]>(`/api/tasks?${q}`)                : Promise.resolve(null),
      canRead(me, 'approvals')  ? api.get<ApprovalRequest[]>(`/api/approvals?${q}`) : Promise.resolve(null),
      canRead(me, 'workOrders') ? api.get<WorkOrder[]>(`/api/work-orders?${q}`)     : Promise.resolve(null),
    ])
    set((s) => ({
      // Replace this issue's children: one that disappeared server-side goes too.
      tasks: tasks ? [...s.tasks.filter((t) => t.issueId !== issue.id), ...tasks] : s.tasks,
      approvals: approvals ? mergeById(s.approvals, approvals) : s.approvals,
      workOrders: workOrders ? mergeById(s.workOrders, workOrders) : s.workOrders,
    }))
  },

  ensureLoaded: async (module) => {
    if (get().loaded[module]) return
    const me = get().currentUser
    const mark = (v: 'loading' | 'done' | undefined) => set((s) => ({ loaded: { ...s.loaded, [module]: v } }))
    if (!LAZY_ALLOWED[module](me)) return mark('done')   // nothing this role may read
    mark('loading')
    const ok = await LAZY_LOADERS[module](get())
    if (get().currentUser?.id !== me?.id) return         // logged out meanwhile
    mark(ok ? 'done' : undefined)                       // a failed load is tried again next time
  },

  // -------------------------------------------------------------------------
  // loadAuditLogs — GET /api/audit-logs (last 50 entries for notifications)
  // -------------------------------------------------------------------------
  loadAuditLogs: async () => {
    try {
      const auditLogs = await api.get<AuditLog[]>('/api/audit-logs?limit=50')
      set({ auditLogs })
    } catch {
      // silent — notifications non-critical
    }
  },

  // -------------------------------------------------------------------------
  // loadNotifications — GET /api/notifications (50 newest)
  // -------------------------------------------------------------------------
  loadNotifications: async () => {
    set({ notificationsLoading: true })
    try {
      const [notifications, { count }] = await Promise.all([
        api.get<AppNotification[]>('/api/notifications?limit=50'),
        api.get<{ count: number }>('/api/notifications/unread-count'),
      ])
      set({ notifications, unreadCount: count, notificationsLoading: false })
    } catch {
      set({ notificationsLoading: false })
    }
  },

  markNotificationRead: async (id) => {
    const updated = await api.patch<AppNotification>(`/api/notifications/${id}/read`, {})
    set((state) => {
      const wasUnread = state.notifications.some(n => n.id === id && !n.read_at)
      return {
        notifications: state.notifications.map(n => n.id === id ? updated : n),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    })
  },

  markAllNotificationsRead: async () => {
    await api.post('/api/notifications/read-all', {})
    const now = new Date().toISOString()
    set((state) => ({
      notifications: state.notifications.map(n => n.read_at ? n : { ...n, read_at: now }),
      unreadCount: 0,
    }))
  },

  // -------------------------------------------------------------------------
  // loadUsers — GET /api/auth/users
  // -------------------------------------------------------------------------
  loadUsers: async () => {
    set({ usersLoading: true })
    try {
      const allUsers = await api.get<User[]>('/api/auth/users')
      set({ allUsers, usersLoading: false })
      return true
    } catch {
      set({ usersLoading: false })
      return false
    }
  },

  // -------------------------------------------------------------------------
  // inviteUser — POST /api/auth/register
  // -------------------------------------------------------------------------
  inviteUser: async (email, name, role, password) => {
    const user = await api.post<User>('/api/auth/register', { email, name, role, password })
    set((state) => ({ allUsers: [...state.allUsers, user].sort((a, b) => a.name.localeCompare(b.name)) }))
    return user
  },

  // -------------------------------------------------------------------------
  // updateUser — PATCH /api/auth/users/{id}
  // -------------------------------------------------------------------------
  updateUser: async (id, patch) => {
    const user = await api.patch<User>(`/api/auth/users/${id}`, patch)
    set((state) => ({
      allUsers: state.allUsers.map(u => u.id === id ? user : u).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return user
  },

  // -------------------------------------------------------------------------
  // deleteUser — DELETE /api/auth/users/{id}  (soft-delete, sets is_active=false)
  // -------------------------------------------------------------------------
  deleteUser: async (id) => {
    await api.delete(`/api/auth/users/${id}`)
    set((state) => ({ allUsers: state.allUsers.filter(u => u.id !== id) }))
  },

  // -------------------------------------------------------------------------
  // Roles — /api/roles (module permissions + outlet access per role)
  // -------------------------------------------------------------------------
  loadRoles: async () => {
    set({ rolesLoading: true })
    try {
      const [roles, modules] = await Promise.all([
        api.get<RoleDef[]>('/api/roles'),
        api.get<ModuleDef[]>('/api/roles/modules'),
      ])
      set({ roles, modules, rolesLoading: false })
    } catch {
      set({ rolesLoading: false })
    }
  },

  createRole: async (input) => {
    const role = await api.post<RoleDef>('/api/roles', input)
    set((state) => ({ roles: [...state.roles, role] }))
    return role
  },

  updateRole: async (key, patch) => {
    const role = await api.patch<RoleDef>(`/api/roles/${key}`, patch)
    set((state) => ({ roles: state.roles.map(r => r.key === key ? role : r) }))
    // Editing a role changes the resolved access of its users.
    get().loadUsers()
    return role
  },

  deleteRole: async (key) => {
    await api.delete(`/api/roles/${key}`)
    set((state) => ({ roles: state.roles.filter(r => r.key !== key) }))
  },

  // -------------------------------------------------------------------------
  // Vendors CRUD
  // -------------------------------------------------------------------------
  loadVendors: async () => {
    set({ vendorsLoading: true })
    try {
      const vendors = await api.get<Vendor[]>('/api/vendors?active_only=false')
      set({ vendors, vendorsLoading: false })
      return true
    } catch { set({ vendorsLoading: false }); return false }
  },
  createVendor: async (input) => {
    const vendor = await api.post<Vendor>('/api/vendors', input)
    set((state) => ({ vendors: [vendor, ...state.vendors] }))
    return vendor
  },
  updateVendor: async (id, input) => {
    const vendor = await api.patch<Vendor>(`/api/vendors/${id}`, input)
    set((state) => ({ vendors: state.vendors.map(v => v.id === id ? vendor : v) }))
    return vendor
  },
  deleteVendor: async (id) => {
    await api.delete(`/api/vendors/${id}`)
    set((state) => ({ vendors: state.vendors.filter(v => v.id !== id) }))
  },

  // -------------------------------------------------------------------------
  // Training Programs CRUD
  // -------------------------------------------------------------------------
  loadTrainingPrograms: async () => {
    set({ trainingLoading: true })
    try {
      const trainingPrograms = await api.get<TrainingProgram[]>('/api/training-programs')
      set({ trainingPrograms, trainingLoading: false })
      return true
    } catch { set({ trainingLoading: false }); return false }
  },
  createTrainingProgram: async (input) => {
    const program = await api.post<TrainingProgram>('/api/training-programs', input)
    set((state) => ({ trainingPrograms: [program, ...state.trainingPrograms] }))
    return program
  },
  updateTrainingProgram: async (id, input) => {
    const program = await api.patch<TrainingProgram>(`/api/training-programs/${id}`, input)
    set((state) => ({ trainingPrograms: state.trainingPrograms.map(p => p.id === id ? program : p) }))
    return program
  },
  deleteTrainingProgram: async (id) => {
    await api.delete(`/api/training-programs/${id}`)
    set((state) => ({ trainingPrograms: state.trainingPrograms.filter(p => p.id !== id) }))
  },

  // -------------------------------------------------------------------------
  // Campaigns CRUD
  // -------------------------------------------------------------------------
  loadCampaigns: async () => {
    set({ campaignsLoading: true })
    try {
      const campaigns = await api.get<Campaign[]>('/api/campaigns')
      set({ campaigns, campaignsLoading: false })
      return true
    } catch { set({ campaignsLoading: false }); return false }
  },
  createCampaign: async (input) => {
    const campaign = await api.post<Campaign>('/api/campaigns', input)
    set((state) => ({ campaigns: [campaign, ...state.campaigns] }))
    return campaign
  },
  updateCampaign: async (id, input) => {
    const campaign = await api.patch<Campaign>(`/api/campaigns/${id}`, input)
    set((state) => ({ campaigns: state.campaigns.map(c => c.id === id ? campaign : c) }))
    return campaign
  },
  // Spend + results (Todo-Pilot §10) — only the fields sent are changed.
  recordCampaignResults: async (id, input) => {
    const campaign = await api.patch<Campaign>(`/api/campaigns/${id}/results`, input)
    set((state) => ({ campaigns: state.campaigns.map(c => c.id === id ? campaign : c) }))
    return campaign
  },
  deleteCampaign: async (id) => {
    await api.delete(`/api/campaigns/${id}`)
    set((state) => ({ campaigns: state.campaigns.filter(c => c.id !== id) }))
  },

  // -------------------------------------------------------------------------
  // createIssue — POST /api/issues, then refresh tasks + approvals
  // -------------------------------------------------------------------------
  createIssue: async (input) => {
    const issue = await api.post<Issue>('/api/issues', {
      title:            input.title,
      description:      input.description,
      outlet:           input.outlet,
      category:         input.category,
      priority:         input.priority,
      assignee:         input.assignee,
      assigneeUserId:   input.assigneeUserId ?? null,
      dueDate:          input.dueDate,
      generateTask:     input.generateTask,
      generateApproval: input.generateApproval,
      approvalAmount:   input.approvalAmount ?? null,
      generateWorkOrder: input.generateWorkOrder,
      assetId:          input.assetId ?? null,
      estimatedCost:    input.estimatedCost ?? null,
    }, input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : undefined)

    set((state) => ({ issues: [issue, ...state.issues.filter((i) => i.id !== issue.id)] }))
    // Only this issue's generated task / approval / work order (Todo-Pilot §22).
    await get().loadIssueChildren(issue)
    get().bumpLists()
    return issue
  },

  // Photo taken when reporting (Todo-Pilot §20). Through the offline queue like
  // WO photos: throws QueuedError when stored for later upload.
  uploadIssuePhoto: async (issueId, file, caption) => {
    return api.mutateOrQueue<IssuePhoto>({
      method: 'POST',
      path: `/api/issues/${issueId}/photos`,
      file,
      fileName: file.name,
      formParts: caption ? [{ field: 'caption', value: caption }] : [],
      label: `Foto laporan ${issueId.slice(0, 8)}`,
    })
  },

  loadIssuePhotos: async (issueId) => {
    return api.get<IssuePhoto[]>(`/api/issues/${issueId}/photos`)
  },

  // Comments (Todo-Ops-Checklist P3). Through the offline queue: throws
  // QueuedError when stored for later.
  loadIssueComments: async (issueId) => {
    return api.get<IssueComment[]>(`/api/issues/${issueId}/comments`)
  },

  addIssueComment: async (issueId, body) => {
    return api.mutateOrQueue<IssueComment>({
      method: 'POST',
      path: `/api/issues/${issueId}/comments`,
      body: { body },
      label: `Komentar laporan ${issueId.slice(0, 8)}`,
    })
  },

  // -------------------------------------------------------------------------
  // updateIssueStatus — optimistic update + PATCH /api/issues/{id}
  // -------------------------------------------------------------------------
  updateIssueStatus: (issueId, status) => {
    set((state) => ({
      issues: state.issues.map((i) => i.id === issueId ? { ...i, status } : i),
    }))
    api.patch<Issue>(`/api/issues/${issueId}`, { status })
      .then((issue) => {
        set((state) => ({ issues: state.issues.map((i) => i.id === issueId ? issue : i) }))
        get().bumpLists()
      })
      .catch((e) => {
        // e.g. 409 from the closure guard — the message lists the open records.
        toast.error(apiErrorMessage(e, translate(get().locale, 'errors.issueStatus')))
        get().refreshIssue(issueId).catch(() => {})   // only this record, not loadAll()
      })
  },

  // -------------------------------------------------------------------------
  // Issue lifecycle (Todo-Pilot §2). Each one can touch Tasks / WOs /
  // Approvals server-side, so those lists are re-read afterwards.
  // -------------------------------------------------------------------------
  cancelIssue: async (issueId, reason) => {
    const issue = await api.post<Issue>(`/api/issues/${issueId}/cancel`, { reason: reason || null })
    await get().refreshIssueChildren(issue)
    return issue
  },
  // Close many "Siap ditutup" Issues (Todo-Pilot §18). The API closes each one
  // on its own; failures come back with a reason and stay as they were.
  bulkCloseIssues: async (issueIds) => {
    const result = await api.post<BulkCloseResult>('/api/issues/bulk-close', { ids: issueIds })
    const closed = new Map(result.closed.map((i) => [i.id, i]))
    set((state) => ({ issues: state.issues.map((i) => closed.get(i.id) ?? i) }))
    get().bumpLists()
    return result
  },
  loadAssignableUsers: async (outlet) => {
    const cached = get().assignableUsers[outlet]
    if (cached) return cached
    const users = await api.get<AssignableUser[]>(`/api/auth/users/assignable?outlet=${encodeURIComponent(outlet)}`)
    set((state) => ({ assignableUsers: { ...state.assignableUsers, [outlet]: users } }))
    return users
  },
  assignIssue: async (issueId, userId) => {
    const issue = await api.patch<Issue>(`/api/issues/${issueId}`, assigneeBody(userId))
    set((state) => ({ issues: state.issues.map((i) => i.id === issueId ? issue : i) }))
    get().bumpLists()
    return issue
  },
  assignTask: async (taskId, userId) => {
    const task = await api.patch<Task>(`/api/tasks/${taskId}`, assigneeBody(userId))
    set((state) => ({ tasks: state.tasks.map((t) => t.id === taskId ? task : t) }))
    return task
  },
  assignWorkOrder: async (woId, userId) => {
    const wo = await api.patch<WorkOrder>(`/api/work-orders/${woId}`, assigneeBody(userId))
    set((state) => ({ workOrders: state.workOrders.map((w) => w.id === woId ? { ...w, ...wo } : w) }))
    return wo
  },
  reopenIssue: async (issueId, reason) => {
    const issue = await api.post<Issue>(`/api/issues/${issueId}/reopen`, { reason })
    set((state) => ({ issues: state.issues.map((i) => i.id === issueId ? issue : i) }))
    get().bumpLists()
    return issue
  },
  reviseApproval: async (issueId, amount, reason) => {
    const issue = await api.post<Issue>(`/api/issues/${issueId}/revise-approval`, { amount, reason: reason || null })
    await get().refreshIssueChildren(issue)
    return issue
  },
  refreshIssueChildren: async (issue) => {
    set((state) => ({ issues: mergeById(state.issues, [issue]) }))
    await get().loadIssueChildren(issue)
    get().bumpLists()
  },

  // -------------------------------------------------------------------------
  // updateTaskStatus — optimistic update + PATCH /api/tasks/{id}
  // -------------------------------------------------------------------------
  updateTaskStatus: (taskId, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status } : t),
    }))
    const issueId = get().tasks.find((t) => t.id === taskId)?.issueId
    api.patch(`/api/tasks/${taskId}`, { status })
      .then(async () => { if (issueId) await get().refreshIssue(issueId); get().bumpLists() })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : translate(get().locale, 'errors.taskStatus'))
        get().refreshTask(taskId).catch(() => {})
        if (issueId) get().refreshIssue(issueId).catch(() => {})
      })
  },

  // -------------------------------------------------------------------------
  // refreshIssue — re-read one Issue. The backend may roll an Issue up to
  // `resolved` as a side effect of a Task, Approval or Work Order change
  // (Todo-Next §2.1), so callers re-read the parent instead of guessing.
  // -------------------------------------------------------------------------
  refreshIssue: async (issueId) => {
    const issue = await api.get<Issue>(`/api/issues/${issueId}`)
    set((state) => ({ issues: mergeById(state.issues, [issue]) }))
  },

  refreshTask: async (taskId) => {
    const task = await api.get<Task>(`/api/tasks/${taskId}`)
    set((state) => ({ tasks: mergeById(state.tasks, [task]) }))
  },

  // -------------------------------------------------------------------------
  // decideApproval — PATCH /api/approvals/{id}/decide (step-aware)
  // After deciding, fetches the updated approval from server so steps,
  // currentStepOrder and status are accurate (no optimistic guess needed).
  // FR-14: if final rejected, also updates parent Issue to 'waiting'.
  // -------------------------------------------------------------------------
  decideApproval: async (approvalId, decision, comment) => {
    const decidedBy = get().currentUser?.name ?? 'System'
    const updated = await api.patch<ApprovalRequest>(
      `/api/approvals/${approvalId}/decide`,
      { decision, comment, decidedBy },
    )
    set((state) => ({
      approvals: state.approvals.map((a) => a.id === approvalId ? updated : a),
      // If final rejected, update linked issue status → waiting
      issues: updated.status === 'rejected'
        ? state.issues.map((i) =>
            i.id === updated.issueId ? { ...i, status: 'waiting' as Issue['status'] } : i
          )
        : state.issues,
      // Mirror backend _sync_linked_work_order: a final decision moves the WO
      // that was waiting on this approval — approved → in-progress,
      // rejected → cancelled. WOs already finished are left alone.
      workOrders: updated.status === 'pending'
        ? state.workOrders
        : state.workOrders.map((wo) =>
            wo.approvalId === updated.id && wo.requiresApproval &&
            wo.status !== 'completed' && wo.status !== 'cancelled'
              ? { ...wo, status: (updated.status === 'approved' ? 'in-progress' : 'cancelled') as WorkOrderStatus }
              : wo
          ),
    }))
    // A final decision changes the Issue's status and/or closureBlockers.
    if (updated.status !== 'pending' && updated.issueId) {
      await get().refreshIssue(updated.issueId)
    }
    get().bumpLists()
  },

  delegateApproval: async (approvalId, target) => {
    const updated = await api.patch<ApprovalRequest>(`/api/approvals/${approvalId}/delegate`, target)
    set((state) => ({
      approvals: state.approvals.map((a) => a.id === approvalId ? updated : a),
    }))
    get().bumpLists()
  },

  escalateStaleApprovals: async (thresholdDays) => {
    const res = await api.post<{ escalated: number; approvalIds: string[] }>(
      '/api/approvals/escalate-stale', { thresholdDays },
    )
    // Lists on screen refetch, so escalated flags show up.
    get().bumpLists()
    return res.escalated
  },

  // =========================================================================
  // CMMS actions
  // =========================================================================

  // -------------------------------------------------------------------------
  // loadCMMS — load assets and work orders in parallel
  // -------------------------------------------------------------------------
  loadCMMS: async () => {
    const me = get().currentUser
    if (!canRead(me, 'assets') && !canRead(me, 'workOrders')) return true
    set({ cmmsLoading: true, cmmsError: null })
    try {
      const [assets, workOrders] = await Promise.all([
        canRead(me, 'assets')     ? api.get<Asset[]>('/api/assets')         : Promise.resolve([]),
        canRead(me, 'workOrders') ? api.get<WorkOrder[]>('/api/work-orders') : Promise.resolve([]),
      ])
      set({ assets, workOrders, cmmsLoading: false })
      return true
    } catch (e) {
      set({ cmmsLoading: false, cmmsError: String(e) })
      return false
    }
  },

  // -------------------------------------------------------------------------
  // Asset CRUD
  // -------------------------------------------------------------------------
  createAsset: async (input) => {
    const asset = await api.post<Asset>('/api/assets', input)
    set((state) => ({ assets: [asset, ...state.assets] }))
    return asset
  },

  updateAsset: async (id, input) => {
    const asset = await api.patch<Asset>(`/api/assets/${id}`, input)
    set((state) => ({
      assets: state.assets.map((a) => a.id === id ? asset : a),
    }))
    return asset
  },

  deleteAsset: async (id) => {
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }))
    try {
      await api.delete(`/api/assets/${id}`)
      // Work orders for this asset will have asset_id set to null by the backend.
      // Refresh work orders to reflect the updated assetId.
      const workOrders = await api.get<WorkOrder[]>('/api/work-orders')
      set({ workOrders })
    } catch (e) {
      get().loadCMMS()
      throw e
    }
  },

  // -------------------------------------------------------------------------
  // Work Order CRUD
  // -------------------------------------------------------------------------
  createWorkOrder: async (input) => {
    const wo = await api.post<WorkOrder>('/api/work-orders', input)
    set((state) => ({ workOrders: [wo, ...state.workOrders] }))
    return wo
  },

  updateWorkOrderStatus: (woId, status) => {
    set((state) => ({
      workOrders: state.workOrders.map((wo) => wo.id === woId ? { ...wo, status } : wo),
    }))
    api.patch(`/api/work-orders/${woId}`, { status }).catch(() => get().loadCMMS())
  },

  transitionWorkOrder: async (woId, targetStatus) => {
    const detail = await api.patch<WorkOrderDetail>(
      `/api/work-orders/${woId}/transition`,
      { targetStatus },
    )
    set((state) => ({
      workOrders: state.workOrders.map((wo) => wo.id === woId ? { ...wo, ...detail } : wo),
      // Sync asset status in local cache: when WO goes in-progress → asset maintenance;
      // when completed/cancelled → check if any other active WOs remain (best-effort).
      assets: state.assets.map((a) => {
        if (a.id !== detail.assetId) return a
        if (targetStatus === 'in-progress') return { ...a, status: 'maintenance' as Asset['status'] }
        if (targetStatus === 'completed' || targetStatus === 'cancelled') {
          const hasOtherActive = state.workOrders.some(
            (wo) => wo.id !== woId && wo.assetId === a.id &&
              (wo.status === 'scheduled' || wo.status === 'in-progress' || wo.status === 'on-hold'),
          )
          return hasOtherActive ? a : { ...a, status: 'operational' as Asset['status'] }
        }
        return a
      }),
    }))
    // Any WO move changes the parent Issue's closureBlockers; completion may
    // also roll the Issue up to resolved.
    if (detail.issueId) {
      await get().refreshIssue(detail.issueId)
    }
    return detail
  },

  updateWorkOrderCost: async (woId, input) => {
    const detail = await api.patch<WorkOrderDetail>(`/api/work-orders/${woId}/cost`, input)
    set((state) => ({
      workOrders: state.workOrders.map((wo) => wo.id === woId ? { ...wo, ...detail } : wo),
    }))
    return detail
  },

  toggleChecklistItem: async (woId, itemId, isDone) => {
    const detail = await api.patch<WorkOrderDetail>(
      `/api/work-orders/${woId}/checklist/${itemId}`,
      { isDone },
    )
    return detail
  },

  deleteWorkOrder: async (id) => {
    set((state) => ({ workOrders: state.workOrders.filter((wo) => wo.id !== id) }))
    try {
      await api.delete(`/api/work-orders/${id}`)
    } catch (e) {
      get().loadCMMS()
      throw e
    }
  },

  assignWorkOrderVendor: async (woId, vendorId, slaDue) => {
    const detail = await api.patch<WorkOrderDetail>(`/api/work-orders/${woId}/assign-vendor`, { vendorId, slaDue })
    set((state) => ({
      workOrders: state.workOrders.map((wo) => wo.id === woId ? { ...wo, ...detail } : wo),
    }))
    return detail
  },

  loadVendorPerformance: async (vendorId) => {
    return api.get<VendorPerformance>(`/api/vendors/${vendorId}/performance`)
  },

  addChecklistItem: async (woId, title, orderIndex = 0) => {
    return api.post<ChecklistItem>(`/api/work-orders/${woId}/checklist`, { title, orderIndex })
  },

  addWorkOrderAttachment: async (woId, fileUrl, caption) => {
    return api.post<WorkOrderAttachment>(`/api/work-orders/${woId}/attachments`, { fileUrl, caption })
  },

  uploadWorkOrderPhoto: async (woId, file, caption) => {
    // Goes through the offline queue (Tier 5.3): in a no-signal room the photo
    // is stored locally and uploaded when signal returns. Throws QueuedError
    // when queued so the UI can say "will upload later".
    return api.mutateOrQueue<WorkOrderAttachment>({
      method: 'POST',
      path: `/api/work-orders/${woId}/attachments/upload`,
      file,
      fileName: file.name,
      formParts: caption ? [{ field: 'caption', value: caption }] : [],
      label: `Foto WO ${woId.slice(0, 8)}`,
    })
  },

  loadWorkOrderParts: async (woId) => {
    return api.get<WorkOrderPart[]>(`/api/work-orders/${woId}/parts`)
  },

  loadAssetHistory: async (assetId) => {
    return api.get<AssetHistory>(`/api/assets/${assetId}/history`)
  },

  loadAssetSummary: async (assetId) => {
    return api.get<AssetSummary>(`/api/assets/${assetId}/summary`)
  },

  resolveQr: async (token) => {
    return api.get<QRResolveResult>(`/api/assets/by-qr/${encodeURIComponent(token)}`)
  },

  // -------------------------------------------------------------------------
  // Preventive Maintenance schedules (Tier 2.1)
  // -------------------------------------------------------------------------
  loadPMSchedules: async () => {
    set({ pmLoading: true })
    try {
      const pmSchedules = await api.get<PMSchedule[]>('/api/pm-schedules')
      set({ pmSchedules, pmLoading: false })
    } catch {
      set({ pmLoading: false })
    }
  },

  createPMSchedule: async (input) => {
    const sched = await api.post<PMSchedule>('/api/pm-schedules', input)
    set((state) => ({ pmSchedules: [sched, ...state.pmSchedules] }))
    return sched
  },

  updatePMSchedule: async (id, input) => {
    const sched = await api.patch<PMSchedule>(`/api/pm-schedules/${id}`, input)
    set((state) => ({
      pmSchedules: state.pmSchedules.map((s) => s.id === id ? sched : s),
    }))
    return sched
  },

  deletePMSchedule: async (id) => {
    set((state) => ({ pmSchedules: state.pmSchedules.filter((s) => s.id !== id) }))
    try {
      await api.delete(`/api/pm-schedules/${id}`)
    } catch (e) {
      get().loadPMSchedules()
      throw e
    }
  },

  runPMGenerator: async () => {
    const result = await api.post<RunPMGeneratorResult>('/api/pm-schedules/run-now', {})
    // New WOs may have been created and schedules advanced — refresh both.
    await Promise.all([get().loadCMMS(), get().loadPMSchedules()])
    return result
  },

  recordMeterReading: async (assetId, value, note) => {
    await api.post(`/api/assets/${assetId}/meter-readings`, { value, note })
  },

  // -------------------------------------------------------------------------
  // CMMS analytics (Tier 3)
  // -------------------------------------------------------------------------
  loadCMMSAnalytics: async (outlet) => {
    set({ cmmsAnalyticsLoading: true })
    try {
      const qs = outlet ? `?outlet=${encodeURIComponent(outlet)}` : ''
      const cmmsAnalytics = await api.get<CMMSAnalytics>(`/api/analytics/cmms${qs}`)
      set({ cmmsAnalytics, cmmsAnalyticsLoading: false })
    } catch {
      set({ cmmsAnalyticsLoading: false })
    }
  },

  // -------------------------------------------------------------------------
  // Spare parts & inventory (Tier 3)
  // -------------------------------------------------------------------------
  loadParts: async () => {
    set({ partsLoading: true })
    try {
      const parts = await api.get<Part[]>('/api/parts?active_only=false')
      set({ parts, partsLoading: false })
    } catch {
      set({ partsLoading: false })
    }
  },

  createPart: async (input) => {
    const part = await api.post<Part>('/api/parts', input)
    set((state) => ({ parts: [part, ...state.parts] }))
    return part
  },

  updatePart: async (id, input) => {
    const part = await api.patch<Part>(`/api/parts/${id}`, input)
    set((state) => ({ parts: state.parts.map((p) => p.id === id ? part : p) }))
    return part
  },

  deletePart: async (id) => {
    set((state) => ({ parts: state.parts.filter((p) => p.id !== id) }))
    try {
      await api.delete(`/api/parts/${id}`)
    } catch (e) {
      get().loadParts()
      throw e
    }
  },

  consumePart: async (woId, partId, quantity) => {
    const wp = await api.post<WorkOrderPart>(`/api/work-orders/${woId}/parts`, { partId, quantity })
    // Stock and WO parts_cost changed — refresh parts + CMMS.
    await Promise.all([get().loadParts(), get().loadCMMS()])
    return wp
  },

  // -------------------------------------------------------------------------
  // Procurement (Tier 6.1)
  // -------------------------------------------------------------------------
  loadPurchaseRequests: async () => {
    set({ procurementLoading: true })
    try {
      const purchaseRequests = await api.get<PurchaseRequest[]>('/api/purchase-requests')
      set({ purchaseRequests, procurementLoading: false })
    } catch {
      set({ procurementLoading: false })
    }
  },

  loadPurchaseOrders: async () => {
    try {
      const purchaseOrders = await api.get<PurchaseOrder[]>('/api/purchase-orders')
      set({ purchaseOrders })
    } catch { /* non-critical */ }
  },

  createPurchaseRequest: async (input) => {
    const pr = await api.post<PurchaseRequest>('/api/purchase-requests', input)
    set((state) => ({ purchaseRequests: [pr, ...state.purchaseRequests] }))
    // The PR raised an approval — lists and badges refetch.
    get().bumpLists()
    return pr
  },

  scanLowStock: async () => {
    const res = await api.post<ScanLowStockResult>('/api/purchase-requests/scan-low-stock', {})
    await get().loadPurchaseRequests()
    return res
  },

  orderPurchaseRequest: async (prId, vendorId) => {
    const po = await api.post<PurchaseOrder>(`/api/purchase-requests/${prId}/order`, { vendorId })
    await Promise.all([get().loadPurchaseRequests(), get().loadPurchaseOrders()])
    return po
  },

  receivePurchaseOrder: async (poId, lines) => {
    await api.post(`/api/purchase-orders/${poId}/receive`, { lines })
    // Stock changed + PO/PR statuses advanced — refresh procurement + parts.
    await Promise.all([get().loadPurchaseOrders(), get().loadPurchaseRequests(), get().loadParts()])
  },

  loadVendorPerformanceSummary: async () => {
    return api.get<VendorPerformanceSummary[]>('/api/vendors/performance-summary')
  },

  loadPartPriceHistory: async (partId) => {
    return api.get<PartPriceHistoryEntry[]>(`/api/parts/${partId}/price-history`)
  },

  loadBudgetStatus: async (period) => {
    return api.get<BudgetStatusEntry[]>(`/api/analytics/budget?period=${period}`)
  },

  createBudget: async (outletId, period, amount) => {
    return api.post<Budget>('/api/budgets', { outletId, period, amount })
  },

  updateBudget: async (id, amount) => {
    return api.patch<Budget>(`/api/budgets/${id}`, { amount })
  },

  deleteBudget: async (id) => {
    await api.delete(`/api/budgets/${id}`)
  },

  // -------------------------------------------------------------------------
  // Approval policies (Tier 2.2)
  // -------------------------------------------------------------------------
  loadApprovalPolicies: async () => {
    set({ policiesLoading: true })
    try {
      const approvalPolicies = await api.get<ApprovalPolicy[]>('/api/approval-policies')
      set({ approvalPolicies, policiesLoading: false })
    } catch {
      set({ policiesLoading: false })
    }
  },

  createApprovalPolicy: async (input) => {
    const policy = await api.post<ApprovalPolicy>('/api/approval-policies', input)
    set((state) => ({ approvalPolicies: [policy, ...state.approvalPolicies] }))
    return policy
  },

  updateApprovalPolicy: async (id, input) => {
    const policy = await api.patch<ApprovalPolicy>(`/api/approval-policies/${id}`, input)
    set((state) => ({
      approvalPolicies: state.approvalPolicies.map((p) => p.id === id ? policy : p),
    }))
    return policy
  },

  deleteApprovalPolicy: async (id) => {
    set((state) => ({ approvalPolicies: state.approvalPolicies.filter((p) => p.id !== id) }))
    try {
      await api.delete(`/api/approval-policies/${id}`)
    } catch (e) {
      get().loadApprovalPolicies()
      throw e
    }
  },

  // =========================================================================
  // Master data actions
  // =========================================================================

  // -------------------------------------------------------------------------
  // loadMasterData — load outlets, categories, pics in parallel
  // -------------------------------------------------------------------------
  loadMasterData: async () => {
    set({ masterDataLoading: true, masterDataError: null })
    try {
      const [outlets, categories, pics] = await Promise.all([
        api.get<Outlet[]>('/api/outlets'),
        api.get<MasterCategory[]>('/api/categories'),
        api.get<PIC[]>('/api/pics'),
      ])
      set({ outlets, categories, pics, masterDataLoading: false })
      // Badges load before the outlets do: recount once the outlet filter can apply.
      if (get().outletFilter) get().loadCounts()
    } catch (e) {
      set({ masterDataLoading: false, masterDataError: String(e) })
    }
  },

  // -------------------------------------------------------------------------
  // Outlet CRUD
  // -------------------------------------------------------------------------
  createOutlet: async (input) => {
    const outlet = await api.post<Outlet>('/api/outlets', input)
    set((state) => ({ outlets: [...state.outlets, outlet] }))
    return outlet
  },

  updateOutlet: async (id, input) => {
    const outlet = await api.patch<Outlet>(`/api/outlets/${id}`, input)
    set((state) => ({
      outlets: state.outlets.map((o) => o.id === id ? outlet : o),
    }))
    return outlet
  },

  deleteOutlet: async (id) => {
    // Optimistic remove
    set((state) => ({ outlets: state.outlets.filter((o) => o.id !== id) }))
    try {
      await api.delete(`/api/outlets/${id}`)
    } catch (e) {
      get().loadMasterData()
      throw e
    }
  },

  // -------------------------------------------------------------------------
  // Category CRUD
  // -------------------------------------------------------------------------
  createCategory: async (input) => {
    const category = await api.post<MasterCategory>('/api/categories', input)
    set((state) => ({ categories: [...state.categories, category] }))
    return category
  },

  updateCategory: async (id, input) => {
    const category = await api.patch<MasterCategory>(`/api/categories/${id}`, input)
    set((state) => ({
      categories: state.categories.map((c) => c.id === id ? category : c),
      // issues.category is the denormalized name — the server renamed them too (P1).
      issues: state.issues.map((i) => i.categoryId === id
        ? { ...i, category: category.name, categoryModule: category.module } : i),
    }))
    return category
  },

  deleteCategory: async (id) => {
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }))
    try {
      await api.delete(`/api/categories/${id}`)
    } catch (e) {
      get().loadMasterData()
      throw e
    }
  },

  // -------------------------------------------------------------------------
  // Assignee routing rules (Todo-Ops-Checklist P2)
  // -------------------------------------------------------------------------
  loadAssignmentRules: async () => {
    set({ assignmentRules: await api.get<AssignmentRule[]>('/api/issue-assignment-rules') })
  },

  createAssignmentRule: async (input) => {
    const rule = await api.post<AssignmentRule>('/api/issue-assignment-rules', input)
    await get().loadAssignmentRules()   // server order: category, then all outlets first
    return rule
  },

  updateAssignmentRule: async (id, input) => {
    const rule = await api.patch<AssignmentRule>(`/api/issue-assignment-rules/${id}`, input)
    set((state) => ({ assignmentRules: state.assignmentRules.map((r) => r.id === id ? rule : r) }))
    return rule
  },

  deleteAssignmentRule: async (id) => {
    await api.delete(`/api/issue-assignment-rules/${id}`)
    set((state) => ({ assignmentRules: state.assignmentRules.filter((r) => r.id !== id) }))
  },

  // -------------------------------------------------------------------------
  // PIC CRUD
  // -------------------------------------------------------------------------
  createPIC: async (input) => {
    const pic = await api.post<PIC>('/api/pics', input)
    set((state) => ({ pics: [...state.pics, pic] }))
    return pic
  },

  updatePIC: async (id, input) => {
    const pic = await api.patch<PIC>(`/api/pics/${id}`, input)
    set((state) => ({
      pics: state.pics.map((p) => p.id === id ? pic : p),
    }))
    return pic
  },

  deletePIC: async (id) => {
    set((state) => ({ pics: state.pics.filter((p) => p.id !== id) }))
    try {
      await api.delete(`/api/pics/${id}`)
    } catch (e) {
      get().loadMasterData()
      throw e
    }
  },
}))

// PATCH body for an assignment: a user, or explicitly nobody (Todo-Pilot §17).
function assigneeBody(userId: string | null) {
  return userId ? { assigneeUserId: userId } : { assignee: 'Unassigned' }
}
