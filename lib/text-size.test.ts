// No text below 12px (Todo-UI 0.5, standar desain): use text-xs. Every file
// under components/ except the shadcn primitives in components/ui.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')
const TINY = /text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/


function files(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n)
    if (statSync(p).isDirectory()) { if (n !== 'ui') files(p, out) }       // shadcn primitives
    else if (n.endsWith('.tsx') && !n.includes('.test.')) out.push(path.relative(root, p))
  }
  return out
}

describe('text size (≥ 12px)', () => {
  const offenders = files(path.join(root, 'components')).filter((f) => TINY.test(readFileSync(path.join(root, f), 'utf8')))

  it('no file uses text-[9px] / [10px] / [11px] — use text-xs', () => {
    expect(offenders).toEqual([])
  })
})
