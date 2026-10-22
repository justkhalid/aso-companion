'use client'

import * as React from 'react'
import { kitSig } from '@/lib/post-queue'
import { PostQueue } from '@/components/post-queue'
import { FullKitButton, LinksKitButton } from '@/components/full-kit-button'
import { ArrowLeft, ArrowRight, Check, Clock4, ChevronLeft, Music, Play, Square, ChevronRight, CircleAlert, Clock, Loader2, Send, X, Copy, Download, ImagePlus, MapPin, Pencil, Plus, Share2, Sparkles, Trash2, CalendarClock, AlertTriangle, CalendarDays } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { cn } from '@/lib/utils'
import { posterThumb } from '@/lib/poster-url'
import type { Club, EventEntry, KitOverrides } from '@/lib/types'
import { DECOR, DECOR_NAMES, LOOKS, rg, type RGB } from '@/lib/kit/decor'
import { KIT_ICONS } from '@/lib/kit/icons'
import { ArchiveGroup } from '@/components/session-card'
import { isOver } from '@/lib/archive'
import { cv, fitCover, iconCanvas, loadImage, loadKitFonts, makeCancel, makeCover, makeHighlight, makeStory, makeStoryAnim, GROUNDS } from '@/lib/kit/engine'
import { KICKERS, kitDiff, kitParams, kitRec, kitSlug, kitTheme, readableInk, type KitRec } from '@/lib/kit/derive'

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
  return { story: await makeStory(p, t), cover: R.type === 'club' ? await makeCover(p, t) : null, highlight: await makeHighlight(p, t) }
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
  const tab = useStore((s) => s.socialTab)
  const setTab = (t: typeof tab) => useStore.setState({ socialTab: t })
  const target = useStore((s) => s.socialTarget)
  const toast = useStore((s) => s.toast)
  const { status } = useSocialStatus()

  /* back from Facebook's "Connect" screen */
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const r = q.get('social')
    if (!r) return
    setTab('connection')
    if (r === 'connected') toast('Connected to Facebook and Instagram')
    else toast(q.get('msg') || 'The connection did not work.', false)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])
  const [editing, setEditing] = React.useState<{ kind: Kind; id: string } | null>(null)
  /* a click on the menu on the left leads back to the list, also from inside a club or an event */
  const navTick = useStore((s) => s.navTick)
  const firstTick = React.useRef(navTick)
  React.useEffect(() => { if (navTick !== firstTick.current) { firstTick.current = navTick; setEditing(null) } }, [navTick])
  /* a "Post" button elsewhere (To post, a club page) opens straight into that club or event */
  React.useEffect(() => {
    if (!target) return
    setEditing(target)
    useStore.setState({ socialTarget: null })
  }, [target])
  const [clubDlg, setClubDlg] = React.useState<{ open: boolean; club: Club | null }>({ open: false, club: null })
  const [eventDlg, setEventDlg] = React.useState<{ open: boolean; event: EventEntry | null }>({ open: false, event: null })

  if (editing) {
    return (
      <>
        <KitEditor
          key={editing.kind + editing.id}
          kind={editing.kind}
          id={editing.id}
          onBack={() => useStore.getState().guardedGo(() => setEditing(null))}
          onManage={() => { setEditing(null); setTab('connection') }}
          onEditSchedule={(item) => (editing.kind === 'club' ? setClubDlg({ open: true, club: item as Club }) : setEventDlg({ open: true, event: item as EventEntry }))}
        />
        <ClubDialog open={clubDlg.open} onOpenChange={(v) => setClubDlg((s) => ({ ...s, open: v }))} club={clubDlg.club} />
        <EventDialog open={eventDlg.open} onOpenChange={(v) => setEventDlg((s) => ({ ...s, open: v }))} event={eventDlg.event} />
      </>
    )
  }

  const all: (Club | EventEntry)[] = tab === 'club' ? state.clubs : tab === 'event' ? state.events : []
  const items = all.filter((x) => !isOver(tab as Kind, x))
  const archived = all.filter((x) => isOver(tab as Kind, x))

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <PageHead
        title="Social media"
        subtitle="What to post, the pictures of every club and event, the month calendars, and posting to Facebook and Instagram. All made from the data you already keep here."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {tab !== 'connection' && <><LinksKitButton /><FullKitButton /></>}
            {(tab === 'club' || tab === 'event') && (
              <Button size="sm" onClick={() => (tab === 'club' ? setClubDlg({ open: true, club: null }) : setEventDlg({ open: true, event: null }))}>
                <Plus className="h-4 w-4" /> {tab === 'club' ? 'New club' : 'New event'}
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="Kind">
        {([['todo', 'Share', null], ['club', 'Clubs', state.clubs.filter((c) => !isOver('club', c)).length], ['event', 'Events', state.events.filter((e) => !isOver('event', e)).length], ['post', 'New post', null], ['month', 'Calendar', null], ['scheduled', 'Scheduled', null], ['connection', 'Connection', null]] as const).map(([k, label, n]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn('rounded-full px-4 py-1.5 text-[13px] font-bold transition', tab === k ? 'aso-nav-pill' : 'text-foreground/70 hover:bg-secondary')}
          >
            {label} {n !== null && <span className="ml-1 text-[11px] opacity-70">{n}</span>}
          </button>
        ))}
      </div>
      {status && typeof status !== 'string' && status.connected && status.daysLeft !== null && status.daysLeft <= 14 && tab !== 'connection' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--aso-gold)]/40 bg-[var(--aso-gold-tint)] px-4 py-2.5 text-sm font-semibold">
          <CircleAlert className="h-4 w-4 shrink-0 text-[var(--aso-gold)]" />
          <span className="min-w-0 flex-1">{status.daysLeft > 0 ? `The Facebook and Instagram token runs out in ${status.daysLeft} days.` : 'The Facebook and Instagram token has run out.'}</span>
          <Button size="sm" variant="outline" onClick={() => setTab('connection')}>Reconnect</Button>
        </div>
      )}
      {tab === 'todo' ? (
        <PostQueue />
      ) : tab === 'post' ? (
        <NewPostPanel onManage={() => setTab('connection')} />
      ) : tab === 'month' ? (
        <MonthStoryPanel onManage={() => setTab('connection')} />
      ) : tab === 'scheduled' ? (
        <ScheduledPanel />
      ) : tab === 'connection' ? (
        <ConnectionPanel />
      ) : all.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title={tab === 'club' ? 'No clubs yet' : 'No events yet'} hint="Add one and its pictures appear here." />
      ) : (
        <>
          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing current. Look in the archive.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => (
                <KitCard key={it.id} kind={tab as Kind} item={it} onOpen={() => setEditing({ kind: tab as Kind, id: it.id })} />
              ))}
            </div>
          )}
          <ArchiveGroup count={archived.length}>
            <div className="grid grid-cols-2 gap-4 opacity-75 md:grid-cols-3 lg:grid-cols-4">
              {archived.map((it) => (
                <KitCard key={it.id} kind={tab as Kind} item={it} onOpen={() => setEditing({ kind: tab as Kind, id: it.id })} />
              ))}
            </div>
          </ArchiveGroup>
        </>
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
      <button onClick={onOpen} className="relative block aspect-[3/4] w-full overflow-hidden bg-secondary" aria-label={`Open ${R.name}`}>
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

/* ---------------------------------------------------------------- new post */

/* any picture, posted as it is: for an updated poster, a photo, a notice. It becomes a feed post (kept whole, with soft side bars when its shape is not allowed)
   and a story (the picture centered on a soft copy of itself). */
async function newPostCanvases(src: string) {
  const im = await loadImage(src)
  const ratio = im.width / im.height
  /* feed: 3:4 up to 1.91:1 is allowed; anything else is placed on a soft background in 3:4 */
  let feed: HTMLCanvasElement
  if (ratio >= 0.75 && ratio <= 1.91) {
    const k = Math.min(1, 1440 / im.width)
    feed = cv(Math.round(im.width * k), Math.round(im.height * k))
    feed.getContext('2d')!.drawImage(im, 0, 0, feed.width, feed.height)
  } else {
    feed = cv(1080, 1440)
    const g = feed.getContext('2d')!
    g.filter = 'blur(40px)'
    fitCover(g, im, -60, -60, 1200, 1560)
    g.filter = 'none'
    const k = Math.min(1080 / im.width, 1440 / im.height)
    g.drawImage(im, (1080 - im.width * k) / 2, (1440 - im.height * k) / 2, im.width * k, im.height * k)
  }
  /* story: 1080x1920 */
  const story = cv(1080, 1920)
  const sg = story.getContext('2d')!
  sg.filter = 'blur(50px)'
  fitCover(sg, im, -80, -80, 1240, 2080)
  sg.filter = 'none'
  sg.fillStyle = 'rgba(255,255,255,0.12)'
  sg.fillRect(0, 0, 1080, 1920)
  const k = Math.min(1000 / im.width, 1500 / im.height)
  const w = im.width * k, h = im.height * k
  sg.save()
  sg.shadowColor = 'rgba(0,0,0,0.3)'
  sg.shadowBlur = 40
  sg.shadowOffsetY = 12
  sg.drawImage(im, (1080 - w) / 2, (1920 - h) / 2, w, h)
  sg.restore()
  return { feed, story }
}

