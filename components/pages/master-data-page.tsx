'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, Filter, Loader2, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { NewOutletDialog } from '@/components/dialogs/new-outlet-dialog'
import { NewCategoryDialog } from '@/components/dialogs/new-category-dialog'
import { NewPICDialog } from '@/components/dialogs/new-pic-dialog'
import { useIssueStore } from '@/lib/store'
import { MasterCategory, Outlet, OutletStatus, PIC } from '@/lib/types'
import { cn } from '@/lib/utils'

const statusColors: Record<OutletStatus, { bg: string; text: string; badge: string }> = {
  operational: { bg: 'bg-success/20', text: 'text-success', badge: 'Operational' },
  warning:     { bg: 'bg-warning/20',  text: 'text-warning',  badge: 'Warning' },
  critical:    { bg: 'bg-destructive/20', text: 'text-destructive', badge: 'Critical' },
}

export function MasterDataPage() {
  const {
    outlets, categories, pics, masterDataLoading,
    createOutlet, updateOutlet, deleteOutlet,
    createCategory, updateCategory, deleteCategory,
    createPIC, updatePIC, deletePIC,
  } = useIssueStore()

  const [activeTab, setActiveTab] = useState<'outlets' | 'categories' | 'pics'>('outlets')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog state — null = closed, undefined = create mode, object = edit mode
  const [outletDialog, setOutletDialog] = useState<{ open: boolean; data?: Outlet }>({ open: false })
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; data?: MasterCategory }>({ open: false })
  const [picDialog, setPicDialog] = useState<{ open: boolean; data?: PIC }>({ open: false })

  // -------------------------------------------------------------------------
  // Filter
  // -------------------------------------------------------------------------
  const filteredOutlets = outlets.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPics = pics.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // -------------------------------------------------------------------------
  // Handlers — delegate all persistence to store
  // -------------------------------------------------------------------------
  const handleDeleteOutlet = async (id: string, name: string) => {
    const tid = toast.loading(`Deleting outlet "${name}"…`)
    try {
      await deleteOutlet(id)
      toast.success(`Outlet "${name}" deleted.`, { id: tid })
    } catch {
      toast.error('Failed to delete outlet. It may be in use.', { id: tid })
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const tid = toast.loading(`Deleting category "${name}"…`)
    try {
      await deleteCategory(id)
      toast.success(`Category "${name}" deleted.`, { id: tid })
    } catch {
      toast.error('Failed to delete category. It may be in use.', { id: tid })
    }
  }

  const handleDeletePIC = async (id: string, name: string) => {
    const tid = toast.loading(`Deleting PIC "${name}"…`)
    try {
      await deletePIC(id)
      toast.success(`PIC "${name}" deleted.`, { id: tid })
    } catch {
      toast.error('Failed to delete PIC.', { id: tid })
    }
  }

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id

  const getCategoryType = (id: string) =>
    categories.find((c) => c.id === id)?.type

  // -------------------------------------------------------------------------
  // Tab switch helper
  // -------------------------------------------------------------------------
  const switchTab = (tab: 'outlets' | 'categories' | 'pics') => {
    setActiveTab(tab)
    setSearchQuery('')
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Data</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage outlets, categories and PICs</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'outlets') setOutletDialog({ open: true })
            else if (activeTab === 'categories') setCategoryDialog({ open: true })
            else setPicDialog({ open: true })
          }}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          New {activeTab === 'outlets' ? 'Outlet' : activeTab === 'categories' ? 'Category' : 'PIC'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['outlets', 'categories', 'pics'] as const).map((tab) => {
          const count = tab === 'outlets' ? outlets.length : tab === 'categories' ? categories.length : pics.length
          return (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={cn(
                'px-4 py-3 text-sm font-semibold border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'pics' ? 'PIC' : tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
          <Filter className="size-4" />
          Filter
        </button>
      </div>

      {/* Loading state */}
      {masterDataLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Outlets Tab                                                          */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'outlets' && !masterDataLoading && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-sm font-semibold">Outlet Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutlets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No outlets found
                    </td>
                  </tr>
                ) : (
                  filteredOutlets.map((outlet) => (
                    <tr key={outlet.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{outlet.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-muted-foreground">{outlet.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-full',
                          statusColors[outlet.status].bg,
                          statusColors[outlet.status].text
                        )}>
                          {statusColors[outlet.status].badge}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setOutletDialog({ open: true, data: outlet })}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button
                            onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                            className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Categories Tab                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'categories' && !masterDataLoading && (
        <div className="space-y-4">
          {filteredCategories.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No categories found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="p-4 rounded-lg border border-border hover:shadow-sm transition-all hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-foreground">{category.name}</h3>
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          category.type === 'operations' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        )}>
                          {category.type === 'operations' ? 'Operations' : 'Maintenance'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCategoryDialog({ open: true, data: category })}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PIC Tab                                                              */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'pics' && !masterDataLoading && (
        <div className="space-y-4">
          {filteredPics.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No PICs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPics.map((pic) => (
                <div
                  key={pic.id}
                  className="p-5 rounded-lg border border-border hover:shadow-sm hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground mb-1">{pic.name}</h3>
                      <p className="text-sm text-muted-foreground">{pic.department}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPicDialog({ open: true, data: pic })}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeletePIC(pic.id, pic.name)}
                        className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Mail className="size-4 text-muted-foreground" />
                      <a href={`mailto:${pic.email}`} className="text-sm text-primary hover:underline">
                        {pic.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="size-4 text-muted-foreground" />
                      <a href={`tel:${pic.phone}`} className="text-sm text-primary hover:underline">
                        {pic.phone}
                      </a>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Assigned Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {pic.categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No categories assigned</p>
                      ) : (
                        pic.categories.map((catId) => {
                          const type = getCategoryType(catId)
                          return (
                            <span
                              key={catId}
                              className={cn(
                                'text-xs font-semibold px-2.5 py-1 rounded-full',
                                type === 'operations'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              )}
                            >
                              {getCategoryName(catId)}
                            </span>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Dialogs                                                              */}
      {/* ------------------------------------------------------------------ */}
      <NewOutletDialog
        open={outletDialog.open}
        onOpenChange={(open) => setOutletDialog((prev) => ({ ...prev, open }))}
        initialData={outletDialog.data}
        onSubmit={async (data) => {
          if (outletDialog.data) {
            await updateOutlet(outletDialog.data.id, data)
            toast.success(`Outlet "${data.name}" updated.`)
          } else {
            await createOutlet(data)
            toast.success(`Outlet "${data.name}" created.`)
          }
        }}
      />

      <NewCategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog((prev) => ({ ...prev, open }))}
        initialData={categoryDialog.data}
        onSubmit={async (data) => {
          if (categoryDialog.data) {
            await updateCategory(categoryDialog.data.id, data)
            toast.success(`Category "${data.name}" updated.`)
          } else {
            await createCategory(data)
            toast.success(`Category "${data.name}" created.`)
          }
        }}
      />

      <NewPICDialog
        open={picDialog.open}
        onOpenChange={(open) => setPicDialog((prev) => ({ ...prev, open }))}
        categories={categories}
        initialData={picDialog.data}
        onSubmit={async (data) => {
          if (picDialog.data) {
            await updatePIC(picDialog.data.id, data)
            toast.success(`PIC "${data.name}" updated.`)
          } else {
            await createPIC(data)
            toast.success(`PIC "${data.name}" created.`)
          }
        }}
      />
    </div>
  )
}
