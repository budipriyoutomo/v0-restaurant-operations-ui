import type { AssetStatus } from '@/lib/types'
import { ASSET_SIGNAL, type Signal } from '@/lib/tone'

// Pill until the CMMS pass (Todo-Modern-UI Fase 4) moves it to StatusLabel;
// the colours already follow the three signals.
const PILL: Record<Signal, string> = {
  action: 'bg-destructive-soft text-destructive border-destructive/30',
  waiting: 'bg-warning-mark/10 text-warning border-warning-mark/40',
  done: 'bg-success/10 text-success border-success/30',
  neutral: 'bg-muted text-foreground border-border',
}

// ---------------------------------------------------------------------------
// Asset status badge
// ---------------------------------------------------------------------------
export function assetStatusColor(status: AssetStatus) {
  return PILL[ASSET_SIGNAL[status] ?? 'neutral']
}