function NewPostPanel({ onManage }: { onManage: () => void }) {
  const state = useStore((s) => s.state)
  const [src, setSrc] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [out, setOut] = React.useState<{ feed: HTMLCanvasElement; story: HTMLCanvasElement } | null>(null)
  const [caption, setCaption] = React.useState('')
  const [about, setAbout] = React.useState('')
  const [err, setErr] = React.useState('')

  React.useEffect(() => {
    if (!src) { setOut(null); return }
    let live = true
    setErr('')
    newPostCanvases(src).then((o) => { if (live) setOut(o) }).catch(() => { if (live) setErr('That picture could not be opened. Try a JPG or PNG.') })
    return () => { live = false }
  }, [src])
  React.useEffect(() => () => { if (src) URL.revokeObjectURL(src) }, [src])

  const choices = [...state.clubs.map((c) => ({ id: 'c:' + c.id, label: c.name, text: kitRec('club', c).cap })), ...state.events.map((e) => ({ id: 'e:' + e.id, label: e.title, text: kitRec('event', e).cap }))]
  const label = about ? `${choices.find((c) => c.id === about)?.label}: new post` : name ? `New post: ${name}` : 'New post'

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          <Block title="Picture">
            <p className="text-xs text-muted-foreground">Any picture: an updated poster, a photo, a notice. It is posted as it is, as a feed post and as a story. Nothing is added to it.</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                <ImagePlus className="h-4 w-4" /> {src ? 'Change picture' : 'Choose a picture'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSrc(URL.createObjectURL(f)); setName(f.name.replace(/\.[^.]+$/, '')) } e.target.value = '' }} />
              </label>
              {src && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setSrc(null)}><Trash2 className="h-4 w-4" /> Remove</Button>}
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </Block>
          <Block title="Caption">
            <div>
              <Lab hint="Optional: fills the caption with the text of a club or event.">About</Lab>
              <select className={inputCls} value={about} onChange={(e) => { setAbout(e.target.value); const c = choices.find((x) => x.id === e.target.value); if (c) setCaption(c.text) }}>
                <option value="">Nothing in particular</option>
                {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <textarea className={cn(inputCls, 'min-h-[140px] resize-y')} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write the caption here" />
          </Block>
        </div>
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          <PublishPanel storyCanvas={out?.story ?? null} poster={null} feedCanvas={out?.feed ?? null} caption={caption} onManage={onManage} scheduleLabel={label} />
        </div>
      </div>
      <div className="grid grid-cols-2 items-start gap-3 lg:sticky lg:top-20">
        {out ? (
          <>
            <PreviewCard title="Story" canvas={out.story} onDownload={() => void toBlob(out.story).then((b) => saveBlob(b, `${kitSlug({ top: '', word: name, name: 'post' })}-story.png`))} />
            <PreviewCard title="Feed post" canvas={out.feed} onDownload={() => void toBlob(out.feed).then((b) => saveBlob(b, `${kitSlug({ top: '', word: name, name: 'post' })}-post.png`))} />
          </>
        ) : (
          <p className="col-span-2 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Choose a picture and the story and the post appear here.</p>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- month story */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* what the month pictures show, so they are made again only when it changes */
function useMonthKey() {
  const state = useStore((s) => s.state)
  return React.useMemo(
    () =>
      JSON.stringify([
        state.clubs.map((c) => [c.id, c.name, c.days, c.time, c.room, c.outside, c.freq, c.from, c.until, c.icon, c.placeholder, c.kit?.short]),
        state.events.map((e) => [e.id, e.title, e.recur, e.day, e.date, e.time, e.place, e.outside, e.from, e.until, e.icon, e.kit?.short]),
        state.absences || [],
      ]),
    [state.clubs, state.events, state.absences],
  )
}

function MonthStoryPanel({ onManage }: { onManage: () => void }) {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const key = useMonthKey()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = React.useState(thisYear)
  const [yearText, setYearText] = React.useState(String(thisYear))
  const goYear = (y: number) => { if (y >= 2000 && y <= 2200) { setYear(y); setYearText(String(y)) } }
  const [month, setMonth] = React.useState(() => new Date().getMonth())
  const [what, setWhat] = React.useState<'story' | 'post'>('story')
  const [story, setStory] = React.useState<import('@/lib/kit/month-story').MonthStory | null>(null)
  const [still, setStill] = React.useState<HTMLCanvasElement | null>(null)
  const [cal, setCal] = React.useState<HTMLCanvasElement | null>(null)
  const [caption, setCaption] = React.useState('')
  const [err, setErr] = React.useState('')
  const [working, setWorking] = React.useState<string | null>(null)
  const view = React.useRef<HTMLCanvasElement>(null)
  const [song, setSong] = React.useState<File | null>(null)
  const [songStart, setSongStart] = React.useState(0)
  const [songVol, setSongVol] = React.useState(80)
  const [playing, setPlaying] = React.useState(false)
  const audio = React.useRef<HTMLAudioElement | null>(null)
  const music = React.useMemo(() => (song ? { file: song as Blob, start: songStart, volume: songVol / 100 } : null), [song, songStart, songVol])
  const stopSong = React.useCallback(() => { audio.current?.pause(); setPlaying(false) }, [])
  React.useEffect(() => () => { audio.current?.pause() }, [])
  const playSong = () => {
    if (!song) return
    if (playing) return stopSong()
    audio.current?.pause()
    const a = new Audio(URL.createObjectURL(song))
    a.currentTime = songStart
    a.volume = songVol / 100
    audio.current = a
    void a.play().then(() => setPlaying(true)).catch(() => toast('The song could not be played.', false))
    window.setTimeout(() => { if (audio.current === a) stopSong() }, 15000)
    a.onended = () => setPlaying(false)
  }

  /* the caption for the calendar post follows the month until it is edited */
  const defaultCaption = `Clubs and events at ${state.settings.institute || 'the American Space Oujda'}, ${MONTH_NAMES[month]} ${year}.`
  const [edited, setEdited] = React.useState(false)
  React.useEffect(() => { if (!edited) setCaption(defaultCaption) }, [defaultCaption, edited])

  const stateRef = React.useRef(state)
  React.useEffect(() => { stateRef.current = state })

  /* the story: made again when the month or the clubs and events change */
  React.useEffect(() => {
    if (what !== 'story') return
    let live = true
    setErr('')
    const t = setTimeout(async () => {
      try {
        const ms = await import('@/lib/kit/month-story')
        const built = await ms.buildMonthStory(stateRef.current, year, month)
        if (!live) return
        setStory(built)
        setStill(ms.monthStoryStill(built))
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : 'The picture could not be made.')
      }
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [what, year, month, key])

  /* the post: the site's normal month calendar */
  React.useEffect(() => {
    if (what !== 'post') return
    let live = true
    setErr('')
    const t = setTimeout(async () => {
      try {
        const { renderMonth } = await import('@/lib/month-export')
        const c = await renderMonth(stateRef.current, { year, month, clubs: true, events: true, holidays: true, scale: 0.625 })
        if (live) setCal(c)
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : 'The picture could not be made.')
      }
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [what, year, month, key])

  /* show the story moving (still when the visitor prefers less motion) */
  React.useEffect(() => {
    const cvs = view.current
    if (what !== 'story' || !story || !cvs) return
    const g = cvs.getContext('2d')!
    let raf = 0
    let live = true
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let last = 0
    void import('@/lib/kit/month-story').then((ms) => {
      const t0 = performance.now()
      const tick = (now: number) => {
        if (!live) return
        if (now - last > 33) { last = now; ms.drawMonthStory(g, story, calm ? 0 : (now - t0) / 1000) }
        if (!calm) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    return () => { live = false; cancelAnimationFrame(raf) }
  }, [what, story])

  const name = `${MONTH_NAMES[month].toLowerCase()}-${year}`
  const run = async (label: string, fn: () => Promise<void>) => {
    setWorking(label)
    try { await fn() } catch (e) { toast(e instanceof Error ? e.message : 'Failed', false) } finally { setWorking(null) }
  }
  const png = async () => { if (still) saveBlob(await toBlob(still), `calendar-story-${name}.png`) }
  const calPng = async () => { if (cal) saveBlob(await toBlob(cal), `calendar-${name}.png`) }
  const video = () => run('Recording', async () => {
    if (!story) return
    const ms = await import('@/lib/kit/month-story')
    const v = await ms.monthStoryVideo(story, { onProgress: (p) => setWorking(`Recording ${Math.round(p * 100)}%`), music })
    saveBlob(v.blob, `calendar-story-${name}.${v.ext}`)
  })
  const all = () => run('Making all months', async () => {
    const ms = await import('@/lib/kit/month-story')
    const { zipFiles } = await import('@/lib/kit/zip')
    const files: { name: string; blob: Blob }[] = []
    for (let i = 0; i < 12; i++) {
      setWorking(`Making ${i + 1} of 12`)
      const b = await ms.buildMonthStory(stateRef.current, year, i)
      const blob = await toBlob(ms.monthStoryStill(b))
      if (blob) files.push({ name: `${String(i + 1).padStart(2, '0')}-${MONTH_NAMES[i].toLowerCase()}-${year}.png`, blob })
    }
    saveBlob(await zipFiles(files), `calendar-stories-${year}.zip`)
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          <Block title="Month">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Previous year" onClick={() => goYear(year - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <input
                inputMode="numeric"
                aria-label="Year"
                className={cn(inputCls, 'w-24 text-center text-base font-bold')}
                value={yearText}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setYearText(v)
                  if (/^\d{4}$/.test(v)) goYear(Number(v))
                }}
                onBlur={() => setYearText(String(year))}
              />
              <Button type="button" variant="outline" size="icon" aria-label="Next year" onClick={() => goYear(year + 1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { goYear(thisYear); setMonth(new Date().getMonth()) }}>Today</Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MONTH_NAMES.map((m, i) => (
                <button key={m} type="button" onClick={() => setMonth(i)} aria-pressed={i === month} className={cn('rounded-xl border px-2 py-2.5 text-center text-[13px] font-bold transition', i === month ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'border-border bg-card hover:bg-secondary')}>{m}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Made from the clubs and events in the app. Add or change one and the pictures follow.</p>
          </Block>
          <Block title="What to make">
            <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1" role="tablist" aria-label="Kind of picture">
              {([['story', 'Story'], ['post', 'Calendar post']] as const).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={what === k} onClick={() => setWhat(k)} className={cn('rounded-full px-3 py-1.5 text-[13px] font-bold transition', what === k ? 'aso-nav-pill' : 'text-foreground/70 hover:bg-secondary')}>{label}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{what === 'story' ? 'The tall picture for stories, with a moving version.' : 'The normal wide month calendar of the site, to post on the feed.'}</p>
          </Block>
          <Block title="Download">
            {what === 'story' ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" disabled={!still || !!working} onClick={() => void png()}><Download className="h-4 w-4" /> Picture</Button>
                <Button type="button" variant="outline" disabled={!story || !!working} onClick={() => void video()}><Download className="h-4 w-4" /> Animation</Button>
                <Button type="button" variant="outline" disabled={!!working} onClick={() => void all()}><Download className="h-4 w-4" /> All of {year}</Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="self-start" disabled={!cal} onClick={() => void calPng()}><Download className="h-4 w-4" /> Picture</Button>
            )}
            <p className="text-xs text-muted-foreground">{working ? working + '...' : what === 'story' ? 'The animation is a 15 second loop. All of the year comes as one zip of 12 pictures.' : ''}</p>
          </Block>
          {what === 'story' && (
            <Block title="Music (optional)">
              <p className="text-xs text-muted-foreground">Pick a song from your computer and it is mixed into the animation. Use only music you have the right to use: Instagram and Facebook can mute or block other music. Instagram's own song library cannot be used from here.</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                  <Music className="h-4 w-4" /> {song ? 'Change song' : 'Choose a song'}
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { stopSong(); setSong(f); setSongStart(0) } e.target.value = '' }} />
                </label>
                {song && <span className="min-w-0 max-w-[16rem] truncate text-xs text-muted-foreground">{song.name}</span>}
                {song && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { stopSong(); setSong(null) }}><Trash2 className="h-4 w-4" /> Remove</Button>}
              </div>
              {song && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Lab hint="Where in the song it begins.">Start at (seconds)</Lab>
                    <input type="number" min={0} className={inputCls} value={songStart} onChange={(e) => setSongStart(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                  <div>
                    <Lab hint={`${songVol}%`}>Volume</Lab>
                    <input type="range" min={0} max={100} className="w-full accent-[var(--primary)]" value={songVol} onChange={(e) => setSongVol(Number(e.target.value))} />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="col-span-2 self-start" onClick={playSong}>
                    {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? 'Stop' : 'Listen (15 seconds)'}
                  </Button>
                </div>
              )}
            </Block>
          )}
        </div>
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          {what === 'post' && (
            <Block title="Caption">
              <textarea className={cn(inputCls, 'min-h-[90px] resize-y')} value={caption} onChange={(e) => { setCaption(e.target.value); setEdited(true) }} />
            </Block>
          )}
          <PublishPanel storyCanvas={what === 'story' ? still : null} poster={null} feedCanvas={what === 'post' ? cal : null} caption={what === 'post' ? caption : ''} only={what === 'story' ? 'story' : 'feed'} onManage={onManage} scheduleLabel={`${MONTH_NAMES[month]} ${year} calendar ${what === 'story' ? 'story' : 'post'}`} key={what} videoMaker={what === 'story' && story ? async (onProgress) => { const ms = await import('@/lib/kit/month-story'); const v = await ms.monthStoryVideo(story, { onProgress, music, forPost: true }); return { blob: v.blob, ext: v.ext } } : undefined} />
        </div>
      </div>
      <div className="lg:sticky lg:top-20">
        <section className={cn('mx-auto flex w-full flex-col gap-2.5 rounded-2xl border border-border bg-card p-3', what === 'story' ? 'max-w-[420px]' : 'max-w-[640px]')}>
          <h3 className="text-xs font-extrabold">{MONTH_NAMES[month]} {year} {what === 'story' ? 'story' : 'calendar post'}</h3>
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
          <div className="overflow-hidden rounded-[10px] bg-secondary">
            {what === 'story' ? (
              story ? <canvas ref={view} width={1080} height={1920} className="block h-auto w-full" /> : <div className="aspect-[9/16] w-full animate-pulse bg-secondary" />
            ) : cal ? (
              <CanvasHost canvas={cal} />
            ) : (
              <div className="aspect-video w-full animate-pulse bg-secondary" />
            )}
          </div>
        </section>
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
const shortPlaceholder = (name: string) => name.replace(/^American Space\s+/i, '').replace(/\s+(Club|Activity)$/i, '')
const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary'

type Section = 'content' | 'look' | 'caption' | 'publish' | 'cancel'
const SECTIONS: [Section, string][] = [['content', 'Poster and name'], ['look', 'Look'], ['caption', 'Caption'], ['publish', 'Share'], ['cancel', 'Canceled?']]

function KitEditor({ kind, id, onBack, onManage, onEditSchedule }: { kind: Kind; id: string; onBack: () => void; onManage: () => void; onEditSchedule: (item: Club | EventEntry) => void }) {
  const list = useStore((s) => (kind === 'club' ? s.state.clubs : s.state.events)) as (Club | EventEntry)[]
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const item = list.find((x) => x.id === id)
  const [section, setSection] = React.useState<Section>('content')
  const [typeOpen, setTypeOpen] = React.useState(false)

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
      if (target.kit?.posts?.length) diff.posts = target.kit.posts
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
  const [out, setOut] = React.useState<{ story: HTMLCanvasElement; cover: HTMLCanvasElement | null; highlight: HTMLCanvasElement } | null>(null)
  const [updating, setUpdating] = React.useState(true)
  const visual = R ? [R.kicker, R.top, R.word, R.look, R.palette, R.decor, R.icon, R.bg, R.glass, R.ground, R.motion, R.day, R.time, R.venue, R.poster ?? ''].join('|') : ''
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

  /* the story moves in the preview: a canvas redrawn about 24 times a second */
  const [live, setLive] = React.useState<HTMLCanvasElement | null>(null)
  const [videoBusy, setVideoBusy] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (!R) return
    let on = true
    let raf = 0
    const t = setTimeout(async () => {
      try {
        await loadKitFonts()
        const anim = await makeStoryAnim(await kitParams(R), kitTheme(R))
        if (!on) return
        const c = cv(1080, 1920)
        const g = c.getContext('2d')!
        anim.draw(g, 0)
        setLive(c)
        if (R.motion === 0) return
        const t0 = performance.now()
        let last = 0
        const tick = (now: number) => {
          if (!on) return
          if (now - last > 40) { last = now; anim.draw(g, ((now - t0) / 1000) % anim.loop) }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch { /* the still picture stays */ }
    }, 400)
    return () => { on = false; clearTimeout(t); cancelAnimationFrame(raf) }
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
  const dlKit = async () => {
    const { kitFiles } = await import('@/lib/kit/bundle')
    const { zipFiles } = await import('@/lib/kit/zip')
    saveBlob(await zipFiles(await kitFiles(R, sl)), `${sl}-kit.zip`)
  }
  const dlVideo = async () => {
    setVideoBusy(0)
    try {
      const { storyVideo } = await import('@/lib/kit/story-video')
      const v = await storyVideo(await kitParams(R), kitTheme(R), { onProgress: (x) => setVideoBusy(x) })
      saveBlob(v.blob, `${sl}-story.${v.ext}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'The video could not be made.', false)
    } finally {
      setVideoBusy(null)
    }
  }
  const dlPoster = async () => { if (R.poster) saveBlob((await posterBlobs(R.poster)).poster, `${sl}-poster-3x4.jpg`) }
  const dlBoth = () => { dlStory(); if (out?.cover) setTimeout(dlCover, 600) }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => { flush(); onBack() }}><ArrowLeft className="h-4 w-4" /> All {kind === 'club' ? 'clubs' : 'events'}</Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{updating ? 'Updating the pictures...' : 'Changes are saved with the ' + kind + '.'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        {/* the pictures, always in view while settings change: the story, the poster and the WhatsApp picture under them */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20">
          <div className="grid grid-cols-2 items-start gap-3">
            <PreviewCard title="Instagram story" note={live && R.motion !== 0 ? 'moving' : undefined} canvas={live ?? out?.story ?? null} />
            <section className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3">
              <h3 className="flex items-baseline justify-between gap-2 text-xs font-extrabold">Poster <span className="text-[11px] font-medium text-muted-foreground">Instagram 3:4</span></h3>
              <div className="overflow-hidden border border-border bg-secondary" style={{ aspectRatio: '3 / 4' }}>
                {R.poster ? <img src={R.poster} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-2 text-center text-[11px] font-bold text-muted-foreground">No poster yet</div>}
              </div>
            </section>
          </div>
          {kind === 'club' && (
            <div className="mx-auto w-full max-w-[220px]">
              <PreviewCard title="WhatsApp picture" note="shown round" canvas={out?.cover ?? null} round />
            </div>
          )}
        </div>

        {/* settings */}
        <div className="flex min-w-0 flex-col gap-3">
          <ol className="grid grid-cols-5 gap-1.5" aria-label="Steps">
            {SECTIONS.map(([k, label], i) => {
              const cur = SECTIONS.findIndex(([x]) => x === section)
              return (
                <li key={k}>
                  <button
                    type="button"
                    aria-current={section === k ? 'step' : undefined}
                    onClick={() => setSection(k)}
                    className={cn('flex w-full flex-col items-start gap-1 rounded-xl border px-2.5 py-2 text-left transition', section === k ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:bg-secondary')}
                  >
                    <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[11px] font-extrabold', i < cur ? 'bg-primary text-primary-foreground' : section === k ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{i < cur ? <Check className="h-3 w-3" /> : i + 1}</span>
                    <span className="text-[12px] font-bold leading-tight">{label}</span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
            {section === 'content' && (
              <>
                <Block title="Poster">
                  <div className="flex items-center gap-4">
                    <div className="w-24 shrink-0 overflow-hidden border border-border bg-secondary" style={{ aspectRatio: '3 / 4' }}>
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
                    <Lab hint="Worked out from how often it happens.">Type</Lab>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[12.5px] font-bold">{R.kicker}</span>
                      <span className="text-[11px] font-semibold text-muted-foreground">{edits.kicker !== undefined ? 'Custom' : 'Automatic'}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => setTypeOpen((v) => !v)}>{typeOpen ? 'Done' : 'Change'}</Button>
                      {edits.kicker !== undefined && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => { change((e) => { const n = { ...e }; delete n.kicker; return n }); setTypeOpen(false) }}>Back to automatic</Button>
                      )}
                    </div>
                    {typeOpen && <div className="mt-2"><KickerPicker value={R.kicker} onChange={(v) => set('kicker', v)} /></div>}
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
                <Block title="Colors and decoration">
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

                <Block title="Background and glass">
                  <div>
                    <Lab hint="The color of the background picture itself, under the waves. Used by the story, the WhatsApp picture and the highlight cover.">Background color</Lab>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {Object.entries(GROUNDS).map(([k, [label, tint]]) => {
                        const sw = k === 'look' ? `linear-gradient(135deg,${rg(theme.c1, .35)},${rg(theme.c2, .35)})` : tint ? rg(tint, .7) : 'rgb(244,240,232)'
                        return (
                          <button key={k} type="button" onClick={() => set('ground', k)} aria-pressed={R.ground === k} className={cn('flex flex-col gap-1 rounded-xl border p-1.5 text-left text-[11px] font-bold transition', R.ground === k ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border bg-card hover:bg-secondary')}>
                            <span className="h-7 rounded-md border border-black/5" style={{ background: sw }} />
                            <span className="leading-tight">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {readableInk(LOOKS[R.palette && R.palette !== 'same' ? R.palette : R.look]?.[3] as [number, number, number] || theme.ink, theme.c1, theme.c2, R.ground).changed && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground"><Check className="h-3.5 w-3.5 text-primary" /> The writing color was changed so it stays readable on this background.</p>
                    )}
                  </div>
                  <div>
                    <Lab hint="The glass waves picture behind the writing. Used by the story and the WhatsApp picture.">Wave picture</Lab>
                    <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                      {Array.from({ length: 8 }, (_, i) => (
                        <button key={i} type="button" onClick={() => set('bg', i)} aria-pressed={R.bg === i} className={cn('w-20 shrink-0 snap-start overflow-hidden rounded-lg border p-0', R.bg === i ? 'border-primary ring-2 ring-primary' : 'border-border')} aria-label={`Background ${i + 1}`}>
                          <img src={`/kit/bg/story${i}.jpg`} alt="" className="block aspect-[9/14] w-full object-cover object-top" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Lab hint="How much of the glass waves shows. 0 is a plain pearl ground, 100 is the full effect.">Glass strength: {R.glass}</Lab>
                    <input type="range" min={0} max={100} step={5} value={R.glass} onChange={(e) => set('glass', +e.target.value)} className="w-full accent-[var(--primary)]" aria-label="Glass strength" />
                    <div className="flex justify-between text-[11px] text-muted-foreground"><span>None</span><span>Full</span></div>
                  </div>
                  <div>
                    <Lab hint="How the story moves in the preview and in the video.">Movement</Lab>
                    <div className="flex flex-wrap gap-1.5">
                      {([[0, 'Still'], [1, 'Gentle'], [2, 'Lively']] as const).map(([v, n]) => (
                        <button key={v} type="button" className={chipCls(R.motion === v)} onClick={() => set('motion', v)}>{n}</button>
                      ))}
                    </div>
                  </div>
                </Block>

                <Block title="Icon">
                  <IconBlock value={R.icon} c1={theme.c1} c2={theme.c2} onChange={(k) => set('icon', k)} />
                </Block>

                <Block title="Fine tuning">
                  <div>
                    <Lab hint="Use the colors of another look, keeping this decoration.">Colors only</Lab>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className={chipCls(R.palette === 'same')} onClick={() => set('palette', 'same')}>Same as look</button>
                      {Object.entries(LOOKS).map(([k, v]) => (
                        <button key={k} type="button" className={chipCls(R.palette === k)} onClick={() => set('palette', k)}>{v[0].split(':')[0]}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Lab hint="Use the decoration of another look, keeping these colors.">Edge decoration only</Lab>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                      <DecorThumb k="same" label="Same as look" on={R.decor === 'same'} c1={theme.c1} c2={theme.c2} onPick={() => set('decor', 'same')} />
                      {Object.entries(DECOR_NAMES).map(([k, n]) => (
                        <DecorThumb key={k} k={k} label={n} on={R.decor === k} c1={theme.c1} c2={theme.c2} onPick={() => set('decor', k)} />
                      ))}
                    </div>
                  </div>
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
              </>
            )}
            {section === 'publish' && (
              <>
              <ShareFiles
                items={[
                  { label: 'Story picture', hint: 'PNG, 9:16', icon: Download, on: dlStory, off: !out },
                  { label: videoBusy !== null ? `Recording ${Math.round(videoBusy * 100)}%` : 'Story video', hint: 'MP4, moving', icon: videoBusy !== null ? Loader2 : Play, on: () => void dlVideo(), off: !live || videoBusy !== null },
                  { label: 'Poster', hint: 'JPG, 3:4', icon: Download, on: () => void dlPoster(), off: !R.poster },
                  ...(kind === 'club' ? [{ label: 'WhatsApp picture', hint: 'PNG, round', icon: Download, on: dlCover, off: !out?.cover }] : []),
                  { label: 'Everything', hint: 'ZIP of all files', icon: Download, on: () => void dlKit(), off: !out },
                ]}
              />
              <PublishPanel
                storyCanvas={out?.story ?? null}
                poster={R.poster}
                caption={R.cap}
                posts={item.kit?.posts}
                onManage={onManage}
                scheduleLabel={`${title}: story and posts`}
                videoMaker={out?.story ? async (onProgress) => {
                  const { storyVideo } = await import('@/lib/kit/story-video')
                  const v = await storyVideo(await kitParams(R), kitTheme(R), { onProgress, forPost: true })
                  return { blob: v.blob, ext: v.ext }
                } : undefined}
                onPosted={(done) => patch((d) => {
                  const target = (kind === 'club' ? d.clubs : d.events).find((x) => x.id === id) as Club | EventEntry | undefined
                  if (target) target.kit = { ...(target.kit || {}), posts: [...(target.kit?.posts || []), { t: new Date().toISOString(), to: done, sig: kitSig(kind, target) }] }
                })}
              />
              </>
            )}
            {section === 'cancel' && (
              <CancelPanel R={R} theme={theme} title={title} slug={sl} onManage={onManage} />
            )}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button type="button" variant="outline" size="sm" disabled={section === SECTIONS[0][0]} onClick={() => setSection(SECTIONS[Math.max(0, SECTIONS.findIndex(([x]) => x === section) - 1)][0])}><ArrowLeft className="h-4 w-4" /> Back</Button>
              <span className="text-[11px] font-semibold text-muted-foreground">Step {SECTIONS.findIndex(([x]) => x === section) + 1} of {SECTIONS.length}</span>
              <Button type="button" size="sm" disabled={section === SECTIONS[SECTIONS.length - 1][0]} onClick={() => setSection(SECTIONS[Math.min(SECTIONS.length - 1, SECTIONS.findIndex(([x]) => x === section) + 1)][0])}>Next <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewCard({ title, note, canvas, round, crop, onDownload, extra }: { extra?: React.ReactNode; title: string; note?: string; canvas: HTMLCanvasElement | null; round?: boolean; crop?: boolean; onDownload?: () => void }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3">
      <h3 className="flex items-baseline justify-between gap-2 text-xs font-extrabold">
        {title}
        {note && <span className="text-[11px] font-medium text-muted-foreground">{note}</span>}
      </h3>
      <div className="flex flex-1 items-center">
        {canvas && crop ? (
          /* a tall picture shown as the round cut Instagram makes from its middle */
          <div className="aspect-square w-full overflow-hidden rounded-full bg-secondary">
            <CanvasHost canvas={canvas} className="w-full [&>canvas]:-mt-[39%]" />
          </div>
        ) : canvas ? (
          <CanvasHost canvas={canvas} className={cn('w-full overflow-hidden bg-secondary', round ? 'rounded-full' : 'rounded-[10px]')} />
        ) : (
          <div className={cn('w-full animate-pulse bg-secondary', round ? 'aspect-square rounded-full' : 'aspect-[9/16] rounded-[10px]')} />
        )}
      </div>
      {onDownload && <Button type="button" variant="outline" size="sm" disabled={!canvas} onClick={onDownload}><Download className="h-4 w-4" /> Download</Button>}
      {extra}
    </section>
  )
}

/* ---------------------------------------------------------------- publish */

const blobOf = (c: HTMLCanvasElement, q = 0.92) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('picture failed'))), 'image/jpeg', q))

/* the poster in the ASO frame, 3:4 (1080x1440), and a 4:5 copy (1080x1350, soft side bars) kept for Instagram feeds that refuse 3:4 */
async function posterBlobs(src: string) {
  const im = await loadImage(src)
  const a = cv(1080, 1440)
  fitCover(a.getContext('2d')!, im, 0, 0, 1080, 1440)
  const b = cv(1080, 1350)
  const g = b.getContext('2d')!
  g.filter = 'blur(40px)'
  fitCover(g, im, -60, -60, 1200, 1470)
  g.filter = 'none'
  const w = Math.round((1350 * 3) / 4)
  g.drawImage(im, (1080 - w) / 2, 0, w, 1350)
  return { poster: await blobOf(a), poster45: await blobOf(b) }
}

type Dest = 'igFeed' | 'igStory' | 'fbFeed' | 'fbStory'
const DESTS: [Dest, string, string][] = [
  ['igFeed', 'Instagram post', 'The poster, with the caption'],
  ['igStory', 'Instagram story', 'The story picture'],
  ['fbFeed', 'Facebook post', 'The poster, with the caption'],
  ['fbStory', 'Facebook story', 'The story picture'],
]
interface Step { label: string; ok: boolean; msg: string }
export interface SocialStatus {
  connected: boolean
  source: 'app' | 'env' | 'none'
  pageName: string | null
  igName: string | null
  hasIg: boolean
  savedAt: string | null
  expiresAt: string | null
  noExpiry: boolean
  daysLeft: number | null
  canExchange: boolean
  canKeep: boolean
}

/* whether Facebook and Instagram are connected; `reload` asks again (after connecting or disconnecting) */
function useSocialStatus() {
  /* 'signin': the server no longer knows this admin (the sign-in ended); 'error': the server did not answer properly */
  const [status, setStatus] = React.useState<SocialStatus | null | 'error' | 'signin'>(null)
  const reload = React.useCallback(() => {
    fetch('/api/social/status', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) return setStatus('signin')
        if (!r.ok) return setStatus('error')
        setStatus((await r.json()) as SocialStatus)
      })
      .catch(() => setStatus('error'))
  }, [])
  React.useEffect(() => { reload() }, [reload])
  return { status, reload }
}

type Only = 'story' | 'feed'

function PublishPanel({ storyCanvas, poster, feedCanvas, caption, only, posts, onPosted, onManage, videoMaker, scheduleLabel }: {
  storyCanvas: HTMLCanvasElement | null
  poster: string | null
  feedCanvas?: HTMLCanvasElement | null // a ready picture for the post (the month calendar), used instead of the poster
  caption: string
  only?: Only
  posts?: { t: string; to: string[] }[]
  onPosted?: (done: string[]) => void
  onManage?: () => void
  videoMaker?: (onProgress: (p: number) => void) => Promise<{ blob: Blob; ext: string }> // records the animated story
  scheduleLabel?: string // what to call this in the list of scheduled posts
}) {
  const { status } = useSocialStatus()
  const [pick, setPick] = React.useState<Record<Dest, boolean>>(
    only === 'story' ? { igFeed: false, igStory: true, fbFeed: false, fbStory: true } : only === 'feed' ? { igFeed: true, igStory: false, fbFeed: true, fbStory: false } : { igFeed: true, igStory: true, fbFeed: true, fbStory: false },
  )
  const [confirm, setConfirm] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [steps, setSteps] = React.useState<Step[] | null>(null)
  const [asVideo, setAsVideo] = React.useState(false)
  const [rec, setRec] = React.useState<number | null>(null)
  const [later, setLater] = React.useState(false)
  const [at, setAt] = React.useState('')

  const ready = !!status && typeof status !== 'string' && status.connected
  const dests = DESTS.filter(([k]) => !only || (only === 'story' ? k === 'igStory' || k === 'fbStory' : k === 'igFeed' || k === 'fbFeed'))
  const chosen = dests.filter(([k]) => pick[k])
  const needsPicture = (pick.igFeed || pick.fbFeed) && !poster && !feedCanvas

  const post = async () => {
    if (!storyCanvas && !feedCanvas) return
    setBusy(true)
    setSteps(null)
    try {
      const f = new FormData()
      f.append('targets', JSON.stringify(pick))
      f.append('caption', caption)
      if (asVideo && videoMaker && (pick.igStory || pick.fbStory)) {
        setRec(0)
        const v = await videoMaker((p) => setRec(p))
        setRec(null)
        if (v.ext !== 'mp4') throw new Error('This browser made a WebM video, which Instagram does not take. Use the latest Chrome or Edge, or post the picture.')
        if (v.blob.size > 4_300_000) throw new Error(`The video is ${(v.blob.size / 1e6).toFixed(1)} MB, more than the site can send (4 MB). Try again, or post the picture.`)
        f.append('video', v.blob, 'story.mp4')
      } else if (storyCanvas) f.append('story', await blobOf(storyCanvas), 'story.jpg')
      if (feedCanvas) {
        /* the month calendar is wide: send it as it is, at most 1920 px across */
        const k = Math.min(1, 1920 / feedCanvas.width)
        const c = cv(Math.round(feedCanvas.width * k), Math.round(feedCanvas.height * k))
        c.getContext('2d')!.drawImage(feedCanvas, 0, 0, c.width, c.height)
        f.append('poster', await blobOf(c), 'post.jpg')
      } else if (poster) {
        const p = await posterBlobs(poster)
        f.append('poster', p.poster, 'poster.jpg')
        f.append('poster45', p.poster45, 'poster45.jpg')
      }
      if (later) {
        const when = new Date(at)
        if (!at || Number.isNaN(when.getTime())) throw new Error('Choose a date and time first.')
        f.append('at', when.toISOString())
        f.append('label', scheduleLabel || 'Post')
        f.append('kind', asVideo && videoMaker && (pick.igStory || pick.fbStory) ? 'animation' : 'picture')
        const r = await fetch('/api/social/schedule', { method: 'POST', body: f })
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; msg?: string }
        setSteps([{ label: 'Scheduled', ok: !!j.ok, msg: j.ok ? `It will be posted around ${when.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. See it under Social media > Scheduled.` : j.msg || `The server answered with an error (${r.status}).` }])
        return
      }
      const r = await fetch('/api/social/publish', { method: 'POST', body: f })
      const j = (await r.json()) as { steps?: Step[] }
      const st = j.steps || [{ label: 'Server', ok: false, msg: `The server answered with an error (${r.status}).` }]
      setSteps(st)
      const done = st.filter((x) => x.ok).map((x) => x.label)
      if (done.length) onPosted?.(done)
    } catch (e) {
      setSteps([{ label: 'Stopped', ok: false, msg: e instanceof Error ? e.message : 'failed' }])
    } finally {
      setRec(null)
      setBusy(false)
    }
  }

  const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
      <Block title="Connection">
        {status === null && <p className="text-xs text-muted-foreground">Checking...</p>}
        {status === 'signin' && <SignInAgain />}
        {status === 'error' && <p className="text-xs text-muted-foreground">The server did not answer. Reload the page and try again.</p>}
        {status && typeof status !== 'string' && (
          <div className="flex flex-wrap items-center gap-3">
            {status.connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--aso-ok-tint)] px-2.5 py-1 text-xs font-bold text-[var(--aso-ok)]">
                <Check className="h-3.5 w-3.5" /> {[status.pageName, status.igName && '@' + status.igName].filter(Boolean).join(' · ') || 'Connected'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--aso-gold-tint)] px-2.5 py-1 text-xs font-bold text-[var(--aso-gold)]"><CircleAlert className="h-3.5 w-3.5" /> Not connected yet</span>
            )}
            {onManage && <Button type="button" variant="outline" size="sm" onClick={onManage}>{status.connected ? 'Manage' : 'Connect'}</Button>}
          </div>
        )}
      </Block>

      {scheduleLabel && (
        <Block title="When">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1" role="tablist" aria-label="When to post">
            {([[false, 'Now'], [true, 'Later']] as const).map(([v, label]) => (
              <button key={label} type="button" role="tab" aria-selected={later === v} onClick={() => setLater(v)} className={cn('rounded-full px-3 py-1.5 text-[13px] font-bold transition', later === v ? 'aso-nav-pill' : 'text-foreground/70 hover:bg-secondary')}>{label}</button>
            ))}
          </div>
          {later && (
            <div>
              <input type="datetime-local" className={inputCls} value={at} min={new Date(Date.now() + 5 * 60000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(e) => setAt(e.target.value)} />
              <p className="mt-1.5 text-[11px] text-muted-foreground">Posted within about 10 minutes of that time. The pictures wait on the server, encrypted, until then.</p>
            </div>
          )}
        </Block>
      )}
      </div>

      <Block title="Where to post">
        <div className="grid grid-cols-2 gap-2">
          {dests.map(([k, label, hint]) => (
            <label key={k} className={cn('flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition', pick[k] ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary')}>
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--primary)]" checked={pick[k]} onChange={(e) => setPick((p) => ({ ...p, [k]: e.target.checked }))} />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{label}</span>
                <span className="block text-[11px] text-muted-foreground">{asVideo && (k === 'igStory' || k === 'fbStory') ? 'The animation' : hint}</span>
              </span>
            </label>
          ))}
        </div>
        {videoMaker && (only === 'story' || !only) && (
          <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1" role="tablist" aria-label="Story kind">
            {([[false, 'Picture'], [true, 'Animation']] as const).map(([v, label]) => (
              <button key={label} type="button" role="tab" aria-selected={asVideo === v} onClick={() => setAsVideo(v)} className={cn('rounded-full px-3 py-1.5 text-[13px] font-bold transition', asVideo === v ? 'aso-nav-pill' : 'text-foreground/70 hover:bg-secondary')}>{label}</button>
            ))}
          </div>
        )}
        {needsPicture && <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--aso-gold)]"><CircleAlert className="h-3.5 w-3.5" /> The posts need a poster. Add one under Poster and name.</p>}
        <Button type="button" className="w-full" disabled={!ready || busy || (!storyCanvas && !feedCanvas) || chosen.length === 0 || needsPicture || (later && !at)} onClick={() => setConfirm(true)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {rec !== null ? `Recording ${Math.round(rec * 100)}%` : busy ? (later ? 'Saving' : 'Posting') : later ? 'Schedule' : 'Post now'}
        </Button>
        {asVideo && (only === 'story' || !only) && <p className="text-[11px] text-muted-foreground">The animation is recorded first (about 16 seconds, keep this page open), then sent. Any song you chose is in it.</p>}
      </Block>

      {steps && (
        <Block title="Result">
          <ul className="flex flex-col gap-1.5">
            {steps.map((st, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                {st.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aso-ok)]" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <span><b>{st.label}</b>: {st.msg}</span>
              </li>
            ))}
          </ul>
          {steps.some((x) => x.ok && /story/i.test(x.label)) && (
            <p className="text-xs text-muted-foreground">To keep a story on the profile: open it on Instagram, tap <b>Highlight</b> and choose an album. Instagram does not let other tools do that step.</p>
          )}
        </Block>
      )}

      {posts && posts.length > 0 && (
        <Block title="Posted before">
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {[...posts].reverse().slice(0, 6).map((p, i) => <li key={i}>{when(p.t)}: {p.to.join(', ')}</li>)}
          </ul>
        </Block>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{later ? 'Schedule this post?' : 'Post now?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {later
                ? `It will go live on ${chosen.map(([, l]) => l).join(', ')} around ${at ? new Date(at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'the time you chose'}. You can remove it from Social media > Scheduled before then.`
                : `This goes live on ${chosen.map(([, l]) => l).join(', ')}. A post cannot be taken back from here.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => void post()}>{later ? 'Schedule' : 'Post'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ---------------------------------------------------------------- scheduled posts */

interface Job {
  id: string
  at: string
  label: string
  targets: Record<Dest, boolean>
  kind: 'picture' | 'animation'
  status: 'pending' | 'running' | 'done' | 'failed'
  ranAt?: string
  result?: Step[]
}

function ScheduledPanel() {
  const toast = useStore((s) => s.toast)
  const [jobs, setJobs] = React.useState<Job[] | null>(null)
  const [state, setState] = React.useState<'ok' | 'signin' | 'error'>('ok')
  const load = React.useCallback(() => {
    fetch('/api/social/schedule', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) return setState('signin')
        if (!r.ok) return setState('error')
        setState('ok')
        setJobs(((await r.json()) as { jobs: Job[] }).jobs)
      })
      .catch(() => setState('error'))
  }, [])
  React.useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])
  const cancel = async (id: string) => {
    const r = await fetch(`/api/social/schedule?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; msg?: string }
    toast(j.ok ? 'Removed' : j.msg || 'Could not remove it', !!j.ok)
    load()
  }
  const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const where = (t: Record<Dest, boolean>) => DESTS.filter(([k]) => t[k]).map(([, l]) => l).join(', ')

  if (state === 'signin') return <SignInAgain />
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <Block title="Scheduled posts">
          <p className="text-xs text-muted-foreground">Schedule from any Publish panel by choosing <b>Later</b>. The post goes out within about 10 minutes of the time you set. Instagram has no timer of its own, so the pictures wait here, encrypted, until then.</p>
          {state === 'error' && <p className="text-xs text-destructive">The list could not be loaded. Reload the page and try again.</p>}
          {jobs === null && state === 'ok' && <p className="text-xs text-muted-foreground">Loading...</p>}
          {jobs && jobs.length === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock4 className="h-4 w-4" /> Nothing scheduled.</p>}
          {jobs && jobs.length > 0 && (
            <ul className="flex flex-col gap-2">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-col gap-1.5 rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="min-w-0 flex-1">{j.label}</b>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', j.status === 'done' ? 'bg-[var(--aso-ok-tint)] text-[var(--aso-ok)]' : j.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]')}>
                      {j.status === 'pending' ? 'Waiting' : j.status === 'running' ? 'Posting' : j.status === 'done' ? 'Posted' : 'Failed'}
                    </span>
                    {j.status === 'pending' && <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => void cancel(j.id)}><Trash2 className="h-4 w-4" /> Remove</Button>}
                  </div>
                  <div className="text-xs text-muted-foreground">{when(j.at)} · {j.kind === 'animation' ? 'animation' : 'picture'} · {where(j.targets)}</div>
                  {j.result && j.result.length > 0 && (
                    <ul className="mt-0.5 flex flex-col gap-0.5 text-xs">
                      {j.result.map((r, i) => <li key={i} className={cn('flex items-center gap-1.5', r.ok ? 'text-[var(--aso-ok)]' : 'text-destructive')}>{r.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {r.label}: {r.msg}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={load}>Refresh</Button>
        </Block>
      </div>
    </div>
  )
}

/* the screen still shows the admin menu, but the server no longer accepts this browser: signing out and in again fixes it */
function SignInAgain() {
  const logout = useStore((s) => s.logout)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
      <p className="font-bold text-foreground">The server does not recognize this sign-in any more.</p>
      <p>This happens when the sign-in has ended. Sign out and sign in again with the admin code, then come back here.</p>
      <Button type="button" size="sm" className="self-start" onClick={() => void logout()}>Sign in again</Button>
    </div>
  )
}

/* ---------------------------------------------------------------- connection */

function ConnectionPanel() {
  const { status, reload } = useSocialStatus()
  const toast = useStore((s) => s.toast)
  const [token, setToken] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [choose, setChoose] = React.useState<{ id: string; name: string }[] | null>(null)
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = React.useState(false)
  const [test, setTest] = React.useState<{ ok: boolean; lines: string[] } | null>(null)
  const [changing, setChanging] = React.useState(false)
  const [confirmOff, setConfirmOff] = React.useState(false)

  const connect = async (pageId?: string) => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/social/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, pageId }) })
      const j = (await r.json()) as { ok: boolean; msg: string; choose?: { id: string; name: string }[] }
      setChoose(j.choose || null)
      setMsg({ ok: j.ok, text: j.msg })
      if (j.ok) { setToken(''); setChanging(false); toast('Connected'); reload() }
    } catch {
      setMsg({ ok: false, text: 'The server could not be reached.' })
    } finally {
      setBusy(false)
    }
  }
  const runTest = async () => {
    setTesting(true)
    setTest(null)
    try {
      setTest((await (await fetch('/api/social/test', { method: 'POST' })).json()) as { ok: boolean; lines: string[] })
    } catch {
      setTest({ ok: false, lines: ['The server could not be reached.'] })
    } finally {
      setTesting(false)
    }
  }
  const off = async () => {
    await fetch('/api/social/disconnect', { method: 'POST' })
    setTest(null)
    reload()
    toast('Disconnected')
  }

  if (status === null) return <p className="text-sm text-muted-foreground">Checking...</p>
  if (status === 'signin') return <SignInAgain />
  if (status === 'error') return <p className="text-sm text-muted-foreground">The server did not answer. Reload the page and try again.</p>
  const connected = status.connected
  const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
        <Block title="Facebook and Instagram">
          {connected ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-[var(--aso-ok-tint)] p-3 text-sm">
                <div className="flex items-center gap-2 font-bold text-[var(--aso-ok)]"><Check className="h-4 w-4" /> Connected</div>
                <div className="mt-1 text-foreground">Facebook Page: <b>{status.pageName || 'set'}</b></div>
                <div className="text-foreground">Instagram: <b>{status.hasIg ? '@' + (status.igName || 'linked') : 'none linked'}</b></div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {status.noExpiry ? 'The token does not expire.' : status.expiresAt ? `The token expires on ${day(status.expiresAt)}.` : 'The token expiry is not known.'}
                  {status.source === 'env' ? ' Set up in Vercel.' : status.savedAt ? ` Connected on ${day(status.savedAt)}.` : ''}
                </div>
              </div>
              {status.daysLeft !== null && status.daysLeft <= 14 && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--aso-gold)]">
                  <CircleAlert className="h-3.5 w-3.5" /> {status.daysLeft > 0 ? `The token runs out in ${status.daysLeft} days. Reconnect before then.` : 'The token has run out. Reconnect.'}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void runTest()} disabled={testing}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Test connection
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setChanging((v) => !v)}>Reconnect</Button>
                {status.source === 'app' && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmOff(true)}>Disconnect</Button>}
              </div>
              {test && (
                <ul className={cn('rounded-xl p-3 text-xs', test.ok ? 'bg-[var(--aso-ok-tint)]' : 'bg-destructive/10')}>
                  {test.lines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--aso-gold)]"><CircleAlert className="h-4 w-4" /> Not connected yet.</p>
          )}
        </Block>

        {(!connected || changing) && (
          <>
            {status.canExchange && (
              <Block title="The easy way">
                <p className="text-xs text-muted-foreground">Log in to Facebook with the account that runs the Page and say yes. The app does the rest.</p>
                <a href="/api/social/connect" className="self-start">
                  <Button type="button" size="sm"><Share2 className="h-4 w-4" /> Connect with Facebook</Button>
                </a>
              </Block>
            )}
            <Block title={status.canExchange ? 'Or paste a token' : 'Paste a token'}>
              <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Open <b>developers.facebook.com/tools/explorer</b> and pick the ASO app.</li>
                <li>Press <b>Generate Access Token</b> and tick: pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish.</li>
                <li>Copy the token and paste it here.</li>
              </ol>
              <textarea className={cn(inputCls, 'min-h-[80px] resize-y font-mono text-xs')} value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token here" autoComplete="off" spellCheck={false} />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" disabled={busy || !token.trim()} onClick={() => void connect()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Connect
                </Button>
                <span className="text-[11px] text-muted-foreground">The token is checked with Meta, then kept encrypted on the server. It is never shown again.</span>
              </div>
              {choose && (
                <div className="flex flex-wrap gap-2">
                  {choose.map((c) => <Button key={c.id} type="button" variant="outline" size="sm" onClick={() => void connect(c.id)}>{c.name}</Button>)}
                </div>
              )}
              {msg && <p className={cn('text-xs font-semibold', msg.ok ? 'text-[var(--aso-ok)]' : 'text-destructive')}>{msg.text}</p>}
              {!status.canExchange && <p className="text-[11px] text-muted-foreground">A token from the Explorer lasts about an hour. To make it last, whoever manages Vercel adds <b>META_APP_ID</b> and <b>META_APP_SECRET</b> once (see DEPLOY.md). After that this screen turns it into a lasting token by itself and offers the Connect button.</p>}
              {!status.canKeep && <p className="text-[11px] font-semibold text-destructive">The server has no fixed secret to keep the token with. Ask whoever manages Vercel to set ASO_SESSION_SECRET.</p>}
            </Block>
          </>
        )}
      </div>
      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Facebook and Instagram?</AlertDialogTitle>
            <AlertDialogDescription>The app forgets the token. Nothing is deleted on Facebook or Instagram. You can connect again any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void off()}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
  const groups = React.useMemo(() => Array.from(new Set(Object.values(KIT_ICONS).map((v) => v.group || 'Signature'))), [])
  const [group, setGroup] = React.useState(() => KIT_ICONS[value]?.group || 'Signature')
  const [q, setQ] = React.useState('')
  const keys = React.useMemo(() => {
    const n = q.trim().toLowerCase()
    return Object.entries(KIT_ICONS).filter(([, v]) => (n ? v.label.toLowerCase().includes(n) : (v.group || 'Signature') === group)).map(([k]) => k).slice(0, 150)
  }, [q, group])
  React.useEffect(() => {
    let live = true
    ;(async () => {
      for (const k of keys) {
        const ck = k + '|' + sig
        let u = iconCache.get(ck)
        if (!u) {
          const c = await iconCanvas(k, 96, c1 as [number, number, number], c2 as [number, number, number])
          u = c.toDataURL('image/png')
          iconCache.set(ck, u)
        }
        if (!live) return
        setUrls((o) => (o[ck] === u ? o : { ...o, [ck]: u! }))
      }
    })().catch(() => {})
    return () => { live = false }
  }, [sig, keys])
  return (
    <div className="flex flex-col gap-2.5">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons (for example: book, ball, mic)" className={inputCls} aria-label="Search icons" />
      {!q.trim() && (
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g) => <button key={g} type="button" className={chipCls(group === g)} onClick={() => setGroup(g)}>{g}</button>)}
        </div>
      )}
      <div className="grid max-h-[26rem] grid-cols-4 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={cn('flex flex-col items-center gap-1 rounded-xl border px-1 py-1.5 transition', value === k ? 'border-2 border-primary bg-card' : 'border-border bg-secondary/40 hover:bg-secondary')}
            aria-pressed={value === k}
          >
            {urls[k + '|' + sig] ? <img src={urls[k + '|' + sig]} alt="" className="h-[46px] w-[46px]" /> : <span className="h-[46px] w-[46px]" />}
            <small className="text-center text-[10px] font-semibold leading-tight">{KIT_ICONS[k].label}</small>
          </button>
        ))}
        {!keys.length && <p className="col-span-full py-4 text-center text-xs text-muted-foreground">No icon with that name.</p>}
      </div>
    </div>
  )
}


function DecorThumb({ k, label, on, c1, c2, onPick }: { k: string; label: string; on: boolean; c1: RGB; c2: RGB; onPick: () => void }) {
  const body = k === 'same' ? '' : (DECOR[k] ? DECOR[k](c1, c2) : '')
  return (
    <button type="button" onClick={onPick} aria-pressed={on} className={cn('flex w-[72px] shrink-0 flex-col gap-1 rounded-xl border p-1.5 text-left transition', on ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border bg-card hover:bg-secondary')}>
      <span className="block overflow-hidden rounded-md border border-black/10" style={{ aspectRatio: '9 / 14' }}>
        {k === 'same'
          ? <span className="grid h-full place-items-center bg-secondary text-[10px] font-bold text-muted-foreground">Look</span>
          : <svg viewBox="0 0 1080 1680" className="block h-full w-full" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={{ __html: `<rect width="1080" height="1920" fill="rgb(244,240,232)"/>${body}` }} />}
      </span>
      <span className="text-[10.5px] font-bold leading-tight">{label}</span>
    </button>
  )
}

function IconBlock({ value, c1, c2, onChange }: { value: string; c1: number[]; c2: number[]; onChange: (k: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState('')
  const sig = c1.join(',') + '|' + c2.join(',')
  React.useEffect(() => {
    let live = true
    iconCanvas(value, 96, c1 as [number, number, number], c2 as [number, number, number]).then((c) => { if (live) setUrl(c.toDataURL('image/png')) }).catch(() => {})
    return () => { live = false }
  }, [value, sig])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
        {url ? <img src={url} alt="" className="h-14 w-14" /> : <span className="h-14 w-14" />}
        <div className="min-w-0 flex-1 text-sm font-bold">{KIT_ICONS[value]?.label || 'Icon'}<div className="text-[11px] font-medium text-muted-foreground">Shown on the story and the WhatsApp picture</div></div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>{open ? 'Done' : 'Change'}</Button>
      </div>
      {open && <IconPicker value={value} c1={c1} c2={c2} onChange={(k) => { onChange(k); setOpen(false) }} />}
    </div>
  )
}


function CancelPanel({ R, theme, title, slug, onManage }: { R: KitRec; theme: ReturnType<typeof kitTheme>; title: string; slug: string; onManage: () => void }) {
  const [reason, setReason] = React.useState('')
  const [next, setNext] = React.useState('')
  const [pics, setPics] = React.useState<{ story: HTMLCanvasElement; post: HTMLCanvasElement } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const key = [reason, next, R.top, R.word, R.day, R.time, R.look, R.palette, R.decor, R.bg, R.glass, R.ground, R.icon].join('|')
  React.useEffect(() => {
    let live = true
    setBusy(true)
    const t = setTimeout(async () => {
      try {
        await loadKitFonts()
        const p = await kitParams(R)
        const info = { reason, next: next.trim().toUpperCase() || undefined }
        const [story, post] = [await makeCancel(p, theme, 'story', info), await makeCancel(p, theme, 'post', info)]
        if (live) setPics({ story, post })
      } catch { /* keep the last pictures */ } finally { if (live) setBusy(false) }
    }, 350)
    return () => { live = false; clearTimeout(t) }
  }, [key])
  const caption = `${title}: today's session is canceled.${reason.trim() ? ' ' + reason.trim() : ''}${next.trim() ? ` See you ${next.trim()}.` : ' See you at the next one.'}`
  return (
    <div className="flex flex-col gap-4">
      <Block title="Cancel notice">
        <p className="text-xs text-muted-foreground">Makes a story and a post, in the same look, for when this session does not happen. Nothing here changes the {R.type === 'club' ? 'club' : 'event'} itself.</p>
        <div>
          <Lab>Reason (short)</Lab>
          <textarea className={cn(inputCls, 'min-h-[84px] resize-y')} value={reason} maxLength={220} placeholder="e.g. The teacher is unwell today." onChange={(e) => setReason(e.target.value)} />
        </div>
        <div>
          <Lab hint="Leave empty for a general line.">Next session (optional)</Lab>
          <input className={inputCls} value={next} placeholder="e.g. Thursday 30 October" onChange={(e) => setNext(e.target.value)} />
        </div>
      </Block>
      <div className="grid grid-cols-2 items-start gap-3">
        {([['story', 'Story'], ['post', 'Post 3:4']] as const).map(([k, label]) => (
          <div key={k} className="flex flex-col gap-2">
            <div className="overflow-hidden rounded-lg border border-border bg-secondary" style={{ aspectRatio: k === 'story' ? '9 / 16' : '3 / 4' }}>
              {pics ? <CanvasHost canvas={pics[k]} className="h-full w-full" /> : null}
            </div>
            <Button type="button" variant="outline" size="sm" disabled={!pics || busy} onClick={() => pics && void toBlob(pics[k]).then((b) => saveBlob(b, `${slug}-canceled-${k}.png`))}><Download className="h-4 w-4" /> {label}</Button>
          </div>
        ))}
      </div>
      <PublishPanel storyCanvas={pics?.story ?? null} poster={null} feedCanvas={pics?.post ?? null} caption={caption} onManage={onManage} scheduleLabel={`${title}: canceled`} />
    </div>
  )
}


function ShareFiles({ items }: { items: { label: string; hint: string; icon: React.ElementType; on: () => void; off?: boolean }[] }) {
  return (
    <Block title="Files to download">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <button key={it.label} type="button" disabled={it.off} onClick={it.on} className="flex h-full items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-secondary disabled:opacity-50">
              <Icon className={cn('h-4 w-4 shrink-0 text-primary', it.icon === Loader2 && 'animate-spin')} />
              <span className="min-w-0"><span className="block text-[13px] font-bold leading-tight">{it.label}</span><span className="block text-[11px] text-muted-foreground">{it.hint}</span></span>
            </button>
          )
        })}
      </div>
    </Block>
  )
}
