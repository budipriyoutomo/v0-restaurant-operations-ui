'use client'

import { Suspense, useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { ListSkeleton } from '@/components/shared/skeleton'
import { useIssueStore } from '@/lib/store'
import { api, authToken } from '@/lib/api-client'
import { User } from '@/lib/types'
import { usePermissions } from '@/lib/permissions'
import { pagePath } from '@/lib/routes'
import { homePage } from '@/lib/home'
import { normalizeLocale, useT } from '@/lib/i18n'
import { navigate, useRoute } from '@/lib/use-route'
import { NotFoundView } from '@/components/shared/not-found-view'

import { LoginPage }               from '@/components/pages/login-page'
import { PlatformPage }            from '@/components/pages/platform-page'

// ── Operations ────────────────────────────────────────────────────────────────
import { ExecutiveDashboardPage } from '@/components/pages/executive-dashboard-page'
import { MyWorkPage }              from '@/components/pages/my-work-page'
import { IssuesListPage }          from '@/components/pages/issues-list-page'
import { TaskCenterPage }          from '@/components/pages/task-center-page'
import { ApprovalCenterPage }      from '@/components/pages/approval-center-page'

// ── Operations modules ────────────────────────────────────────────────────────
// Maintenance = outlet queue of maintenance Issues; CMMS = assets, work orders,
// PM and parts; Assets = asset purchase requests; QA = outlet audit checklists
// (Todo-Pilot §7); Guest Service = guest complaints + recovery + KPIs (§8).
// IT Support is a saved view of IssuesListPage (Todo-Pilot §6).
import { MaintenanceModulePage }   from '@/components/pages/maintenance-module-page'
import { CMMSPage }                from '@/components/pages/cmms-page'
import { AssetsPage }              from '@/components/pages/assets-page'
import { ProcurementPage }         from '@/components/pages/procurement-page'
import { TrainingPage }            from '@/components/pages/training-page'
import { MarketingPage }           from '@/components/pages/marketing-page'
import { QAPage }                  from '@/components/pages/qa-page'
import { GuestPage }               from '@/components/pages/guest-page'

// ── Insights & system ─────────────────────────────────────────────────────────
import { AnalyticsDashboardPage }  from '@/components/pages/analytics-page-new'
import { ReportsPage }             from '@/components/pages/reports-page'
import { MasterDataPage }          from '@/components/pages/master-data-page'
import { UsersPage }               from '@/components/pages/users-page'
import { NotificationsPage }       from '@/components/pages/notifications-page'
import { SettingsPage }            from '@/components/pages/settings-page'

// One catch-all route renders the whole app shell; the URL (not component
// state) decides the page and the open record — Todo-Pilot §14 / UX-1.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  )
}

function App() {
  const { page: routePage, notFound } = useRoute()
  const onNavigate = (page: string) => navigate(pagePath(page))
  const [sessionChecked, setSessionChecked] = useState(false)
  const { currentUser, authLoading, loadAll, isLoading, error, lastSyncedAt } = useIssueStore()
  const { canViewPage } = usePermissions()
  const { t } = useT()

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
    // Platform admins have no company: every company endpoint would refuse them.
    if (currentUser && !currentUser.is_platform_admin) loadAll()
    // The account's language wins over this device's last choice (Todo-Pilot §16).
    if (currentUser) {
      api.get<{ language?: string }>('/api/auth/me/preferences')
        .then((p) => { if (p?.language) useIssueStore.getState().setLocale(normalizeLocale(p.language), { persist: false }) })
        .catch(() => {})
    }
  }, [currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // Waiting for session restore check on first load
  if (!sessionChecked || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        {t('common.loading')}
      </div>
    )
  }

  // Not authenticated — show login
  if (!currentUser) {
    return <LoginPage />
  }

  // SaaS operator (Todo-Pilot §11): companies only, no business modules.
  if (currentUser.is_platform_admin) {
    return <PlatformPage />
  }

  // '/' = the role's home page (Todo-Pilot §19): set per role, default My Work.
  const currentPage = routePage === 'home' ? homePage(currentUser) : routePage

  const renderPage = () => {
    if (notFound) return <NotFoundView />
    if (!canViewPage(currentPage)) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
          <p className="text-2xl font-semibold text-foreground">{t('shell.accessDenied')}</p>
          <p className="text-sm text-muted-foreground max-w-xs">{t('shell.accessDeniedText')}</p>
        </div>
      )
    }

    switch (currentPage) {
      // ── Operations ──────────────────────────────────────────────────────
      case 'my-work':       return <MyWorkPage />
      case 'dashboard':     return <ExecutiveDashboardPage />
      case 'issues':        return <IssuesListPage key="issues" />
      case 'tasks':         return <TaskCenterPage />
      case 'approvals':     return <ApprovalCenterPage />

      // ── Operations modules ──────────────────────────────────────────────
      case 'maintenance':   return <MaintenanceModulePage />
      case 'cmms':          return <CMMSPage />
      case 'assets':        return <AssetsPage />
      case 'procurement':   return <ProcurementPage />
      case 'training':      return <TrainingPage />
      case 'marketing':     return <MarketingPage />
      case 'qa':            return <QAPage />
      case 'guest-service': return <GuestPage />
      // Saved Issue views — keyed so filters/drawer reset when switching views.
      case 'it-support':    return <IssuesListPage key={currentPage} view={currentPage} />

      // ── Insights & system ───────────────────────────────────────────────
      case 'analytics':     return <AnalyticsDashboardPage />
      case 'reports':       return <ReportsPage />
      case 'master-data':   return <MasterDataPage />
      case 'users':         return <UsersPage />
      case 'notifications': return <NotificationsPage />
      case 'settings':      return <SettingsPage />

      default:
        return <ExecutiveDashboardPage />
    }
  }

  // First load: the frame at once, placeholders until the data arrives (Todo-Pilot §22).
  // Later reloads keep the page on screen.
  if (isLoading && !lastSyncedAt && !error) {
    return (
      <AppShell currentPage={currentPage} onNavigate={onNavigate}>
        <ListSkeleton rows={5} />
      </AppShell>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <p className="text-sm text-destructive font-medium">{t('shell.backendDown')}</p>
        <p className="text-xs text-muted-foreground max-w-sm text-center">{error}</p>
        <button
          onClick={() => loadAll()}
          className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <AppShell currentPage={currentPage} onNavigate={onNavigate}>
      {renderPage()}
    </AppShell>
  )
}
