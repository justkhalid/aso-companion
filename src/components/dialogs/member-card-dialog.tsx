'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Camera, Check, Loader2, Printer, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { CARD_TYPES, MemberCard, titleCase, type CardType } from '@/components/member-card'

export interface CardMember { nr: number; name: string; occupation: string; banned: boolean; cardPrinted: boolean }

const OFFSET_KEY = 'aso-card-offset'
const readOffset = (): { x: number; y: number } => {
  try { const j = JSON.parse(window.localStorage.getItem(OFFSET_KEY) || '{}') as { x?: number; y?: number }; return { x: +(j.x || 0), y: +(j.y || 0) } } catch { return { x: 0, y: 0 } }
}

/* the photo spot on the card is 248 x 330: the picture is cropped to that shape and kept small */
function cropToPhoto(source: CanvasImageSource, sw: number, sh: number): string {
  const ratio = 248 / 330
  let w = sh * ratio
  let h = sh
  if (w > sw) { w = sw; h = sw / ratio }
  const c = document.createElement('canvas')
  c.width = 480
  c.height = Math.round(480 / ratio)
  c.getContext('2d')!.drawImage(source, (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}
function brightness(dataUrl: string): Promise<number> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 40; c.height = 53
      const g = c.getContext('2d')!; g.drawImage(img, 0, 0, 40, 53)
      const d = g.getImageData(0, 0, 40, 53).data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      res(sum / (d.length / 4))
    }
    img.onerror = () => res(128)
    img.src = dataUrl
  })
}

const post = async (body: Record<string, unknown>): Promise<{ ok: boolean; msg: string }> => {
  try {
    const r = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return (await r.json()) as { ok: boolean; msg: string }
  } catch { return { ok: false, msg: 'The app could not be reached.' } }
}

