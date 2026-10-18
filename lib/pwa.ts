// Installable PWA (Todo-PWA P0). Brand colours are the sRGB of the globals.css
// tokens (manifest and <meta theme-color> cannot read CSS variables); pwa.test
// fails when a token changes without this file.
import type { Metadata, Viewport } from 'next'

export const BRAND = {
  primary: '#0070c4',          // --primary (light)
  background: '#f9fafb',       // --background (light)
  backgroundDark: '#020405',   // --background (.dark)
} as const

export const APP_NAME = 'RestaurantOps'
export const APP_SHORT_NAME = 'RestoOps'

export const siteMetadata: Metadata = {
  title: 'RestaurantOps — Operations Management Platform',
  description: 'Enterprise-grade restaurant chain operations management: tickets, CMMS, finance, QA, and guest service.',
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: 'default' },
}

export const siteViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',        // standalone: content under the notch, padded by env(safe-area-inset-*)
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND.background },
    { media: '(prefers-color-scheme: dark)', color: BRAND.backgroundDark },
  ],
}
