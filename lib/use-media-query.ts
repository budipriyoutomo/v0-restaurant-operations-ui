'use client'

// Does the screen match a CSS media query? Re-renders when it changes.
// No matchMedia (server render, tests): false — the phone layout.
import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind `lg` (1024px): wide enough for a kanban board. */
export const WIDE_SCREEN = '(min-width: 1024px)'
