// The one way to show money (Todo-Pilot §26 / UX-13). Amounts are integer
// major units (IDR has no cents in this app). Rupiah always uses dot grouping
// ("Rp 5.000.000") whatever the interface language, as on receipts.

/** Integer major units → "Rp 5.000.000" / "RM 5,000" / "USD 1,200"; null → "—". */
export function formatMoney(amount: number | null | undefined, currency: string = 'IDR'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—'
  if (currency === 'IDR') return 'Rp ' + Math.round(amount).toLocaleString('id-ID')
  const prefix = currency === 'MYR' ? 'RM' : currency
  return `${prefix} ${amount.toLocaleString('en-US')}`
}

/** "Rp 5.000.000" / "5000000" from an input box → 5000000; empty → null. */
export function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, '')
  return digits ? Number(digits) : null
}
