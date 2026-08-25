'use client'

import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

/**
 * Renders an image served by an authenticated endpoint.
 *
 * A plain <img src="/api/..."> can't attach the Bearer token, so we fetch the
 * bytes with auth, wrap them in an object URL, and revoke it on unmount.
 */
export function AuthedImage({ path, alt, className }: { path: string; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    api.objectUrl(path)
      .then((u) => { if (cancelled) { URL.revokeObjectURL(u) } else { revoked = u; setUrl(u) } })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked) }
  }, [path])

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}>
        <ImageOff className="size-4" />
      </div>
    )
  }
  if (!url) {
    return <div className={cn('animate-pulse bg-muted', className)} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt ?? ''} className={className} />
}
