'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface NewPICDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onSubmit?: (data: {
    name: string
    email: string
    phone: string
    department: string
    categories: string[]
  }) => void
}

const departments = ['Engineering', 'Operations', 'Maintenance', 'Quality', 'Supply Chain', 'Finance']

export function NewPICDialog({ open, onOpenChange, categories, onSubmit }: NewPICDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Engineering',
    categories: [] as string[],
  })

  const isComplete = formData.name.trim() && formData.email.trim() && formData.phone.trim() && formData.categories.length > 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryToggle = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isComplete) {
      onSubmit?.(formData)
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: 'Engineering',
        categories: [],
      })
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 className="text-lg font-bold">Create New PIC</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Full Name <span className="text-destructive">*</span></label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Ahmad Razif"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Email <span className="text-destructive">*</span></label>
            <input
              type="email"
              name="email"
              placeholder="e.g. ahmad@restaurant.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Phone <span className="text-destructive">*</span></label>
            <input
              type="tel"
              name="phone"
              placeholder="e.g. +60 12-3456 7890"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-semibold mb-2">Assign Categories <span className="text-destructive">*</span></label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`cat-${category.id}`}
                    checked={formData.categories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="rounded border border-border"
                  />
                  <label htmlFor={`cat-${category.id}`} className="text-sm cursor-pointer flex-1">
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
            {formData.categories.length === 0 && (
              <p className="text-xs text-destructive mt-2">Please select at least one category</p>
            )}
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
              Create PIC
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
