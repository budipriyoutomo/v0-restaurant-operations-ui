import type { Outlet } from './types'

/** Outlet name → effective WO approval threshold in IDR (Todo-Pilot §5):
 *  the outlet's own override, else the global default the API reports. */
export function approvalThresholdsByOutlet(outlets: Pick<Outlet, 'name' | 'approvalThreshold' | 'approvalThresholdDefault'>[]): Record<string, number> {
  return Object.fromEntries(outlets.map((o) => [o.name, o.approvalThreshold ?? o.approvalThresholdDefault]))
}
