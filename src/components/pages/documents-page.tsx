'use client'

import * as React from 'react'
import { ArrowLeft, Award, ChevronLeft, ChevronRight, Download, FileText, ImagePlus, Loader2, Megaphone, Plus, QrCode, Trash2, X } from 'lucide-react'
import { PageHead } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { jpegToA4Pdf } from '@/lib/documents/pdf'
import { type LookFields } from '@/lib/documents/common'
import { checkLink, defaultQrPoster, posterProblems, renderQrPoster, type QrPosterFields } from '@/lib/documents/qr-poster'
import { MAX_ROLES, callProblems, defaultCallPoster, formatDates, renderCallPoster, type CallPosterFields } from '@/lib/documents/call-poster'
import { MAX_SIGNERS, certificateProblems, defaultCertificate, renderCertificate, type CertificateFields } from '@/lib/documents/certificate'
import { buildReportDoc, defaultReportDoc, reportDocProblems, reportFileName, type ReportDocFields } from '@/lib/documents/report-doc'
import { MAX_PHOTOS, PHOTO_MAX_BYTES, PHOTO_TYPES, type DocPhoto } from '@/lib/documents/photos'
import { formatDay } from '@/lib/documents/dates'
import { GROUNDS } from '@/lib/kit/engine'
import { LOOKS, rg } from '@/lib/kit/decor'

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary'

/* the templates the space needs; the ones without `ready` are on the list so the director sees what is coming */
const TEMPLATES = [
  { id: 'qr-poster', title: 'Social media QR poster', hint: 'Instagram, Facebook and WhatsApp codes on one A4 page', icon: QrCode, ready: true },
  { id: 'call-poster', title: 'Volunteers and interns call', hint: 'A poster that invites people to join the team', icon: Megaphone, ready: true },
  { id: 'report', title: 'Activity report', hint: 'A Word document to fill in and edit: facts, results, lessons, follow-up', icon: FileText, ready: true },
  { id: 'certificate', title: 'Certificate', hint: 'For volunteers, interns and course participants', icon: Award, ready: true },
] as const

export function DocumentsPage() {
  const [open, setOpen] = React.useState<string | null>(null)
  const back = () => setOpen(null)
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {open === 'qr-poster' ? <QrPosterEditor onBack={back} /> : open === 'call-poster' ? <CallPosterEditor onBack={back} /> : open === 'certificate' ? <CertificateEditor onBack={back} /> : open === 'report' ? <ReportEditor onBack={back} /> : <TemplateList onOpen={setOpen} />}
    </div>
  )
}

