'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, QrCode, Camera, Printer, Loader2, Keyboard } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { QRResolveResult } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

// The browser-native barcode API — present on Android Chrome (the field case),
// absent on desktop Safari/Firefox, where we fall back to manual entry.
type BarcodeDetectorCtor = new (opts?: { formats: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}
function getBarcodeDetector(): BarcodeDetectorCtor | null {
  return (typeof window !== 'undefined' && 'BarcodeDetector' in window)
    ? (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector
    : null
}

export function QrDialog({ onClose, onResolved }: {
  onClose: () => void
  onResolved: (r: QRResolveResult) => void
}) {
  const { assets, resolveQr } = useIssueStore()
  const [tab, setTab] = useState<'scan' | 'print'>('scan')
  const { t } = useT()

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" className="bg-background rounded-lg border border-border shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <QrCode className="size-4 text-primary" />
            <h2 className="text-sm font-bold">{t('qr.title')}</h2>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          {(['scan', 'print'] as const).map((id) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-md',
                tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}>
              {id === 'scan' ? t('qr.scan') : t('qr.print')}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'scan'
            ? <ScanTab resolveQr={resolveQr} onResolved={onResolved} />
            : <PrintTab assets={assets} />}
        </div>
      </div>
    </div>
  )
}

// Also used by the report form to pick an asset (Todo-Pilot §20) — hence
// type="button" everywhere: it may sit inside a <form>.
export function ScanTab({ resolveQr, onResolved }: {
  resolveQr: (token: string) => Promise<QRResolveResult>
  onResolved: (r: QRResolveResult) => void
}) {
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const hasCamera = getBarcodeDetector() !== null

  const resolve = async (token: string) => {
    if (!token.trim()) return
    setBusy(true)
    try {
      const result = await resolveQr(token.trim())
      onResolved(result)
    } catch (e) {
      toast.error(e instanceof Error && e.message.includes('404') ? t('qr.unknown') : t('qr.resolveFailed'))
    } finally {
      setBusy(false)
    }
  }

  // Camera scan loop — only when supported and switched on.
  useEffect(() => {
    if (!cameraOn) return
    const Detector = getBarcodeDetector()
    if (!Detector) return
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    const detector = new Detector({ formats: ['qr_code'] })

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        const tick = async () => {
          if (stopped || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) { stopped = true; setCameraOn(false); resolve(codes[0].rawValue); return }
          } catch { /* transient */ }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        toast.error(t('qr.noCamera'))
        setCameraOn(false)
      }
    })()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [cameraOn]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      {hasCamera ? (
        <>
          {cameraOn
            ? <video ref={videoRef} className="w-full aspect-square rounded-md bg-black object-cover" muted playsInline />
            : (
              <button type="button" onClick={() => setCameraOn(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
                <Camera className="size-4" /> {t('qr.openCamera')}
              </button>
            )}
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Keyboard className="size-3.5" /> {t('qr.noScanner')}
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve(manual) } }}
          aria-label={t('qr.manualPlaceholder')}
          placeholder={t('qr.manualPlaceholder')}
          className="flex-1 h-9 rounded-md border border-border bg-muted/20 px-3 text-xs font-mono"
        />
        <button type="button" onClick={() => resolve(manual)} disabled={busy || !manual.trim()}
          className="px-3 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} {t('qr.open')}
        </button>
      </div>
    </div>
  )
}

function PrintTab({ assets }: { assets: { id: string; name: string; number: string; qrToken: string | null }[] }) {
  const [dataUrls, setDataUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(
      assets.filter((a) => a.qrToken).map(async (a) => [a.id, await QRCode.toDataURL(a.qrToken!, { margin: 1, width: 160 })] as const),
    ).then((entries) => { if (!cancelled) setDataUrls(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [assets])

  const printable = assets.filter((a) => a.qrToken)
  const { t } = useT()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t('qr.ready', { count: printable.length })}</p>
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent">
          <Printer className="size-3.5" /> {t('qr.printButton')}
        </button>
      </div>
      {printable.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-6">{t('qr.noAssets')}</p>
      ) : (
        <div id="qr-print-area" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {printable.map((a) => (
            <div key={a.id} className="border border-border rounded-md p-2 flex flex-col items-center text-center bg-white">
              {dataUrls[a.id]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={dataUrls[a.id]} alt={a.name} className="w-full max-w-[120px]" />
                : <div className="w-[120px] h-[120px] animate-pulse bg-muted" />}
              <p className="text-[10px] font-mono mt-1 text-black">{a.number}</p>
              <p className="text-[9px] text-neutral-600 truncate w-full">{a.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
