'use client'

// Record detail drawer (Todo-UI 0.2): same width, backdrop, sticky header and
// keyboard behaviour everywhere. The caller names the dialog (`label`) — the
// e2e tests find drawers by that name, e.g. "Laporan ISS-…".
import { useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

export function SideDrawer({ label, number, title, subtitle, closeLabel, onClose, children, className }: {
  label: string
  number?: React.ReactNode       // record number above the title (mono, primary)
  title: React.ReactNode
  subtitle?: React.ReactNode      // one line of context under the title
  closeLabel: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Escape closes, Tab stays in the drawer, focus returns to the opener (Todo-Pilot §26)
  useModalKeyboard(ref, onClose)

  return (
    <>
      <div data-testid="side-drawer-backdrop" className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn('fixed right-0 top-0 h-screen w-full sm:w-[440px] bg-background border-l border-border shadow-2xl z-50 overflow-y-auto', className)}
      >
        {/* Sticky header: the close button never scrolls away */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-6 py-4 bg-background/95 backdrop-blur border-b border-border">
          <div className="min-w-0">
            {number && <p className="font-mono text-xs text-primary font-bold mb-1">{number}</p>}
            <h2 className="font-semibold text-lg leading-snug">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label={closeLabel}
            className="flex-shrink-0 size-9 -mr-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">{children}</div>
      </div>
    </>
  )
}
