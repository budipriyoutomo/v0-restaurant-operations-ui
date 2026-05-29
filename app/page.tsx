'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardPage } from '@/components/pages/dashboard-page'
import { TicketsPage } from '@/components/pages/tickets-page'
import { TicketManagementPage } from '@/components/pages/ticket-management-page'
import { GuestPage } from '@/components/pages/guest-page'
import { FinancePage } from '@/components/pages/finance-page'
import { QAPage } from '@/components/pages/qa-page'
import { NotificationsPage } from '@/components/pages/notifications-page'
import { AnalyticsPage } from '@/components/pages/analytics-page'
import { PlaceholderPage } from '@/components/pages/placeholder-page'
import { Package, Monitor, FileText, Settings } from 'lucide-react'

export default function Page() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':   return <DashboardPage />
      case 'tickets':     return <TicketManagementPage />
      case 'cmms':        return <TicketsPage />
      case 'guest':       return <GuestPage />
      case 'finance':     return <FinancePage />
      case 'qa':          return <QAPage />
      case 'notifications': return <NotificationsPage />
      case 'analytics':   return <AnalyticsPage />
      case 'assets':      return <PlaceholderPage icon={Package} title="Asset Management" description="Comprehensive asset registry with lifecycle tracking, depreciation schedules, and QR code scanning." />
      case 'it':          return <PlaceholderPage icon={Monitor} title="IT Support" description="POS system monitoring, network uptime, device inventory, and IT ticket escalation workflows." />
      case 'reports':     return <PlaceholderPage icon={FileText} title="Reports" description="Scheduled PDF/Excel reports, executive summaries, compliance reports, and custom report builder." />
      case 'settings':    return <PlaceholderPage icon={Settings} title="Settings" description="User management, role permissions, SLA thresholds, notification rules, and outlet configuration." />
      default:            return <DashboardPage />
    }
  }

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppShell>
  )
}
