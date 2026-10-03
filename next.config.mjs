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
