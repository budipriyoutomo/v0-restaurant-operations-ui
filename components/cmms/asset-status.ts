import type { AssetStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// Asset status badge
// ---------------------------------------------------------------------------
export function assetStatusColor(status: AssetStatus) {
  switch (status) {
    case 'operational': return 'bg-success/15 text-success border-success/30'
    case 'warning':     return 'bg-warning/15 text-warning border-warning/30'
    case 'maintenance': return 'bg-primary/15 text-primary border-primary/30'
    case 'critical':    return 'bg-destructive/15 text-destructive border-destructive/30'
  }
}
