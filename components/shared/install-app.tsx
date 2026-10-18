'use client'

// "Install the app" (Todo-PWA P3): a group in Settings, and a one-time card on
// My Work that can be closed for good. Chrome / Edge get a button (the captured
// install prompt); iPhone / iPad get the Share → Add to Home Screen steps.
import { useState } from 'react'
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react'
import { installNudge, promptInstall, useInstallMode } from '@/lib/install-prompt'
import { useT } from '@/lib/i18n'

function InstallButton({ onDone }: { onDone?: () => void }) {
  const { t } = useT()
  return (
    <button type="button"
      onClick={async () => { await promptInstall(); onDone?.() }}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
      <Download className="size-4" /> {t('pwa.install')}
    </button>
  )
}

function IosSteps() {
  const { t } = useT()
  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      {t('pwa.iosStepsBefore')} <Share className="inline size-3.5 -mt-0.5" aria-label={t('pwa.share')} /> {t('pwa.iosStepsAfter')}
    </p>
  )
}

/** Settings → "App". Nothing where the browser cannot install. */
export function InstallAppGroup() {
  const { t } = useT()
  const mode = useInstallMode()
  if (mode === 'none') return null
  return (
    <section aria-label={t('pwa.group')} className="rounded-2xl border border-border bg-card overflow-hidden">
      <h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-foreground">{t('pwa.group')}</h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 gap-3">
        <div className="flex items-start gap-3">
          {mode === 'installed'
            ? <CheckCircle2 className="size-4 mt-0.5 text-success flex-shrink-0" />
            : <Smartphone className="size-4 mt-0.5 text-muted-foreground flex-shrink-0" />}
          <div>
            <p className="text-sm font-medium">{mode === 'installed' ? t('pwa.installed') : t('pwa.installTitle')}</p>
            {mode === 'ios' ? <IosSteps /> : <p className="text-xs text-muted-foreground mt-0.5">{t('pwa.installHint')}</p>}
          </div>
        </div>
        {mode === 'prompt' && <InstallButton />}
      </div>
    </section>
  )
}

/** My Work: offered once; closing or installing retires it on this device. */
export function InstallNudge() {
  const { t } = useT()
  const mode = useInstallMode()
  const [closed, setClosed] = useState(() => installNudge.dismissed())
  if (closed || (mode !== 'prompt' && mode !== 'ios')) return null
  const close = () => { installNudge.dismiss(); setClosed(true) }
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
      <Smartphone className="size-5 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('pwa.installTitle')}</p>
          {mode === 'ios' ? <IosSteps /> : <p className="text-xs text-muted-foreground mt-0.5">{t('pwa.installHint')}</p>}
        </div>
        {mode === 'prompt' && <InstallButton onDone={close} />}
      </div>
      <button type="button" onClick={close} aria-label={t('common.close')}
        className="size-11 -m-2.5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent flex-shrink-0">
        <X className="size-4" />
      </button>
    </div>
  )
}
