'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { ExecutiveDashboardPage } from '@/components/pages/executive-dashboard-page'
import { IssuesListPage } from '@/components/pages/issues-list-page'
import { TaskCenterPage } from '@/components/pages/task-center-page'
import { ApprovalCenterPage } from '@/components/pages/approval-center-page'
import { MaintenanceModulePage } from '@/components/pages/maintenance-module-page'
import { AnalyticsDashboardPage } from '@/components/pages/analytics-page-new'
import { TicketsPage } from '@/components/pages/tickets-page'
import { GuestPage } from '@/components/pages/guest-page'
import { FinancePage } from '@/components/pages/finance-page'
import { QAPage } from '@/components/pages/qa-page'
import { NotificationsPage } from '@/components/pages/notifications-page'
import { MasterDataPage } from '@/components/pages/master-data-page'
import { PlaceholderPage } from '@/components/pages/placeholder-page'
import { Package, Monitor, FileText, Settings, CheckSquare, CheckCircle2, ShoppingCart, BookOpen, Megaphone, Users } from 'lucide-react'

export default function Page() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':     return <ExecutiveDashboardPage />
      case 'issues':        return <IssuesListPage />
      case 'tasks':         return <TaskCenterPage />
      case 'approvals':     return <ApprovalCenterPage />
      case 'maintenance':   return <MaintenanceModulePage />
      case 'qa':            return <QAPage />
      case 'procurement':   return <PlaceholderPage icon={ShoppingCart} title="Procurement" description="Manage purchase requests, vendor management, and procurement workflows." />
      case 'training':      return <PlaceholderPage icon={BookOpen} title="Training" description="Training programs, schedules, certifications, and staff development tracking." />
      case 'marketing':     return <PlaceholderPage icon={Megaphone} title="Marketing" description="Marketing campaigns, promotions, and marketing initiative workflows." />
      case 'guest-service': return <GuestPage />
      case 'it-support':    return <PlaceholderPage icon={Monitor} title="IT Support" description="POS system monitoring, network uptime, device inventory, and IT ticket escalation workflows." />
      case 'assets':        return <PlaceholderPage icon={Package} title="Asset Management" description="Comprehensive asset registry with lifecycle tracking, depreciation schedules, and QR code scanning." />
      case 'notifications': return <NotificationsPage />
      case 'analytics':     return <AnalyticsDashboardPage />
      case 'reports':       return <PlaceholderPage icon={FileText} title="Reports" description="Scheduled PDF/Excel reports, executive summaries, compliance reports, and custom report builder." />
      case 'master-data':   return <MasterDataPage />
      case 'users':         return <PlaceholderPage icon={Users} title="Users & Roles" description="User management, role permissions, access control, and organizational structure." />
      case 'settings':      return <PlaceholderPage icon={Settings} title="Settings" description="System settings, SLA thresholds, notification rules, outlet configuration, and preferences." />
      default:              return <DashboardPage />
    }
  }

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppShell>
  )
}
