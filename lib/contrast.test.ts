// Colour contrast (Todo-Pilot §26 / UX-13, Todo-Modern-UI Fase 1).
// 1. The design tokens in app/globals.css, light and dark: every text pair the
//    app uses must reach WCAG AA, controls and marks 3:1.
// 2. No raw Tailwind palette classes (bg-red-100, text-amber-700, …): colours
//    come from the tokens, so 1. covers every colour the app shows.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

// ── WCAG ratio ────────────────────────────────────────────────────────────────
const linear = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
const relLum = ([r, g, b]: number[]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
const contrast = (x: number, y: number) => {
  const [hi, lo] = [x, y].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}
const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

// ── 1. Tokens ─────────────────────────────────────────────────────────────────
const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8')
function tokens(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`)
  const body = css.slice(start, css.indexOf('}', start))
  return new Map([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]))
}
const MODES = { light: tokens(':root'), dark: tokens('.dark') }

// [foreground, background] the app puts together.
const TEXT_PAIRS = [
  ['foreground', 'background'], ['foreground', 'card'], ['foreground', 'muted'],
  ['muted-foreground', 'background'], ['muted-foreground', 'card'], ['muted-foreground', 'muted'],
  ['card-foreground', 'card'], ['popover-foreground', 'popover'],
  ['secondary-foreground', 'secondary'], ['accent-foreground', 'accent'],
  ['primary-foreground', 'primary'], ['primary', 'background'], ['primary', 'card'],
  ['destructive-foreground', 'destructive'],
  ['destructive', 'background'], ['destructive', 'card'], ['destructive', 'destructive-soft'],
  ['warning', 'background'], ['warning', 'card'],
  ['success', 'background'], ['success', 'card'], ['success-foreground', 'success'],
  ['background', 'muted-foreground'],
  ['sidebar-foreground', 'sidebar'], ['sidebar-muted', 'sidebar'], ['sidebar-foreground', 'sidebar-accent'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
] as const
// Borders of controls, focus ring, coloured marks: WCAG 1.4.11, 3:1.
const MARK_PAIRS = [
  ['input', 'background'], ['input', 'card'], ['ring', 'background'], ['ring', 'card'],
  ['warning-mark', 'card'], ['success', 'card'], ['destructive', 'card'],
] as const

describe('design tokens (WCAG AA)', () => {
  for (const [mode, map] of Object.entries(MODES)) {
    const ratio = (fg: string, bg: string) => {
      expect(map.get(fg), `${mode} --${fg}`).toBeDefined()
      expect(map.get(bg), `${mode} --${bg}`).toBeDefined()
      return contrast(relLum(hexRgb(map.get(fg)!)), relLum(hexRgb(map.get(bg)!)))
    }
    it(`${mode}: text pairs reach 4.5:1`, () => {
      const low = TEXT_PAIRS.filter(([fg, bg]) => ratio(fg, bg) < 4.5).map(([fg, bg]) => `${fg}/${bg} ${ratio(fg, bg).toFixed(2)}`)
      expect(low).toEqual([])
    })
    it(`${mode}: control borders and marks reach 3:1`, () => {
      const low = MARK_PAIRS.filter(([fg, bg]) => ratio(fg, bg) < 3).map(([fg, bg]) => `${fg}/${bg} ${ratio(fg, bg).toFixed(2)}`)
      expect(low).toEqual([])
    })
  }
})

// ── 2. Raw palette classes ────────────────────────────────────────────────────
const HUES = 'red|orange|amber|yellow|green|emerald|cyan|blue|purple|rose|violet|gray|slate|indigo|teal|lime|pink|sky|zinc|neutral|stone|fuchsia'
const RAW = new RegExp(`(?:^|[^a-z-])(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|accent|caret|shadow)-(?:${HUES})-\\d{2,3}`)

const files = new Map<string, string>()
const walk = (dir: string) => {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n)
    if (statSync(p).isDirectory()) { if (n !== 'ui' && n !== 'node_modules') walk(p) }   // shadcn primitives use theme tokens
    else if (/\.tsx?$/.test(n) && !n.includes('.test.')) files.set(path.relative(root, p), readFileSync(p, 'utf8'))
  }
}
for (const dir of ['app', 'components', 'lib']) walk(path.join(root, dir))

describe('raw palette colours', () => {
  it('are not used: every colour is a theme token', () => {
    const offenders = [...files].filter(([, src]) => RAW.test(src)).map(([f]) => f)
    expect(offenders).toEqual([])
  })
})
