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
