// One id per build for the service worker cache names (Todo-PWA P1): the
// commit on Vercel / Netlify, else the build time. Set on process.env so build
// workers inherit the same value; NEXT_PUBLIC_* is inlined at build.
process.env.NEXT_PUBLIC_BUILD_ID ||= (
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || Date.now().toString(36)
).slice(0, 12)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the Playwright server (NEXT_DIST_DIR=.next-e2e) run beside `next dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
