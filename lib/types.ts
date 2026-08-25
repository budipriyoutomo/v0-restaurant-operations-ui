// =====================================================================
// ISSUE CORE — Shared domain types
// Single source of truth for Issue, Task, and Approval data models.
// All three modules (Issues, Tasks, Approvals) read/write through these
// types via the central store in lib/store.ts — never local mock arrays.
// =====================================================================

export type Priority = 'critical' | 'high' | 'medium' | 'low'

export type IssueStatus =
  | 'open'
  | 'assigned'
  | 'in-progress'
  | 'waiting'
  | 'resolved'
  | 'closed'

export type TaskStatus = IssueStatus

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type IssueCategory =
  | 'Maintenance'
  | 'IT Support'
  | 'Compliance'
  | 'Training'
  | 'Procurement'
  | 'Marketing'
  | 'Asset Purchase'
  | 'Guest Service'
  | 'Other'

export type ApprovalType =
  | 'procurement'
  | 'marketing'
  | 'training'
  | 'asset-purchase'
  | 'maintenance'

// Multi-step approval
export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped'
export type ApproverRole = 'staff' | 'manager' | 'admin'

export interface ApprovalStep {
  id: string
  approvalRequestId: string
  stepOrder: number
  approverRole: ApproverRole
  approverUserId: string | null
  status: ApprovalStepStatus
  decidedBy: string | null
  decidedAt: string | null
  comment: string | null
  createdAt: string
}

// Maps an Issue category to the Approval "type" badge used in the
// Approval Center. Only categories that can carry an approval need an entry.
export const CATEGORY_TO_APPROVAL_TYPE: Partial<Record<IssueCategory, ApprovalType>> = {
  Procurement: 'procurement',
  Marketing: 'marketing',
  Training: 'training',
  'Asset Purchase': 'asset-purchase',
}

// Default suggestion rules: when creating an Issue with this category,
// should the UI pre-check "Generate Task" / "Generate Approval"?
// These are *defaults* the user can override in the Create Issue form.
export const CATEGORY_DEFAULTS: Record<IssueCategory, { task: boolean; approval: boolean }> = {
  Maintenance: { task: true, approval: false },
  'IT Support': { task: true, approval: false },
  Compliance: { task: true, approval: false },
  Training: { task: true, approval: true },
  Procurement: { task: true, approval: true },
  Marketing: { task: true, approval: true },
  'Asset Purchase': { task: true, approval: true },
  'Guest Service': { task: true, approval: false },
  Other: { task: true, approval: false },
}

export interface Issue {
  id: string
  number: string // e.g. ISS-2026-00145
  title: string
  description: string
  outlet: string
  category: IssueCategory
  priority: Priority
  status: IssueStatus
  assignee: string
  dueDate: string | null   // null when no due date is set
  createdDate: string
  slaBreach: boolean
  // Relations — populated automatically when child records are generated
  taskIds: string[]
  approvalId: string | null
  workOrderId: string | null  // populated when Maintenance issue auto-generates a WO
}

export interface Task {
  id: string
  number: string // e.g. TSK-2026-00211
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assignee: string
  dueDate: string | null   // null when the parent Issue had no due date
  outlet: string
  // Relation back to the originating Issue (always present — Tasks never exist standalone in this MVP)
  issueId: string
  issueNumber: string
}

export interface ApprovalRequest {
  id: string
  number: string // e.g. APR-2026-00089
  title: string
  type: ApprovalType
  description: string
  requester: string
  outlet: string
  requestedDate: string | null
  amount?: number | null     // IDR integer; format "Rp X.XXX" only in UI
  currency?: string          // default "IDR"
  status: ApprovalStatus
  // Polymorphic source: an approval is for an Issue OR a Purchase Request (Tier 6.1).
  issueId: string | null
  issueNumber: string | null
  purchaseRequestId?: string | null
  // Multi-step fields (populated from backend)
  currentStepOrder: number
  escalated: boolean
  steps: ApprovalStep[]
}

// =====================================================================
// Master Data types — Outlet, Category (master), PIC
// =====================================================================

export type OutletStatus = 'operational' | 'warning' | 'critical'
export type CategoryType = 'operations' | 'maintenance'

export interface Outlet {
  id: string
  name: string
  code: string
  status: OutletStatus
}

export interface MasterCategory {
  id: string
  name: string
  description: string
  type: CategoryType
}

export interface PIC {
  id: string
  name: string
  email: string
  phone: string
  department: string
  categories: string[] // list of MasterCategory IDs
}

export interface CreateOutletInput {
  name: string
  code: string
  status: OutletStatus
}

export interface UpdateOutletInput {
  name?: string
  code?: string
  status?: OutletStatus
}

export interface CreateCategoryInput {
  name: string
  description: string
  type: CategoryType
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
  type?: CategoryType
}

