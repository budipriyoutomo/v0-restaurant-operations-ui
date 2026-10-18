import { BUILD_ID } from '@/lib/sw-client'

// The deployed build (Todo-PWA P1). An installed app left open for days asks
// this when it comes back to the foreground; a different answer registers the
// new service worker, which offers "Reload". Never cached by the worker.
export const dynamic = 'force-static'

export function GET() {
  return Response.json({ version: BUILD_ID }, { headers: { 'Cache-Control': 'no-store' } })
}
