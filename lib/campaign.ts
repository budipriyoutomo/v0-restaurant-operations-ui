// Campaign screen rules (Todo-Pilot §10). Pure — tested in campaign.test.ts.
import { translate } from './i18n/translate'
import type { Locale } from './i18n/locale'

// Money formatting lives in lib/money.ts (Todo-Pilot §26); re-exported for existing callers.
export { formatMoney, parseMoneyInput } from './money'

export function budgetBar(budget: number | null, actual: number | null, locale: Locale = 'en'): { fill: number; over: boolean; label: string } {
  if (!budget) return { fill: 0, over: false, label: translate(locale, 'campaignMoney.noBudget') }
  if (actual === null) return { fill: 0, over: false, label: translate(locale, 'campaignMoney.noSpend') }
  const pct = Math.round((actual * 1000) / budget) / 10
  const over = actual > budget
  return { fill: Math.min(100, pct), over, label: translate(locale, over ? 'campaignMoney.usedOver' : 'campaignMoney.used', { pct }) }
}

export function upliftLabel(pct: number | null): string {
  if (pct === null) return '—'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}
