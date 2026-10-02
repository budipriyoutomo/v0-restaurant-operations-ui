import type { scoreTone } from '@/lib/qa-audit'

// Text colour per score band (lib/qa-audit.scoreTone).
export const TONE_CLASS: Record<ReturnType<typeof scoreTone>, string> = {
  good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-red-600', none: 'text-muted-foreground',
}
