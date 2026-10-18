// "Install the app" (Todo-PWA P3). Chrome / Edge fire `beforeinstallprompt`
// once, early — usually before the Settings page exists — so it is captured at
// app start (SwRegister) and kept here until the user presses "Install".
// iOS has no prompt: the user is shown Share → Add to Home Screen instead.
import { useSyncExternalStore } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'none'
export type InstallEnv = { standalone: boolean; canPrompt: boolean; userAgent: string; maxTouchPoints: number }

export function installMode({ standalone, canPrompt, userAgent, maxTouchPoints }: InstallEnv): InstallMode {
  if (standalone) return 'installed'
  if (canPrompt) return 'prompt'
  // iPadOS reports a Mac user agent; a touch screen tells them apart.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  return ios ? 'ios' : 'none'
}

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Call once at app start. Returns the cleanup. */
export function listenForInstallPrompt(win: Window = window): () => void {
  const onPrompt = (e: Event) => {
    e.preventDefault()                    // our own button instead of Chrome's mini-infobar
    deferred = e as InstallPromptEvent
    emit()
  }
  const onInstalled = () => { deferred = null; installed = true; emit() }
  win.addEventListener('beforeinstallprompt', onPrompt)
  win.addEventListener('appinstalled', onInstalled)
  return () => {
    win.removeEventListener('beforeinstallprompt', onPrompt)
    win.removeEventListener('appinstalled', onInstalled)
  }
}

/** Shows Chrome's install dialog. True when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null                         // a prompt event can be used once
  emit()
  await e.prompt()
  return (await e.userChoice).outcome === 'accepted'
}

function currentMode(): InstallMode {
  const standalone = installed
    || window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return installMode({
    standalone, canPrompt: deferred !== null,
    userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0,
  })
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribeInstall, currentMode, () => 'none')
}

// The one-time nudge on My Work. No storage → treated as closed: better
// silent than shown on every visit.
const NUDGE_KEY = 'ro.installNudgeDismissed'
export const installNudge = {
  dismissed: (): boolean => {
    try { return localStorage.getItem(NUDGE_KEY) === '1' } catch { return true }
  },
  dismiss: (): void => {
    try { localStorage.setItem(NUDGE_KEY, '1') } catch { /* private mode */ }
  },
}
