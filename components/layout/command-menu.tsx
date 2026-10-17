'use client'

// ⌘K / Ctrl+K: jump to any page the role can open, or start a report, without
// hunting through the sidebar.
import { useEffect, useRef, useState } from 'react'
import { Bell, Plus } from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { usePermissions } from '@/lib/permissions'
import { pagePath } from '@/lib/routes'
import { navigate } from '@/lib/use-route'
import { useT, type MessageKey } from '@/lib/i18n'
import { navGroups, navItems, type NavItem } from './nav-items'

// Notifications left the sidebar but stay searchable.
const searchItems: NavItem[] = [...navItems, { id: 'notifications', icon: Bell, group: 'system' }]

interface CommandMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandMenu({ open: openProp, onOpenChange }: CommandMenuProps) {
  const { t } = useT()
  const { canViewPage } = usePermissions()
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (next: boolean) => { setOpenState(next); onOpenChange?.(next) }
  // Latest setter for the window listener, so it is bound once.
  const toggleRef = useRef(() => {})
  toggleRef.current = () => setOpen(!open)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (path: string) => { setOpen(false); navigate(path) }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t('topnav.search')} description={t('topnav.searchPlaceholder')}>
      <CommandInput placeholder={t('topnav.searchPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('topnav.noResults')}</CommandEmpty>

        {canViewPage('issues') && (
          <CommandGroup heading={t('topnav.quickActions')}>
            <CommandItem value={t('topnav.newIssue')} onSelect={() => go('/issues?new=1')}>
              <Plus /> {t('topnav.newIssue')}
            </CommandItem>
          </CommandGroup>
        )}

        {navGroups.map((group) => {
          const items = searchItems.filter((item) => item.group === group && canViewPage(item.id))
          if (items.length === 0) return null
          const groupLabel = t(`navGroup.${group}` as MessageKey)
          return (
            <CommandGroup key={group} heading={groupLabel}>
              {items.map(({ id, icon: Icon }) => {
                const label = t(`nav.${id}` as MessageKey)
                return (
                  <CommandItem key={id} value={`${label} ${id}`} onSelect={() => go(pagePath(id))}>
                    <Icon /> {label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
