'use client'

import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const performanceRadar = [
  { metric: 'PM Compliance', KLC: 95, BSR: 88, KCC: 72, DMS: 91, SBJ: 65 },
  { metric: 'Ticket Resolution', KLC: 90, BSR: 84, KCC: 70, DMS: 88, SBJ: 60 },
  { metric: 'Guest Satisfaction', KLC: 88, BSR: 82, KCC: 76, DMS: 85, SBJ: 68 },
  { metric: 'SLA Compliance', KLC: 98, BSR: 92, KCC: 78, DMS: 95, SBJ: 65 },
  { metric: 'QA Score', KLC: 91, BSR: 87, KCC: 73, DMS: 89, SBJ: 68 },
]

const monthlyTickets = [
  { month: 'Nov', critical: 4, high: 8, medium: 12, low: 6 },
  { month: 'Dec', critical: 3, high: 10, medium: 14, low: 8 },
  { month: 'Jan', critical: 6, high: 9, medium: 11, low: 5 },
  { month: 'Feb', critical: 5, high: 7, medium: 13, low: 7 },
  { month: 'Mar', critical: 4, high: 11, medium: 10, low: 9 },
  { month: 'Apr', critical: 3, high: 8, medium: 15, low: 6 },
  { month: 'May', critical: 5, high: 9, medium: 12, low: 4 },
]

const resolutionTime = [
  { category: 'Electrical', avgHours: 6.2 },
  { category: 'Plumbing', avgHours: 4.8 },
  { category: 'HVAC', avgHours: 8.4 },
  { category: 'Equipment', avgHours: 5.6 },
  { category: 'IT / POS', avgHours: 2.1 },
  { category: 'Others', avgHours: 3.5 },
]

const slaComplianceTrend = [
  { week: 'W1', compliance: 91 },
  { week: 'W2', compliance: 88 },
  { week: 'W3', compliance: 82 },
  { week: 'W4', compliance: 87 },
  { week: 'W5', compliance: 85 },
  { week: 'W6', compliance: 91 },
  { week: 'W7', compliance: 89 },
  { week: 'W8', compliance: 87 },
]

export function AnalyticsPage() {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Analytics Overview</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Cross-outlet performance intelligence — last 90 days</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ticket volume by priority */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Ticket Volume by Priority</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly breakdown — Nov 2023 to May 2024</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyTickets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
              <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
              <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
              <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium" />
              <Bar dataKey="low" stackId="a" fill="#6b7280" name="Low" radius={[3, 3, 0, 0]} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA compliance trend */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">SLA Compliance Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Weekly compliance % — all outlets combined</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={slaComplianceTrend}>
              <defs>
                <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} formatter={(v: number) => [`${v}%`, 'SLA Compliance']} />
              <Area type="monotone" dataKey="compliance" stroke="#3b82f6" strokeWidth={2} fill="url(#slaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution time by category */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Avg Resolution Time by Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Hours to resolve — May 2024</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={resolutionTime} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} unit="h" />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} formatter={(v: number) => [`${v}h`, 'Avg Resolution']} />
              <Bar dataKey="avgHours" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Outlet Performance Radar</h3>
          <p className="text-xs text-muted-foreground mb-2">Multi-dimensional comparison</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={performanceRadar} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} />
              <Radar name="KL Central" dataKey="KLC" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={1.5} />
              <Radar name="Subang" dataKey="SBJ" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={1.5} />
              <Radar name="Bangsar" dataKey="BSR" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={1.5} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Outlet KPI Summary Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Outlet', 'Open Tickets', 'SLA %', 'QA Score', 'PM Compliance', 'Complaints', 'Health Score'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { outlet: 'KL Central', tickets: 3, sla: '98%', qa: 91, pm: '95%', complaints: 4, health: 94 },
                { outlet: 'Bangsar', tickets: 7, sla: '92%', qa: 87, pm: '88%', complaints: 6, health: 88 },
                { outlet: 'KLCC', tickets: 12, sla: '78%', qa: 73, pm: '75%', complaints: 11, health: 76 },
                { outlet: 'Damansara', tickets: 5, sla: '95%', qa: 89, pm: '91%', complaints: 3, health: 91 },
                { outlet: 'Subang', tickets: 18, sla: '65%', qa: 68, pm: '62%', complaints: 15, health: 62 },
              ].map((row) => (
                <tr key={row.outlet} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-medium">{row.outlet}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-semibold ${row.tickets > 10 ? 'text-destructive' : row.tickets > 5 ? 'text-warning' : 'text-success'}`}>{row.tickets}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-semibold ${parseInt(row.sla) < 80 ? 'text-destructive' : parseInt(row.sla) < 90 ? 'text-warning' : 'text-success'}`}>{row.sla}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-semibold ${row.qa < 75 ? 'text-destructive' : row.qa < 85 ? 'text-warning' : 'text-success'}`}>{row.qa}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-semibold ${parseInt(row.pm) < 75 ? 'text-destructive' : parseInt(row.pm) < 88 ? 'text-warning' : 'text-success'}`}>{row.pm}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-semibold ${row.complaints > 10 ? 'text-destructive' : row.complaints > 5 ? 'text-warning' : 'text-success'}`}>{row.complaints}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.health >= 85 ? 'bg-success' : row.health >= 70 ? 'bg-warning' : 'bg-destructive'}`}
                          style={{ width: `${row.health}%` }}
                        />
                      </div>
                      <span className={`font-bold w-6 text-right ${row.health >= 85 ? 'text-success' : row.health >= 70 ? 'text-warning' : 'text-destructive'}`}>{row.health}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
