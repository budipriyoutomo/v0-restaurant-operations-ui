// Brand icons (Todo-PWA P0): lucide "Utensils" in white on --primary, as in the
// sidebar logo. Run after changing the glyph or colour:
//   node scripts/generate-icons.mjs
// sharp ships with Next (image optimisation), so no extra dependency.
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PRIMARY = '#0070c4'   // BRAND.primary in lib/pwa.ts
const GLYPH = [               // lucide-react icons/utensils.js, 24×24 viewBox
  'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2',
  'M7 2v20',
  'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7',
]

// Manifest shortcuts (long-press the app icon): lucide plus, list-checks, circle-check.
const SHORTCUTS = {
  'shortcut-report': ['<path d="M5 12h14"/>', '<path d="M12 5v14"/>'],
  'shortcut-my-work': ['<path d="M13 5h8"/>', '<path d="M13 12h8"/>', '<path d="M13 19h8"/>',
    '<path d="m3 17 2 2 4-4"/>', '<path d="m3 7 2 2 4-4"/>'],
  'shortcut-approvals': ['<circle cx="12" cy="12" r="10"/>', '<path d="m9 12 2 2 4-4"/>'],
}

// glyph: share of the canvas the 24-unit glyph box takes; radius: corner share
// (0 = full bleed, for maskable/apple where the OS applies its own mask).
function svg({ size, glyph, radius, shapes = GLYPH.map((d) => `<path d="${d}"/>`) }) {
  const g = size * glyph, scale = g / 24, off = (size - g) / 2
  const paths = shapes.join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${size * radius}" fill="${PRIMARY}"/>` +
    `<g transform="translate(${off} ${off}) scale(${scale})" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</g>` +
    `</svg>`
}

const png = (file, opts) =>
  sharp(Buffer.from(svg(opts))).png().toFile(path.join(root, file))

await Promise.all([
  png('public/icon-192.png', { size: 192, glyph: 0.55, radius: 0.22 }),
  png('public/icon-512.png', { size: 512, glyph: 0.55, radius: 0.22 }),
  // maskable: the glyph stays inside the 80% safe circle whatever the mask shape
  png('public/icon-maskable-512.png', { size: 512, glyph: 0.45, radius: 0 }),
  png('app/apple-icon.png', { size: 180, glyph: 0.55, radius: 0 }),
  ...Object.entries(SHORTCUTS).map(([name, shapes]) =>
    png(`public/${name}.png`, { size: 96, glyph: 0.5, radius: 0.22, shapes })),
])
writeFileSync(path.join(root, 'app/icon.svg'), svg({ size: 32, glyph: 0.62, radius: 0.22 }) + '\n')
console.log('icons written')
