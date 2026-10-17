'use client'

// Assignee routing rules, category × outlet → user (Todo-Ops-Checklist P2).
// A new Issue without assignee goes to the (category, outlet) rule → the
// (category, all outlets) rule → the category's PIC with an account → nobody.
import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Plus, Route, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { activeCategories } from '@/lib/categories'
import { apiErrorMessage } from '@/lib/api-client'
import type { AssignableUser } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const fieldClass = 'w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

export function AssignmentRulesPanel() {
  const { t, label } = useT()
  const {
    assignmentRules, categories, outlets, loadAssignmentRules, createAssignmentRule, deleteAssignmentRule,
    loadAssignableUsers,
  } = useIssueStore()
  const { can } = usePermissions()

  const options = activeCategories(categories)
  const [categoryId, setCategoryId] = useState('')
  const [outletId, setOutletId] = useState('')            // '' = every outlet
  const [assigneeUserId, setAssigneeUserId] = useState('')
  const [people, setPeople] = useState<AssignableUser[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAssignmentRules().catch(() => {}) }, [loadAssignmentRules])
  useEffect(() => { if (!categoryId && options[0]) setCategoryId(options[0].id) }, [options, categoryId])

  // The assignee must be able to work at the chosen outlet: the list follows it.
  const outletName = outlets.find((o) => o.id === outletId)?.name ?? ''
  useEffect(() => {
    let live = true
    setPeople(null)
    loadAssignableUsers(outletName).then((users) => {
      if (!live) return
      setPeople(users)
      setAssigneeUserId((cur) => (users.some((u) => u.id === cur) ? cur : ''))
    }).catch(() => { if (live) setPeople([]) })
    return () => { live = false }
  }, [outletName, loadAssignableUsers])

  const add = async () => {
    if (!categoryId || !assigneeUserId || saving) return
    setSaving(true)
    try {
      await createAssignmentRule({ categoryId, outletId: outletId || null, assigneeUserId })
      toast.success(t('assignmentRules.created'))
      setAssigneeUserId('')
    } catch (err) {
      toast.error(apiErrorMessage(err, t('assignmentRules.failed')))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteAssignmentRule(id)
      toast.success(t('assignmentRules.deleted'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t('assignmentRules.failed')))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Route className="size-4 shrink-0 mt-0.5" aria-hidden />
        <p>{t('assignmentRules.hint')}</p>
      </div>

      {can.manageMasterData && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-lg border border-border p-4">
          <div>
            <label htmlFor="rule-category" className="block text-xs font-semibold mb-1">{t('assignmentRules.category')}</label>
            <select id="rule-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
              {options.map((c) => <option key={c.id} value={c.id}>{label('category', c.name)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rule-outlet" className="block text-xs font-semibold mb-1">{t('assignmentRules.outlet')}</label>
            <select id="rule-outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)} className={fieldClass}>
              <option value="">{t('assignmentRules.allOutlets')}</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rule-assignee" className="block text-xs font-semibold mb-1">{t('assignmentRules.assignTo')}</label>
            <select id="rule-assignee" value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}
              disabled={people === null} className={fieldClass}>
              <option value="">{t('assignmentRules.pickUser')}</option>
              {(people ?? []).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role_name}</option>)}
            </select>
          </div>
          <button type="button" onClick={add} disabled={!categoryId || !assigneeUserId || saving}
            className={cn('flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-xs font-semibold transition-colors',
              categoryId && assigneeUserId && !saving
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {t('assignmentRules.addRule')}
          </button>
        </div>
      )}

      {assignmentRules.length === 0 ? (
        <div className="p-12 rounded-lg border border-border text-center">
          <p className="text-sm text-muted-foreground">{t('assignmentRules.empty')}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-2">{t('assignmentRules.category')}</th>
                <th className="text-left font-semibold px-4 py-2">{t('assignmentRules.outlet')}</th>
                <th className="text-left font-semibold px-4 py-2">{t('assignmentRules.assignTo')}</th>
                {can.manageMasterData && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {assignmentRules.map((r) => (
                <tr key={r.id} aria-label={`${label('category', r.categoryName)} · ${r.outlet ?? t('assignmentRules.allOutlets')}`}
                  className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{label('category', r.categoryName)}</td>
                  <td className="px-4 py-2">{r.outlet ?? <span className="text-muted-foreground">{t('assignmentRules.allOutlets')}</span>}</td>
                  <td className="px-4 py-2">
                    <span>{r.assigneeName}</span>
                    {!r.assigneeActive && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-warning">
                        <AlertTriangle className="size-3" aria-hidden /> {t('assignmentRules.inactive')}
                      </span>
                    )}
                  </td>
                  {can.manageMasterData && (
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => remove(r.id)} aria-label={t('common.delete')} title={t('common.delete')}
                        className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors">
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" aria-hidden />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
