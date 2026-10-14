'use client'

// Photos taken when an Issue was reported (Todo-Pilot §20 / UX-7) — thumbnails
// in the drawer, full size on tap. Only fetched when the issue has photos.
import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'
import type { IssuePhoto } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { AuthedImage } from './authed-image'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

export function IssuePhotos({ issueId, count, load }: {
  issueId: string
  count: number
  load: (issueId: string) => Promise<IssuePhoto[]>
}) {
  const { t } = useT()
  const [photos, setPhotos] = useState<IssuePhoto[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<IssuePhoto | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(viewerRef, () => setOpen(null), !!open)

  useEffect(() => {
    if (count === 0) return
    let cancelled = false
    setFailed(false)
    load(issueId)
      .then((p) => { if (!cancelled) setPhotos(p) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [issueId, count, load])

  if (count === 0) return null

  const alt = (p: IssuePhoto, i: number) => p.caption || t('issueDrawer.photoN', { n: i + 1 })

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{t('issueDrawer.photos')}</p>
      {failed ? (
        <p className="text-xs text-destructive">{t('issueDrawer.photosFailed')}</p>
      ) : photos === null ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: Math.min(count, 3) }, (_, i) => <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setOpen(p)} aria-label={alt(p, i)}
              className="aspect-square rounded-md overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-primary/50">
              <AuthedImage path={p.thumbnailUrl} alt={alt(p, i)} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div ref={viewerRef} role="dialog" aria-modal="true" aria-label={alt(open, photos?.indexOf(open) ?? 0)}
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button type="button" onClick={() => setOpen(null)} aria-label={t('common.close')}
            className="absolute top-4 right-4 size-11 flex items-center justify-center rounded-full bg-black/60 text-white">
            <X className="size-5" />
          </button>
          <AuthedImage path={open.fileUrl} alt={alt(open, photos?.indexOf(open) ?? 0)} className="max-h-full max-w-full rounded-md object-contain" />
        </div>
      )}
    </div>
  )
}
