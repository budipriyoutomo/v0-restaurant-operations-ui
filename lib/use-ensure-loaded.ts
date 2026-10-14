'use client'

// A page asks for the modules it shows; each loads once per session, the first
// time any page needs it (Todo-Pilot §22 / UX-9 — not everything at login).
import { useEffect } from 'react'
import { useIssueStore, type LazyModule } from './store'

export function useEnsureLoaded(...modules: LazyModule[]) {
  const ensure = useIssueStore((s) => s.ensureLoaded)
  const key = modules.join(',')
  useEffect(() => {
    for (const m of key.split(',')) if (m) ensure(m as LazyModule)
  }, [ensure, key])
}
