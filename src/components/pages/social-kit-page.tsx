'use client'

import * as React from 'react'
import { ArrowLeft, Check, Clock, Copy, Download, ImagePlus, MapPin, Pencil, Plus, Share2, Sparkles, Trash2, CalendarClock, AlertTriangle, CalendarDays } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { cn } from '@/lib/utils'
import { posterThumb } from '@/lib/poster-url'
import type { Club, EventEntry, KitOverrides } from '@/lib/types'
import { DECOR_NAMES, LOOKS, rg } from '@/lib/kit/decor'
import { KIT_ICONS } from '@/lib/kit/icons'
import { cv, fitCover, iconCanvas, loadImage, loadKitFonts, makeCover, makeStory } from '@/lib/kit/engine'
import { KICKERS, kitDiff, kitParams, kitRec, kitSlug, kitTheme, type KitRec } from '@/lib/kit/derive'

type Kind = 'club' | 'event'

/* ---------------------------------------------------------------- helpers */

function saveBlob(blob: Blob | null, name: string) {
  if (!blob) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'))

async function renderBoth(R: KitRec) {
  await loadKitFonts()
  const p = await kitParams(R)
  const t = kitTheme(R)
  /* events have no WhatsApp group, so only clubs get the group picture */
  return { story: await makeStory(p, t), cover: R.type === 'club' ? await makeCover(p, t) : null }
}

async function downloadBoth(R: KitRec) {
  const { story, cover } = await renderBoth(R)
  const sl = kitSlug(R)
  saveBlob(await toBlob(story), `${sl}-story.png`)
  if (cover) setTimeout(() => void toBlob(cover).then((b) => saveBlob(b, `${sl}-whatsapp.png`)), 600)
}

function CanvasHost({ canvas, className }: { canvas: HTMLCanvasElement | null; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.replaceChildren()
    if (canvas) el.appendChild(canvas)
  }, [canvas])
  return <div ref={ref} className={cn('[&>canvas]:block [&>canvas]:h-auto [&>canvas]:w-full', className)} />
}

const chipCls = (on: boolean) =>
  cn(
    'rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition',
    on ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-foreground/80 hover:bg-secondary',
  )

/* ---------------------------------------------------------------- the page */

export function SocialKitPage() {
  const state = useStore((s) => s.state)
  const [tab, setTab] = React.useState<Kind>('club')
  const [editing, setEditing] = React.useState<{ kind: Kind; id: string } | null>(null)
  const [clubDlg, setClubDlg] = React.useState<{ open: boolean; club: Club | null }>({ open: false, club: null })
  const [eventDlg, setEventDlg] = React.useState<{ open: boolean; event: EventEntry | null }>({ open: false, event: null })

  if (editing) {
    return (
      <>
        <KitEditor
          key={editing.kind + editing.id}
          kind={editing.kind}
          id={editing.id}
          onBack={() => setEditing(null)}
          onEditSchedule={(item) => (editing.kind === 'club' ? setClubDlg({ open: true, club: item as Club }) : setEventDlg({ open: true, event: item as EventEntry }))}
        />
        <ClubDialog open={clubDlg.open} onOpenChange={(v) => setClubDlg((s) => ({ ...s, open: v }))} club={clubDlg.club} />
        <EventDialog open={eventDlg.open} onOpenChange={(v) => setEventDlg((s) => ({ ...s, open: v }))} event={eventDlg.event} />
      </>
    )
  }

  const items: (Club | EventEntry)[] = tab === 'club' ? state.clubs : state.events

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <PageHead
        title="Social kit"
        subtitle="The Instagram story and the WhatsApp group picture of every club and event, made from the data you already keep here."
        right={
          <Button size="sm" onClick={() => (tab === 'club' ? setClubDlg({ open: true, club: null }) : setEventDlg({ open: true, event: null }))}>
            <Plus className="h-4 w-4" /> {tab === 'club' ? 'New club' : 'New event'}
          </Button>
        }
      />
      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="Kind">
        {([['club', 'Clubs', state.clubs.length], ['event', 'Events', state.events.length]] as const).map(([k, label, n]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn('rounded-full px-4 py-1.5 text-[13px] font-bold transition', tab === k ? 'aso-nav-pill' : 'text-foreground/70 hover:bg-secondary')}
          >
            {label} <span className="ml-1 text-[11px] opacity-70">{n}</span>
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title={tab === 'club' ? 'No clubs yet' : 'No events yet'} hint="Add one and its pictures appear here." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <KitCard key={it.id} kind={tab} item={it} onOpen={() => setEditing({ kind: tab, id: it.id })} />
          ))}
        </div>
      )}
      <ClubDialog open={clubDlg.open} onOpenChange={(v) => setClubDlg((s) => ({ ...s, open: v }))} club={clubDlg.club} />
      <EventDialog open={eventDlg.open} onOpenChange={(v) => setEventDlg((s) => ({ ...s, open: v }))} event={eventDlg.event} />
    </div>
  )
}

