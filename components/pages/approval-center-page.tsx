'use client'

import { useState } from 'react'
import { Search, Filter, CheckCircle2, XCircle, Clock, ShoppingCart, Megaphone, BookOpen, Package, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { ApprovalRequest, ApprovalType } from '@/lib/types'

const typeIcons: Record<ApprovalType, React.ReactNode> = {
  procurement: <ShoppingCart className="size-5" />,
  marketing: <Megaphone className="size-5" />,
  training: <BookOpen className="size-5" />,
  'asset-purchase': <Package className="size-5" />,
}

const typeLabels: Record<ApprovalType, string> = {
  procurement: 'Procurement',
  marketing: 'Marketing',
  training: 'Training',
  'asset-purchase': 'Asset Purchase',
}

export function ApprovalCenterPage() {
  const { approvals, decideApproval } = useIssueStore()
  const { can } = usePermissions()
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<ApprovalType | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>('pending')
  const [isDeciding, setIsDeciding] = useState(false)

  const filteredApprovals = approvals.filter((approval) => {
    const matchesSearch = approval.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.requester.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !filterType || approval.type === filterType
    const matchesStatus = !filterStatus || approval.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const stats = [
    { label: 'Pending', count: approvals.filter((a) => a.status === 'pending').length, color: 'text-amber-600' },
    { label: 'Approved', count: approvals.filter((a) => a.status === 'approved').length, color: 'text-green-600' },
    { label: 'Rejected', count: approvals.filter((a) => a.status === 'rejected').length, color: 'text-red-600' },
  ]

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedApproval || isDeciding) return
    setIsDeciding(true)
    try {
      decideApproval(selectedApproval.id, decision)
      toast.success(decision === 'approved' ? 'Request approved.' : 'Request rejected.')
      setSelectedApproval(null)
    } catch {
      toast.error('Failed to process decision. Please try again.')
    } finally {
      setIsDeciding(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
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

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground py-1">Type:</span>
          {(['procurement', 'marketing', 'training', 'asset-purchase'] as ApprovalType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                filterType === type ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {typeIcons[type]}
              {typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Grid */}
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
                selectedApproval?.id === approval.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-muted/20 border-border hover:bg-muted/40'
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-amber-600 mt-0.5 flex-shrink-0">{typeIcons[approval.type]}</div>
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
                <span className={cn(
                  'px-2 py-0.5 rounded font-medium capitalize',
                  approval.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  approval.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                )}>
                  {approval.status}
                </span>
                <span className="text-muted-foreground">{approval.requestedDate}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approval Detail Side Drawer */}
      {selectedApproval && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedApproval(null)} />
          <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 mr-2">
                  <div className="text-amber-600 mt-1 flex-shrink-0">{typeIcons[selectedApproval.type]}</div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{selectedApproval.number}</p>
                    <h2 className="font-bold text-lg leading-snug">{selectedApproval.title}</h2>
                  </div>
                </div>
                <button onClick={() => setSelectedApproval(null)} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Type</span>
                  <span className="text-sm font-semibold text-amber-600">{typeLabels[selectedApproval.type]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-semibold capitalize',
                    selectedApproval.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    selectedApproval.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {selectedApproval.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedApproval.description}</p>
              </div>

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

              {selectedApproval.amount && (
                <div className="space-y-2 pb-6 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</p>
                  <p className="text-xl font-bold text-foreground">{selectedApproval.amount}</p>
                </div>
              )}

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Requested Date</span>
                  <span className="text-sm font-mono">{selectedApproval.requestedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Linked Issue</span>
                  <span className="text-sm font-mono font-bold text-primary">{selectedApproval.issueNumber}</span>
                </div>
              </div>

              {selectedApproval.status === 'pending' ? (
                <>
                  <div className="p-4 rounded-md bg-blue-100/50 border border-blue-200 space-y-1">
                    <p className="text-sm font-semibold text-blue-700">Pending Approval</p>
                    <p className="text-xs text-blue-700">
                      {can.approve
                        ? 'Review the details and take action to approve or reject. The linked Issue will be updated automatically.'
                        : 'Awaiting approval from a manager or admin.'}
                    </p>
                  </div>

                  {can.approve && (
                    <div className="flex flex-col gap-2 pt-6 border-t border-border">
                      <button
                        onClick={() => handleDecision('approved')}
                        disabled={isDeciding}
                        className="w-full px-4 py-2.5 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isDeciding ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecision('rejected')}
                        disabled={isDeciding}
                        className="w-full px-4 py-2.5 rounded-md bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isDeciding ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                        Reject
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={cn(
                  'p-4 rounded-md border space-y-1',
                  selectedApproval.status === 'approved' ? 'bg-green-100/50 border-green-200' : 'bg-red-100/50 border-red-200'
                )}>
                  <p className={cn('text-sm font-semibold', selectedApproval.status === 'approved' ? 'text-green-700' : 'text-red-700')}>
                    This request has been {selectedApproval.status}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
