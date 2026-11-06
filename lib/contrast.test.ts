// Colour contrast (Todo-Pilot §26 / UX-13, Todo-Modern-UI Fase 1).
// 1. The design tokens in app/globals.css, light and dark: every text pair the
//    app uses must reach WCAG AA, controls and marks 3:1.
// 2. Raw Tailwind palette classes are on their way out: only the files listed
//    below may still use them, and each Fase 1 PR shortens the list.
// 3. While they remain, raw badge/text pairs are still checked against
//    Tailwind's own palette (OKLCH → sRGB → WCAG ratio).
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
  ['success', 'background'], ['success', 'card'],
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

// Shrinks with each Fase 1 PR; empty = done. Do not add to it.
const RAW_COLOUR_LEFT = new Set([
  'components/cmms/qr-dialog.tsx',
  'components/cmms/work-order-drawer.tsx',
  'components/dashboard/outlet-comparison.tsx',
  'components/dialogs/create-issue-dialog.tsx',
  'components/guest/guest-case-drawer.tsx',
  'components/guest/guest-kpi-panel.tsx',
  'components/ops/checklist-runner.tsx',
  'components/ops/day-signoff.tsx',
  'components/ops/kpi-panel.tsx',
  'components/ops/sensor-panel.tsx',
  'components/ops/temperature-panel.tsx',
  'components/pages/analytics-page-new.tsx',
  'components/pages/approval-center-page.tsx',
  'components/pages/assets-page.tsx',
  'components/pages/executive-dashboard-page.tsx',
  'components/pages/guest-page.tsx',
  'components/pages/issues-list-page.tsx',
  'components/pages/maintenance-module-page.tsx',
  'components/pages/marketing-page.tsx',
  'components/pages/master-data-page.tsx',
  'components/pages/my-work-page.tsx',
  'components/pages/ops-checklist-page.tsx',
  'components/pages/platform-page.tsx',
  'components/pages/procurement-page.tsx',
  'components/pages/qa-page.tsx',
  'components/pages/settings-page.tsx',
  'components/pages/task-center-page.tsx',
  'components/pages/training-page.tsx',
  'components/pages/users-page.tsx',
  'components/procurement/purchasing-panel.tsx',
  'components/qa/audit-runner.tsx',
  'components/qa/qa-scores-panel.tsx',
  'components/shared/engineering-kpi-bar.tsx',
  'components/shared/offline-status-bar.tsx',
  'components/shared/onboarding-checklist.tsx',
  'components/shared/unlinked-assignee-note.tsx',
  'components/training/attendance-recap.tsx',
  'components/training/participants-drawer.tsx',
  'components/users/shared.tsx',
  'components/users/user-card.tsx',
])

describe('raw palette colours', () => {
  it('appear only in files still waiting for the token pass', () => {
    const offenders = [...files].filter(([f, src]) => RAW.test(src) && !RAW_COLOUR_LEFT.has(f)).map(([f]) => f)
    expect(offenders).toEqual([])
  })

  it('the waiting list only holds files that still need it', () => {
    const clean = [...RAW_COLOUR_LEFT].filter((f) => !RAW.test(files.get(f) ?? ''))
    expect(clean).toEqual([])
  })
})

// ── 3. Remaining raw pairs, against Tailwind's palette ───────────────────────
const theme = readFileSync(path.join(root, 'node_modules/tailwindcss/theme.css'), 'utf8')
const palette = new Map<string, number[]>()
for (const m of theme.matchAll(/--color-([a-z]+-\d+): oklch\(([^)]*)\)/g)) {
  palette.set(m[1], m[2].split(/\s+/).map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x))))
}

function paletteLum(name: string): number {
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
const ratio = (bg: string, fg: string) => contrast(paletteLum(bg), paletteLum(fg))

const all = [...files].filter(([f]) => f.startsWith('components/') || f === 'lib/tone.ts').map(([, src]) => src).join('\n')

describe('raw palette contrast (WCAG AA 4.5:1)', () => {
  it('badges: coloured text on its pale background', () => {
    const pairs = new Set([...all.matchAll(new RegExp(`(?<![:\\w-])bg-((?:${HUES})-(?:50|100))\\s+text-((?:${HUES})-\\d{3})`, 'g'))].map((m) => `${m[1]} ${m[2]}`))
    const low = [...pairs].map((p) => p.split(' ')).filter(([bg, fg]) => ratio(bg, fg) < 4.6).map(([bg, fg]) => `${bg}/${fg} ${ratio(bg, fg).toFixed(2)}`)
    expect(low).toEqual([])
  })

  it('badges in dark mode: light text on the deep background', () => {
    // `dark:bg-red-950/60` sits on the near-black page, so the real background is
    // darker than red-950: measuring against red-950 itself is the strict case.
    const pairs = new Set([...all.matchAll(new RegExp(`dark:bg-((?:${HUES})-(?:800|900|950))(?:/\\d+)?\\s+dark:text-((?:${HUES})-\\d{3})`, 'g'))].map((m) => `${m[1]} ${m[2]}`))
    const low = [...pairs].map((p) => p.split(' ')).filter(([bg, fg]) => ratio(bg, fg) < 4.5).map(([bg, fg]) => `${bg}/${fg} ${ratio(bg, fg).toFixed(2)}`)
    expect(low).toEqual([])
  })

  it('status text on the white page', () => {
    const colours = new Set([...all.matchAll(new RegExp(`(?<![:\\w-])text-((?:${HUES})-\\d{3})\\b`, 'g'))].map((m) => m[1]))
    const low = [...colours].filter((c) => ratio('white', c) < 4.5).map((c) => `${c} ${ratio('white', c).toFixed(2)}`)
    expect(low).toEqual([])
  })
})
