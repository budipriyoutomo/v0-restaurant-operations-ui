// Issue categories as master data (Todo-Ops-Checklist P1).
//
// A category's name is data an admin may change ("Maintenance" → "Perbaikan");
// what it does is its `module`. Mirrors backend/app/core/category_defaults.py:
// only the maintenance module creates corrective Work Orders, guest_service
// opens a guest case, and the module pages (Maintenance, QA, Guest Service,
// IT Support, Asset Purchase) show every category of their module.
import type { CategoryModule, CategorySystemKey, Issue, MasterCategory } from './types'

export const CATEGORY_MODULES: CategoryModule[] = [
  'maintenance', 'it_support', 'compliance', 'guest_service', 'asset_purchase', 'general',
]

// Canonical order of the system categories in pickers (the pre-P1 order + Food Safety).
const SYSTEM_ORDER: CategorySystemKey[] = [
  'maintenance', 'it_support', 'compliance', 'food_safety', 'training', 'procurement', 'marketing',
  'asset_purchase', 'guest_service', 'other',
]

const rank = (c: MasterCategory) => {
  const i = c.systemKey ? SYSTEM_ORDER.indexOf(c.systemKey) : -1
  return i === -1 ? SYSTEM_ORDER.length : i
}

/** Categories offered when reporting an Issue: active only, system ones first. */
export function activeCategories(categories: MasterCategory[]): MasterCategory[] {
  return categories
    .filter((c) => c.isActive)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

export function categoryBySystemKey(categories: MasterCategory[], key: CategorySystemKey): MasterCategory | undefined {
  return categories.find((c) => c.systemKey === key)
}

export function categoryByName(categories: MasterCategory[], name: string): MasterCategory | undefined {
  const n = name.trim().toLowerCase()
  return categories.find((c) => c.name.toLowerCase() === n)
}

/** Pre-checked "generate Task / Approval" toggles in the Create Issue form. */
export function defaultsFor(category: MasterCategory | undefined): { task: boolean; approval: boolean } {
  if (!category) return { task: true, approval: false }
  return { task: category.defaultGenerateTask, approval: category.defaultGenerateApproval }
}

export function allowsWorkOrder(module: CategoryModule | null | undefined): boolean {
  return module === 'maintenance'
}

/** The module of an Issue: what the API sent, else looked up in master data. */
export function issueModule(
  issue: Pick<Issue, 'category'> & Partial<Pick<Issue, 'categoryId' | 'categoryModule'>>,
  categories: MasterCategory[],
): CategoryModule {
  if (issue.categoryModule) return issue.categoryModule
  const byId = issue.categoryId ? categories.find((c) => c.id === issue.categoryId) : undefined
  return (byId ?? categoryByName(categories, issue.category))?.module ?? 'general'
}
