// "Done — Undo" for actions that cannot be reversed on the server (Todo-Pilot
// §23): a closed Issue cannot be reopened, so the request waits a few seconds
// while the toast offers Undo. Leaving the page sends it at once, so nothing
// the user saw as done is lost.
import { toast } from 'sonner'

export const UNDO_MS = 5000

export function runWithUndo({ message, undoLabel, run, onUndo, delayMs = UNDO_MS }: {
  message: string
  undoLabel: string
  run: () => unknown
  onUndo?: () => void
  delayMs?: number
}): void {
  let settled = false
  const fire = () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    window.removeEventListener('pagehide', fire)
    run()
  }
  const timer = setTimeout(fire, delayMs)
  window.addEventListener('pagehide', fire)
  toast(message, {
    duration: delayMs,
    action: {
      label: undoLabel,
      onClick: () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        window.removeEventListener('pagehide', fire)
        onUndo?.()
      },
    },
  })
}
