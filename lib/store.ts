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
import { api, authToken } from './api-client'
import {
  AppNotification,
  ApprovalRequest,
  ApproverRole,
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
  updateUser: (id: string, patch: { name?: string; role?: string; is_active?: boolean; outlet_ids?: string[] }) => Promise<User>
  deleteUser: (id: string) => Promise<void>

  // Issue core actions
  loadAll: () => Promise<void>
  loadAuditLogs: () => Promise<void>
  createIssue: (input: CreateIssueInput) => Promise<Issue>
  updateIssueStatus: (issueId: string, status: Issue['status']) => void
  updateTaskStatus:  (taskId: string,  status: Task['status'])  => void
  decideApproval: (approvalId: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>
  delegateApproval: (approvalId: string, target: { toUserId?: string; toRole?: ApproverRole }) => Promise<void>
  escalateStaleApprovals: (thresholdDays?: number) => Promise<number>

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

  pmSchedules: [],
  pmLoading:   false,

  purchaseRequests:  [],
  purchaseOrders:    [],
  procurementLoading: false,

  approvalPolicies: [],
  policiesLoading:  false,

  cmmsAnalytics:        null,
  cmmsAnalyticsLoading: false,

  parts:        [],
  partsLoading: false,

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
      title:            input.title,
      description:      input.description,
      outlet:           input.outlet,
      category:         input.category,
      priority:         input.priority,
      assignee:         input.assignee,
      dueDate:          input.dueDate,
      generateTask:     input.generateTask,
      generateApproval: input.generateApproval,
      approvalAmount:   input.approvalAmount ?? null,
      generateWorkOrder: input.generateWorkOrder,
      assetId:          input.assetId ?? null,
      estimatedCost:    input.estimatedCost ?? null,
    })

    // Refresh tasks, approvals, and work orders to pick up auto-generated records.
    const [tasks, approvals, workOrders] = await Promise.all([
      api.get<Task[]>('/api/tasks'),
      api.get<ApprovalRequest[]>('/api/approvals'),
      api.get<WorkOrder[]>('/api/work-orders'),
    ])
    set((state) => ({
      issues:     [issue, ...state.issues.filter((i) => i.id !== issue.id)],
      tasks,
      approvals,
      workOrders,
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
    api.patch(`/api/issues/${issueId}`, { status }).catch((e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to update issue status.')
      get().loadAll()
    })
  },

  // -------------------------------------------------------------------------
  // updateTaskStatus — optimistic update + PATCH /api/tasks/{id}
  // -------------------------------------------------------------------------
  updateTaskStatus: (taskId, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status } : t),
    }))
    api.patch(`/api/tasks/${taskId}`, { status }).catch((e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to update task status.')
      get().loadAll()
    })
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
      // If final approved, update linked WO status in local cache
      workOrders: updated.status === 'approved'
        ? state.workOrders.map((wo) =>
            wo.approvalId === updated.id ? { ...wo, status: 'in-progress' as WorkOrderStatus } : wo
          )
        : state.workOrders,
    }))
  },

  delegateApproval: async (approvalId, target) => {
    const updated = await api.patch<ApprovalRequest>(`/api/approvals/${approvalId}/delegate`, target)
    set((state) => ({
      approvals: state.approvals.map((a) => a.id === approvalId ? updated : a),
    }))
  },

  escalateStaleApprovals: async (thresholdDays) => {
    const res = await api.post<{ escalated: number; approvalIds: string[] }>(
      '/api/approvals/escalate-stale', { thresholdDays },
    )
    // Refresh approvals so escalated flags show up.
    const approvals = await api.get<ApprovalRequest[]>('/api/approvals')
    set({ approvals })
    return res.escalated
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
    // The PR raised an approval — refresh the approval inbox.
    get().loadAll?.()
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
