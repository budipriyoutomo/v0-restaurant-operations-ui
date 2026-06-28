import type { LucideIcon } from 'lucide-react'
import { Clock } from 'lucide-react'

interface PlaceholderPageProps {
  icon: LucideIcon
  title: string
  description: string
}

export function PlaceholderPage({ icon: Icon, title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center px-6">
      {/* Coming soon badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-muted-foreground mb-6 uppercase tracking-wide">
        <Clock className="size-3" />
        Coming Soon
      </div>

      {/* Module icon */}
      <div className="size-16 rounded-2xl bg-muted/80 border border-border flex items-center justify-center mb-5 shadow-sm">
        <Icon className="size-8 text-muted-foreground" />
      </div>

      {/* Title & description */}
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>

      {/* Decorative progress indicator */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full bg-muted"
              style={{ width: i === 0 ? '2rem' : '0.75rem' }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">This module is in development</p>
      </div>
    </div>
  )
}
