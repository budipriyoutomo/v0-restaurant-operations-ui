'use client'

import { navigate } from '@/lib/use-route'
import { useT } from '@/lib/i18n'

// Shown for an unknown URL and for a record link the user can't open — missing
// or outside their company/outlets look the same, like the backend's 404
// (Todo-Pilot §14 / UX-1).
export function NotFoundView({
  title, message, backTo = '/', backLabel,
}: { title?: string; message?: string; backTo?: string; backLabel?: string }) {
  const { t } = useT()
  return (
    <div role="alert" className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
      <p className="text-2xl font-semibold text-foreground">{title ?? t('notFound.pageTitle')}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{message ?? t('notFound.pageText')}</p>
      <button
        onClick={() => navigate(backTo)}
        className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
      >
        {backLabel ?? t('notFound.backToDashboard')}
      </button>
    </div>
  )
}
