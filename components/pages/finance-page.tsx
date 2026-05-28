'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge, PriorityBadge } from '@/components/shared/priority-badge'
import { expenseRequests, financeSummary } from '@/lib/data'
import { cn } from '@/lib/utils'

const budgetBreakdown = [
  { category: 'Maintenance', amount: 22400, budget: 28000, color: '#3b82f6' },
  { category: 'Supplies', amount: 14800, budget: 18000, color: '#10b981' },
  { category: 'Safety', amount: 6200, budget: 8000, color: '#f59e0b' },
  { category: 'IT', amount: 4940, budget: 6000, color: '#8b5cf6' },
  { category: 'Other', amount: 4000, budget: 5000, color: '#6b7280' },
]

const monthlySpend = [
  { month: 'Jan', spend: 10200 },
  { month: 'Feb', spend: 9400 },
  { month: 'Mar', spend: 11800 },
  { month: 'Apr', spend: 10600 },
  { month: 'May', spend: 10340 },
]

const usageRatio = Math.round((financeSummary.spent / financeSummary.totalBudget) * 100)

export function FinancePage() {
  const [selectedExp, setSelectedExp] = useState<typeof expenseRequests[0] | null>(null)

  return (
    <div className="p-5 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Budget" value={`RM ${(financeSummary.totalBudget / 1000).toFixed(0)}k`} subtitle="May 2024 allocation" icon={DollarSign} />
        <StatCard title="Spent" value={`RM ${(financeSummary.spent / 1000).toFixed(1)}k`} subtitle={`${usageRatio}% of budget used`} icon={TrendingUp} variant={usageRatio > 85 ? 'critical' : 'warning'} />
        <StatCard title="Pending Approvals" value={`RM ${(financeSummary.pending / 1000).toFixed(1)}k`} subtitle="5 requests pending" icon={Clock} variant="warning" />
        <StatCard title="Remaining" value={`RM ${(financeSummary.remaining / 1000).toFixed(1)}k`} subtitle="Budget available" icon={CheckCircle2} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expense approval queue */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Petty Cash / Expense Approval Queue</h3>
            <span className="text-[11px] text-warning bg-warning/15 px-2 py-0.5 rounded font-medium">
              {expenseRequests.filter(e => e.status === 'pending').length} pending
            </span>
          </div>
          <div className="space-y-2">
            {expenseRequests.map((exp) => (
              <button
                key={exp.id}
                onClick={() => setSelectedExp(selectedExp?.id === exp.id ? null : exp)}
                className={cn(
                  'w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm',
                  selectedExp?.id === exp.id ? 'border-primary bg-primary/5' :
                  exp.status === 'pending' ? 'border-warning/30 bg-warning/5' : 'border-border bg-muted/20'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground">{exp.id}</span>
                    {exp.priority === 'urgent' && (
                      <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded font-semibold">URGENT</span>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{exp.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{exp.outlet} · {exp.requestor} · {exp.date}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-foreground">RM {exp.amount.toLocaleString()}</span>
                  <StatusBadge status={exp.status as 'pending' | 'approved' | 'rejected'} />
                  {exp.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation() }}
                        className="size-6 rounded flex items-center justify-center bg-success/15 text-success hover:bg-success/25 transition-colors"
                        aria-label="Approve"
                      >
                        <CheckCircle2 className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation() }}
                        className="size-6 rounded flex items-center justify-center bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                        aria-label="Reject"
                      >
                        <XCircle className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Budget utilization */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Budget Utilization</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative size-24">
                <svg viewBox="0 0 100 100" className="rotate-[-90deg] size-full">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-muted)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={usageRatio > 85 ? 'var(--color-destructive)' : 'var(--color-primary)'}
                    strokeWidth="10"
                    strokeDasharray={`${usageRatio * 2.513} 251.3`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{usageRatio}%</span>
                  <span className="text-[10px] text-muted-foreground">used</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {budgetBreakdown.map((b) => (
                <div key={b.category}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{b.category}</span>
                    <span className="font-medium">RM {(b.amount / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(b.amount / b.budget) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly spend */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Monthly Spend</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
                  formatter={(v: number) => [`RM ${v.toLocaleString()}`, 'Spend']}
                />
                <Bar dataKey="spend" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expense detail */}
      {selectedExp && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm ring-1 ring-primary/10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground">{selectedExp.id}</p>
              <h3 className="text-sm font-semibold mt-0.5">{selectedExp.title}</h3>
            </div>
            <button onClick={() => setSelectedExp(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            <div><p className="text-muted-foreground">Outlet</p><p className="font-semibold mt-1">{selectedExp.outlet}</p></div>
            <div><p className="text-muted-foreground">Category</p><p className="font-semibold mt-1">{selectedExp.category}</p></div>
            <div><p className="text-muted-foreground">Requestor</p><p className="font-semibold mt-1">{selectedExp.requestor}</p></div>
            <div><p className="text-muted-foreground">Amount</p><p className="font-bold text-sm mt-1 text-foreground">RM {selectedExp.amount.toLocaleString()}</p></div>
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={selectedExp.status as 'pending' | 'approved' | 'rejected'} /></div></div>
          </div>
          {selectedExp.status === 'pending' && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button className="px-4 py-1.5 rounded-md bg-success text-white text-xs font-medium hover:bg-success/90 transition-colors flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" /> Approve Request
              </button>
              <button className="px-4 py-1.5 rounded-md bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition-colors flex items-center gap-1.5">
                <XCircle className="size-3.5" /> Reject
              </button>
              <button className="px-4 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1.5">
                <ChevronRight className="size-3.5" /> Request More Info
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
