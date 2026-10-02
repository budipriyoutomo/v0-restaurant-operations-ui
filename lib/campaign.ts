// Campaign screen rules (Todo-Pilot §10). Pure — tested in campaign.test.ts.

/** Integer major units → "Rp 5.000.000" / "RM 5,000" / "USD 1,200". */
export function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return '—'
  if (currency === 'IDR') return 'Rp ' + amount.toLocaleString('id-ID')
  const prefix = currency === 'MYR' ? 'RM' : currency
  return `${prefix} ${amount.toLocaleString('en-US')}`
}

/** "Rp 5.000.000" / "5000000" from an input box → 5000000; empty → null. */
export function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, '')
  return digits ? Number(digits) : null
}

export function budgetBar(budget: number | null, actual: number | null): { fill: number; over: boolean; label: string } {
  if (!budget) return { fill: 0, over: false, label: 'No budget set' }
  if (actual === null) return { fill: 0, over: false, label: 'No spend recorded' }
  const pct = Math.round((actual * 1000) / budget) / 10
  const over = actual > budget
  return { fill: Math.min(100, pct), over, label: over ? `${pct}% used — over budget` : `${pct}% used` }
}

export function upliftLabel(pct: number | null): string {
  if (pct === null) return '—'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}
