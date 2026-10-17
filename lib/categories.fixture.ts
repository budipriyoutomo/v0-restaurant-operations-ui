// Test fixture: the system categories every company has (backend
// app/core/category_defaults.py SYSTEM_CATEGORIES), with their default names.
// For tests that put master data in the store: useIssueStore.setState({ categories: SYSTEM_CATEGORIES }).
import type { ApprovalType, CategoryModule, CategorySystemKey, MasterCategory } from './types'

const rows: [CategorySystemKey, string, CategoryModule, boolean, ApprovalType | null, string][] = [
  ['maintenance',    'Maintenance',    'maintenance',    false, 'maintenance',    'wrench'],
  ['it_support',     'IT Support',     'it_support',     false, null,             'monitor'],
  ['compliance',     'Compliance',     'compliance',     false, null,             'shield-check'],
  ['training',       'Training',       'general',        true,  'training',       'graduation-cap'],
  ['procurement',    'Procurement',    'general',        true,  'procurement',    'shopping-cart'],
  ['marketing',      'Marketing',      'general',        true,  'marketing',      'megaphone'],
  ['asset_purchase', 'Asset Purchase', 'asset_purchase', true,  'asset-purchase', 'package'],
  ['guest_service',  'Guest Service',  'guest_service',  false, null,             'message-square-warning'],
  ['other',          'Other',          'general',        false, null,             'circle-help'],
  ['food_safety',    'Food Safety',    'compliance',     false, null,             'thermometer'],
]

export const SYSTEM_CATEGORIES: MasterCategory[] = rows.map(([key, name, module, approval, approvalType, icon]) => ({
  id: `cat-${key}`, name, description: '', type: module === 'maintenance' ? 'maintenance' : 'operations', module,
  systemKey: key, isSystem: true, isActive: true, defaultGenerateTask: true, defaultGenerateApproval: approval,
  approvalType, icon,
}))
