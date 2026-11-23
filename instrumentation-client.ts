// Runs in the browser before the app starts (Next.js instrumentation-client).
// Error tracking is off unless NEXT_PUBLIC_SENTRY_DSN is set (Todo-Review P1 #5).
import { initErrorTracking } from './lib/error-tracking'

void initErrorTracking(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev')
