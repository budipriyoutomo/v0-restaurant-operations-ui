'use client'

// Top bar outlet filter: one outlet for every list, the menu badges and My Work,
// or all my outlets. Only shown to users who have more than one outlet.
import { ChevronDown, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMyOutlets, useOutletFilter } from '@/lib/permissions'
import { useT } from '@/lib/i18n'
import type { Outlet } from '@/lib/types'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ALL = '__all__'

function StatusDot({ status }: { status: Outlet['status'] | null }) {
  return (
    <span aria-hidden="true" className={cn('size-2 rounded-full flex-shrink-0',
      status === null ? 'bg-muted-foreground/50' :
      status === 'operational' ? 'bg-success' : status === 'warning' ? 'bg-warning' : 'bg-destructive')} />
  )
}

export function OutletSwitcher() {
  const { t } = useT()
  const outlets = useMyOutlets()
  const { outlet, setOutlet } = useOutletFilter()

  if (outlets.length <= 1) return null
  const current = outlets.find((o) => o.name === outlet) ?? null
  const name = current?.name ?? t('topnav.allMyOutlets')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('topnav.outletButton', { name })}
          className={cn(
            'flex items-center gap-2 h-10 px-3 rounded-full text-sm font-medium transition-colors flex-shrink-0',
            // Filtered: tinted, so nobody forgets the lists show one outlet only.
            current ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Store className="size-4 flex-shrink-0" />
          <span className="hidden md:inline max-w-36 truncate">{name}</span>
          <ChevronDown className="hidden md:block size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">{t('topnav.selectOutlet')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current?.name ?? ALL} onValueChange={(v) => setOutlet(v === ALL ? null : v)}>
          <DropdownMenuRadioItem value={ALL} className="gap-2">
            <StatusDot status={null} />
            <span className="flex-1">{t('topnav.allMyOutlets')}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{outlets.length}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          <div className="max-h-72 overflow-y-auto">
            {outlets.map((o) => (
              <DropdownMenuRadioItem key={o.id} value={o.name} className="gap-2">
                <StatusDot status={o.status} />
                <span className="flex-1 truncate">{o.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{o.code}</span>
              </DropdownMenuRadioItem>
            ))}
          </div>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