function TemplateList({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div>
      <PageHead title="Documents" subtitle="Print-ready A4 pages in the ASO look. Pick a template, change the words, download the PDF." />
      <div className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.ready}
            onClick={() => onOpen(t.id)}
            className={cn(
              'flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors',
              t.ready ? 'hover:border-primary' : 'cursor-not-allowed opacity-60',
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <t.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{t.hint}</span>
              {!t.ready && <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">Coming soon</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  )
}

const card = 'space-y-3 rounded-2xl border border-border bg-card p-4'

/* the choices every document offers: page direction, colours, paper, background lightness and glass */
function LookCard<F extends LookFields>({ f, setF, noPage }: { f: F; setF: (next: F) => void; noPage?: boolean }) {
  return (
    <div className={cn(card, 'space-y-4')}>
      <div className="text-sm font-bold">Look</div>
      {!noPage && <Field label="Page">
        <div className="grid grid-cols-2 gap-2">
          {([false, true] as const).map((land) => (
            <button key={String(land)} type="button" onClick={() => setF({ ...f, landscape: land })} aria-pressed={f.landscape === land} className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium', f.landscape === land ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/60')}>
              <span className={cn('inline-block rounded-[2px] border-2 border-current', land ? 'h-3 w-4' : 'h-4 w-3')} />
              {land ? 'Landscape' : 'Portrait'}
            </button>
          ))}
        </div>
      </Field>}
      <Field label="Colours">
        <div className="flex flex-wrap gap-2">
          {Object.entries(LOOKS).map(([key, l]) => (
            <button key={key} type="button" title={l[0]} aria-label={l[0]} aria-pressed={f.look === key} onClick={() => setF({ ...f, look: key })} className={cn('h-8 w-8 rounded-full border-2', f.look === key ? 'border-primary ring-2 ring-primary/30' : 'border-white shadow')} style={{ background: `linear-gradient(135deg, ${rg(l[1])}, ${rg(l[2])})` }} />
          ))}
        </div>
      </Field>
      <Field label="Paper">
        <div className="flex flex-wrap gap-2">
          {Object.entries(GROUNDS).filter(([k]) => k !== 'look').map(([key, g]) => (
            <button key={key} type="button" title={g[0]} aria-label={g[0]} aria-pressed={f.ground === key} onClick={() => setF({ ...f, ground: key })} className={cn('h-7 w-7 rounded-full border-2', f.ground === key ? 'border-primary ring-2 ring-primary/30' : 'border-border')} style={{ background: g[1] ? rg(g[1]) : '#f4f0e8' }} />
          ))}
        </div>
      </Field>
      <Field label="Background">
        <div className="grid grid-cols-3 gap-2">
          {(['Standard', 'Light', 'Lighter'] as const).map((name, i) => (
            <button key={name} type="button" aria-pressed={f.light === i} onClick={() => setF({ ...f, light: i as 0 | 1 | 2 })} className={cn('rounded-lg border px-3 py-2 text-sm font-medium', f.light === i ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/60')}>
              {name}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Glass in the corners: ${f.glass}%`}>
        <input type="range" min={0} max={100} step={5} value={f.glass} onChange={(e) => setF({ ...f, glass: +e.target.value })} className="w-full" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <button key={i} type="button" aria-pressed={f.bg === i} onClick={() => setF({ ...f, bg: i })} className={cn('h-8 w-8 rounded-lg border text-xs font-semibold', f.bg === i ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
              {i + 1}
            </button>
          ))}
        </div>
      </Field>
    </div>
  )
}

/* the title block every document has */
function HeadCard<F extends { kicker: string; headline: string; subtitle: string; footer: string }>({ f, setF }: { f: F; setF: (next: F) => void }) {
  return (
    <div className={card}>
      <Field label="Small line above the title">
        <input className={inputCls} value={f.kicker} maxLength={50} onChange={(e) => setF({ ...f, kicker: e.target.value })} />
      </Field>
      <Field label="Title">
        <input className={inputCls} value={f.headline} maxLength={60} onChange={(e) => setF({ ...f, headline: e.target.value })} />
      </Field>
      <Field label="Text under the title">
        <textarea className={cn(inputCls, 'min-h-[72px]')} value={f.subtitle} maxLength={160} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
      </Field>
      <Field label="Name at the bottom">
        <input className={inputCls} value={f.footer} maxLength={50} onChange={(e) => setF({ ...f, footer: e.target.value })} />
      </Field>
    </div>
  )
}

/* The editor every template shares: the form on the left, the live A4 preview on the right, and the PDF. */
function DocEditor<F extends LookFields>({
  title,
  intro,
  f,
  render,
  problems,
  fileName,
  onBack,
  children,
}: {
  title: string
  intro: string
  f: F
  render: (f: F, width: number) => Promise<HTMLCanvasElement>
  problems: string[]
  fileName: string
  onBack: () => void
  children: React.ReactNode
}) {
  const toast = useStore((s) => s.toast)
  const [busy, setBusy] = React.useState(false)
  const [previewError, setPreviewError] = React.useState('')
  const [overflow, setOverflow] = React.useState(false)
  const host = React.useRef<HTMLDivElement>(null)
  const run = React.useRef(0)

  /* redraw the preview shortly after the last keystroke; an older drawing never replaces a newer one */
  React.useEffect(() => {
    const id = ++run.current
    const t = setTimeout(async () => {
      try {
        const c = await render(f, 720)
        if (id !== run.current || !host.current) return
        c.style.width = '100%'
        c.style.height = 'auto'
        c.style.display = 'block'
        host.current.replaceChildren(c)
        setOverflow(c.dataset.overflow === '1')
        setPreviewError('')
      } catch {
        if (id === run.current) setPreviewError('The preview could not be drawn. Check your connection and reload the page.')
      }
    }, 150)
    return () => clearTimeout(t)
  }, [f, render])

  async function download() {
    if (busy || problems.length || overflow) return
    setBusy(true)
    try {
      const c = await render(f, f.landscape ? 3508 : 2480) /* A4 at 300 dpi */
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.95))
      if (!blob) throw new Error('empty')
      const pdf = jpegToA4Pdf(new Uint8Array(await blob.arrayBuffer()), c.width, c.height, f.landscape)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(pdf)
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      toast(`PDF ready: ${fileName}`)
    } catch {
      toast('The PDF could not be made. Try again.', false)
    } finally {
      setBusy(false)
    }
  }

  const DownloadBtn = (
    <Button onClick={download} disabled={busy || problems.length > 0 || overflow} className="gap-2">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? 'Making the PDF...' : 'Download PDF'}
    </Button>
  )

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All documents
      </button>
      <PageHead title={title} subtitle={intro} right={DownloadBtn} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-4">{children}</div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm" style={{ aspectRatio: f.landscape ? '1.4142 / 1' : '1 / 1.4142' }}>
            <div ref={host} className="h-full w-full" />
          </div>
          {previewError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{previewError}</p>}
          {overflow && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">The page is full. Remove a photo or a point, or shorten the text, so everything has room.</p>}
          {problems.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm text-amber-700 dark:text-amber-300">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 lg:hidden">{DownloadBtn}</div>
        </div>
      </div>
    </div>
  )
}

function QrPosterEditor({ onBack }: { onBack: () => void }) {
  const [f, setF] = React.useState<QrPosterFields>(() => defaultQrPoster())

  /* the instagram handle the space is connected with, if any, instead of the built-in one */
  React.useEffect(() => {
    let alive = true
    fetch('/api/social/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { igName?: string | null } | null) => {
        const h = s?.igName?.replace(/^@/, '').trim()
        if (!alive || !h || !/^[\w.]+$/.test(h)) return
        setF((cur) => ({
          ...cur,
          items: cur.items.map((i) => (i.id === 'instagram' && i.url === defaultQrPoster().items[0].url ? { ...i, caption: `@${h}`, url: `https://www.instagram.com/${h}/` } : i)),
        }))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const setItem = (idx: number, patch: Partial<QrPosterFields['items'][number]>) => setF((cur) => ({ ...cur, items: cur.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }))

  return (
    <DocEditor title="Social media QR poster" intro="A4, ready to print. The preview updates as you type." f={f} render={renderQrPoster} problems={posterProblems(f)} fileName="ASO-social-media-QR-poster.pdf" onBack={onBack}>
      <LookCard f={f} setF={setF} />
      <div className={card}>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4" checked={f.icons} onChange={(e) => setF({ ...f, icons: e.target.checked })} />
          Icon above each code
        </label>
      </div>
      <HeadCard f={f} setF={setF} />
      {f.items.map((it, idx) => {
        const err = it.on ? checkLink(it.url) : null
        return (
          <div key={it.id} className={card}>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4" checked={it.on} onChange={(e) => setItem(idx, { on: e.target.checked })} />
              {it.label.charAt(0) + it.label.slice(1).toLowerCase()} code
            </label>
            {it.on && (
              <>
                <Field label="Link the code opens" error={err}>
                  <input className={inputCls} dir="ltr" inputMode="url" placeholder="https://" value={it.url} onChange={(e) => setItem(idx, { url: e.target.value })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name above the code">
                    <input className={inputCls} value={it.label} maxLength={30} onChange={(e) => setItem(idx, { label: e.target.value })} />
                  </Field>
                  <Field label="Text under the code">
                    <input className={inputCls} value={it.caption} maxLength={40} onChange={(e) => setItem(idx, { caption: e.target.value })} />
                  </Field>
                </div>
              </>
            )}
          </div>
        )
      })}
    </DocEditor>
  )
}

/* the photos of a document: added from the computer, shown whole, kept only in this browser */
function usePhotos(setPhotos: (fn: (cur: DocPhoto[]) => DocPhoto[]) => void, count: number) {
  const [error, setError] = React.useState('')
  const urls = React.useRef<string[]>([])
  React.useEffect(() => {
    const list = urls.current
    return () => list.forEach((u) => URL.revokeObjectURL(u))
  }, [])
  async function add(files: FileList | null) {
    if (!files?.length) return
    setError('')
    const room = MAX_PHOTOS - count
    const added: DocPhoto[] = []
    const bad: string[] = []
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      if (!PHOTO_TYPES.includes(file.type)) {
        bad.push(`${file.name}: use a JPG, PNG or WebP picture`)
        continue
      }
      if (file.size > PHOTO_MAX_BYTES) {
        bad.push(`${file.name}: the file is too big (15 MB at most)`)
        continue
      }
      const url = URL.createObjectURL(file)
      const ok = await new Promise<boolean>((res) => {
        const im = new Image()
        im.onload = () => res(true)
        im.onerror = () => res(false)
        im.src = url
      })
      if (!ok) {
        URL.revokeObjectURL(url)
        bad.push(`${file.name}: this picture cannot be read`)
        continue
      }
      urls.current.push(url)
      added.push({ id: `${Date.now()}-${added.length}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, url })
    }
    if (files.length > room) bad.push(`Only ${MAX_PHOTOS} photos fit on the page`)
    if (added.length) setPhotos((cur) => [...cur, ...added].slice(0, MAX_PHOTOS))
    if (bad.length) setError(bad.join('. '))
  }
  return { error, add }
}

function PhotosCard({ photos, setPhotos }: { photos: DocPhoto[]; setPhotos: (fn: (cur: DocPhoto[]) => DocPhoto[]) => void }) {
  const { error, add } = usePhotos(setPhotos, photos.length)
  const move = (i: number, d: -1 | 1) =>
    setPhotos((cur) => {
      const a = [...cur]
      const j = i + d
      if (j < 0 || j >= a.length) return cur
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold">Photos</div>
        <label className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary', photos.length >= MAX_PHOTOS && 'pointer-events-none opacity-50')}>
          <ImagePlus className="h-4 w-4" /> Add photos
          <input
            type="file"
            accept={PHOTO_TYPES.join(',')}
            multiple
            className="sr-only"
            disabled={photos.length >= MAX_PHOTOS}
            onChange={(e) => {
              void add(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Up to {MAX_PHOTOS}. They are laid out as a collage and each photo is shown whole, never cropped. They stay on this computer.</p>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((ph, i) => (
            <li key={ph.id} className="relative overflow-hidden rounded-lg border border-border bg-secondary/40 p-1">
              <img src={ph.url} alt={ph.name} className="h-24 w-full object-contain" />
              <div className="mt-1 flex items-center justify-between">
                <button type="button" aria-label="Move earlier" disabled={i === 0} className="rounded p-1 hover:bg-secondary disabled:opacity-30" onClick={() => move(i, -1)}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Move later" disabled={i === photos.length - 1} className="rounded p-1 hover:bg-secondary disabled:opacity-30" onClick={() => move(i, 1)}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                aria-label={`Remove ${ph.name}`}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow hover:bg-background"
                onClick={() => {
                  URL.revokeObjectURL(ph.url)
                  setPhotos((cur) => cur.filter((x) => x.id !== ph.id))
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* a short list of lines the director can add to, change and remove */
function LinesCard({ title, label, lines, setLines, max, placeholder, addLabel }: { title: string; label: string; lines: string[]; setLines: (l: string[]) => void; max: number; placeholder?: string; addLabel: string }) {
  return (
    <div className={card}>
      <div className="text-sm font-bold">{title}</div>
      {lines.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={inputCls} aria-label={`${label} ${i + 1}`} placeholder={placeholder} value={r} maxLength={80} onChange={(e) => setLines(lines.map((v, k) => (k === i ? e.target.value : v)))} />
          <button type="button" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setLines(lines.filter((_, k) => k !== i))}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={lines.length >= max} onClick={() => setLines([...lines, ''])}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  )
}

function CallPosterEditor({ onBack }: { onBack: () => void }) {
  const [f, setF] = React.useState<CallPosterFields>(() => defaultCallPoster())
  const qrErr = f.qrOn ? checkLink(f.qrUrl) : null
  const dates = formatDates(f.dateFrom, f.dateTo)
  const setPhotos = (fn: (cur: DocPhoto[]) => DocPhoto[]) => setF((cur) => ({ ...cur, photos: fn(cur.photos) }))

  return (
    <DocEditor title="Volunteers and interns call" intro="A4, ready to print. The preview updates as you type." f={f} render={renderCallPoster} problems={callProblems(f)} fileName="ASO-volunteers-and-interns-call.pdf" onBack={onBack}>
      <LookCard f={f} setF={setF} />
      <HeadCard f={f} setF={setF} />
      <div className={card}>
        <Field label="Small line above the opportunities">
          <input className={inputCls} value={f.rolesLabel} maxLength={36} onChange={(e) => setF({ ...f, rolesLabel: e.target.value })} />
        </Field>
      </div>
      <LinesCard title="Opportunities" label="Opportunity" lines={f.roles} setLines={(roles) => setF({ ...f, roles })} max={MAX_ROLES} addLabel="Add an opportunity" />
      <div className={card}>
        <div className="text-sm font-bold">Registration</div>
        <Field label="Small line above the dates">
          <input className={inputCls} value={f.dateLabel} maxLength={30} onChange={(e) => setF({ ...f, dateLabel: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From">
            <input type="date" className={inputCls} value={f.dateFrom} onChange={(e) => setF({ ...f, dateFrom: e.target.value })} />
          </Field>
          <Field label="To" error={f.dateFrom && f.dateTo && f.dateTo < f.dateFrom ? 'The end date is before the start date' : null}>
            <input type="date" className={inputCls} value={f.dateTo} min={f.dateFrom || undefined} onChange={(e) => setF({ ...f, dateTo: e.target.value })} />
          </Field>
        </div>
        {dates && <p className="text-xs text-muted-foreground">On the poster: {dates}</p>}
        <Field label="Words on the button (empty for no button)">
          <input className={inputCls} value={f.cta} maxLength={20} onChange={(e) => setF({ ...f, cta: e.target.value })} />
        </Field>
        <Field label="Contact: one line each for e-mail, phone, address (up to three)">
          <textarea className={cn(inputCls, 'min-h-[72px]')} value={f.contact} maxLength={140} onChange={(e) => setF({ ...f, contact: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" checked={f.qrOn} onChange={(e) => setF({ ...f, qrOn: e.target.checked })} />
          QR code to register
        </label>
        {f.qrOn && (
          <>
            <Field label="Link the code opens" error={qrErr}>
              <input className={inputCls} dir="ltr" inputMode="url" placeholder="https://" value={f.qrUrl} onChange={(e) => setF({ ...f, qrUrl: e.target.value })} />
            </Field>
            <Field label="Text under the code">
              <input className={inputCls} value={f.qrCaption} maxLength={30} onChange={(e) => setF({ ...f, qrCaption: e.target.value })} />
            </Field>
          </>
        )}
      </div>
      <PhotosCard photos={f.photos} setPhotos={setPhotos} />
    </DocEditor>
  )
}

function CertificateEditor({ onBack }: { onBack: () => void }) {
  const [f, setF] = React.useState<CertificateFields>(() => defaultCertificate())
  const setSigner = (i: number, patch: Partial<CertificateFields['signers'][number]>) => setF((cur) => ({ ...cur, signers: cur.signers.map((s, k) => (k === i ? { ...s, ...patch } : s)) }))
  const day = formatDay(f.date)

  return (
    <DocEditor title="Certificate" intro="A4, ready to print. Type the name, download, and make the next one." f={f} render={renderCertificate} problems={certificateProblems(f)} fileName={`ASO-certificate${f.name.trim() ? '-' + f.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') : ''}.pdf`} onBack={onBack}>
      <div className={card}>
        <div className="text-sm font-bold">Who is it for</div>
        <Field label="Name of the person" error={f.name.trim() ? null : 'Add the name of the person'}>
          <input className={inputCls} value={f.name} maxLength={60} placeholder="Full name" onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Why (one or two sentences)">
          <textarea className={cn(inputCls, 'min-h-[72px]')} value={f.reason} maxLength={220} onChange={(e) => setF({ ...f, reason: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="Place">
            <input className={inputCls} value={f.place} maxLength={30} onChange={(e) => setF({ ...f, place: e.target.value })} />
          </Field>
        </div>
        {day && <p className="text-xs text-muted-foreground">On the certificate: {day}</p>}
      </div>
      <div className={card}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">Signatures</div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={f.signers.length >= MAX_SIGNERS} onClick={() => setF({ ...f, signers: [...f.signers, { name: '', role: '' }] })}>
            <Plus className="h-3.5 w-3.5" /> Add a signature
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Leave the name empty to keep a line for signing by hand.</p>
        {f.signers.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={inputCls} placeholder="Name" aria-label={`Signature ${i + 1} name`} value={s.name} maxLength={40} onChange={(e) => setSigner(i, { name: e.target.value })} />
            <input className={inputCls} placeholder="Role" aria-label={`Signature ${i + 1} role`} value={s.role} maxLength={40} onChange={(e) => setSigner(i, { role: e.target.value })} />
            <button type="button" aria-label={`Remove signature ${i + 1}`} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setF({ ...f, signers: f.signers.filter((_, k) => k !== i) })}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <HeadCard f={f} setF={setF} />
      <LookCard f={f} setF={setF} />
    </DocEditor>
  )
}

function ReportEditor({ onBack }: { onBack: () => void }) {
  const toast = useStore((s) => s.toast)
  const events = useStore((s) => s.state.events) || []
  const [f, setF] = React.useState<ReportDocFields>(() => defaultReportDoc())
  const [busy, setBusy] = React.useState(false)
  const problems = reportDocProblems(f)

  /* the words of an event the app already knows, so nothing is typed twice */
  function fillFrom(id: string) {
    const e = events.find((x) => x.id === id)
    if (!e) return
    setF((cur) => ({ ...cur, activity: e.title, summary: e.desc || cur.summary, date: e.date || cur.date, time: e.time || cur.time, place: e.place || cur.place, leader: e.lead || cur.leader }))
  }

  async function download() {
    if (busy || problems.length) return
    setBusy(true)
    try {
      const blob = await buildReportDoc(f)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = reportFileName(f)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      toast(`Word document ready: ${reportFileName(f)}`)
    } catch {
      toast('The document could not be made. Try again.', false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All documents
      </button>
      <PageHead
        title="Activity report"
        subtitle="A Word document with the facts filled in and every section ready to write. Open it in Word to finish it."
        right={
          <Button onClick={download} disabled={busy || problems.length > 0} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? 'Making the document...' : 'Download Word document'}
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="space-y-4">
          {events.length > 0 && (
            <div className={card}>
              <Field label="Fill the facts from an event of the app">
                <select className={inputCls} defaultValue="" onChange={(e) => fillFrom(e.target.value)}>
                  <option value="">Choose an event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
          <div className={card}>
            <div className="text-sm font-bold">The activity</div>
            <Field label="Name of the activity" error={f.activity.trim() ? null : 'Add the name of the activity'}>
              <input className={inputCls} value={f.activity} maxLength={80} onChange={(e) => setF({ ...f, activity: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              </Field>
              <Field label="Time">
                <input className={inputCls} value={f.time} maxLength={30} placeholder="4:00 PM - 6:00 PM" onChange={(e) => setF({ ...f, time: e.target.value })} />
              </Field>
              <Field label="Place">
                <input className={inputCls} value={f.place} maxLength={60} onChange={(e) => setF({ ...f, place: e.target.value })} />
              </Field>
              <Field label="Led by">
                <input className={inputCls} value={f.leader} maxLength={60} onChange={(e) => setF({ ...f, leader: e.target.value })} />
              </Field>
              <Field label="Number of participants">
                <input className={inputCls} value={f.participants} maxLength={20} inputMode="numeric" onChange={(e) => setF({ ...f, participants: e.target.value })} />
              </Field>
            </div>
          </div>
          <div className={card}>
            <Field label="What happened (optional, you can write it in Word)">
              <textarea className={cn(inputCls, 'min-h-[120px]')} value={f.summary} maxLength={1500} onChange={(e) => setF({ ...f, summary: e.target.value })} />
            </Field>
          </div>
          <LinesCard title="Results and highlights (optional)" label="Highlight" lines={f.highlights} setLines={(highlights) => setF({ ...f, highlights })} max={8} addLabel="Add a highlight" />
          <div className={card}>
            <div className="text-sm font-bold">Prepared by</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input className={inputCls} value={f.preparedBy} maxLength={40} onChange={(e) => setF({ ...f, preparedBy: e.target.value })} />
              </Field>
              <Field label="Role">
                <input className={inputCls} value={f.role} maxLength={40} onChange={(e) => setF({ ...f, role: e.target.value })} />
              </Field>
            </div>
          </div>
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className={card}>
            <div className="text-sm font-bold">What the document contains</div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Activity details</li>
              <li>Purpose and objectives</li>
              <li>What happened</li>
              <li>Participation (a table to fill in)</li>
              <li>Results and highlights</li>
              <li>Challenges and lessons learned</li>
              <li>Feedback received</li>
              <li>Follow-up actions (who, by when)</li>
              <li>Materials and costs</li>
              <li>Photos</li>
              <li>Sign-off</li>
            </ol>
            <p className="text-xs text-muted-foreground">Each section has a short note on what to write. Delete the notes you do not need.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
