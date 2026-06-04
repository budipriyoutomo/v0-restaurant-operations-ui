'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, Filter, Check, X, Mail, Phone } from 'lucide-react'
import { outlets, pics } from '@/lib/data'
import { cn } from '@/lib/utils'

interface Outlet {
  id: string
  name: string
  code: string
  status: 'operational' | 'warning' | 'critical'
}

interface Category {
  id: string
  name: string
  description: string
  type: 'operations' | 'maintenance'
}

interface PIC {
  id: string
  name: string
  email: string
  phone: string
  department: string
  categories: string[]
}

const categoryMasterData: Category[] = [
  { id: '1', name: 'Operations', description: 'Operational and scheduling issues', type: 'operations' },
  { id: '2', name: 'Procurement', description: 'Supply chain and inventory management', type: 'operations' },
  { id: '3', name: 'Service Quality', description: 'Customer service and quality issues', type: 'operations' },
  { id: '4', name: 'Training', description: 'Staff training and development', type: 'operations' },
  { id: '5', name: 'Compliance', description: 'Health and safety compliance', type: 'operations' },
  { id: '6', name: 'Marketing', description: 'Marketing and promotional activities', type: 'operations' },
  { id: '7', name: 'Equipment', description: 'Kitchen equipment maintenance', type: 'maintenance' },
  { id: '8', name: 'Plumbing', description: 'Water and plumbing systems', type: 'maintenance' },
  { id: '9', name: 'Electrical', description: 'Electrical systems and lighting', type: 'maintenance' },
  { id: '10', name: 'HVAC', description: 'Heating, ventilation and cooling', type: 'maintenance' },
]

const statusColors = {
  operational: { bg: 'bg-success/20', text: 'text-success', badge: 'Operational' },
  warning: { bg: 'bg-warning/20', text: 'text-warning', badge: 'Warning' },
  critical: { bg: 'bg-destructive/20', text: 'text-destructive', badge: 'Critical' },
}

export function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<'outlets' | 'categories' | 'pics'>('outlets')
  const [searchQuery, setSearchQuery] = useState('')
  const [outletList, setOutletList] = useState<Outlet[]>(outlets)
  const [categoryList, setCategoryList] = useState<Category[]>(categoryMasterData)
  const [picList, setPicList] = useState<PIC[]>(pics)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Filter logic
  const filteredOutlets = outletList.filter(
    (outlet) =>
      outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCategories = categoryList.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPics = picList.filter((pic) =>
    pic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pic.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pic.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteOutlet = (id: string) => {
    if (confirm('Are you sure you want to delete this outlet?')) {
      setOutletList(outletList.filter((o) => o.id !== id))
    }
  }

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategoryList(categoryList.filter((c) => c.id !== id))
    }
  }

  const handleDeletePIC = (id: string) => {
    if (confirm('Are you sure you want to delete this PIC?')) {
      setPicList(picList.filter((p) => p.id !== id))
    }
  }

  const getCategoryNames = (categoryIds: string[]): string => {
    return categoryIds
      .map(id => categoryList.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Data</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage outlets and categories</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="size-4" /> New {activeTab === 'outlets' ? 'Outlet' : activeTab === 'categories' ? 'Category' : 'PIC'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('outlets')
            setSearchQuery('')
            setEditingId(null)
          }}
          className={cn(
            'px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'outlets'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Outlets ({outletList.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('categories')
            setSearchQuery('')
            setEditingId(null)
          }}
          className={cn(
            'px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'categories'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Categories ({categoryList.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('pics')
            setSearchQuery('')
            setEditingId(null)
          }}
          className={cn(
            'px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'pics'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          PIC ({picList.length})
        </button>
      </div>

      {/* Search and Filter */}
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

      {/* Outlets Tab */}
      {activeTab === 'outlets' && (
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
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusColors[outlet.status].bg, statusColors[outlet.status].text)}>
                          {statusColors[outlet.status].badge}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 hover:bg-accent rounded-md transition-colors" title="Edit">
                            <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button 
                            onClick={() => handleDeleteOutlet(outlet.id)}
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {filteredCategories.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No categories found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.map((category) => (
                <div key={category.id} className="p-4 rounded-lg border border-border hover:shadow-sm transition-all hover:border-primary/50">
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
                      <button className="p-1.5 hover:bg-accent rounded-md transition-colors" title="Edit">
                        <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(category.id)}
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

      {/* PIC Tab */}
      {activeTab === 'pics' && (
        <div className="space-y-4">
          {filteredPics.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No PICs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPics.map((pic) => (
                <div key={pic.id} className="p-5 rounded-lg border border-border hover:shadow-sm hover:border-primary/50 transition-all">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground mb-1">{pic.name}</h3>
                      <p className="text-sm text-muted-foreground">{pic.department}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="p-1.5 hover:bg-accent rounded-md transition-colors" title="Edit">
                        <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button 
                        onClick={() => handleDeletePIC(pic.id)}
                        className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
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

                  {/* Categories */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Assigned Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {pic.categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No categories assigned</p>
                      ) : (
                        pic.categories.map((catId) => {
                          const category = categoryList.find(c => c.id === catId)
                          return category ? (
                            <span 
                              key={catId}
                              className={cn(
                                'text-xs font-semibold px-2.5 py-1 rounded-full',
                                category.type === 'operations' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-orange-100 text-orange-700'
                              )}
                            >
                              {category.name}
                            </span>
                          ) : null
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
    </div>
  )
}