export interface CreatePICInput {
  name: string
  email: string
  phone: string
  department: string
  categories: string[]
}

export interface UpdatePICInput {
  name?: string
  email?: string
  phone?: string
  department?: string
  categories?: string[]
}

// =====================================================================
// Audit log entry from /api/audit-logs
// =====================================================================

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  performed_by: string
  created_at: string
}

// =====================================================================
// Notifications
// =====================================================================

export type NotificationType = 'info' | 'warning' | 'critical' | 'success'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}

// =====================================================================
// Auth — User session
// =====================================================================

export type UserRole = 'staff' | 'manager' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  // Outlets this user is scoped to (Tier 4.1). Empty for admins (they see all)
  // and for users not yet assigned — Tier 4.2 treats empty as deny-by-default
  // for non-admins, never as "see everything".
  outlet_ids: string[]
}

// =====================================================================
// CMMS — Asset & Work Order
// =====================================================================

export type AssetStatus = 'operational' | 'warning' | 'maintenance' | 'critical'
export type WorkOrderType = 'corrective' | 'preventive'
export type WorkOrderStatus = 'scheduled' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled'

export interface Asset {
  id: string
  number: string           // AST-2026-00001
  name: string
  category: string
  outlet: string
  status: AssetStatus
  serialNumber: string | null
  brand: string | null
  model: string | null
  installDate: string | null
  lastPM: string | null
  nextPM: string | null
  purchaseCost: number | null    // IDR integer — for repair-vs-replace analytics
  qrToken: string | null         // opaque sticker token (Tier 5.2)
  createdAt: string
}

export interface QRResolveResult {
  asset: Asset
  activeWorkOrderId: string | null
  openWorkOrderCount: number
}

export interface WorkOrder {
  id: string
  number: string           // WO-2026-00001
  type: WorkOrderType
  assetId: string | null
  assetName: string
  outlet: string
  issueId: string | null
  issueNumber: string | null
  title: string
  description: string
  priority: Priority
  status: WorkOrderStatus
  assignee: string
  scheduledDate: string | null
  completedDate: string | null
  createdAt: string
  // Cost & downtime (Tier 1 CMMS depth)
  downtimeStart: string | null
  downtimeEnd: string | null
  laborHours: number | null
  laborCost: number
  partsCost: number
  totalCost: number
  estimatedCost: number | null
  requiresApproval: boolean
  approvalId: string | null
  // Vendor / external maintenance (Tier 3)
  vendorId: string | null
  vendorName: string | null
  slaDue: string | null
  slaMet: boolean | null
}

export interface VendorPerformance {
  vendorId: string
  totalAssigned: number
  completed: number
  onTime: number
  onTimePct: number
  avgResolutionDays: number
  openWorkOrders: number
}

export interface ChecklistItem {
  id: string
  workOrderId: string
  title: string
  isDone: boolean
  doneBy: string | null
  doneAt: string | null
  orderIndex: number
}

export interface WorkOrderAttachment {
  id: string
  workOrderId: string
  fileUrl: string | null        // external URL, or serve-route for uploads
  thumbnailUrl?: string | null  // small preview for uploads
  caption: string | null
  uploadedBy: string
  mimeType?: string | null
  sizeBytes?: number | null
  isUpload?: boolean            // true = photo stored by the app
  createdAt: string
}

export interface WorkOrderDetail extends WorkOrder {
  checklistItems: ChecklistItem[]
  attachments: WorkOrderAttachment[]
}

export interface WorkOrderCostUpdateInput {
  laborHours?: number
  laborCost?: number
  partsCost?: number
}

// GET /api/assets/{id}/history
export interface AssetHistory {
  items: WorkOrder[]
  total: number
  page: number
  pageSize: number
}

// GET /api/assets/{id}/summary
export interface AssetSummary {
  totalWorkOrders: number
  totalDowntimeHours: number
  totalLaborCost: number
  totalPartsCost: number
  totalCost: number
  lastPM: string | null
  nextPM: string | null
  workOrdersLast90Days: number
}

export interface CreateAssetInput {
  name: string
  category: string
  outlet: string
  status?: AssetStatus
  serialNumber?: string
  brand?: string
  model?: string
  installDate?: string
  lastPM?: string
  nextPM?: string
  purchaseCost?: number
}

export interface UpdateAssetInput {
  name?: string
  category?: string
  outlet?: string
  status?: AssetStatus
  serialNumber?: string
  brand?: string
  model?: string
  installDate?: string
  lastPM?: string
  nextPM?: string
  purchaseCost?: number
}

export interface CreateWorkOrderInput {
  assetId: string
  issueId?: string
  issueNumber?: string
  type?: WorkOrderType
  title: string
  description?: string
  priority?: Priority
  assignee?: string
  scheduledDate?: string
  estimatedCost?: number
}

