// Installable PWA (Todo-PWA P0): manifest fields, icon files, brand colours.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from '@/app/manifest'
import { BRAND, siteMetadata as metadata, siteViewport as viewport } from './pwa'

const root = path.resolve(__dirname, '..')
const m = manifest()

// PNG header: width/height are big-endian uint32 at bytes 16 and 20.
function pngSize(file: string): [number, number] {
  const buf = readFileSync(file)
  expect(buf.subarray(1, 4).toString()).toBe('PNG')
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)]
}

// globals.css token → sRGB hex, so the manifest follows a palette change.
function tokenHex(selector: ':root' | '.dark', name: string): string {
  const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8')
  const block = css.slice(css.indexOf(`${selector} {`))
  const [L, C, h] = block.match(new RegExp(`--${name}: oklch\\(([^)]*)\\)`))![1].split(/\s+/).map(Number)
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return '#' + [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s]
    .map((x) => Math.min(Math.max(x, 0), 1))
    .map((x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055))
    .map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

describe('web app manifest', () => {
  it('has the fields Chrome needs to install', () => {
    expect(m.name).toBe('RestaurantOps')
    expect(m.short_name).toBe('RestoOps')
    expect(m.start_url).toBe('/')          // role home page, default "Pekerjaan Saya"
    expect(m.scope).toBe('/')
    expect(m.display).toBe('standalone')
    expect(m.lang).toBe('id')
    expect(m.theme_color).toBe(BRAND.primary)
    expect(m.background_color).toBe(BRAND.background)
  })

  it('lists 192 and 512 icons plus one maskable, all present in public/ at their declared size', () => {
    const icons = m.icons ?? []
    const sizes = icons.filter((i) => i.purpose !== 'maskable').map((i) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(icons.filter((i) => i.purpose === 'maskable')).toHaveLength(1)
    for (const icon of icons) {
      const file = path.join(root, 'public', icon.src)
      expect(existsSync(file), icon.src).toBe(true)
      expect(icon.type).toBe('image/png')
      expect(pngSize(file).join('x')).toBe(icon.sizes)
    }
  })
})

describe('manifest shortcuts (long-press the app icon)', () => {
  it('Lapor Masalah, Pekerjaan Saya, Persetujuan — each a route the app opens, with an icon in public/', () => {
    const shortcuts = m.shortcuts ?? []
    expect(shortcuts.map((s) => [s.name, s.url])).toEqual([
      ['Lapor Masalah', '/issues?new=1'],          // same as "Lapor" in the bottom bar
      ['Pekerjaan Saya', '/my-work'],
      ['Persetujuan', '/approvals'],
    ])
    for (const s of shortcuts) {
      expect(s.short_name, s.name).toBeTruthy()
      for (const icon of s.icons ?? []) {
        expect(pngSize(path.join(root, 'public', icon.src)).join('x')).toBe(icon.sizes)
      }
      expect(s.icons, s.name).toHaveLength(1)
    }
  })
})

describe('brand colours', () => {
  it('match the theme tokens in globals.css', () => {
    expect(BRAND.primary).toBe(tokenHex(':root', 'primary'))
    expect(BRAND.background).toBe(tokenHex(':root', 'background'))
    expect(BRAND.backgroundDark).toBe(tokenHex('.dark', 'background'))
  })
})

describe('root layout metadata', () => {
  it('links the manifest, sets iOS standalone meta and drops the v0 generator', () => {
    expect(metadata.manifest).toBe('/manifest.webmanifest')
    expect(metadata.appleWebApp).toMatchObject({ capable: true, title: 'RestoOps' })
    expect(metadata.generator).toBeUndefined()
  })

  it('paints the status bar per colour scheme and extends under the notch', () => {
    expect(viewport.viewportFit).toBe('cover')
    expect(viewport.themeColor).toEqual([
      { media: '(prefers-color-scheme: light)', color: BRAND.background },
      { media: '(prefers-color-scheme: dark)', color: BRAND.backgroundDark },
    ])
  })

  it('is what the root layout exports', () => {
    const layout = readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
    expect(layout).toMatch(/export const metadata = siteMetadata\b/)
    expect(layout).toMatch(/export const viewport = siteViewport\b/)
  })

  it('serves the brand favicon and apple-touch icon through the app/ file convention', () => {
    expect(existsSync(path.join(root, 'app/icon.svg'))).toBe(true)
    expect(pngSize(path.join(root, 'app/apple-icon.png'))).toEqual([180, 180])
    // v0 placeholders are gone
    for (const f of ['icon.svg', 'apple-icon.png', 'icon-light-32x32.png', 'icon-dark-32x32.png']) {
      expect(existsSync(path.join(root, 'public', f)), f).toBe(false)
    }
  })
})
