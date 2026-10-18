// Unread notifications on the installed app's icon (Todo-PWA P3), via the
// Badging API (Chromium, installed iOS 16.4+ apps). Elsewhere: nothing.
type BadgeNavigator = {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function syncAppBadge(count: number, nav: BadgeNavigator = navigator as BadgeNavigator): void {
  const call = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.()
  call?.catch(() => {})                   // not installed / no permission: no badge, no error
}
