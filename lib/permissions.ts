import { useIssueStore } from './store'
import { UserRole } from './types'

const ROLE_RANK: Record<UserRole, number> = { staff: 0, manager: 1, admin: 2 }

function atLeast(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole]
}

// Pages accessible per role — anything not listed here is admin-only by default.
const STAFF_PAGES = new Set([
  'dashboard', 'issues', 'tasks', 'approvals',
  'maintenance', 'qa', 'procurement', 'training',
  'marketing', 'guest-service', 'it-support', 'assets',
  'notifications',
])
const MANAGER_PAGES = new Set([...STAFF_PAGES, 'analytics', 'reports'])
const ADMIN_PAGES   = new Set([...MANAGER_PAGES, 'master-data', 'users', 'settings'])

export function usePermissions() {
  const currentUser = useIssueStore((s) => s.currentUser)
  const role: UserRole = (currentUser?.role as UserRole | undefined) ?? 'staff'

  const can = {
    // Approval decide — manager, admin
    approve: atLeast(role, 'manager'),
    // Issue status change (PATCH /api/issues/{id}) — manager, admin
    updateIssueStatus: atLeast(role, 'manager'),
    // Asset/WO create/edit/delete — manager, admin
    manageAssets: atLeast(role, 'manager'),
    // View analytics & reports — manager, admin
    viewAnalytics: atLeast(role, 'manager'),
    // Master data CRUD, user management, settings — admin only
    manageMasterData: atLeast(role, 'admin'),
    manageUsers: atLeast(role, 'admin'),
    viewSettings: atLeast(role, 'admin'),
  } as const

  function canViewPage(page: string): boolean {
    if (role === 'admin') return ADMIN_PAGES.has(page)
    if (role === 'manager') return MANAGER_PAGES.has(page)
    return STAFF_PAGES.has(page)
  }

  return { role, can, canViewPage }
}
