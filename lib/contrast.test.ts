// Colour contrast of status text and badges (Todo-Pilot §26 / UX-13).
// Computed from Tailwind's own palette (OKLCH → sRGB → WCAG ratio), so the
// check follows any palette change. Light mode; `dark:` variants are skipped.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')
const theme = readFileSync(path.join(root, 'node_modules/tailwindcss/theme.css'), 'utf8')
const palette = new Map<string, number[]>()
for (const m of theme.matchAll(/--color-([a-z]+-\d+): oklch\(([^)]*)\)/g)) {
  palette.set(m[1], m[2].split(/\s+/).map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x))))
}

function luminance(name: string): number {
  if (name === 'white') return 1
  const [L, C, h] = palette.get(name)!
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((x) => Math.min(Math.max(x, 0), 1))
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}
const ratio = (bg: string, fg: string) => {
  const [x, y] = [luminance(bg), luminance(fg)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const sources: string[] = []
const walk = (dir: string) => {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n)
    if (statSync(p).isDirectory()) { if (n !== 'ui') walk(p) }      // shadcn primitives use theme tokens
    else if (n.endsWith('.tsx') && !n.includes('.test.')) sources.push(readFileSync(p, 'utf8'))
  }
}
walk(path.join(root, 'components'))
const all = sources.join('\n')
const HUES = 'red|orange|amber|yellow|green|emerald|cyan|blue|purple|rose|violet|gray|slate'

describe('contrast (WCAG AA 4.5:1)', () => {
  it('badges: coloured text on its pale background', () => {
    const pairs = new Set([...all.matchAll(new RegExp(`(?<![:\\w-])bg-((?:${HUES})-(?:50|100))\\s+text-((?:${HUES})-\\d{3})`, 'g'))].map((m) => `${m[1]} ${m[2]}`))
    const low = [...pairs].map((p) => p.split(' ')).filter(([bg, fg]) => ratio(bg, fg) < 4.6).map(([bg, fg]) => `${bg}/${fg} ${ratio(bg, fg).toFixed(2)}`)
    expect(pairs.size).toBeGreaterThan(5)
    expect(low).toEqual([])
  })

  it('status text on the white page', () => {
    const colours = new Set([...all.matchAll(new RegExp(`(?<![:\\w-])text-((?:${HUES})-\\d{3})\\b`, 'g'))].map((m) => m[1]))
    const low = [...colours].filter((c) => ratio('white', c) < 4.5).map((c) => `${c} ${ratio('white', c).toFixed(2)}`)
    expect(low).toEqual([])
  })
})
