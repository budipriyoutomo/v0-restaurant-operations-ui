// One money format everywhere (Todo-Pilot §26 / UX-13).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoneyInput } from './money'

describe('formatMoney', () => {
  it('rupiah with dots, ringgit as RM, others by code; nothing → dash', () => {
    expect(formatMoney(5_000_000)).toBe('Rp 5.000.000')
    expect(formatMoney(0, 'IDR')).toBe('Rp 0')
    expect(formatMoney(5000, 'MYR')).toBe('RM 5,000')
    expect(formatMoney(1200, 'USD')).toBe('USD 1,200')
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
  })

  it('parses what people type', () => {
    expect(parseMoneyInput('Rp 5.000.000')).toBe(5_000_000)
    expect(parseMoneyInput('')).toBeNull()
  })
})

describe('no hand-made money formatting', () => {
  const root = path.resolve(__dirname, '..')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name)
      if (statSync(p).isDirectory()) { if (!['node_modules', '.next', 'i18n'].includes(name)) walk(p) }
      else if (/\.tsx?$/.test(name) && !/\.test\./.test(name) && !p.endsWith(path.join('lib', 'money.ts'))) files.push(p)
    }
  }
  walk(path.join(root, 'components'))
  walk(path.join(root, 'lib'))

  it('uses formatMoney instead of "Rp " + toLocaleString or Intl currency', () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8')
      return /['"`]Rp \$?\{?|Rp \{|style: 'currency'/.test(src)
    }).map((f) => path.relative(root, f))
    expect(offenders).toEqual([])
  })
})
