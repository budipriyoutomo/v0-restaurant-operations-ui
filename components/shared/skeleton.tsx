'use client'

// Grey placeholders shaped like the content that is on its way (Todo-Pilot §22):
// on outlet Wi-Fi the page frame shows at once and fills in as data arrives.
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-md bg-muted animate-pulse', className)} />
}

/** A list of `rows` card placeholders, announced once as "Loading…". */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  const { t } = useT()
  return (
    <div role="status" aria-busy="true" className={cn('p-4 sm:p-6 space-y-3', className)}>
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}
    </div>
  )
}

/** Row placeholders for a panel; `label` says what is loading, to screen readers only. */
export function RowsSkeleton({ rows = 3, label, className }: { rows?: number; label?: string; className?: string }) {
  const { t } = useT()
  const text = label ?? t('common.loading')
  return (
    <div role="status" aria-busy="true" aria-label={text} className={cn('space-y-2 py-2', className)}>
      <span className="sr-only">{text}</span>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )
}

/** The app frame while the session is restored (Todo-Modern-UI Fase 4): the
 *  sidebar, top bar and a list in place, instead of a blank screen with a word. */
export function AppShellSkeleton() {
  const { t } = useT()
  return (
    <div role="status" aria-busy="true" aria-label={t('common.loading')} className="flex h-screen bg-background">
      <span className="sr-only">{t('common.loading')}</span>
      <div data-part="sidebar" aria-hidden="true" className="hidden md:flex w-64 flex-col gap-3 bg-sidebar px-4 py-4">
        <div className="h-8 w-36 rounded-md bg-sidebar-accent" />
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-9 rounded-md bg-sidebar-accent/60" />)}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div data-part="header" aria-hidden="true" className="h-14 flex items-center gap-3 border-b border-border px-4 sm:px-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="ml-auto h-9 w-40 max-sm:hidden" />
          <Skeleton className="max-sm:ml-auto size-9 rounded-full" />
        </div>
        <div data-part="content" aria-hidden="true" className="p-4 sm:p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    </div>
  )
}
