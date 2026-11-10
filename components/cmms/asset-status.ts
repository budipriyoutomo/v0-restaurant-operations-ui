import type { AssetStatus } from '@/lib/types'
import { ASSET_SIGNAL, type Signal } from '@/lib/tone'

/** An asset's condition as a signal, for StatusLabel (Todo-Modern-UI Fase 4). */
export function assetSignal(status: AssetStatus): Signal {
  return ASSET_SIGNAL[status] ?? 'neutral'
}
