'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { ListSkeleton } from '@/components/shared/skeleton'
import { usePermissions } from '@/lib/permissions'
import { useT } from '@/lib/i18n'
import { SegmentedTabs } from '@/components/shared/segmented-tabs'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar, FilterOptions, FilterSelect } from '@/components/shared/filter-menu'
import { InviteModal } from '@/components/users/invite-modal'
import { RolesTab } from '@/components/users/roles-tab'
import { UserCard } from '@/components/users/user-card'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function UsersPage() {
  useEnsureLoaded('users', 'vendors')
  const { t } = useT()
  const { allUsers, usersLoading, currentUser, roles, loadRoles } = useIssueStore()
  const { can } = usePermissions()
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [showInvite, setShowInvite] = useState(false)
  const [filterRole, setFilterRole] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => { loadRoles() }, [loadRoles])

  const visibleUsers = allUsers.filter(u => showInactive ? true : u.is_active)
  const filtered = filterRole ? visibleUsers.filter(u => u.role === filterRole) : visibleUsers

  const stats = {
    total:  allUsers.length,
    active: allUsers.filter(u => u.is_active).length,
    admins: allUsers.filter(u => u.role === 'admin').length,
    roles:  roles.length,
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      <PageHeader
        title={t('users.title')}
        description={t('users.subtitle')}
        actions={<>
          {can.manageUsers && tab === 'users' && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="size-4" /> {t('users.invite')}
          </button>
        )}
      </>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('users.totalUsers'), value: stats.total,  color: 'text-foreground' },
          { label: t('users.active'),     value: stats.active, color: 'text-success' },
          { label: t('users.admins'),     value: stats.admins, color: 'text-red-600' },
          { label: t('users.roles'),      value: stats.roles,  color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border border-border bg-card">
            <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <SegmentedTabs label={t('nav.users')} value={tab} onChange={setTab} tabs={[
        { id: 'users', label: t('users.tabUsers') },
        { id: 'roles', label: t('users.tabRoles') },
      ] as const} />

      {tab === 'roles' ? <RolesTab canManage={can.manageUsers} /> : (
        <>
          <FilterBar>
            <FilterSelect label={t('users.roleFilter')} allLabel={t('common.all')} value={filterRole}
              options={roles.map((r) => ({ value: r.key, label: r.name }))} onChange={setFilterRole} />
            <FilterOptions label={t('common.filterOptions')} items={[
              { label: t('users.showInactive'), checked: showInactive, onChange: setShowInactive },
            ]} />
          </FilterBar>

          {usersLoading && allUsers.length === 0 ? (
            <ListSkeleton rows={4} className="p-0 sm:p-0" />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="size-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">{t('users.noUsers')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filterRole ? t('users.noUsersRole') : t('users.inviteFirst')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUser?.id}
                  canManage={can.manageUsers}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
