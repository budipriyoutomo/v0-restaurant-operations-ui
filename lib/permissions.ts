import { useIssueStore } from './store'
import { hasPermission } from './access'

// Pages every signed-in user can open regardless of role.
const ALWAYS_VISIBLE = new Set(['notifications'])

/**
 * Outlets the current user may act on.
 *
 * Resolved by the backend from the role (all outlets, or the role's default
 * outlets) and the user's personal override. Used to populate outlet pickers so
 * the UI never offers an action the backend will reject with 403.
 *
 * This is a convenience layer, not the security boundary — the backend scopes
 * reads and guards writes regardless of what the UI shows.
 */
export function useMyOutlets() {
  const currentUser = useIssueStore((s) => s.currentUser)
  const outlets = useIssueStore((s) => s.outlets)

  if (!currentUser) return []
  if (currentUser.all_outlets) return outlets

  const mine = new Set(currentUser.effective_outlet_ids ?? [])
  return outlets.filter((o) => mine.has(o.id))
}

/**
 * Module permissions of the current user's role (none / view / manage per
 * module — see backend/app/permissions.py). Page ids are module keys.
 */
export function usePermissions() {
  const currentUser = useIssueStore((s) => s.currentUser)
  const role = currentUser?.role ?? ''
  const manage = (m: string) => hasPermission(currentUser, m, 'manage')
  const view = (m: string) => hasPermission(currentUser, m, 'view')

  const can = {
    // Approval decide / delegate
    approve: manage('approvals'),
    // Issue status change (PATCH /api/issues/{id})
    updateIssueStatus: manage('issues'),
    // Guest Service: record compensation (Todo-Pilot §8)
    manageGuest: manage('guest-service'),
    // QA audits: run audits, edit checklist templates (Todo-Pilot §7)
    manageQA: manage('qa'),
    // Asset create/edit/delete
    manageAssets: manage('assets'),
    // Work orders, PM schedules, spare parts
    manageCMMS: manage('cmms'),
    managePM: manage('cmms'),
    // Campaign create/edit/delete
    manageCampaigns: manage('marketing'),
    // Training program create/edit/delete
    manageTraining: manage('training'),
    // Vendor create/edit/delete
    manageVendors: manage('vendors'),
    // Purchase requests / orders / goods receipts
    manageProcurement: manage('procurement'),
    // Budget create/edit/delete
    manageBudgets: manage('budgets'),
    // System jobs: PM generator, low-stock scan, stale-approval escalation
    runSystemJobs: manage('settings'),
    runPMGenerator: manage('settings'),
    // View analytics
    viewAnalytics: view('analytics'),
    // Master data CRUD, user & role management, settings
    manageMasterData: manage('master-data'),
    manageUsers: manage('users'),
    viewSettings: view('settings'),
  } as const

  function canViewPage(page: string): boolean {
    return ALWAYS_VISIBLE.has(page) || view(page)
  }

  return { role, can, canViewPage }
}
