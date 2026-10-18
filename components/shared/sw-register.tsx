'use client'

// Registers public/sw.js (Todo-PWA P1) — production builds only. `next dev`
// and the e2e stack run without it, and drop a worker an earlier production
// run left on the origin, so nobody debugs a stale cached page.
//
// Updates: a new worker waits. If it is this page's own build (a fresh load
// after a deploy) it takes over quietly; if it is newer than this page (a tab
// left open across a deploy), a toast offers "Reload" — the user decides, so a
// half-filled form is never reloaded away.
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import { BUILD_ID, waitingAction } from '@/lib/sw-client'
import { listenForInstallPrompt } from '@/lib/install-prompt'

const ENABLED = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SW !== 'off'

export function SwRegister() {
  const { t } = useT()
  const tRef = useRef(t)
  tRef.current = t

  // Chrome fires its install prompt once, early — keep it for Settings / My
  // Work (Todo-PWA P3).
  useEffect(() => listenForInstallPrompt(), [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const sw = navigator.serviceWorker
    if (!ENABLED) {
      sw.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
      return
    }

    let accepted = false
    // This page is older than the deployed build. Pressing "Reload" switches on
    // the waiting worker if there still is one — another tab may already have
    // done that (verifikasi akhir) — else just reloads.
    const promptReload = () => {
      toast(tRef.current('pwa.updateReady'), {
        id: 'sw-update',
        duration: Infinity,
        action: {
          label: tRef.current('pwa.reload'),
          onClick: async () => {
            const waiting = (await sw.getRegistration())?.waiting
            if (!waiting) return window.location.reload()
            accepted = true
            waiting.postMessage({ type: 'SKIP_WAITING' })
          },
        },
      })
    }
    const onWaiting = (worker: ServiceWorker) => {
      if (waitingAction(worker.scriptURL, BUILD_ID) === 'activate') worker.postMessage({ type: 'SKIP_WAITING' })
      else promptReload()
    }
    const watch = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && sw.controller) onWaiting(reg.waiting)
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && sw.controller) onWaiting(worker)
        })
      })
    }
    const register = (version: string) =>
      sw.register(`/sw.js?v=${encodeURIComponent(version)}`, { scope: '/' }).then(watch).catch(() => {})

    // Reload only after the user pressed "Reload" (first install also changes
    // the controller, via clients.claim()).
    const onControllerChange = () => { if (accepted) window.location.reload() }
    sw.addEventListener('controllerchange', onControllerChange)
    register(BUILD_ID)

    // An installed app resumed from the background never reloads by itself:
    // ask which build is deployed; if it changed, fetch its worker and offer
    // the reload (the worker may already be active through another tab).
    const checkDeploy = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      fetch('/version.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { version?: string } | null) => {
          if (!d?.version || d.version === BUILD_ID) return
          register(d.version)
          promptReload()
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', checkDeploy)
    return () => {
      sw.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', checkDeploy)
    }
  }, [])

  return null
}
