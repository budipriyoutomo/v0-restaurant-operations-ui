// "Install the app" (Todo-PWA P3): which offer a device gets, the captured
// Chrome prompt, and the one-time nudge on My Work.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installMode, installNudge, listenForInstallPrompt, promptInstall, subscribeInstall, type InstallEnv,
} from './install-prompt'

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15'
const env = (over: Partial<InstallEnv>): InstallEnv =>
  ({ standalone: false, canPrompt: false, userAgent: ANDROID, maxTouchPoints: 5, ...over })

describe('installMode', () => {
  it('already running as the installed app: nothing to offer', () => {
    expect(installMode(env({ standalone: true, canPrompt: true }))).toBe('installed')
  })

  it('Chrome / Edge handed us its install prompt: a button', () => {
    expect(installMode(env({ canPrompt: true }))).toBe('prompt')
  })

  it('iPhone and iPad (which reports a Mac UA): Share → Add to Home Screen instructions', () => {
    expect(installMode(env({ userAgent: IPHONE }))).toBe('ios')
    expect(installMode(env({ userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 5 }))).toBe('ios')
  })

  it('a Mac, or a browser without an install prompt: no offer', () => {
    expect(installMode(env({ userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 0 }))).toBe('none')
    expect(installMode(env({}))).toBe('none')
  })
})

describe('captured install prompt', () => {
  function fakeWindow() {
    const target = new EventTarget()
    return Object.assign(target, { matchMedia: () => ({ matches: false }) })
  }
  function bipEvent(outcome: 'accepted' | 'dismissed') {
    const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & Record<string, unknown>
    e.prompt = vi.fn(async () => {})
    e.userChoice = Promise.resolve({ outcome })
    return e
  }

  it('keeps Chrome\'s event (no mini-infobar), prompts once on demand, then forgets it', async () => {
    const win = fakeWindow()
    const stop = listenForInstallPrompt(win as unknown as Window)
    const changed = vi.fn()
    const unsub = subscribeInstall(changed)
    const e = bipEvent('accepted')
    win.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(changed).toHaveBeenCalled()

    expect(await promptInstall()).toBe(true)
    expect(e.prompt).toHaveBeenCalledTimes(1)
    expect(await promptInstall()).toBe(false)               // an event can be used once
    unsub(); stop()
  })

  it('a dismissed prompt reports false', async () => {
    const win = fakeWindow()
    const stop = listenForInstallPrompt(win as unknown as Window)
    win.dispatchEvent(bipEvent('dismissed'))
    expect(await promptInstall()).toBe(false)
    stop()
  })
})

describe('installNudge', () => {
  beforeEach(() => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows until closed, then never again on this device', () => {
    expect(installNudge.dismissed()).toBe(false)
    installNudge.dismiss()
    expect(installNudge.dismissed()).toBe(true)
  })

  it('without storage (private mode) it counts as closed rather than nagging', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } })
    expect(installNudge.dismissed()).toBe(true)
    expect(() => installNudge.dismiss()).not.toThrow()
  })
})
