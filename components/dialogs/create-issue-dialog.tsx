'use client'

import { useEffect, useState } from 'react'
import { X, CheckSquare, CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_DEFAULTS, CreateIssueInput, IssueCategory, Priority } from '@/lib/types'

interface CreateIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Outlet names from store.outlets — falls back to hardcoded list if empty */
  outlets?: string[]
  /** Assignee names from store.pics — falls back to hardcoded list if empty */
  assignees?: string[]
  /** Pre-select a category and lock the selector */
  defaultCategory?: IssueCategory
  onSubmit: (input: CreateIssueInput) => Promise<void> | void
}

const CATEGORIES: IssueCategory[] = [
  'Maintenance', 'IT Support', 'Compliance', 'Training', 'Procurement', 'Marketing', 'Asset Purchase', 'Guest Service', 'Other',
]
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

const FALLBACK_OUTLETS = ['KL Central', 'Subang', 'KLCC', 'Bangsar', 'Damansara', 'All Outlets']
const FALLBACK_ASSIGNEES = ['Unassigned', 'Ahmad Razif', 'Lee Chong Wei', 'Mohd Faris', 'Raj Kumar', 'Sarah Johnson', 'Priya Sharma']

export function CreateIssueDialog({ open, onOpenChange, outlets, assignees, defaultCategory, onSubmit }: CreateIssueDialogProps) {
  const outletOptions  = outlets  && outlets.length  > 0 ? outlets  : FALLBACK_OUTLETS
  const assigneeOptions = assignees && assignees.length > 0 ? assignees : FALLBACK_ASSIGNEES

  const [form, setForm] = useState({
    title: '',
    description: '',
    outlet: outletOptions[0],
    category: (defaultCategory ?? 'Maintenance') as IssueCategory,
    priority: 'medium' as Priority,
    assignee: 'Unassigned',
    dueDate: '',
    approvalAmount: '',
  })
  const [generateTask, setGenerateTask] = useState(true)
  const [generateApproval, setGenerateApproval] = useState(false)
  const [touchedToggles, setTouchedToggles] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens, using current outlet/assignee options
  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        outlet: outletOptions[0],
        category: defaultCategory ?? 'Maintenance',
        priority: 'medium',
        assignee: 'Unassigned',
        dueDate: '',
        approvalAmount: '',
      })
      setTouchedToggles(false)
      setIsSubmitting(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Smart default: whenever category changes (and user hasn't manually
  // overridden the toggles yet), pre-fill Task/Approval suggestions.
  useEffect(() => {
    if (!touchedToggles) {
      const defaults = CATEGORY_DEFAULTS[form.category]
      setGenerateTask(defaults.task)
      setGenerateApproval(defaults.approval)
    }
  }, [form.category, touchedToggles])

  const isComplete = form.title.trim() && form.description.trim() && form.dueDate && form.outlet

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        title: form.title,
        description: form.description,
        outlet: form.outlet,
        category: form.category,
        priority: form.priority,
        assignee: form.assignee,
        dueDate: form.dueDate,
        generateTask,
        generateApproval,
        approvalAmount: generateApproval ? form.approvalAmount : undefined,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 className="text-lg font-bold">New Issue</h2>
          <button
            onClick={() => !isSubmitting && onOpenChange(false)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Title <span className="text-destructive">*</span></label>
            <input
              type="text" name="title" placeholder="Brief description of the issue"
              value={form.title} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Description <span className="text-destructive">*</span></label>
            <textarea
              name="description" placeholder="Detailed explanation of the issue"
              value={form.description} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Outlet */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Outlet
              {outlets && outlets.length === 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(add outlets in Master Data)</span>
              )}
            </label>
            {outletOptions.length === 0 ? (
              <input
                type="text" name="outlet" placeholder="Enter outlet name"
                value={form.outlet} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <select name="outlet" value={form.outlet} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {outletOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Category</label>
            {defaultCategory ? (
              <div className="w-full px-3 py-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                {defaultCategory}
              </div>
            ) : (
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Priority</label>
            <select name="priority" value={form.priority} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Assign To
              {assignees && assignees.length === 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(add PICs in Master Data)</span>
              )}
            </label>
            <select name="assignee" value={form.assignee} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Due Date <span className="text-destructive">*</span></label>
            <input
              type="date" name="dueDate" value={form.dueDate} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Auto-generation section */}
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center gap-1.5 pt-3">
              <Sparkles className="size-3.5 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Auto-generate to other modules
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={generateTask}
                onChange={(e) => { setTouchedToggles(true); setGenerateTask(e.target.checked) }}
                className="mt-0.5 size-4 accent-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <CheckSquare className="size-3.5" /> Create Task in Task Center
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Adds a tracked task assigned to the same person, linked back to this issue.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={generateApproval}
                onChange={(e) => { setTouchedToggles(true); setGenerateApproval(e.target.checked) }}
                className="mt-0.5 size-4 accent-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <CheckCircle2 className="size-3.5" /> Send to Approval Center
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Routes this issue for management sign-off (budget, vendor, or resource approval).</p>
              </div>
            </label>

            {generateApproval && (
              <div>
                <label className="block text-sm font-semibold mb-1.5">Estimated Amount (optional)</label>
                <input
                  type="text" name="approvalAmount" placeholder="e.g. RM 12,000"
                  value={form.approvalAmount} onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => !isSubmitting && onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isComplete || isSubmitting}
              className={cn(
                'flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors',
                isComplete && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
