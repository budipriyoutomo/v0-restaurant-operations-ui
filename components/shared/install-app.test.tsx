// "Install the app" in Settings and the one-time nudge on My Work (Todo-PWA P3).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InstallMode } from '@/lib/install-prompt'

const install = vi.hoisted(() => ({
  mode: 'none' as InstallMode,
  prompt: vi.fn(async () => true),
  dismissed: false,
  dismiss: vi.fn(),
}))
vi.mock('@/lib/install-prompt', () => ({
  useInstallMode: () => install.mode,
  promptInstall: install.prompt,
  installNudge: { dismissed: () => install.dismissed, dismiss: install.dismiss },
}))

import { InstallAppGroup, InstallNudge } from './install-app'

beforeEach(() => {
  vi.clearAllMocks()
  install.mode = 'none'
  install.dismissed = false
})

describe('InstallAppGroup (Settings)', () => {
  it('Chrome: a button that opens the install dialog', async () => {
    install.mode = 'prompt'
    render(<InstallAppGroup />)
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }))
    expect(install.prompt).toHaveBeenCalled()
  })

  it('iPhone: the Share → Add to Home Screen steps, no button', () => {
    install.mode = 'ios'
    render(<InstallAppGroup />)
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
  })

  it('already installed: says so', () => {
    install.mode = 'installed'
    render(<InstallAppGroup />)
    expect(screen.getByText('Installed on this device')).toBeInTheDocument()
  })

  it('a browser that cannot install: no group at all', () => {
    const { container } = render(<InstallAppGroup />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('InstallNudge (My Work)', () => {
  it('offers the install once and can be closed for good', async () => {
    install.mode = 'prompt'
    render(<InstallNudge />)
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(install.dismiss).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
  })

  it('iPhone: the steps, closable', () => {
    install.mode = 'ios'
    render(<InstallNudge />)
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
  })

  it('hidden once closed, when installed, or where install is impossible', () => {
    for (const [mode, dismissed] of [['prompt', true], ['installed', false], ['none', false]] as const) {
      install.mode = mode
      install.dismissed = dismissed
      const { container, unmount } = render(<InstallNudge />)
      expect(container, `${mode}/${dismissed}`).toBeEmptyDOMElement()
      unmount()
    }
  })

  it('accepting the install also retires the nudge', async () => {
    install.mode = 'prompt'
    render(<InstallNudge />)
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }))
    expect(install.prompt).toHaveBeenCalled()
    expect(install.dismiss).toHaveBeenCalled()
  })
})
