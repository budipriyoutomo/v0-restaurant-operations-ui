'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { outlets } from '@/lib/data'
import { cn } from '@/lib/utils'

interface CreateTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: any) => void
}

const categories = ['Equipment', 'Plumbing', 'Electrical', 'HVAC', 'IT / POS', 'Others']
const priorities = ['low', 'medium', 'high', 'critical']
const technicians = ['Ahmad Razif', 'Lee Chong Wei', 'Mohd Faris', 'Raj Kumar', 'Unassigned']

export function CreateTicketDialog({ open, onOpenChange, onSubmit }: CreateTicketDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    outlet: '',
    category: '',
    priority: 'medium',
    assignee: 'Unassigned',
    slaHours: '24',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.title && formData.outlet && formData.category) {
      onSubmit?.(formData)
      setFormData({
        title: '',
        description: '',
        outlet: '',
        category: '',
        priority: 'medium',
        assignee: 'Unassigned',
        slaHours: '24',
      })
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
          <h2 className="text-sm font-semibold">Create New Ticket</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief title of the issue"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of the issue"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none h-20"
            />
          </div>

          {/* Outlet */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Outlet <span className="text-destructive">*</span>
            </label>
            <select
              name="outlet"
              value={formData.outlet}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              required
            >
              <option value="">Select an outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.name}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Assign To</label>
            <select
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {technicians.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>

          {/* SLA Hours */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">SLA (hours)</label>
            <select
              name="slaHours"
              value={formData.slaHours}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="1">1 hour (Critical)</option>
              <option value="2">2 hours (Urgent)</option>
              <option value="4">4 hours (High)</option>
              <option value="8">8 hours (Medium)</option>
              <option value="24">24 hours (Low)</option>
              <option value="48">48 hours (Very Low)</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-3 py-2 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title || !formData.outlet || !formData.category}
              className={cn(
                'flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                formData.title && formData.outlet && formData.category
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
