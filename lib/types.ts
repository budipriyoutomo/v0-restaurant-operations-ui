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
  amount?: string | null
  status: ApprovalStatus
  // Relation back to the originating Issue
  issueId: string
  issueNumber: string
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
// Auth — User session
// =====================================================================

export type UserRole = 'staff' | 'manager' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
}

// =====================================================================
// CMMS — Asset & Work Order
// =====================================================================

export type AssetStatus = 'operational' | 'warning' | 'maintenance' | 'critical'
export type WorkOrderType = 'corrective' | 'preventive'
export type WorkOrderStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled'

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
  createdAt: string
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
}

// Input shape for the Create Issue form. Everything the user fills in,
// plus the two toggles that control auto-generation.
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
  approvalAmount?: string
}
