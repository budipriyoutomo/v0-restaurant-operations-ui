'use client'

// "Siapkan perusahaan Anda" — the first admin's checklist (Todo-Pilot §24 /
// UX-11). Steps come from the server and are done when the data exists; each
// open step is one tap to the page where it is done.
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Circle, ChevronRight, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { onboardingApi, STEP_PAGE, type Onboarding } from '@/lib/onboarding-api'
import { hasPermission } from '@/lib/access'
import { pagePath } from '@/lib/routes'
import { useIssueStore } from '@/lib/store'
import { navigate } from '@/lib/use-route'
import { useT } from '@/lib/i18n'

export function OnboardingChecklist() {
  const { t } = useT()
  const currentUser = useIssueStore((s) => s.currentUser)
  const loadAll = useIssueStore((s) => s.loadAll)
  const allowed = hasPermission(currentUser, 'users', 'manage')
  const [status, setStatus] = useState<Onboarding | null>(null)
  const [hidden, setHidden] = useState(false)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => { onboardingApi.get().then(setStatus).catch(() => {}) }, [])
  useEffect(() => { if (allowed) load() }, [allowed, load])

  if (!allowed || !status || status.complete || status.dismissed || hidden) return null

  const done = status.steps.filter((s) => s.done).length
  const next = status.steps.find((s) => !s.done)?.key

  const hide = () => {
    setHidden(true)
    onboardingApi.dismiss().catch(() => {})
  }

  const addDemo = async () => {
    setBusy(true)
    try {
      const res = await onboardingApi.createDemoData()
      toast.success(t('onboarding.demoAdded', { count: res.issues.length }))
      setConfirmDemo(false)
      await loadAll()
      load()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="onboarding-title" className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 id="onboarding-title" className="font-semibold">{t('onboarding.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('onboarding.progress', { done, total: status.steps.length })}</p>
        </div>
        <button type="button" onClick={hide} aria-label={t('onboarding.hide')} title={t('onboarding.hide')}
          className="size-9 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div className="h-full bg-primary transition-all" style={{ width: `${(done / status.steps.length) * 100}%` }} />
      </div>

      <ol className="space-y-1">
        {status.steps.map((s) => (
          <li key={s.key}>
            {s.done ? (
              <p className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground line-through">
                <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400 shrink-0" /> {t(`onboarding.step.${s.key}`)}
              </p>
            ) : (
              <button type="button" onClick={() => navigate(pagePath(STEP_PAGE[s.key]))}
                className={cn('w-full min-h-11 flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-background',
                  s.key === next && 'bg-background font-medium shadow-sm')}>
                <Circle className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1">
                  {t(`onboarding.step.${s.key}`)}
                  {s.key === next && <span className="block text-xs font-normal text-muted-foreground">{t(`onboarding.hint.${s.key}`)}</span>}
                </span>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            )}
          </li>
        ))}
      </ol>

      {status.demoAvailable && (
        <div className="pt-2 border-t border-border">
          {confirmDemo ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('onboarding.demoConfirm')}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDemo(false)} disabled={busy}
                  className="flex-1 min-h-10 rounded-md border border-border text-sm font-medium hover:bg-muted/50">{t('common.cancel')}</button>
                <button type="button" onClick={addDemo} disabled={busy}
                  className="flex-1 min-h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {t('onboarding.demoYes')}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDemo(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <Sparkles className="size-4" /> {t('onboarding.demo')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
