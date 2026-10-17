'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, Loader2, Mail, Phone, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { NewOutletDialog } from '@/components/dialogs/new-outlet-dialog'
import { NewCategoryDialog } from '@/components/dialogs/new-category-dialog'
import { CategoryIcon } from '@/components/shared/category-icon'
import { activeCategories } from '@/lib/categories'
import { apiErrorMessage } from '@/lib/api-client'
import { NewPICDialog } from '@/components/dialogs/new-pic-dialog'
import { ApprovalPolicyPanel } from '@/components/master-data/approval-policy-panel'
import { AssignmentRulesPanel } from '@/components/master-data/assignment-rules-panel'
import { useIssueStore } from '@/lib/store'
import { MasterCategory, Outlet, OutletStatus, PIC } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'

const statusColors: Record<OutletStatus, { bg: string; text: string }> = {
  operational: { bg: 'bg-success/20', text: 'text-success' },
  warning:     { bg: 'bg-warning/20',  text: 'text-warning' },
  critical:    { bg: 'bg-destructive/20', text: 'text-destructive' },
}

export function MasterDataPage() {
  const { t, label } = useT()
  const {
    outlets, categories, pics, masterDataLoading, approvalPolicies, assignmentRules,
    createOutlet, updateOutlet, deleteOutlet,
    createCategory, updateCategory, deleteCategory,
    createPIC, updatePIC, deletePIC,
  } = useIssueStore()

  const [activeTab, setActiveTab] = useState<'outlets' | 'categories' | 'pics' | 'rules' | 'policies'>('outlets')
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

  // System categories first (canonical order), then the rest; inactive ones last.
  const sortedCategories = [...activeCategories(categories), ...categories.filter((c) => !c.isActive)]
  const filteredCategories = sortedCategories.filter((c) =>
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
    const tid = toast.loading(t('masterData.deleting', { kind: t('masterData.kind.outlet'), name }))
    try {
      await deleteOutlet(id)
      toast.success(t('masterData.deleted', { kind: t('masterData.kind.outlet'), name }), { id: tid })
    } catch {
      toast.error(t('masterData.deleteFailedInUse', { kind: t('masterData.kind.outlet') }), { id: tid })
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const tid = toast.loading(t('masterData.deleting', { kind: t('masterData.kind.category'), name }))
    try {
      await deleteCategory(id)
      toast.success(t('masterData.deleted', { kind: t('masterData.kind.category'), name }), { id: tid })
    } catch (err) {
      toast.error(apiErrorMessage(err, t('masterData.deleteFailedInUse', { kind: t('masterData.kind.category') })), { id: tid })
    }
  }

  const handleDeletePIC = async (id: string, name: string) => {
    const tid = toast.loading(t('masterData.deleting', { kind: t('masterData.kind.pic'), name }))
    try {
      await deletePIC(id)
      toast.success(t('masterData.deleted', { kind: t('masterData.kind.pic'), name }), { id: tid })
    } catch {
      toast.error(t('masterData.deleteFailed', { kind: t('masterData.kind.pic') }), { id: tid })
    }
  }

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id

  const getCategoryModule = (id: string) =>
    categories.find((c) => c.id === id)?.module

  // -------------------------------------------------------------------------
  // Tab switch helper
  // -------------------------------------------------------------------------
  const switchTab = (tab: 'outlets' | 'categories' | 'pics' | 'rules' | 'policies') => {
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
          <h1 className="text-3xl font-bold">{t('masterData.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('masterData.subtitle')}</p>
        </div>
        {activeTab !== 'policies' && activeTab !== 'rules' && (
          <button
            onClick={() => {
              if (activeTab === 'outlets') setOutletDialog({ open: true })
              else if (activeTab === 'categories') setCategoryDialog({ open: true })
              else setPicDialog({ open: true })
            }}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            {t(`masterData.new.${activeTab}`)}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['outlets', 'categories', 'pics', 'rules', 'policies'] as const).map((tab) => {
          const count = tab === 'outlets' ? outlets.length
            : tab === 'categories' ? categories.length
            : tab === 'pics' ? pics.length
            : tab === 'rules' ? assignmentRules.length
            : approvalPolicies.length
          const label = t(`masterData.tab.${tab}`)
          return (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={cn(
                'px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      {activeTab !== 'policies' && activeTab !== 'rules' && (
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t(`masterData.search.${activeTab as 'outlets' | 'categories' | 'pics'}`)}
            aria-label={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      )}

      {/* Loading state */}
      {masterDataLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="size-4 animate-spin" />
          {t('common.loading')}
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
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('masterData.outletName')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('masterData.code')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('common.status')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('masterData.threshold')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutlets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      {t('masterData.noOutlets')}
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
                          {label('outletStatus', outlet.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {outlet.approvalThreshold == null ? (
                          <span className="text-muted-foreground">
                            {formatMoney(outlet.approvalThresholdDefault)} {t('masterData.default')}
                          </span>
                        ) : (
                          <span>{formatMoney(outlet.approvalThreshold)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setOutletDialog({ open: true, data: outlet })}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors"
                            title={t('common.edit')} aria-label={t('common.edit')}
                          >
                            <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button
                            onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                            className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors"
                            title={t('common.delete')} aria-label={t('common.delete')}
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
              <p className="text-muted-foreground">{t('masterData.noCategories')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    'p-4 rounded-lg border border-border hover:shadow-sm transition-all hover:border-primary/50',
                    !category.isActive && 'opacity-60',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="flex items-center justify-center size-9 rounded-md bg-muted text-foreground shrink-0">
                        <CategoryIcon name={category.icon} className="size-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-foreground">{category.name}</h3>
                          <span className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            category.module === 'maintenance' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-700'
                          )}>
                            {label('categoryModule', category.module)}
                          </span>
                          {category.isSystem && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              <Lock className="size-2.5" aria-hidden /> {t('masterData.systemBadge')}
                            </span>
                          )}
                          {!category.isActive && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {t('masterData.inactiveBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {[
                            category.defaultGenerateTask && t('categoryDialog.defaultTask'),
                            category.defaultGenerateApproval && `${t('categoryDialog.defaultApproval')}${category.approvalType ? ` · ${label('approvalType', category.approvalType)}` : ''}`,
                          ].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCategoryDialog({ open: true, data: category })}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                        title={t('common.edit')} aria-label={t('common.edit')}
                      >
                        <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      {!category.isSystem && (
                        <button
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors"
                          title={t('common.delete')} aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        </button>
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
      {/* PIC Tab                                                              */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'pics' && !masterDataLoading && (
        <div className="space-y-4">
          {filteredPics.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">{t('masterData.noPics')}</p>
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
                      {pic.userName && (
                        <p className="text-xs text-primary mt-0.5">{t('masterData.linkedUser', { name: pic.userName })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPicDialog({ open: true, data: pic })}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                        title={t('common.edit')} aria-label={t('common.edit')}
                      >
                        <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeletePIC(pic.id, pic.name)}
                        className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors"
                        title={t('common.delete')} aria-label={t('common.delete')}
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
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t('masterData.assignedCategories')}</p>
                    <div className="flex flex-wrap gap-2">
                      {pic.categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">{t('masterData.noAssigned')}</p>
                      ) : (
                        pic.categories.map((catId) => {
                          const isMaintenance = getCategoryModule(catId) === 'maintenance'
                          return (
                            <span
                              key={catId}
                              className={cn(
                                'text-xs font-semibold px-2.5 py-1 rounded-full',
                                isMaintenance
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-700'
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
      {/* Approval Policies Tab (Tier 2.2)                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'rules' && <AssignmentRulesPanel />}
      {activeTab === 'policies' && <ApprovalPolicyPanel />}

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
            toast.success(t('masterData.updated', { kind: t('masterData.kind.outlet'), name: data.name }))
          } else {
            await createOutlet(data)
            toast.success(t('masterData.created', { kind: t('masterData.kind.outlet'), name: data.name }))
          }
        }}
      />

      <NewCategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog((prev) => ({ ...prev, open }))}
        initialData={categoryDialog.data}
        onSubmit={async (data) => {
          if (categoryDialog.data) {
            // A system category keeps its module and stays active — don't send them.
            const { module, isActive, ...rest } = data
            await updateCategory(categoryDialog.data.id, categoryDialog.data.isSystem ? rest : { ...rest, module, isActive })
            toast.success(t('masterData.updated', { kind: t('masterData.kind.category'), name: data.name }))
          } else {
            const { isActive: _active, ...input } = data   // eslint-disable-line @typescript-eslint/no-unused-vars
            await createCategory(input)
            toast.success(t('masterData.created', { kind: t('masterData.kind.category'), name: data.name }))
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
            toast.success(t('masterData.updated', { kind: t('masterData.kind.pic'), name: data.name }))
          } else {
            await createPIC(data)
            toast.success(t('masterData.created', { kind: t('masterData.kind.pic'), name: data.name }))
          }
        }}
      />
    </div>
  )
}
