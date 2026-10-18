import type { MetadataRoute } from 'next'
import { APP_NAME, APP_SHORT_NAME, BRAND } from '@/lib/pwa'

// Served at /manifest.webmanifest. Icons come from scripts/generate-icons.mjs.
// start_url "/" opens the role's home page (default "Pekerjaan Saya").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: 'Operasional restoran: masalah, perintah kerja, checklist, dan persetujuan.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'id',
    theme_color: BRAND.primary,
    background_color: BRAND.background,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the app icon (Todo-PWA P3). Labels in Indonesian, like `lang`.
    shortcuts: [
      { name: 'Lapor Masalah', short_name: 'Lapor', url: '/issues?new=1', icons: [shortcutIcon('report')] },
      { name: 'Pekerjaan Saya', short_name: 'Pekerjaan', url: '/my-work', icons: [shortcutIcon('my-work')] },
      { name: 'Persetujuan', short_name: 'Persetujuan', url: '/approvals', icons: [shortcutIcon('approvals')] },
    ],
  }
}

function shortcutIcon(name: string) {
  return { src: `/shortcut-${name}.png`, sizes: '96x96', type: 'image/png' }
}
