'use client'

// Keyboard for the app's hand-made dialogs and drawers (Todo-Pilot §26):
// focus moves in on open, Tab stays inside, Escape closes the topmost one,
// and focus returns to whatever opened it.
import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Open modals, innermost last — only the last one reacts to Escape / Tab.
const stack: object[] = []

export function useModalKeyboard(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  // Latest onClose without re-running the effect (which would move focus again).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return
    const token = {}
    stack.push(token)
    const opener = document.activeElement as HTMLElement | null
    const el = ref.current
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((n) => !n.closest('[hidden]'))
    if (el && !el.contains(document.activeElement)) {
      const first = focusables()[0]
      if (first) first.focus()
      else { el.tabIndex = -1; el.focus() }
    }

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return
      // A dialog opened on top of this one but outside it (a Radix dialog in a
      // portal, e.g. "Create work order" from a drawer) runs its own keyboard.
      const target = e.target instanceof Element ? e.target : null
      if (el && target && !el.contains(target) && target.closest('[role="dialog"], [role="alertdialog"]')) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !el) return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === first || !el.contains(current))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (current === last || !el.contains(current))) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(token), 1)
      if (opener && document.contains(opener)) opener.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ref])

}
