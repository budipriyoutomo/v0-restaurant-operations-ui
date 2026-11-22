import type { scoreTone } from '@/lib/qa-audit'

// Text colour per score band (lib/qa-audit.scoreTone).
export const TONE_CLASS: Record<ReturnType<typeof scoreTone>, string> = {
  good: 'text-success', warn: 'text-warning', bad: 'text-destructive', none: 'text-muted-foreground',
}