// =====================================================================
// Preventive Maintenance scheduling (Tier 2.1) — mirrors backend
// app/schemas/pm_schedule.py exactly.
// =====================================================================

export type PMIntervalType = 'days' | 'weeks' | 'months'
export type PMTriggerType = 'calendar' | 'meter'

export interface PMSchedule {
  id: string
  assetId: string
  assetName: string
  name: string
  triggerType: PMTriggerType
  intervalType: PMIntervalType
  intervalValue: number
  meterInterval: number | null
  lastMeterValue: number | null
  checklist: string[]
  assigneeRole: ApproverRole | null
  assigneeUserId: string | null
  assigneeName: string | null
  leadTimeDays: number
  nextDueDate: string | null     // ISO date (calendar only)
  lastGeneratedAt: string | null
  isActive: boolean
  outlet: string
  createdAt: string
}

export interface CreatePMScheduleInput {
  assetId: string
  name: string
  triggerType?: PMTriggerType
  intervalType?: PMIntervalType
  intervalValue?: number
  meterInterval?: number
  checklist?: string[]
  assigneeRole?: ApproverRole
  assigneeUserId?: string
  assigneeName?: string
  leadTimeDays?: number
  nextDueDate?: string | null
  isActive?: boolean
}

export interface UpdatePMScheduleInput {
  name?: string
  triggerType?: PMTriggerType
  intervalType?: PMIntervalType
  intervalValue?: number
  meterInterval?: number
  checklist?: string[]
  assigneeRole?: ApproverRole
  assigneeUserId?: string
  assigneeName?: string
  leadTimeDays?: number
  nextDueDate?: string
  isActive?: boolean
}

export interface MeterReading {
  id: string
  assetId: string
  value: number
  note: string | null
  recordedBy: string | null
  recordedAt: string
}

export interface RunPMGeneratorResult {
  generated: number
  workOrderIds: string[]
  schedulesEvaluated: number
}

// =====================================================================
// Approval Policy engine (Tier 2.2) — mirrors backend
// app/schemas/approval_policy.py exactly.
// =====================================================================

export interface PolicyStep {
  order: number
  role: ApproverRole
}

export interface ApprovalPolicy {
  id: string
  approvalType: ApprovalType
  minAmount: number | null       // IDR integer
  maxAmount: number | null       // IDR integer
  steps: PolicyStep[]
  outlet: string | null
  isActive: boolean
  createdAt: string
}

export interface CreateApprovalPolicyInput {
  approvalType: ApprovalType
  minAmount?: number | null
  maxAmount?: number | null
  steps: PolicyStep[]
  outlet?: string | null
  isActive?: boolean
}

export interface UpdateApprovalPolicyInput {
  approvalType?: ApprovalType
  minAmount?: number | null
  maxAmount?: number | null
  steps?: PolicyStep[]
  outlet?: string | null
  isActive?: boolean
}

// =====================================================================
// CMMS Analytics (Tier 3) — mirrors backend /api/analytics/cmms
// =====================================================================

export interface AssetAnalytics {
  assetId: string
  assetName: string
  outlet: string
  workOrders: number
  failures: number
  mttrHours: number
  mtbfHours: number
  uptimePct: number
  totalDowntimeHours: number
  totalCost: number
  repairCost: number
  purchaseCost: number | null
  repairVsReplace: boolean | null
}

export interface FleetAnalytics {
  assetCount: number
  avgMttrHours: number
  avgMtbfHours: number
  avgUptimePct: number
  totalCost: number
  replaceCandidates: number
}

export interface CMMSAnalytics {
  perAsset: AssetAnalytics[]
  fleet: FleetAnalytics
}

// =====================================================================
// Spare parts & inventory (Tier 3) — mirrors backend app/schemas/part.py
// =====================================================================

export interface Part {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  unitCost: number       // IDR integer
  stockQty: number
  reorderLevel: number
  outlet: string | null
  isActive: boolean
  lowStock: boolean
  createdAt: string
}

export interface CreatePartInput {
  sku: string
  name: string
  category?: string
  unit?: string
  unitCost?: number
  stockQty?: number
  reorderLevel?: number
  outlet?: string | null
  isActive?: boolean
}

export interface UpdatePartInput {
  name?: string
  category?: string
  unit?: string
  unitCost?: number
  stockQty?: number
  reorderLevel?: number
  outlet?: string | null
  isActive?: boolean
}

export interface WorkOrderPart {
  id: string
  workOrderId: string
  partId: string | null
  partName: string
  quantity: number
  unitCost: number
  lineCost: number
  createdAt: string
}

// =====================================================================
// Procurement (Tier 6.1) — PR → PO → Goods Receipt
// =====================================================================

export type PurchaseRequestStatus =
  | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received' | 'cancelled'
export type PurchaseOrderStatus = 'sent' | 'partially_received' | 'received' | 'cancelled'