function KitCard({ kind, item, onOpen }: { kind: Kind; item: Club | EventEntry; onOpen: () => void }) {
  const R = React.useMemo(() => kitRec(kind, item), [kind, item])
  const [busy, setBusy] = React.useState(false)
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button onClick={onOpen} className="relative block aspect-[848/1200] w-full overflow-hidden bg-secondary" aria-label={`Open ${R.name}`}>
        {R.sitePoster || R.poster ? (
          <img src={R.sitePoster ? posterThumb(R.sitePoster, 480) : R.poster || ''} alt={`${R.name} poster`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs font-bold">No poster yet</span>
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-0.5 p-3 text-[12.5px]">
        <b className="text-sm leading-tight">{[R.top, R.word].filter(Boolean).join(' ') || R.name}</b>
        <span className="text-muted-foreground">{R.day}</span>
        <span className="text-muted-foreground">{R.time}{R.venue ? ' | ' + R.venue : ''}</span>
        {R.nameNeeded && (
          <span className="mt-1.5 inline-flex items-center gap-1 self-start rounded-full bg-[var(--aso-gold-tint)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--aso-gold)]">
            <AlertTriangle className="h-3 w-3" /> English name needed
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-3 pt-0">
        <Button size="sm" onClick={onOpen}><Pencil className="h-3.5 w-3.5" /> Customize</Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={async () => { setBusy(true); try { await downloadBoth(R) } finally { setBusy(false) } }}
        >
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- the editor */

const Lab = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="mb-2">
    <div className="text-xs font-bold">{children}</div>
    {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
  </div>
)
const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
    <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
    {children}
  </div>
)
const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary'

type Section = 'content' | 'look' | 'caption'
const SECTIONS: [Section, string][] = [['content', 'Poster and name'], ['look', 'Look'], ['caption', 'Caption and link']]

function KitEditor({ kind, id, onBack, onEditSchedule }: { kind: Kind; id: string; onBack: () => void; onEditSchedule: (item: Club | EventEntry) => void }) {
  const list = useStore((s) => (kind === 'club' ? s.state.clubs : s.state.events)) as (Club | EventEntry)[]
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const item = list.find((x) => x.id === id)
  const [section, setSection] = React.useState<Section>('content')

  const [edits, setEdits] = React.useState<KitOverrides>(() => ({ ...(item?.kit || {}) }))
  const R = React.useMemo(() => (item ? kitRec(kind, { ...item, kit: edits }) : null), [kind, item, edits])

  /* save what was changed on the club or event itself, a moment after the last change */
  const dirty = React.useRef(false)
  const latest = React.useRef({ R, edits })
  React.useEffect(() => { latest.current = { R, edits } })
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = React.useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (!dirty.current || !latest.current.R) return
    dirty.current = false
    const rec = latest.current.R
    patch((d) => {
      const target = (kind === 'club' ? d.clubs : d.events).find((x) => x.id === id) as Club | EventEntry | undefined
      if (!target) return
      const diff = kitDiff(kind, { ...target, kit: undefined }, rec)
      if (Object.keys(diff).length) target.kit = diff
      else delete target.kit
    })
  }, [patch, kind, id])
  const change = React.useCallback((fn: (e: KitOverrides) => KitOverrides) => {
    dirty.current = true
    setEdits(fn)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 900)
  }, [flush])
  React.useEffect(() => () => flush(), [flush])

  /* the poster was turned into a file by a save: keep its address instead of the picture */
  const savedPoster = item?.kit?.poster
  React.useEffect(() => {
    if (savedPoster && savedPoster.startsWith('/api/poster/')) setEdits((e) => (e.poster && e.poster.startsWith('data:') ? { ...e, poster: savedPoster } : e))
  }, [savedPoster])

  /* the pictures */
  const [out, setOut] = React.useState<{ story: HTMLCanvasElement; cover: HTMLCanvasElement | null } | null>(null)
  const [updating, setUpdating] = React.useState(true)
  const visual = R ? [R.kicker, R.top, R.word, R.look, R.palette, R.decor, R.icon, R.bg, R.day, R.time, R.venue, R.poster ?? ''].join('|') : ''
  React.useEffect(() => {
    if (!R) return
    let live = true
    setUpdating(true)
    const t = setTimeout(() => {
      renderBoth(R)
        .then((o) => { if (live) { setOut(o); setUpdating(false) } })
        .catch(() => { if (live) setUpdating(false) })
    }, 300)
    return () => { live = false; clearTimeout(t) }
  }, [visual])

  if (!item || !R) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <EmptyState title="This one no longer exists" />
        <div className="mt-4 text-center"><Button variant="outline" onClick={onBack}>Back to the list</Button></div>
      </div>
    )
  }

  const theme = kitTheme(R)
  const set = (k: keyof KitOverrides, v: string | number | undefined) => change((e) => ({ ...e, [k]: v }))
  const pickLook = (k: string) => change((e) => { const n = { ...e, look: k }; delete n.icon; return n })
  const setPoster = async (file: File) => {
    const im = await loadImage(URL.createObjectURL(file))
    const c = cv(1080, 1440)
    fitCover(c.getContext('2d')!, im, 0, 0, 1080, 1440)
    const webp = c.toDataURL('image/webp', 0.88)
    set('poster', webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', 0.88))
  }
  const title = [R.top, R.word].filter(Boolean).join(' ') || R.name
  const sl = kitSlug(R)
  const dlStory = () => out && void toBlob(out.story).then((b) => saveBlob(b, `${sl}-story.png`))
  const dlCover = () => out?.cover && void toBlob(out.cover).then((b) => saveBlob(b, `${sl}-whatsapp.png`))
  const dlBoth = () => { dlStory(); if (out?.cover) setTimeout(dlCover, 600) }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => { flush(); onBack() }}><ArrowLeft className="h-4 w-4" /> All {kind === 'club' ? 'clubs' : 'events'}</Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{updating ? 'Updating the pictures...' : 'Changes are saved with the ' + kind + '.'}</p>
        </div>
        <Button size="sm" disabled={!out} onClick={dlBoth}><Download className="h-4 w-4" /> {kind === 'club' ? 'Download both pictures' : 'Download story'}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* settings */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-3 gap-1 rounded-full border border-border bg-card p-1" role="tablist" aria-label="Settings">
            {SECTIONS.map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={section === k}
                onClick={() => setSection(k)}
                className={cn('rounded-full px-2 py-2 text-[13px] font-bold transition', section === k ? 'aso-nav-pill' : 'text-foreground/70 hover:bg-secondary')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
            {section === 'content' && (
              <>
                <Block title="Poster">
                  <div className="flex items-center gap-4">
                    <div className="w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary" style={{ aspectRatio: '3 / 4' }}>
                      {R.poster ? <img src={R.poster} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-bold text-muted-foreground">NO POSTER</div>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                      <p className="text-xs text-muted-foreground">
                        {edits.poster ? 'Your own poster for the story.' : R.sitePoster && R.poster === R.sitePoster ? 'The website poster is used.' : R.poster ? 'The framed poster that came with the kit is used.' : 'Add the finished poster, ASO frame included. The kit never adds a frame.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                          <ImagePlus className="h-4 w-4" /> {R.poster ? 'Replace' : 'Add poster'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void setPoster(f); e.target.value = '' }} />
                        </label>
                        {R.sitePoster && R.poster !== R.sitePoster && (
                          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => set('poster', R.sitePoster || undefined)}>Use website poster</Button>
                        )}
                        {edits.poster && (
                          <Button type="button" variant="ghost" size="sm" className="rounded-lg text-destructive" onClick={() => change((e) => { const n = { ...e }; delete n.poster; return n })}>
                            <Trash2 className="h-4 w-4" /> Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Block>

                <Block title="Name">
                  <div>
                    <Lab>Type</Lab>
                    <KickerPicker value={R.kicker} onChange={(v) => set('kicker', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Lab>First line (small, optional)</Lab>
                      <input className={inputCls} value={R.top} placeholder="e.g. PHILO" onChange={(e) => set('top', e.target.value.toUpperCase())} />
                    </div>
                    <div>
                      <Lab>Name (big)</Lab>
                      <input className={inputCls} value={R.word} placeholder="e.g. PHYSICS" onChange={(e) => set('word', e.target.value.toUpperCase())} />
                    </div>
                  </div>
                  {R.nameNeeded && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--aso-gold)]">
                      <AlertTriangle className="h-3.5 w-3.5" /> The name is in Arabic. Type the English name for the story.
                    </p>
                  )}
                </Block>

                <Block title="When and where">
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/60 p-3">
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" /> {R.day}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {R.time || 'no time'}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {R.venue}</span>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => onEditSchedule(item)}>
                      <CalendarClock className="h-4 w-4" /> Change
                    </Button>
                  </div>
                  <p className="-mt-2 text-[11px] text-muted-foreground">This comes from the {kind === 'club' ? 'club' : 'event'}. Change it there and the pictures follow.</p>
                </Block>
              </>
            )}

            {section === 'look' && (
              <>
                <Block title="Colours and decoration">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Object.entries(LOOKS).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => pickLook(k)}
                        aria-pressed={R.look === k}
                        className={cn('flex flex-col gap-1 rounded-xl border p-2 text-left text-xs font-bold transition', R.look === k ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border bg-card hover:bg-secondary')}
                      >
                        <span className="h-6 rounded-md" style={{ background: `linear-gradient(90deg,${rg(v[1])},${rg(v[2])})` }} />
                        <span className="leading-tight">{v[0].split(':')[0]}</span>
                        <small className="text-[11px] font-medium text-muted-foreground">{DECOR_NAMES[v[4]]}</small>
                      </button>
                    ))}
                  </div>
                </Block>

                <Block title="Icon">
                  <IconPicker value={R.icon} c1={theme.c1} c2={theme.c2} onChange={(k) => set('icon', k)} />
                </Block>

                <Block title="Fine tuning">
                  <div>
                    <Lab hint="Use the colours of another look, keeping this decoration.">Colours only</Lab>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className={chipCls(R.palette === 'same')} onClick={() => set('palette', 'same')}>Same as look</button>
                      {Object.entries(LOOKS).map(([k, v]) => (
                        <button key={k} type="button" className={chipCls(R.palette === k)} onClick={() => set('palette', k)}>{v[0].split(':')[0]}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Lab hint="Use the decoration of another look, keeping these colours.">Edge decoration only</Lab>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className={chipCls(R.decor === 'same')} onClick={() => set('decor', 'same')}>Same as look</button>
                      {Object.entries(DECOR_NAMES).map(([k, n]) => (
                        <button key={k} type="button" className={chipCls(R.decor === k)} onClick={() => set('decor', k)}>{n}</button>
                      ))}
                    </div>
                  </div>
                  {kind === 'club' && (
                  <div>
                    <Lab hint="Only the WhatsApp group picture uses it.">WhatsApp picture background</Lab>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 8 }, (_, i) => (
                        <button key={i} type="button" onClick={() => set('bg', i)} aria-pressed={R.bg === i} className={cn('overflow-hidden rounded-lg border p-0', R.bg === i ? 'border-primary ring-2 ring-primary' : 'border-border')} aria-label={`Background ${i + 1}`}>
                          <img src={`/kit/bg/cover${i}.jpg`} alt="" className="block w-full" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                  )}
                </Block>
              </>
            )}

            {section === 'caption' && (
              <>
                <Block title="Caption for the post">
                  <textarea className={cn(inputCls, 'min-h-[180px] resize-y')} value={R.cap} placeholder="Paste the caption here" onChange={(e) => set('cap', e.target.value)} />
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => { void navigator.clipboard.writeText(R.cap).then(() => toast('Caption copied')) }}>
                    <Copy className="h-4 w-4" /> Copy caption
                  </Button>
                </Block>
                {kind === 'club' && (
                  <Block title="WhatsApp group link">
                    <div>
                      <Lab hint="For the link sticker on the story.">Link</Lab>
                      <input className={inputCls} value={R.wa} placeholder="https://chat.whatsapp.com/..." onChange={(e) => set('wa', e.target.value.trim())} />
                    </div>
                  </Block>
                )}
                <Block title="Publish">
                  <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                    <Share2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Posting to Instagram and Facebook from here is not switched on yet. Download the pictures and post them from the Instagram app for now.</p>
                  </div>
                </Block>
              </>
            )}
          </div>
        </div>

        {/* the pictures, always in view while settings change */}
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
          <div className={cn('grid items-stretch gap-3', kind === 'club' ? 'grid-cols-2' : 'mx-auto w-full max-w-[420px] grid-cols-1')}>
            <PreviewCard title="Instagram story" canvas={out?.story ?? null} onDownload={dlStory} />
            {kind === 'club' && <PreviewCard title="WhatsApp picture" note="shown round" canvas={out?.cover ?? null} round onDownload={dlCover} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewCard({ title, note, canvas, round, onDownload }: { title: string; note?: string; canvas: HTMLCanvasElement | null; round?: boolean; onDownload: () => void }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3">
      <h3 className="flex items-baseline justify-between gap-2 text-xs font-extrabold">
        {title}
        {note && <span className="text-[11px] font-medium text-muted-foreground">{note}</span>}
      </h3>
      <div className="flex flex-1 items-center">
        {canvas ? (
          <CanvasHost canvas={canvas} className={cn('w-full overflow-hidden bg-secondary', round ? 'rounded-full' : 'rounded-[10px]')} />
        ) : (
          <div className={cn('w-full animate-pulse bg-secondary', round ? 'aspect-square rounded-full' : 'aspect-[9/16] rounded-[10px]')} />
        )}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={!canvas} onClick={onDownload}><Download className="h-4 w-4" /> Download</Button>
    </section>
  )
}

/* ---------------------------------------------------------------- pickers */

function KickerPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const custom = !KICKERS.includes(value)
  const [other, setOther] = React.useState(custom)
  const showOther = other || custom
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {KICKERS.map((k) => (
          <button key={k} type="button" className={chipCls(value === k && !showOther)} onClick={() => { setOther(false); onChange(k) }}>{k}</button>
        ))}
        <button type="button" className={chipCls(showOther)} onClick={() => setOther(true)}>Other...</button>
      </div>
      {showOther && <input className={inputCls} value={custom ? value : ''} placeholder="Type your own" onChange={(e) => onChange(e.target.value.toUpperCase())} />}
    </div>
  )
}

const iconCache = new Map<string, string>()

function IconPicker({ value, c1, c2, onChange }: { value: string; c1: number[]; c2: number[]; onChange: (k: string) => void }) {
  const [urls, setUrls] = React.useState<Record<string, string>>({})
  const sig = c1.join(',') + '|' + c2.join(',')
  React.useEffect(() => {
    let live = true
    ;(async () => {
      const acc: Record<string, string> = {}
      for (const k of Object.keys(KIT_ICONS)) {
        const ck = k + '|' + sig
        let u = iconCache.get(ck)
        if (!u) {
          const c = await iconCanvas(k, 96, c1 as [number, number, number], c2 as [number, number, number])
          u = c.toDataURL('image/png')
          iconCache.set(ck, u)
        }
        acc[k] = u
        if (!live) return
      }
      if (live) setUrls(acc)
    })().catch(() => {})
    return () => { live = false }
  }, [sig])
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
      {Object.entries(KIT_ICONS).map(([k, v]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn('flex flex-col items-center gap-1 rounded-xl border px-1 py-1.5 transition', value === k ? 'border-2 border-primary bg-card' : 'border-border bg-secondary/40 hover:bg-secondary')}
          aria-pressed={value === k}
        >
          {urls[k] ? <img src={urls[k]} alt="" className="h-[46px] w-[46px]" /> : <span className="h-[46px] w-[46px]" />}
          <small className="text-center text-[10px] font-semibold leading-tight">{v.label}</small>
          {value === k && <Check className="sr-only" />}
        </button>
      ))}
    </div>
  )
}
