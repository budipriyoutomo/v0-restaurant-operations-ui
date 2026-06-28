'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { useIssueStore } from '@/lib/store'

interface AppShellProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

export function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { issues, tasks, approvals, unreadCount } = useIssueStore()

  const badges = {
    issues:        issues.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length,
    tasks:         tasks.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length,
    approvals:     approvals.filter((a) => a.status === 'pending').length,
    notifications: unreadCount,
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        badges={badges}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav currentPage={currentPage} sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
