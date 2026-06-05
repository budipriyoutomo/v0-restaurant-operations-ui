'use client'

import { useState } from 'react'
import { Search, Filter, Plus, CheckCircle2, XCircle, Clock, ShoppingCart, Megaphone, BookOpen, Package, X } from 'lucide-react'
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

      {/* Approvals Grid and Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredApprovals.length === 0 ? (
          <div className="lg:col-span-2 p-12 rounded-lg border border-border text-center">
            <p className="text-muted-foreground">No approvals found</p>
          </div>
        ) : (
          filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              onClick={() => setSelectedApproval(approval)}
              className={cn(
                'p-5 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                selectedApproval?.id === approval.id
                  ? 'bg-primary/10 border-primary shadow-md'
                  : 'bg-muted/20 border-border hover:bg-muted/40'
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-amber-600 mt-0.5 flex-shrink-0">
                    {typeIcons[approval.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{approval.number}</p>
                    <h3 className="font-semibold text-sm line-clamp-2">{approval.title}</h3>
                  </div>
                </div>
                <Clock className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mb-2">
                <span className="bg-muted px-2 py-0.5 rounded">{typeLabels[approval.type]}</span>
                <span>{approval.requester}</span>
                {approval.amount && <span className="font-semibold text-foreground">{approval.amount}</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Pending</span>
                <span className="text-muted-foreground">{approval.requestedDate}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approval Detail Side Drawer */}
      {selectedApproval && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedApproval(null)}
          />
          
          {/* Side Drawer */}
          <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 mr-2">
                  <div className="text-amber-600 mt-1 flex-shrink-0">
                    {typeIcons[selectedApproval.type]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{selectedApproval.number}</p>
                    <h2 className="font-bold text-lg leading-snug">{selectedApproval.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Type & Status Section */}
              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Type</span>
                  <span className="text-sm font-semibold text-amber-600">{typeLabels[selectedApproval.type]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold">Pending</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedApproval.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Requester</p>
                  <p className="text-sm font-semibold text-foreground">{selectedApproval.requester}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Outlet</p>
                  <p className="text-sm font-semibold text-foreground">{selectedApproval.outlet}</p>
                </div>
              </div>

              {/* Amount (if applicable) */}
              {selectedApproval.amount && (
                <div className="space-y-2 pb-6 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</p>
                  <p className="text-xl font-bold text-foreground">{selectedApproval.amount}</p>
                </div>
              )}

              {/* Dates Section */}
              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Requested Date</span>
                  <span className="text-sm font-mono">{selectedApproval.requestedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Linked Issue</span>
                  <span className="text-sm font-mono font-bold text-primary">{selectedApproval.linkedIssue}</span>
                </div>
              </div>

              {/* Info Alert */}
              <div className="p-4 rounded-md bg-blue-100/50 border border-blue-200 space-y-1">
                <p className="text-sm font-semibold text-blue-700">Pending Your Approval</p>
                <p className="text-xs text-blue-700">Review the details and take action to approve, reject, or request revisions.</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-6 border-t border-border">
                <button className="w-full px-4 py-2.5 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-4" /> Approve
                </button>
                <button className="w-full px-4 py-2.5 rounded-md bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                  <XCircle className="size-4" /> Reject
                </button>
                <button className="w-full px-4 py-2.5 rounded-md border border-border text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors">
                  Request Revision
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
