'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { useIssueStore } from '@/lib/store'
import { api, authToken } from '@/lib/api-client'
import { User } from '@/lib/types'

// ── In-scope pages (fully functional) ────────────────────────────────────────
import { ExecutiveDashboardPage } from '@/components/pages/executive-dashboard-page'
import { IssuesListPage }          from '@/components/pages/issues-list-page'
import { TaskCenterPage }          from '@/components/pages/task-center-page'
import { ApprovalCenterPage }      from '@/components/pages/approval-center-page'
import { MasterDataPage }          from '@/components/pages/master-data-page'
import { AnalyticsDashboardPage }  from '@/components/pages/analytics-page-new'
import { ReportsPage }             from '@/components/pages/reports-page'
import { LoginPage }               from '@/components/pages/login-page'

// ── Connected — pending real backend data (Phase 2) ───────────────────────────
import { MaintenanceModulePage }   from '@/components/pages/maintenance-module-page'
import { QAPage }                  from '@/components/pages/qa-page'
import { GuestPage }               from '@/components/pages/guest-page'
import { NotificationsPage }       from '@/components/pages/notifications-page'

// ── Phase 3: System modules ───────────────────────────────────────────────────
import { UsersPage }    from '@/components/pages/users-page'
import { SettingsPage } from '@/components/pages/settings-page'

// ── Phase 4: New full modules ─────────────────────────────────────────────────
import { ProcurementPage } from '@/components/pages/procurement-page'
import { TrainingPage }    from '@/components/pages/training-page'
import { MarketingPage }   from '@/components/pages/marketing-page'
import { ITSupportPage }   from '@/components/pages/it-support-page'
import { AssetsPage }      from '@/components/pages/assets-page'

export default function Page() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sessionChecked, setSessionChecked] = useState(false)
  const { currentUser, authLoading, loadAll, isLoading, error } = useIssueStore()

  // On first mount: try to restore a previous session from localStorage token.
  // If the token is valid, /api/auth/me succeeds and currentUser is populated.
  // If it fails or no token exists, currentUser stays null → LoginPage is shown.
  useEffect(() => {
    const token = authToken.get()
    if (!token) {
      setSessionChecked(true)
      return
    }
    api.get<User>('/api/auth/me')
      .then((user) => {
        useIssueStore.setState({ currentUser: user })
      })
      .catch(() => {
        authToken.clear()
      })
      .finally(() => {
        setSessionChecked(true)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load all data once the user is authenticated.
  useEffect(() => {
    if (currentUser) loadAll()
  }, [currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // Waiting for session restore check on first load
  if (!sessionChecked || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  // Not authenticated — show login
  if (!currentUser) {
    return <LoginPage />
  }

  const renderPage = () => {
    switch (currentPage) {
      // ── Active modules ──────────────────────────────────────────────────
      case 'dashboard':   return <ExecutiveDashboardPage />
      case 'issues':      return <IssuesListPage />
      case 'tasks':       return <TaskCenterPage />
      case 'approvals':   return <ApprovalCenterPage />
      case 'master-data': return <MasterDataPage />
      case 'analytics':   return <AnalyticsDashboardPage />
      case 'reports':     return <ReportsPage />

      // ── Coming Soon modules ─────────────────────────────────────────────
      case 'maintenance':   return <MaintenanceModulePage />
      case 'qa':            return <QAPage />
      case 'guest-service': return <GuestPage />
      case 'notifications': return <NotificationsPage />
      case 'procurement': return <ProcurementPage />
      case 'training':    return <TrainingPage />
      case 'marketing':   return <MarketingPage />
      case 'it-support':  return <ITSupportPage />
      case 'assets':      return <AssetsPage />
      case 'users':    return <UsersPage />
      case 'settings': return <SettingsPage />

      default:
        return <ExecutiveDashboardPage />
    }
  }

  if (isLoading && !error) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <p className="text-sm text-destructive font-medium">Could not connect to backend</p>
        <p className="text-xs text-muted-foreground max-w-sm text-center">{error}</p>
        <button
          onClick={() => loadAll()}
          className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppShell>
  )
}
