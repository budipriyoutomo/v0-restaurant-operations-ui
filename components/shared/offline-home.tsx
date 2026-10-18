'use client'

// Opened with no signal before anything was loaded on this device (Todo-PWA).
// Lists wait for the signal, but reporting a problem does not: the form uses
// the outlets and categories kept on the device and the report waits in the
// offline queue. "Lapor" in the bottom bar (/issues?new=1) lands here too.
import { useEffect, useState } from 'react'
import { CloudOff, Plus } from 'lucide-react'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { useIssueStore } from '@/lib/store'
import { useMyOutlets, usePermissions } from '@/lib/permissions'
import { useUrlState } from '@/lib/use-route'
import { useT } from '@/lib/i18n'

export function OfflineHome() {
  const { t } = useT()
  const createIssue = useIssueStore((s) => s.createIssue)
  const uploadIssuePhoto = useIssueStore((s) => s.uploadIssuePhoto)
  const currentUser = useIssueStore((s) => s.currentUser)
  const myOutlets = useMyOutlets()
  const { can, canViewPage } = usePermissions()
  const canReport = canViewPage('issues')

  const [open, setOpen] = useState(false)
  const [newFlag, setNewFlag] = useUrlState('new')
  useEffect(() => {
    if (newFlag === '1' && canReport) { setOpen(true); setNewFlag(null) }
  }, [newFlag, canReport]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
      <CloudOff className="size-10 text-muted-foreground" aria-hidden />
      <p className="text-lg font-semibold text-foreground">{t('shell.offlineNoDataTitle')}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{t('shell.offlineNoData')}</p>
      {canReport && (
        <>
          <button type="button" onClick={() => setOpen(true)}
            className="mt-2 inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="size-4" /> {t('shell.offlineReport')}
          </button>
          <CreateIssueDialog
            open={open}
            onOpenChange={setOpen}
            outlets={myOutlets.map((o) => o.name)}
            onSubmit={createIssue}
            quick={!can.updateIssueStatus}
            whatsappOptIn={Boolean(currentUser?.whatsapp_number)}
            onUploadPhoto={(issue, file) => uploadIssuePhoto(issue, file)}
          />
        </>
      )}
    </div>
  )
}
