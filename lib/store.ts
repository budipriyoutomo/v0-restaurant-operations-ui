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
  AppNotification,
  ApprovalRequest,
  Asset,
  AuditLog,
  Campaign,
  CreateAssetInput,
  CreateCampaignInput,
  CreateIssueInput,
  CreateTrainingProgramInput,
  CreateVendorInput,
  CreateWorkOrderInput,
  Issue,
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
  Vendor,
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
  loadUsers: () => Promise<void>
  inviteUser: (email: string, name: string, role: string, password: string) => Promise<User>
  updateUser: (id: string, patch: { name?: string; role?: string; is_active?: boolean }) => Promise<User>
  deleteUser: (id: string) => Promise<void>

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

  // Vendors (Procurement)
  vendors: Vendor[]
  vendorsLoading: boolean
  loadVendors: () => Promise<void>
  createVendor: (input: CreateVendorInput) => Promise<Vendor>
  updateVendor: (id: string, input: UpdateVendorInput) => Promise<Vendor>
  deleteVendor: (id: string) => Promise<void>

  // Training Programs
  trainingPrograms: TrainingProgram[]
  trainingLoading: boolean
  loadTrainingPrograms: () => Promise<void>
  createTrainingProgram: (input: CreateTrainingProgramInput) => Promise<TrainingProgram>
  updateTrainingProgram: (id: string, input: UpdateTrainingProgramInput) => Promise<TrainingProgram>
  deleteTrainingProgram: (id: string) => Promise<void>

  // Campaigns (Marketing)
  campaigns: Campaign[]
  campaignsLoading: boolean
  loadCampaigns: () => Promise<void>
  createCampaign: (input: CreateCampaignInput) => Promise<Campaign>
  updateCampaign: (id: string, input: UpdateCampaignInput) => Promise<Campaign>
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

  notifications:        [],
  unreadCount:          0,
  notificationsLoading: false,

  vendors:         [],
  vendorsLoading:  false,
  trainingPrograms:   [],
  trainingLoading:    false,
  campaigns:          [],
  campaignsLoading:   false,

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
    get().loadNotifications()
    get().loadVendors()
    get().loadTrainingPrograms()
    get().loadCampaigns()
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
    set((state) => ({
      notifications: state.notifications.map(n => n.id === id ? updated : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
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
  // Vendors CRUD
  // -------------------------------------------------------------------------
  loadVendors: async () => {
    set({ vendorsLoading: true })
    try {
      const vendors = await api.get<Vendor[]>('/api/vendors?active_only=false')
      set({ vendors, vendorsLoading: false })
    } catch { set({ vendorsLoading: false }) }
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
    } catch { set({ trainingLoading: false }) }
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
    } catch { set({ campaignsLoading: false }) }
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
  deleteCampaign: async (id) => {
    await api.delete(`/api/campaigns/${id}`)
    set((state) => ({ campaigns: state.campaigns.filter(c => c.id !== id) }))
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
