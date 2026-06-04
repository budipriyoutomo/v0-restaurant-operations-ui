'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewOutletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: { name: string; code: string; status: string }) => void
}

const statuses = ['operational', 'warning', 'critical']

export function NewOutletDialog({ open, onOpenChange, onSubmit }: NewOutletDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'operational',
  })

  const isComplete = formData.name.trim() && formData.code.trim()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isComplete) {
      onSubmit?.(formData)
      setFormData({ name: '', code: '', status: 'operational' })
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 className="text-lg font-bold">Create New Outlet</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Outlet Name */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Outlet Name <span className="text-destructive">*</span></label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Outlet KL Central"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Code <span className="text-destructive">*</span></label>
            <input
              type="text"
              name="code"
              placeholder="e.g. KLC"
              value={formData.code}
              onChange={handleChange}
              maxLength={5}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isComplete}
              className={cn(
                'flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors',
                isComplete
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              Create Outlet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
