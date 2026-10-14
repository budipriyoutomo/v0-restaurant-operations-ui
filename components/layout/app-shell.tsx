'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { OfflineStatusBar } from '@/components/shared/offline-status-bar'
import { BottomNav } from './bottom-nav'
import { useIssueStore } from '@/lib/store'

interface AppShellProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

export function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigateAndClose = (page: string) => { setMobileNavOpen(false); onNavigate(page) }
  const { counts, unreadCount } = useIssueStore()

  // Counted by the server (Todo-Pilot §22). Issues = work still going on —
  // finished work awaiting close is not counted (Todo-Pilot §18).
  const badges = {
    issues:        counts?.issuesInProgress ?? 0,
    tasks:         counts?.tasksActive ?? 0,
    approvals:     counts?.approvalsPending ?? 0,
    notifications: unreadCount,
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        onNavigate={navigateAndClose}
        badges={badges}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav currentPage={currentPage} sidebarCollapsed={sidebarCollapsed} onNavigate={onNavigate} onOpenMenu={() => setMobileNavOpen(true)} />
        <OfflineStatusBar />
        {/* pb-16: room for the phone's bottom navigation (Todo-Pilot §19) */}
        <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0">
          {children}
        </main>
        <BottomNav currentPage={currentPage} />
      </div>
    </div>
  )
}
