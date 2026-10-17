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
  | 'cancelled'   // only via POST /api/issues/{id}/cancel (Todo-Pilot §2)

export type TaskStatus = IssueStatus

/** A derived record that still blocks resolving/closing its Issue (Todo-Pilot §1). */
export interface ClosureBlocker {
  type: 'task' | 'work_order' | 'approval'
  id: string
  number: string
  status: string
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

// Issue categories are master data (Todo-Ops-Checklist P1): names are data,
// behaviour follows the module. See lib/categories.ts.
export type CategoryModule =
  | 'maintenance'
  | 'it_support'
  | 'compliance'
  | 'guest_service'
  | 'asset_purchase'
  | 'general'

export type CategorySystemKey =
  | 'maintenance'
  | 'it_support'
  | 'compliance'
  | 'training'
  | 'procurement'
  | 'marketing'
  | 'asset_purchase'
  | 'guest_service'
  | 'other'
  | 'food_safety'

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

export interface Issue {
  id: string
  number: string // e.g. ISS-2026-00145
  title: string
  description: string
  outlet: string
  category: string                         // category name (master data)
  categoryId?: string | null
  categoryModule?: CategoryModule | null   // behaviour of that category
  priority: Priority
  status: IssueStatus
  assignee: string
  assigneeUserId?: string | null   // Todo-Pilot §17; null = not linked to a user (never notified)
  dueDate: string | null   // null when no due date is set
  createdDate: string
  createdAt?: string | null   // ISO timestamp — "2 h ago" on the card (Todo-Pilot §21)
  slaBreach: boolean
  // Relations — populated automatically when child records are generated
  taskIds: string[]
  approvalId: string | null
  workOrderId: string | null  // populated when a maintenance-module issue auto-generates a WO
  closureBlockers: ClosureBlocker[]  // non-empty → Resolve/Close is refused by the API
  // "Siap ditutup" (Todo-Pilot §18): derived records all finished, Issue not closed yet
  readyToClose?: boolean
  photoCount?: number   // Todo-Pilot §20
  // Card summaries from the server, so a page of cards needs no other list (Todo-Pilot §22)
  approval?: { id: string; number: string; status: ApprovalStatus; currentStepOrder: number; stepCount: number; escalated: boolean } | null
  workOrder?: { id: string; number: string; status: WorkOrderStatus } | null
}

// Photo on an Issue — GET /api/issues/{id}/photos (Todo-Pilot §20). URLs are
// authenticated API paths; load them with the bearer token.
export interface IssuePhoto {
  id: string
  caption: string | null
  fileUrl: string
  thumbnailUrl: string
  mimeType: string | null
  createdAt: string
}

// Assignee picker option — GET /api/auth/users/assignable (Todo-Pilot §17)
export interface AssignableUser {
  id: string
  name: string
  role_name: string
  approval_tier: string
}

export interface BulkCloseResult {
  closed: Issue[]
  failed: { id: string; number: string | null; reason: string }[]
}

export interface Task {
  id: string
  number: string // e.g. TSK-2026-00211
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assignee: string
  assigneeUserId?: string | null   // Todo-Pilot §17
  dueDate: string | null   // null when the parent Issue had no due date
  outlet: string
  // Relation back to the originating Issue (always present — Tasks never exist standalone in this MVP)
  issueId: string
  issueNumber: string
  issueStatus?: IssueStatus | null   // a finished Issue locks its tasks (Todo-Pilot §22/§23)
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
  amount?: number | null     // IDR integer; show with formatMoney() (lib/money.ts)
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
  // IDR. Corrective WOs costing more than this need approval.
  // null = outlet uses approvalThresholdDefault (global).
  approvalThreshold: number | null
  approvalThresholdDefault: number
  timezone?: string                 // IANA, e.g. Asia/Jakarta (daily checklist times)
}

export interface MasterCategory {
  id: string
  name: string
  description: string
  type: CategoryType                  // legacy, derived from module
  module: CategoryModule
  systemKey: CategorySystemKey | null
  isSystem: boolean                   // system rows: rename ok; no delete / deactivate / module change
  isActive: boolean
  defaultGenerateTask: boolean
  defaultGenerateApproval: boolean
  approvalType: ApprovalType | null   // null → procurement
  icon: string | null                 // lucide icon name, kebab-case
}

export interface PIC {
  id: string
  name: string
  email: string
  phone: string
  department: string
  categories: string[] // list of MasterCategory IDs
  userId?: string | null    // linked user account (P2): gets the PIC's categories when no rule applies
  userName?: string | null
}

export interface CreateOutletInput {
  name: string
  code: string
  status: OutletStatus
  approvalThreshold?: number | null
  timezone?: string
}

export interface UpdateOutletInput {
  name?: string
  code?: string
  status?: OutletStatus
  approvalThreshold?: number | null   // null clears the override
  timezone?: string
}

export interface CreateCategoryInput {
  name: string
  description: string
  module: CategoryModule
  defaultGenerateTask?: boolean
  defaultGenerateApproval?: boolean
  approvalType?: ApprovalType | null
  icon?: string | null
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
  module?: CategoryModule
  isActive?: boolean
  defaultGenerateTask?: boolean
  defaultGenerateApproval?: boolean
  approvalType?: ApprovalType | null
  icon?: string | null
}

export interface CreatePICInput {
  name: string
  email: string
  phone: string
  department: string
  categories: string[]
  userId?: string | null
}

export interface UpdatePICInput {
  name?: string
  email?: string
  phone?: string
  department?: string
  categories?: string[]
  userId?: string | null   // null unlinks
}

// Assignee routing, category × outlet → user (Todo-Ops-Checklist P2). A new
// Issue without assignee goes to the (category, outlet) rule → the
// (category, all outlets) rule → the category's PIC with a user → Unassigned.
// Comments on an Issue (Todo-Ops-Checklist P3). system = written by a service,
// e.g. a daily checklist item failing again on an open Issue.
export type IssueCommentKind = 'user' | 'system'

export interface IssueComment {
  id: string
  issueId: string
  body: string
  kind: IssueCommentKind
  authorUserId: string | null
  authorName: string
  createdAt: string
}

// ── Daily ops checklist (Todo-Ops-Checklist Fase 1) ─────────────────────────
export type OpsShift = 'opening' | 'midday' | 'closing' | 'other'
export type OpsItemType = 'check' | 'number' | 'temperature'
export type OpsResult = 'pass' | 'fail' | 'na'
export type OpsRunStatus = 'pending' | 'in_progress' | 'submitted' | 'missed'
// daily: daysOfWeek filter · weekly: its one weekday · monthly: dayOfMonth (Fase 4)
export type OpsScheduleFrequency = 'daily' | 'weekly' | 'monthly'

export interface OpsTemplateItem {
  id: string
  title: string
  section: string
  itemType: OpsItemType
  minValue: number | null
  maxValue: number | null
  unit: string
  requiresPhoto: boolean
  isCritical: boolean
  issueCategoryId: string | null   // null → Compliance
  assetId?: string | null          // temperature item measuring one monitored asset (Fase 2)
  assetName?: string | null
}

export type OpsTemplateItemInput = Omit<OpsTemplateItem, 'id'> & { id?: string }

export interface OpsTemplate {
  id: string
  name: string
  description: string
  shift: OpsShift
  isActive: boolean
  items: OpsTemplateItem[]
}

export interface OpsSchedule {
  id: string
  templateId: string
  templateName: string
  shift: OpsShift
  outlet: string
  outletId: string
  timezone: string
  frequency: OpsScheduleFrequency
  daysOfWeek: number[]            // ISO 1–7; empty = every day; weekly = exactly one
  dayOfMonth: number | null       // monthly: 1–31, a shorter month → its last day
  dueTime: string                 // HH:MM, outlet wall clock
  openMinutesBefore: number
  graceMinutes: number
  isActive: boolean
}

export interface OpsPhoto {
  id: string
  fileUrl: string
  thumbnailUrl: string
  createdAt: string
}

export interface OpsRunItem {
  id: string
  templateItemId: string | null
  title: string
  section: string
  itemType: OpsItemType
  minValue: number | null
  maxValue: number | null
  unit: string
  requiresPhoto: boolean
  isCritical: boolean
  assetId?: string | null          // QR scan of this asset jumps to the item
  assetName?: string | null
  result: OpsResult | null
  value: number | null
  notes: string
  correctiveAction: string | null
  recordedAt: string | null
  issueId: string | null
  issueNumber: string | null
  photos: OpsPhoto[]
}

export interface OpsRun {
  id: string
  number: string                  // OPS-2026-00001
  scheduleId: string
  templateId: string
  templateName: string
  shift: OpsShift
  outlet: string
  outletId: string
  runDate: string                 // shift date at the outlet
  opensAt: string
  dueAt: string
  closesAt: string
  status: OpsRunStatus
  isLate: boolean
  submittedByName: string | null
  submittedAt: string | null
  score: number | null
  itemCount: number
  answeredCount: number
  failedCount: number
  criticalFailed: boolean
}

export interface OpsRunDetail extends OpsRun {
  items: OpsRunItem[]
}

// Checklist compliance (Todo-Ops-Checklist Fase 3). compliance = on time ÷ scheduled, %.
export interface OpsKpiCounts {
  scheduled: number               // runs that were due (finished, or window closed)
  onTime: number
  late: number
  missed: number
  compliance: number | null
  avgScore: number | null
  excursions: number
  issuesCreated: number
}

export interface OpsOutletKpi extends OpsKpiCounts {
  outlet: string
  outletId: string
  topFailing: { title: string; count: number }[]
}

export interface OpsKpis {
  from: string
  to: string
  outlets: OpsOutletKpi[]         // lowest compliance first
  totals: OpsKpiCounts
  trend: { weekStart: string; scheduled: number; onTime: number; compliance: number | null }[]
}

// Manager's daily sign-off (Todo-Ops-Checklist Fase 4). One per outlet per
// business day (05:00–05:00); digest = SHA-256 of the day's runs + readings.
export interface OpsDaySummary {
  runs: number
  submitted: number
  late: number
  missed: number
  failedItems: number
  temperatureReadings: number
  excursions: number
}

export interface OpsSignoff {
  id: string
  outlet: string
  outletId: string
  businessDate: string
  signedByName: string
  signedAt: string
  note: string
  summary: OpsDaySummary          // what the manager saw when signing
  digest: string
}

export interface OpsDay {
  outlet: string
  outletId: string
  date: string
  summary: OpsDaySummary          // now
  runs: OpsRun[]
  signoff: OpsSignoff | null
  canSign: boolean
  problem: string | null          // why it cannot be signed yet
  isIntact: boolean | null        // signed data still matches (null = not signed)
}

// Built-in template sets per outlet type (Fase 4, onboarding UX-11).
export interface OpsPreset {
  key: string
  label: string
  templates: { name: string; shift: OpsShift; frequency: OpsScheduleFrequency; dueTime: string; itemCount: number }[]
}

export interface OpsPresetResult {
  preset: string
  created: string[]
  skipped: string[]               // names that already existed
  schedules: number
}

export interface AssignmentRule {
  id: string
  categoryId: string
  categoryName: string
  outletId: string | null      // null = every outlet
  outlet: string | null
  assigneeUserId: string
  assigneeName: string
  assigneeActive: boolean      // false → skipped when routing
}

export interface CreateAssignmentRuleInput {
  categoryId: string
  outletId: string | null
  assigneeUserId: string
}

export type UpdateAssignmentRuleInput = Partial<CreateAssignmentRuleInput>

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

// Role key — staff / manager / admin or a custom role (see RoleDef).
export type UserRole = string
// Approval tier a role acts as in approval workflows (approver_role enum).
export type ApprovalTier = 'staff' | 'manager' | 'admin'
export type AccessLevel = 'none' | 'view' | 'manage'

export interface User {
  id: string
  home_page?: string | null   // role's home page (Todo-Pilot §19); see lib/home.ts
  email: string
  name: string
  role: UserRole
  is_active: boolean
  // Personal outlet override. Empty = inherit the role's outlet access.
  outlet_ids: string[]
  // Resolved from the role by the backend.
  role_name: string
  approval_tier: ApprovalTier
  permissions: Record<string, AccessLevel>
  all_outlets: boolean
  effective_outlet_ids: string[]
  whatsapp_number?: string | null   // normalised digits, e.g. 6281234567890 (Todo-Pilot §4)
  // Tenant (Todo-Pilot §11). Platform admins have no company and see only the Platform page.
  company_id?: string | null
  company_name?: string | null
  is_platform_admin?: boolean
}

export interface RoleDef {
  key: string
  name: string
  description: string | null
  permissions: Record<string, AccessLevel>
  all_outlets: boolean
  outlet_ids: string[]
  approval_tier: ApprovalTier
  is_system: boolean
  user_count: number
  home_page?: string | null   // Todo-Pilot §19; null = default (My Work)
}

export interface ModuleDef {
  key: string
  label: string
  group: string
  manageable: boolean
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
  // Food safety temperature monitoring (Todo-Ops-Checklist Fase 2), °C inclusive
  tempMonitored?: boolean
  tempMin?: number | null
  tempMax?: number | null
}

export type TemperatureSource = 'checklist' | 'manual' | 'sensor'

export interface TemperatureLog {
  id: string
  assetId: string
  outlet: string
  value: number
  minValue: number | null          // limits at the time of the reading
  maxValue: number | null
  inRange: boolean
  correctiveAction: string | null
  source: TemperatureSource
  runItemId: string | null
  issueId: string | null
  recordedAt: string
}

// An IoT thermometer on a monitored asset (Fase 4). It posts readings with its
// own key — returned once, at creation.
export interface TemperatureSensor {
  id: string
  assetId: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastSeenAt: string | null
  lastValue: number | null
  createdAt: string
}

export interface CreatedTemperatureSensor extends TemperatureSensor {
  key: string
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
  assigneeUserId?: string | null   // Todo-Pilot §17
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
  tempMonitored?: boolean
  tempMin?: number | null
  tempMax?: number | null
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
  tempMonitored?: boolean
  tempMin?: number | null          // null clears
  tempMax?: number | null
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
  assigneeUserId?: string | null   // Todo-Pilot §17
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
  enrolled_count: number     // Todo-Pilot §9
  attended_count: number
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
  budget: number | null          // integer major units (Todo-Pilot §10)
  currency: string               // ISO, default IDR
  budget_legacy: string | null   // old free text that could not be converted
  start_date: string | null
  end_date: string | null
  status: CampaignStatus
  pic: string | null
  // Entered by hand (Todo-Pilot §10)
  actual_cost: number | null
  result_transactions: number | null
  result_revenue: number | null
  baseline_transactions: number | null
  baseline_revenue: number | null
  metrics: CampaignMetrics
  created_at: string
  updated_at: string
}

export interface CampaignMetrics {
  budget_used_pct: number | null
  over_budget: boolean
  cost_per_transaction: number | null
  revenue_per_rupiah: number | null
  revenue_uplift_pct: number | null
  transaction_uplift_pct: number | null
}

export interface CampaignResultsInput {
  actual_cost?: number | null
  result_transactions?: number | null
  result_revenue?: number | null
  baseline_transactions?: number | null
  baseline_revenue?: number | null
}

export interface CreateCampaignInput {
  title: string
  type?: CampaignType
  description?: string
  outlet?: string
  budget?: number | null
  currency?: string
  start_date?: string
  end_date?: string
  pic?: string
}

export interface UpdateCampaignInput {
  title?: string
  type?: CampaignType
  description?: string
  outlet?: string
  budget?: number | null
  currency?: string
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
  category: string           // name; categoryId wins when given
  categoryId?: string
  priority: Priority
  assignee: string
  assigneeUserId?: string | null   // picker choice; wins over `assignee` (Todo-Pilot §17)
  dueDate: string            // '' = none (optional in quick report, Todo-Pilot §20)
  generateTask: boolean
  generateApproval: boolean
  approvalAmount?: number    // IDR integer; no formatted strings
  // Maintenance-specific: auto-generate a corrective Work Order
  generateWorkOrder: boolean
  assetId?: string
  estimatedCost?: number
  // Client-only: sent as the Idempotency-Key header, one per dialog opening,
  // so a double submit / retry never creates a second Issue (Todo-Pilot §3).
  idempotencyKey?: string
}

// ---------------------------------------------------------------------------
// QA audit checklist (Todo-Pilot §7) — mirrors backend/app/schemas/qa_audit.py
// ---------------------------------------------------------------------------

export type QAAuditResult = 'pass' | 'fail' | 'na'

export interface QAAuditTemplateItem {
  id: string
  title: string
  category: string
  weight: number            // 1–10
  requiresPhoto: boolean
  isCritical: boolean
  orderIndex: number
}

export interface QAAuditTemplate {
  id: string
  name: string
  description: string
  isActive: boolean
  items: QAAuditTemplateItem[]
}

export interface QAAuditTemplateItemInput {
  id?: string
  title: string
  category: string
  weight: number
  requiresPhoto: boolean
  isCritical: boolean
}

export interface QAAuditPhoto {
  id: string
  fileUrl: string
  thumbnailUrl: string
  createdAt: string
}

export interface QAAuditFinding {
  id: string
  templateItemId: string | null
  title: string
  category: string
  weight: number
  requiresPhoto: boolean
  isCritical: boolean
  result: QAAuditResult | null
  notes: string
  isRepeat: boolean
  issueId: string | null
  photos: QAAuditPhoto[]
}

export interface QAAuditSummary {
  id: string
  number: string            // AUD-2026-00001
  templateId: string
  templateName: string
  outlet: string
  auditor: string
  auditDate: string
  status: 'in_progress' | 'submitted'
  score: number | null
  progress: { answered: number; total: number }
  failedCount: number
  repeatCount: number
  submittedAt: string | null
}

export interface QAAuditDetail extends QAAuditSummary {
  findings: QAAuditFinding[]
}

export interface QAOutletScore {
  outlet: string
  latestScore: number | null
  latestDate: string | null
  audits: number
  repeatFindings: number
}

export interface QAScores {
  outlets: QAOutletScore[]
  trend: Record<string, { month: string; score: number; audits: number }[]>
}

// ---------------------------------------------------------------------------
// Guest Service (Todo-Pilot §8) — mirrors backend/app/schemas/guest_case.py
// ---------------------------------------------------------------------------

export type GuestChannel = 'walk-in' | 'phone' | 'google-review' | 'instagram' | 'whatsapp' | 'other'
export type CompensationType = 'none' | 'discount' | 'free-item' | 'voucher' | 'refund' | 'other'

export interface GuestCase {
  id: string
  issueId: string
  issueNumber: string
  title: string
  status: IssueStatus          // the Issue's status
  priority: Priority
  outlet: string
  guestName: string
  guestContact: string
  channel: GuestChannel
  reportedAt: string
  firstResponseAt: string | null
  firstResponseBy: string
  firstResponseNote: string
  resolvedAt: string | null
  firstResponseMinutes: number | null
  resolutionMinutes: number | null
  compensationType: CompensationType
  compensationValue: number    // integer IDR
  currency: string
  compensationNote: string
}

export interface GuestKpis {
  cases: number
  open: number
  responded: number
  resolved: number
  avgFirstResponseMinutes: number | null
  medianFirstResponseMinutes: number | null
  avgResolutionMinutes: number | null
  medianResolutionMinutes: number | null
  targetMinutes: number
  withinTargetPct: number | null
  byChannel: Partial<Record<GuestChannel, number>>
  compensationTotal: Record<string, number>
  perOutlet: { outlet: string; cases: number; open: number; avgFirstResponseMinutes: number | null; avgResolutionMinutes: number | null }[]
}

// ---------------------------------------------------------------------------
// Training enrollment & attendance (Todo-Pilot §9) — snake_case like the
// training API (backend/app/routers/training_programs.py)
// ---------------------------------------------------------------------------

export type EnrollmentStatus = 'registered' | 'attended' | 'no-show'

export interface TrainingEnrollment {
  id: string
  program_id: string
  user_id: string
  user_name: string
  role_name: string          // snapshot at enrollment
  outlet: string             // snapshot at enrollment
  status: EnrollmentStatus
  score: number | null       // 0–100, attended only
  notes: string
  enrolled_at: string
  marked_at: string | null
}

export interface AttendanceBucket {
  enrolled: number
  attended: number
  no_show: number
  pending: number
  attendance_rate: number | null
}

export interface AttendanceRecap {
  totals: AttendanceBucket
  by_outlet: (AttendanceBucket & { key: string })[]
  by_role: (AttendanceBucket & { key: string })[]
}
