// Relative time for a notification's created_at ("5m ago", "3h ago", then a date).
export function formatNotificationTime(iso: string, now: number = Date.now()): string {
  try {
    const diffMin = Math.floor((now - new Date(iso).getTime()) / 60000)
    if (diffMin < 1)  return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const h = Math.floor(diffMin / 60)
    if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}
