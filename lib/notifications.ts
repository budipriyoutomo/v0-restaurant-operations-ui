import type { AppNotification } from './types'
import { notificationPath } from './routes'


// Click on a notification (bell or inbox): mark it read and open the record it
// is about, if it has a route — Todo-Pilot §14 / UX-1. Returns whether it opened.
export function openNotification(
  n: Pick<AppNotification, 'id' | 'read_at' | 'entity_type' | 'entity_id'>,
  { markRead, go }: { markRead: (id: string) => unknown; go: (path: string) => void },
): boolean {
  if (!n.read_at) markRead(n.id)
  const path = notificationPath(n.entity_type, n.entity_id)
  if (path) go(path)
  return path !== null
}
