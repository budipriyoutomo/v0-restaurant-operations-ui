'use client'

import { useState } from 'react'
import { Search, Filter, Plus, CheckCircle2, XCircle, Clock, ShoppingCart, Megaphone, BookOpen, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApprovalRequest {
  id: string
  number: string
  title: string
  type: 'procurement' | 'marketing' | 'training' | 'asset-purchase'
  description: string
  requester: string
  outlet: string
  requestedDate: string
  amount?: string
  status: 'pending' | 'approved' | 'rejected'
  linkedIssue: string
}

const mockApprovals: ApprovalRequest[] = [
  {
    id: 'apr-1',
    number: 'APR-2026-00089',
    title: 'Purchase kitchen equipment and utensils',
    type: 'procurement',
    description: 'Replace aging food prep station and order new utensils',
    requester: 'Priya Sharma',
    outlet: 'KL Central',
    requestedDate: '2026-06-01',
    amount: 'RM 45,000',
    status: 'pending',
    linkedIssue: 'ISS-2026-00132'
  },
  {
    id: 'apr-2',
    number: 'APR-2026-00086',
    title: 'Mid-year promotional campaign launch',
    type: 'marketing',
    description: 'Approve marketing campaign for mid-year promotions across all outlets',
    requester: 'Marketing Team',
    outlet: 'All Outlets',
    requestedDate: '2026-05-28',
    status: 'pending',
    linkedIssue: 'ISS-2026-00128'
  },
  {
    id: 'apr-3',
    number: 'APR-2026-00082',
    title: 'Purchase new POS system hardware',
    type: 'asset-purchase',
    description: 'Upgrade POS terminals for better performance and compliance',
    requester: 'IT Department',
    outlet: 'KLCC',
    requestedDate: '2026-05-25',
    amount: 'RM 28,500',
    status: 'pending',
    linkedIssue: 'ISS-2026-00142'
  },
  {
    id: 'apr-4',
    number: 'APR-2026-00078',
    title: 'Staff training program for new menu',
    type: 'training',
    description: 'Training program for staff on 5 new menu items launching next week',
    requester: 'Sarah Johnson',
    outlet: 'Bangsar',
    requestedDate: '2026-06-01',
    status: 'pending',
    linkedIssue: 'ISS-2026-00135'
  },
]

export function ApprovalCenterPage() {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>('pending')

  const filteredApprovals = mockApprovals.filter((approval) => {
    const matchesSearch = approval.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.requester.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !filterType || approval.type === filterType
    const matchesStatus = !filterStatus || approval.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const typeIcons: Record<string, React.ReactNode> = {
    procurement: <ShoppingCart className="size-5" />,
    marketing: <Megaphone className="size-5" />,
    training: <BookOpen className="size-5" />,
    'asset-purchase': <Package className="size-5" />,
  }

  const typeLabels: Record<string, string> = {
    procurement: 'Procurement',
    marketing: 'Marketing',
    training: 'Training',
    'asset-purchase': 'Asset Purchase',
  }

  const stats = [
    { label: 'Pending', count: mockApprovals.filter(a => a.status === 'pending').length, color: 'text-amber-600' },
    { label: 'Approved', count: mockApprovals.filter(a => a.status === 'approved').length, color: 'text-green-600' },
    { label: 'Rejected', count: mockApprovals.filter(a => a.status === 'rejected').length, color: 'text-red-600' },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve requests - Centralized approval inbox</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-4 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by request number, title, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
            <Filter className="size-4" />
            Filter
          </button>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground py-1">Type:</span>
          {['procurement', 'marketing', 'training', 'asset-purchase'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                filterType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {typeIcons[type]}
              {typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals List and Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approvals List */}
        <div className="lg:col-span-2 space-y-2">
          {filteredApprovals.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No approvals found</p>
            </div>
          ) : (
            filteredApprovals.map((approval) => (
              <div
                key={approval.id}
                onClick={() => setSelectedApproval(approval)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                  selectedApproval?.id === approval.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/20 border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-amber-600 mt-1">
                      {typeIcons[approval.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-primary font-bold mb-1">{approval.number}</p>
                      <h3 className="font-semibold text-sm line-clamp-2">{approval.title}</h3>
                    </div>
                  </div>
                  <Clock className="size-5 text-amber-600 flex-shrink-0" />
                </div>

                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded">{typeLabels[approval.type]}</span>
                  <span>{approval.requester}</span>
                  {approval.amount && <span className="font-semibold text-foreground">{approval.amount}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedApproval && (
          <div className="lg:col-span-1 p-5 rounded-lg border border-border bg-muted/30 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="space-y-5">
              {/* Header */}
              <div className="pb-4 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-amber-600">
                    {typeIcons[selectedApproval.type]}
                  </div>
                  <div>
                    <p className="font-mono text-xs text-primary font-bold">{selectedApproval.number}</p>
                    <h2 className="font-bold text-base">{typeLabels[selectedApproval.type]}</h2>
                  </div>
                </div>
                <h3 className="font-semibold text-sm leading-snug">{selectedApproval.title}</h3>
              </div>

              {/* Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Description</p>
                  <p className="text-foreground leading-relaxed">{selectedApproval.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Requester</p>
                  <p className="text-foreground font-semibold">{selectedApproval.requester}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Outlet</p>
                  <p className="text-foreground font-semibold">{selectedApproval.outlet}</p>
                </div>
                {selectedApproval.amount && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Amount</p>
                    <p className="text-foreground font-bold text-lg">{selectedApproval.amount}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Requested Date</p>
                    <p className="text-foreground text-[10px] font-mono">{selectedApproval.requestedDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Linked Issue</p>
                    <p className="text-foreground text-[10px] font-mono text-primary font-semibold">{selectedApproval.linkedIssue}</p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-700 font-medium">Pending your approval</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <button className="w-full px-3 py-2 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-4" /> Approve
                </button>
                <button className="w-full px-3 py-2 rounded-md bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                  <XCircle className="size-4" /> Reject
                </button>
                <button className="w-full px-3 py-2 rounded-md border border-border text-muted-foreground text-xs font-semibold hover:bg-muted/50 transition-colors">
                  Request Revision
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
