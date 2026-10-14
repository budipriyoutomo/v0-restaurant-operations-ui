'use client'

// QA & Compliance — outlet audit checklists (Todo-Pilot §7). Replaces the
// saved Issues view: audits, scores per outlet, checklist templates, and the
// Compliance issues that failed items raise.
import { useEffect, useState, useRef } from 'react'
import { ClipboardCheck, Plus, Repeat, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { newKey } from '@/lib/offline-queue'
import { scoreTone } from '@/lib/qa-audit'
import { qaApi } from '@/lib/qa-audit-api'
import { useMyOutlets, usePermissions } from '@/lib/permissions'
import type { QAAuditSummary, QAAuditTemplate } from '@/lib/types'
import { AuditRunner } from '@/components/qa/audit-runner'
import { TemplateEditor } from '@/components/qa/template-editor'
import { QAScoresPanel } from '@/components/qa/qa-scores-panel'
import { TONE_CLASS } from '@/components/qa/tone'
import { useT } from '@/lib/i18n'
import { IssuesListPage } from '@/components/pages/issues-list-page'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

type Tab = 'audits' | 'scores' | 'templates' | 'issues'

export function QAPage() {
  const { t } = useT()
  const { can } = usePermissions()
  const myOutlets = useMyOutlets()
  const [tab, setTab] = useState<Tab>('audits')
  const [audits, setAudits] = useState<QAAuditSummary[] | null>(null)
  const [templates, setTemplates] = useState<QAAuditTemplate[]>([])
  const [openAuditId, setOpenAuditId] = useState<string | null>(null)
  const [editing, setEditing] = useState<QAAuditTemplate | 'new' | null>(null)
  const [showStart, setShowStart] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    qaApi.list().then(setAudits).catch((e) => { toast.error(apiErrorMessage(e)); setAudits([]) })
    qaApi.templates(can.manageQA).then(setTemplates).catch(() => setTemplates([]))
  }, [refreshKey, can.manageQA])

  const inProgress = (audits ?? []).filter((a) => a.status === 'in_progress')
  const submitted = (audits ?? []).filter((a) => a.status === 'submitted')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'audits', label: t('qa.tab.audits') },
    { id: 'scores', label: t('qa.tab.scores') },
    { id: 'templates', label: t('qa.tab.templates') },
    { id: 'issues', label: t('qa.tab.issues') },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{t('qa.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('qa.subtitle')}
          </p>
        </div>
        {can.manageQA && tab === 'audits' && (
          <button onClick={() => setShowStart(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
            <Plus className="size-4" /> {t('qa.startAudit')}
          </button>
        )}
        {can.manageQA && tab === 'templates' && (
          <button onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
            <Plus className="size-4" /> {t('qa.newTemplate')}
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((td) => (
          <button key={td.id} onClick={() => setTab(td.id)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap',
              tab === td.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {td.label}
          </button>
        ))}
      </div>

      {tab === 'audits' && (
        audits === null ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : (
          <div className="space-y-6">
            {inProgress.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('qa.inProgress')}</h3>
                {inProgress.map((a) => <AuditRow key={a.id} audit={a} onOpen={() => setOpenAuditId(a.id)} />)}
              </section>
            )}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('qa.submitted')}</h3>
              {submitted.length === 0
                ? <Empty text={templates.length === 0 && can.manageQA
                    ? t('qa.noAuditsCreate')
                    : t('qa.noSubmitted')} />
                : submitted.map((a) => <AuditRow key={a.id} audit={a} onOpen={() => setOpenAuditId(a.id)} />)}
            </section>
          </div>
        )
      )}

      {tab === 'scores' && <QAScoresPanel refreshKey={refreshKey} />}

      {tab === 'templates' && (
        templates.length === 0 ? <Empty text={t('qa.noTemplates')} /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className={cn('p-4 rounded-xl border border-border bg-card space-y-2', !tpl.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{tpl.name}</p>
                    {tpl.description && <p className="text-xs text-muted-foreground">{tpl.description}</p>}
                  </div>
                  {can.manageQA && (
                    <button onClick={() => setEditing(tpl)} className="p-1 text-muted-foreground hover:text-foreground" title={t('common.edit')} aria-label={t('common.edit')}>
                      <Pencil className="size-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('qa.templateSummary', { items: tpl.items.length, critical: tpl.items.filter((i) => i.isCritical).length, photo: tpl.items.filter((i) => i.requiresPhoto).length })}
                  {!tpl.isActive && t('qa.inactive')}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'issues' && <IssuesListPage view="qa" />}

      {showStart && (
        <StartAuditDialog
          templates={templates.filter((t) => t.isActive)}
          outlets={myOutlets.map((o) => o.name)}
          onClose={() => setShowStart(false)}
          onStarted={(id) => { setShowStart(false); reload(); setOpenAuditId(id) }}
        />
      )}
      {openAuditId && (
        <AuditRunner auditId={openAuditId} canEdit={can.manageQA}
          onClose={() => setOpenAuditId(null)} onChanged={reload} />
      )}
      {editing && (
        <TemplateEditor template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  )
}

function AuditRow({ audit: a, onOpen }: { audit: QAAuditSummary; onOpen: () => void }) {
  const { t, date } = useT()
  return (
    <button onClick={onOpen}
      className="w-full text-left p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors flex items-center gap-3">
      <ClipboardCheck className="size-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-muted-foreground">{a.number}</span>
          <span className="text-sm font-semibold truncate">{a.templateName}</span>
        </div>
        <p className="text-xs text-muted-foreground">{a.outlet} · {date(a.auditDate)} · {a.auditor}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {a.status === 'submitted' ? (
          <>
            <p className={cn('text-lg font-bold leading-none', TONE_CLASS[scoreTone(a.score)])}>{a.score ?? '—'}</p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
              {t('qa.failed', { count: a.failedCount })}
              {a.repeatCount > 0 && <span className="text-orange-700 inline-flex items-center gap-0.5"><Repeat className="size-3" />{a.repeatCount}</span>}
            </p>
          </>
        ) : (
          <p className="text-xs font-semibold text-primary">{t('qa.answered', { done: a.progress.answered, total: a.progress.total })}</p>
        )}
      </div>
    </button>
  )
}

function StartAuditDialog({ templates, outlets, onClose, onStarted }: {
  templates: QAAuditTemplate[]
  outlets: string[]
  onClose: () => void
  onStarted: (auditId: string) => void
}) {
  const { t } = useT()
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [outlet, setOutlet] = useState(outlets[0] ?? '')
  const [auditDate, setAuditDate] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  // One key per dialog: a double tap never starts two audits.
  const [key] = useState(newKey)

  const start = async () => {
    setBusy(true)
    try {
      const audit = await qaApi.start({ templateId, outlet, auditDate }, key)
      onStarted(audit.id)
    } catch (e) {
      toast.error(apiErrorMessage(e))
      setBusy(false)
    }
  }

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className="bg-background rounded-lg border border-border shadow-lg w-full max-w-sm p-5 space-y-4">
        <h2 className="font-semibold">{t('qa.startAudit')}</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('qa.needTemplate')}</p>
        ) : (
          <div className="space-y-3">
            <Field label={t('qa.checklist')}>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm">
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.items.length} items)</option>)}
              </select>
            </Field>
            <Field label={t('common.outlet')}>
              <select value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm">
                {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label={t('qa.auditDate')}>
              <input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm" />
            </Field>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-border text-sm">{t('common.cancel')}</button>
          <button onClick={start} disabled={!templateId || !outlet || busy}
            className="px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {busy ? t('qa.starting') : t('qa.start')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>
}

function Empty({ text }: { text: string }) {
  return <div className="py-14 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">{text}</div>
}