/* Make a membership card: take or upload the photo, pick the card type, print it, then confirm it printed so it leaves the waiting list. */
export function MemberCardDialog({ member, onClose, onDone }: { member: CardMember | null; onClose: () => void; onDone: () => void }) {
  const toast = useStore((s) => s.toast)
  const [photo, setPhoto] = React.useState('')
  const [loading, setLoading] = React.useState(!!member)
  const [cam, setCam] = React.useState<'off' | 'starting' | 'live'>('off')
  const [camErr, setCamErr] = React.useState('')
  const [light, setLight] = React.useState('')
  const [type, setType] = React.useState<CardType>('member')
  const [reason, setReason] = React.useState('')
  const [asking, setAsking] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  /* teacher and volunteer cards show when they stop being valid; the end of the school year is proposed and can be changed */
  const [until, setUntil] = React.useState(() => { const n = new Date(); return `${n.getMonth() >= 8 ? n.getFullYear() + 1 : n.getFullYear()}-06-30` })
  const [off, setOff] = React.useState(() => (typeof window === 'undefined' ? { x: 0, y: 0 } : readOffset()))
  const video = React.useRef<HTMLVideoElement>(null)
  const stream = React.useRef<MediaStream | null>(null)
  const nr = member?.nr

  const stop = React.useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam('off') }, [])

  /* open: read the saved photo of this member (it is only ever held while the card is being made) */
  React.useEffect(() => {
    if (!nr) return
    let live = true
    fetch('/api/members?nr=' + nr, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { member?: { photo?: string } | null }) => { if (live) setPhoto(j.member?.photo || '') })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false; stop() }
  }, [nr, stop])

  const startCam = async () => {
    setCamErr(''); setCam('starting')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      stream.current = s
      setCam('live')
      requestAnimationFrame(async () => { if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}) } })
    } catch (e) {
      setCam('off')
      const n = (e as Error).name
      setCamErr(n === 'NotAllowedError' || n === 'SecurityError' ? 'The camera was not allowed. Allow it in the browser and try again.' : n === 'NotFoundError' ? 'No camera was found. Upload a photo instead.' : n === 'NotReadableError' ? 'Another program is using the camera. Close it and try again.' : 'The camera could not start. Upload a photo instead.')
    }
  }

  const keep = async (dataUrl: string) => {
    if (!nr) return
    stop()
    const l = await brightness(dataUrl)
    setLight(l < 70 ? 'The photo looks dark. More light, or face a window, then retake it.' : l > 215 ? 'The photo looks washed out. Move away from bright light, then retake it.' : '')
    setPhoto(dataUrl)
    const r = await post({ action: 'savePhoto', nr, dataUrl })
    toast(r.ok ? 'Photo saved' : 'The photo is on the card but could not be saved: ' + r.msg, r.ok)
  }
  const snap = () => { const v = video.current; if (v && v.videoWidth) void keep(cropToPhoto(v, v.videoWidth, v.videoHeight)) }
  const upload = (f?: File) => {
    if (!f) return
    const img = new Image()
    img.onload = () => { void keep(cropToPhoto(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(img.src) }
    img.src = URL.createObjectURL(f)
  }

  const [printing, setPrinting] = React.useState(false)
  const print = async () => {
    if (!member) return
    if (member.cardPrinted && !reason) return toast('Choose why a new card is needed', false)
    try { window.localStorage.setItem(OFFSET_KEY, JSON.stringify(off)) } catch { /* fine */ }
    setPrinting(true)
    await document.fonts?.ready
    await new Promise((r) => setTimeout(r, 150))
    const style = document.createElement('style')
    style.textContent = '@page{size:85.6mm 54mm;margin:0}@media print{html,body{margin:0!important;background:#fff!important}body>*:not(#card-print){display:none!important}#card-print{display:block!important}}'
    document.head.appendChild(style)
    const after = () => { style.remove(); window.removeEventListener('afterprint', after); setPrinting(false); setAsking(true) }
    window.addEventListener('afterprint', after)
    window.print()
  }
  const confirm = async (ok: boolean) => {
    if (!ok || !member) return setAsking(false)
    setBusy(true)
    const r = await post({ action: 'markPrinted', nr: member.nr, by: 'ASO Companion' + (reason ? ' - reprint: ' + reason : '') })
    setBusy(false)
    toast(r.ok ? `Card for ${titleCase(member.name)} marked as printed` : r.msg, r.ok)
    if (r.ok) { setAsking(false); onDone(); onClose() }
  }

  const expires = type === 'teacher' || type === 'volunteer'
  const issued = expires && until ? new Date(until + 'T12:00:00') : undefined
  const data = member ? { nr: member.nr, name: member.name, occupation: member.occupation, photo } : null
  return (
    <>
      <Dialog open={!!member} onOpenChange={(o) => { if (!o) { stop(); onClose() } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          {member && data && (
            <>
              <DialogHeader>
                <DialogTitle>Make a card for {titleCase(member.name) || 'this member'}</DialogTitle>
                <DialogDescription>Member number {member.nr}{member.banned ? ' · Banned' : ''}{member.cardPrinted ? ' · A card was already printed' : ''}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <div>
                  <div className="overflow-hidden rounded-xl border border-border shadow-sm"><MemberCard m={data} type={type} issued={issued} /></div>
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Card type">
                    {CARD_TYPES.map((t) => (
                      <button key={t.key} type="button" aria-pressed={type === t.key} onClick={() => setType(t.key)} className={cn('h-8 rounded-full border px-3 text-xs font-bold', type === t.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary')}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div className="grid content-start gap-3">
                  <div>
                    <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Photo</div>
                    {cam !== 'off' ? (
                      <div className="grid gap-2">
                        <div className="relative aspect-[248/330] w-40 overflow-hidden rounded-lg bg-black">
                          <video ref={video} playsInline muted className="h-full w-full object-cover" />
                          {cam === 'starting' && <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white" />}
                        </div>
                        <div className="flex gap-2"><Button size="sm" onClick={snap} disabled={cam !== 'live'}><Camera className="h-4 w-4" /> Take photo</Button><Button size="sm" variant="outline" onClick={stop}>Cancel</Button></div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant={photo ? 'outline' : 'default'} onClick={() => void startCam()}><Camera className="h-4 w-4" /> {photo ? 'Retake' : 'Use the camera'}</Button>
                        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-sm font-semibold hover:bg-secondary"><Upload className="h-4 w-4" /> Upload<input type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} /></label>
                        {loading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                      </div>
                    )}
                    {camErr && <p className="mt-1.5 text-xs text-destructive">{camErr}</p>}
                    {light && <p className="mt-1.5 text-xs text-[var(--aso-gold)]">{light}</p>}
                    <p className="mt-1.5 text-xs text-muted-foreground">Face centered, eyes level, plain background, good light.</p>
                  </div>

                  {expires && (
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Valid until
                      <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-foreground" />
                    </label>
                  )}

                  {member.cardPrinted && (
                    <div>
                      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Why a new card?</div>
                      <div className="flex flex-wrap gap-1.5">
                        {['lost', 'damaged', 'new photo', 'other'].map((r) => (
                          <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={cn('h-8 rounded-full border px-3 text-xs font-bold capitalize', reason === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary')}>{r}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-semibold">Printer position</summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="grid gap-1">Right / left (mm)<input type="number" step="0.25" min={-5} max={5} value={off.x} onChange={(e) => setOff((o) => ({ ...o, x: +e.target.value }))} className="rounded-md border border-border bg-background px-2 py-1" /></label>
                      <label className="grid gap-1">Down / up (mm)<input type="number" step="0.25" min={-5} max={5} value={off.y} onChange={(e) => setOff((o) => ({ ...o, y: +e.target.value }))} className="rounded-md border border-border bg-background px-2 py-1" /></label>
                    </div>
                    <p className="mt-1.5">Printer: Zebra ZC100, card size CR80, landscape. In the print window set margins to none and scale to 100.</p>
                  </details>

                  {member.banned && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-semibold text-destructive">This member is banned. Print only if you are sure.</p>}
                  {!photo && !loading && <p className="text-xs text-muted-foreground">No photo yet: the card prints with an empty photo spot.</p>}

                  {asking ? (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                      <p className="mb-2 text-sm font-bold">Did the card print correctly?</p>
                      <p className="mb-2 text-xs text-muted-foreground">If yes, the member leaves the waiting list.</p>
                      <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => void confirm(true)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Yes, card printed</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void confirm(false)}>No, keep in the list</Button></div>
                    </div>
                  ) : (
                    <Button onClick={() => void print()} disabled={printing || loading}><Printer className="h-4 w-4" /> {printing ? 'Printing...' : 'Print card'}</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* the page the printer receives: only the card, 85.6 x 54 mm */}
      {typeof document !== 'undefined' && member && data && createPortal(
        <div id="card-print" style={{ display: 'none', width: '85.6mm', height: '54mm', overflow: 'hidden' }}>
          <div style={{ width: '85.6mm', transform: `translate(${off.x}mm, ${off.y}mm)` }}><MemberCard m={data} type={type} issued={issued} /></div>
        </div>,
        document.body,
      )}
    </>
  )
}
