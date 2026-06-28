'use client'

import { useState } from 'react'
import { Users, UserPlus, Shield, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'

const ROLE_CONFIG: Record<string, { label: string; badge: string }> = {
  admin:   { label: 'Admin',   badge: 'bg-red-100 text-red-700' },
  manager: { label: 'Manager', badge: 'bg-purple-100 text-purple-700' },
  staff:   { label: 'Staff',   badge: 'bg-blue-100 text-blue-700' },
}

function getRole(role: string) {
  return ROLE_CONFIG[role] ?? { label: role, badge: 'bg-muted text-muted-foreground' }
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function UsersPage() {
  const { allUsers, usersLoading, inviteUser, currentUser } = useIssueStore()
  const [showInvite, setShowInvite] = useState(false)
  const [filterRole, setFilterRole] = useState<string | null>(null)

  const filtered = filterRole ? allUsers.filter(u => u.role === filterRole) : allUsers

  const stats = {
    total:   allUsers.length,
    active:  allUsers.filter(u => u.is_active).length,
    admins:  allUsers.filter(u => u.role === 'admin').length,
    managers:allUsers.filter(u => u.role === 'manager').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team access and permissions</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="size-4" /> Invite User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',  value: stats.total,    color: 'text-foreground' },
          { label: 'Active',       value: stats.active,   color: 'text-success' },
          { label: 'Admins',       value: stats.admins,   color: 'text-red-600' },
          { label: 'Managers',     value: stats.managers, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Role filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Filter:</span>
        {(['all', 'admin', 'manager', 'staff'] as const).map(r => (
          <button
            key={r}
            onClick={() => setFilterRole(r === 'all' ? null : r)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium transition-colors capitalize',
              (r === 'all' ? !filterRole : filterRole === r)
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {r === 'all' ? 'All' : getRole(r).label}
          </button>
        ))}
      </div>

      {/* User list */}
      {usersLoading && allUsers.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="size-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">No users found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filterRole ? `No ${filterRole}s registered yet.` : 'Invite your first team member.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => {
            const role = getRole(user.role)
            const isCurrentUser = user.id === currentUser?.id
            return (
              <div
                key={user.id}
                className={cn(
                  'p-4 rounded-xl border bg-card shadow-sm',
                  isCurrentUser ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'size-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    user.role === 'admin'   ? 'bg-red-100 text-red-700' :
                    user.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                             'bg-blue-100 text-blue-700'
                  )}>
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{user.name}</p>
                      {isCurrentUser && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">You</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', role.badge)}>
                        {role.label}
                      </span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                        user.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                      )}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <Shield className="size-4 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Invite User Modal */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} />
      )}
    </div>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const { inviteUser } = useIssueStore()
  const [form, setForm] = useState({ name: '', email: '', role: 'staff', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = form.name.trim() && form.email.trim() && form.password.trim().length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    try {
      await inviteUser(form.email.trim(), form.name.trim(), form.role, form.password)
      onClose()
    } catch (err) {
      setError(String(err).replace('Error: API 409 /api/auth/register: ', '').replace('Error: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-background rounded-2xl border border-border shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Invite User</h2>
          <button onClick={onClose} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="Ahmad Razif"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Email</label>
            <input
              type="email"
              placeholder="ahmad@restaurant.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="staff">Staff — day-to-day operations</option>
              <option value="manager">Manager — can approve requests</option>
              <option value="admin">Admin — full system access</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Temporary Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 pr-10 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">User should change this on first login.</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors',
                valid && !loading
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> Inviting…</> : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
