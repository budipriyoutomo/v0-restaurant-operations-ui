// Page side of public/sw.js (Todo-PWA P1).

// Build id baked in at `next build` (next.config.mjs → env). The worker is
// registered as /sw.js?v=<id>, and /version.json reports the deployed one.
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'

/** Build of a worker, from its script URL (`/sw.js?v=<id>`). */
export function swVersion(scriptURL: string): string | null {
  try { return new URL(scriptURL).searchParams.get('v') } catch { return null }
}

/**
 * A worker is installed and waiting. Same build as this page: the page is
 * already the new version, switch the worker on quietly. Newer build: this
 * page is out of date — ask the user, so a reload never eats a half-filled form.
 */
export function waitingAction(scriptURL: string, pageVersion: string): 'activate' | 'prompt' {
  return swVersion(scriptURL) === pageVersion ? 'activate' : 'prompt'
}

/** Logout: drop cached pages of every build (static assets stay). */
export async function clearPageCache(): Promise<void> {
  if (typeof caches === 'undefined') return
  const names = await caches.keys()
  await Promise.all(names.filter((n) => n.startsWith('ro-pages-')).map((n) => caches.delete(n)))
}
