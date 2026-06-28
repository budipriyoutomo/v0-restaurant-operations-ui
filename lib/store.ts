// =====================================================================
// ISSUE CORE — Central store (Zustand)
//
// All state is now backed by the REST API (PostgreSQL via FastAPI).
// Local Zustand state is a client-side cache that mirrors the server.
// Each action calls the API first, then updates the local cache from
// the API response — no stale local state.
// =====================================================================

import { create } from 'zustand'
import { api, authToken } from './api-client'
import {
  ApprovalRequest,
  Asset,
  AuditLog,
  CreateAssetInput,
  CreateIssueInput,
  CreateWorkOrderInput,
  Issue,
  MasterCategory,
  Outlet,
  PIC,
  Task,
  UpdateAssetInput,
  User,
  WorkOrder,
  WorkOrderStatus,
  CreateOutletInput,
  UpdateOutletInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreatePICInput,
  UpdatePICInput,
} from './types'

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface IssueCoreState {
  // Auth
  currentUser: User | null
  authLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void

  // Issue core
  issues: Issue[]
  tasks: Task[]
  approvals: ApprovalRequest[]
  auditLogs: AuditLog[]
  isLoading: boolean
  error: string | null

  // Master data
  outlets: Outlet[]
  categories: MasterCategory[]
  pics: PIC[]
  masterDataLoading: boolean
  masterDataError: string | null

  // Users management
  allUsers: User[]
  usersLoading: boolean
  loadUsers: () => Promise<void>
  inviteUser: (email: string, name: string, role: string, password: string) => Promise<User>

  // Issue core actions
  loadAll: () => Promise<void>
  loadAuditLogs: () => Promise<void>
  createIssue: (input: CreateIssueInput) => Promise<Issue>
  updateIssueStatus: (issueId: string, status: Issue['status']) => void
  updateTaskStatus:  (taskId: string,  status: Task['status'])  => void
  decideApproval: (approvalId: string, decision: 'approved' | 'rejected') => void

  // CMMS
  assets: Asset[]
  workOrders: WorkOrder[]
  cmmsLoading: boolean
  cmmsError: string | null
  loadCMMS: () => Promise<void>
  createAsset: (input: CreateAssetInput) => Promise<Asset>
  updateAsset: (id: string, input: UpdateAssetInput) => Promise<Asset>
  deleteAsset: (id: string) => Promise<void>
  createWorkOrder: (input: CreateWorkOrderInput) => Promise<WorkOrder>
  updateWorkOrderStatus: (woId: string, status: WorkOrderStatus) => void
  deleteWorkOrder: (id: string) => Promise<void>

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
      set({ currentUser: null, authLoading: false, authError: String(e).replace('Error: API 401 /api/auth/login: ', '') })
      throw e
    }
  },

  logout: () => {
    authToken.clear()
    set({ currentUser: null, issues: [], tasks: [], approvals: [], outlets: [], categories: [], pics: [] })
  },

  // -------------------------------------------------------------------------
  // Issue core + master data initial state
  // -------------------------------------------------------------------------
  issues:    [],
  tasks:     [],
  approvals: [],
  auditLogs: [],
  isLoading: false,
  error:     null,

  outlets:           [],
  categories:        [],
  pics:              [],
  masterDataLoading: false,
  masterDataError:   null,

  assets:      [],
  workOrders:  [],
  cmmsLoading: false,
  cmmsError:   null,

  allUsers:     [],
  usersLoading: false,

  // -------------------------------------------------------------------------
  // loadAll — initial hydration from the API (issue core + master data)
  // -------------------------------------------------------------------------
  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const [issues, tasks, approvals] = await Promise.all([
        api.get<Issue[]>('/api/issues'),
        api.get<Task[]>('/api/tasks'),
        api.get<ApprovalRequest[]>('/api/approvals'),
      ])
      set({ issues, tasks, approvals, isLoading: false })
    } catch (e) {
      set({ isLoading: false, error: String(e) })
    }
    get().loadMasterData()
    get().loadAuditLogs()
    get().loadUsers()
    get().loadCMMS()
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
  // loadUsers — GET /api/auth/users
  // -------------------------------------------------------------------------
  loadUsers: async () => {
    set({ usersLoading: true })
    try {
      const allUsers = await api.get<User[]>('/api/auth/users')
      set({ allUsers, usersLoading: false })
    } catch {
      set({ usersLoading: false })
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
  // createIssue — POST /api/issues, then refresh tasks + approvals
  // -------------------------------------------------------------------------
  createIssue: async (input) => {
    const issue = await api.post<Issue>('/api/issues', {
      title:           input.title,
      description:     input.description,
      outlet:          input.outlet,
      category:        input.category,
      priority:        input.priority,
      assignee:        input.assignee,
      dueDate:         input.dueDate,
      generateTask:    input.generateTask,
      generateApproval: input.generateApproval,
      approvalAmount:  input.approvalAmount ?? null,
    })

    // Refresh tasks and approvals to pick up the newly auto-generated records.
    const [tasks, approvals] = await Promise.all([
      api.get<Task[]>('/api/tasks'),
      api.get<ApprovalRequest[]>('/api/approvals'),
    ])
    set((state) => ({
      issues:    [issue, ...state.issues.filter((i) => i.id !== issue.id)],
      tasks,
      approvals,
    }))
    return issue
  },

  // -------------------------------------------------------------------------
  // updateIssueStatus — optimistic update + PATCH /api/issues/{id}
  // -------------------------------------------------------------------------
  updateIssueStatus: (issueId, status) => {
    set((state) => ({
      issues: state.issues.map((i) => i.id === issueId ? { ...i, status } : i),
    }))
    api.patch(`/api/issues/${issueId}`, { status }).catch(() => get().loadAll())
  },

  // -------------------------------------------------------------------------
  // updateTaskStatus — optimistic update + PATCH /api/tasks/{id}
  // -------------------------------------------------------------------------
  updateTaskStatus: (taskId, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status } : t),
    }))
    api.patch(`/api/tasks/${taskId}`, { status }).catch(() => get().loadAll())
  },

  // -------------------------------------------------------------------------
  // decideApproval — optimistic update + PATCH /api/approvals/{id}/decide
  // FR-14: if rejected, also optimistically set parent Issue to 'waiting'.
  // -------------------------------------------------------------------------
  decideApproval: (approvalId, decision) => {
    const approval = get().approvals.find((a) => a.id === approvalId)

    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === approvalId ? { ...a, status: decision } : a
      ),
      issues: decision === 'rejected' && approval
        ? state.issues.map((i) =>
            i.id === approval.issueId ? { ...i, status: 'waiting' as Issue['status'] } : i
          )
        : state.issues,
    }))

    const decidedBy = get().currentUser?.name ?? 'System'
    api
      .patch(`/api/approvals/${approvalId}/decide`, { decision, decidedBy })
      .catch(() => get().loadAll())
  },

  // =========================================================================
  // CMMS actions
  // =========================================================================

  // -------------------------------------------------------------------------
  // loadCMMS — load assets and work orders in parallel
  // -------------------------------------------------------------------------
  loadCMMS: async () => {
    set({ cmmsLoading: true, cmmsError: null })
    try {
      const [assets, workOrders] = await Promise.all([
        api.get<Asset[]>('/api/assets'),
        api.get<WorkOrder[]>('/api/work-orders'),
      ])
      set({ assets, workOrders, cmmsLoading: false })
    } catch (e) {
      set({ cmmsLoading: false, cmmsError: String(e) })
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

  deleteWorkOrder: async (id) => {
    set((state) => ({ workOrders: state.workOrders.filter((wo) => wo.id !== id) }))
    try {
      await api.delete(`/api/work-orders/${id}`)
    } catch (e) {
      get().loadCMMS()
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