export interface PurchaseRequestItem {
  id: string
  partId: string | null
  partName: string
  quantity: number
  estUnitCost: number
  lineTotal: number
}

export interface PurchaseRequest {
  id: string
  number: string
  status: PurchaseRequestStatus
  source: 'manual' | 'auto_reorder'
  outlet: string | null
  requestedBy: string | null
  notes: string | null
  totalEst: number
  approvalId: string | null
  items: PurchaseRequestItem[]
  createdAt: string
}

export interface CreatePurchaseRequestInput {
  outlet?: string | null
  notes?: string | null
  items: { partId?: string | null; partName: string; quantity: number; estUnitCost?: number }[]
}

export interface PurchaseOrderItem {
  id: string
  partId: string | null
  partName: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  lineTotal: number
}

export interface PurchaseOrder {
  id: string
  number: string
  status: PurchaseOrderStatus
  purchaseRequestId: string | null
  vendorId: string | null
  vendorName: string | null
  outlet: string | null
  total: number
  items: PurchaseOrderItem[]
  createdAt: string
}

export interface ScanLowStockResult {
  created: number
  purchaseRequestIds: string[]
  partsScanned: number
}

// Tier 6.2 — data-driven vendor selection
export interface VendorPerformanceSummary {
  vendorId: string
  name: string
  totalAssigned: number
  completed: number
  onTime: number
  onTimePct: number
  avgResolutionDays: number
  openWorkOrders: number
}

export interface PartPriceHistoryEntry {
  vendorId: string | null
  vendorName: string | null
  lastUnitCost: number
  avgUnitCost: number
  minUnitCost: number
  timesOrdered: number
  totalQuantity: number
  lastOrderedAt: string | null
}

// Tier 6.3 — budgets
export interface Budget {
  id: string
  outletId: string
  outlet: string | null
  period: string      // YYYY-MM
  amount: number
  createdAt: string
}

export interface BudgetStatusEntry {
  budgetId: string
  outletId: string
  outlet: string | null
  period: string
  amount: number
  spentWorkOrders: number
  spentPurchaseOrders: number
  spent: number
  remaining: number
  pct: number
  overBudget: boolean
  warning: boolean
}

// =====================================================================
// Procurement — Vendors
// =====================================================================

export interface Vendor {
  id: string
  name: string
  category: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  address: string | null
  outlet: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateVendorInput {
  name: string
  category?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  outlet?: string
  notes?: string
}

export interface UpdateVendorInput {
  name?: string
  category?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  outlet?: string
  is_active?: boolean
  notes?: string
}

// =====================================================================
// Training — Programs
// =====================================================================

export type TrainingProgramStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled'

export interface TrainingProgram {
  id: string
  title: string
  description: string | null
  target_role: string
  outlet: string | null
  trainer: string | null
  scheduled_date: string | null
  duration_hours: number | null
  status: TrainingProgramStatus
  max_participants: number | null
  created_at: string
  updated_at: string
}

export interface CreateTrainingProgramInput {
  title: string
  description?: string
  target_role?: string
  outlet?: string
  trainer?: string
  scheduled_date?: string
  duration_hours?: number
  max_participants?: number
}

export interface UpdateTrainingProgramInput {
  title?: string
  description?: string
  target_role?: string
  outlet?: string
  trainer?: string
  scheduled_date?: string
  duration_hours?: number
  status?: TrainingProgramStatus
  max_participants?: number
}

// =====================================================================
// Marketing — Campaigns
// =====================================================================

export type CampaignStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type CampaignType = 'promotion' | 'event' | 'social-media' | 'email' | 'other'

export interface Campaign {
  id: string
  title: string
  type: CampaignType
  description: string | null
  outlet: string | null
  budget: string | null
  start_date: string | null
  end_date: string | null
  status: CampaignStatus
  pic: string | null
  created_at: string
  updated_at: string
}

export interface CreateCampaignInput {
  title: string
  type?: CampaignType
  description?: string
  outlet?: string
  budget?: string
  start_date?: string
  end_date?: string
  pic?: string
}

export interface UpdateCampaignInput {
  title?: string
  type?: CampaignType
  description?: string
  outlet?: string
  budget?: string
  start_date?: string
  end_date?: string
  status?: CampaignStatus
  pic?: string
}

// Input shape for the Create Issue form. Everything the user fills in,
// plus the toggles that control auto-generation.
export interface CreateIssueInput {
  title: string
  description: string
  outlet: string
  category: IssueCategory
  priority: Priority
  assignee: string
  dueDate: string
  generateTask: boolean
  generateApproval: boolean
  approvalAmount?: number    // IDR integer; no formatted strings
  // Maintenance-specific: auto-generate a corrective Work Order
  generateWorkOrder: boolean
  assetId?: string
  estimatedCost?: number
}
