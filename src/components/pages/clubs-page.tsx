'use client'

import * as React from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  CalendarDays,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  List,
  LayoutGrid,
  Palette,
  Camera,
  FileText,
  Send,
  HeartHandshake,
  ArrowRight,
  Repeat2,
  X,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  toneClassForClub,
  nextOccurrence,
  fmtEventWhen,
  fmtRepeat,
  fmtRange,
  fmtFreq,
  fmtD,
  clubDayOrder,
  parseISO,
  isOnceEvent,
} from '@/lib/app-utils'
import { ROOM_LEGEND, DAY_KEYS } from '@/lib/constants'
import { buildCalendarLinks } from '@/lib/export-word'
import { clubIcon } from '@/lib/icons'
import { WeeklyGrid, CalendarListView, CalendarCardsView, CalViewSwitcher, readCalView, writeCalView, type GridItem, type LegendEntry, type CalendarView } from '@/components/weekly-grid'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { CalendarExportMenu } from '@/components/calendar-export'
import { PageHead, SectionHeader, LinkButton, Chip, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Club, EventEntry } from '@/lib/types'

type ClubView = 'list' | 'grid'
const CLUB_VIEW_KEY = 'aso-clubs-view-v2' // v2: grid is now the default

export function ClubsPage({ admin, internMode = false }: { admin: boolean; internMode?: boolean }) {
  const state = useStore((s) => s.state)
  const setView = useStore((s) => s.setView)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)

  const [clubDialog, setClubDialog] = React.useState<{ open: boolean; club: Club | null }>({ open: false, club: null })
  const [eventDialog, setEventDialog] = React.useState<{ open: boolean; event: EventEntry | null }>({ open: false, event: null })
  const [clubView, setClubView] = React.useState<ClubView>(() => {
    if (typeof window === 'undefined') return 'grid'
    const v = window.localStorage.getItem(CLUB_VIEW_KEY)
    return v === 'list' ? 'list' : 'grid'
  })
  React.useEffect(() => {
    try { window.localStorage.setItem(CLUB_VIEW_KEY, clubView) } catch { /* private mode */ }
  }, [clubView])

  const [calView, setCalView] = React.useState<CalendarView>(readCalView)
  React.useEffect(() => {
    writeCalView(calView)
  }, [calView])

  /* the club card expanded in the elegant overlay (grid + list views) */
  const [expanded, setExpanded] = React.useState<Club | null>(null)

  /* All clubs: ordered by day of the week (Monday first), then by time */
  const orderedClubs = React.useMemo(
    () => [...state.clubs].sort((a, b) => clubDayOrder(a) - clubDayOrder(b)),
    [state.clubs],
  )

  const clubItems: GridItem[] = (state.clubs || [])
    .filter((c) => (c.days || []).length && c.time)
    .map((c) => ({
      id: c.id,
      days: c.days,
      slot: c.time,
      code: c.name,
      meta: '',
      lead: c.lead || 'no lead yet',
      room: c.room,
      icon: c.icon,
      tone: toneClassForClub(state, c.id),
    }))

  /* events join the calendar: repeating events sit on their weekday,
     one-off events on the weekday of their date */
  const eventItems: GridItem[] = (state.events || [])
    .map((e) => {
      let day = ''
      if (!isOnceEvent(e)) day = e.day || ''
      else if (e.date) {
        const d = parseISO(e.date)
        day = DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1] || ''
      }
      if (!day || !e.time) return null
      return {
        id: e.id,
        days: [day],
        slot: e.time,
        code: e.title,
        meta: '',
        lead: '',
        room: e.place || '',
        icon: e.icon || 'calendar',
        tone: 'tone-7',
      }
    })
    .filter(Boolean) as GridItem[]

  const calItems = [...clubItems, ...eventItems]
  const calLegend: LegendEntry[] = [
    ...(state.clubs || []).map((c) => ({ label: c.name, tone: toneClassForClub(state, c.id) })),
    ...(eventItems.length ? [{ label: 'Special events', tone: 'tone-7' }] : []),
  ]

  const exportYear = (state.settings.year || 'export').replace(/\//g, '-')
  const buildClubOpts = () => ({
    title: 'ASO - Clubs & Events',
    subtitle: (state.settings.institute || '') + ' - ' + (state.settings.year || '') + ' - ' + (state.clubs || []).length + ' clubs',
    items: calItems,
    legend: calLegend,
    rooms: ROOM_LEGEND,
    libraryLinks: buildCalendarLinks(state),
    appUrl: window.location.origin,
  })

  const upcoming = (state.events || [])
    .map((e) => ({ e, d: nextOccurrence(e) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d!.getTime() - b.d!.getTime())

  const deleteClub = (c: Club) => {
    patch((draft) => {
      draft.clubs = draft.clubs.filter((x) => x.id !== c.id)
    })
    toast('Club removed')
  }
  const deleteEvent = (e: EventEntry) => {
    patch((draft) => {
      draft.events = draft.events.filter((x) => x.id !== e.id)
    })
    toast('Event removed')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Clubs & events"
        subtitle={internMode ? 'For ASO interns · the week of club sessions, what is coming up and every club in one place' : `The American Space week · club sessions and what is coming up${admin ? '' : ' · open to everyone'}`}
        right={
          <div className="flex flex-wrap gap-2">
            {admin && (
              <Button size="sm" onClick={() => setClubDialog({ open: true, club: null })}>
                <Plus className="h-4 w-4" /> Add club
              </Button>
            )}
            {admin && (
              <Button size="sm" variant="outline" onClick={() => setEventDialog({ open: true, event: null })}>
                <Plus className="h-4 w-4" /> Add event
              </Button>
            )}
            <CalendarExportMenu
              buildOpts={buildClubOpts}
              baseName={'ASO_Clubs_Events_Weekly_' + exportYear}
            />
          </div>
        }
      />

      {/* calendar with a view switcher, like the clubs section */}
      <div id="calendar" className="mb-3 flex scroll-mt-28 flex-wrap items-center gap-x-2 gap-y-2">
        <h2 className="text-[15px] font-extrabold tracking-tight">Weekly calendar</h2>
        <CalViewSwitcher view={calView} onChange={setCalView} className="ml-auto" />
      </div>
      <div className="rounded-2xl bg-card">
        {calItems.length ? (
          calView === 'grid' ? (
            <WeeklyGrid items={calItems} legend={calLegend} emptyMessage="No club sessions yet" />
          ) : calView === 'cards' ? (
            <CalendarCardsView items={calItems} legend={calLegend} emptyMessage="No club sessions yet" />
          ) : (
            <CalendarListView items={calItems} legend={calLegend} emptyMessage="No club sessions yet" />
          )
        ) : (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No club sessions yet" hint="Club sessions appear here as soon as they are scheduled." />
        )}
      </div>

      {/* upcoming events */}
      <div id="events" className="mt-7 scroll-mt-28">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[15px] font-extrabold tracking-tight">Upcoming events</h2>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">{upcoming.length} events</span>
        </div>
        {upcoming.length ? (
          <div className="grid gap-3">
            {upcoming.map(({ e, d }) => (
              <EventCard
                key={e.id}
                event={e}
                nextDate={d!}
                admin={admin}
                onEdit={() => setEventDialog({ open: true, event: e })}
                onDelete={() => deleteEvent(e)}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Nothing scheduled" hint="Events land here as soon as they exist." />
        )}
      </div>

      {/* all clubs, list or grid, ordered by day of the week */}
      <div id="clubs" className="mt-7 scroll-mt-28">
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-2">
          <h2 className="text-[15px] font-extrabold tracking-tight">All clubs</h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {state.clubs.length} clubs · {state.clubs.reduce((n, c) => n + (c.days || []).length, 0)} sessions / week
          </span>
          <div className="ml-auto flex items-center gap-0.5 rounded-full border border-border bg-secondary/70 p-0.5" role="group" aria-label="Club display mode">
            <ViewModeButton active={clubView === 'list'} onClick={() => setClubView('list')} label="List view">
              <List className="h-3.5 w-3.5" />
            </ViewModeButton>
            <ViewModeButton active={clubView === 'grid'} onClick={() => setClubView('grid')} label="Grid view">
              <LayoutGrid className="h-3.5 w-3.5" />
            </ViewModeButton>
          </div>
        </div>

        {orderedClubs.length ? (
          clubView === 'list' ? (
            <div className="grid gap-3">
              {orderedClubs.map((c) => (
                <ClubListCard
                  key={c.id}
                  club={c}
                  admin={admin}
                  onExpand={() => setExpanded(c)}
                  onEdit={() => setClubDialog({ open: true, club: c })}
                  onDelete={() => deleteClub(c)}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orderedClubs.map((c) => (
                <ClubGridCard
                  key={c.id}
                  club={c}
                  admin={admin}
                  onExpand={() => setExpanded(c)}
                  onEdit={() => setClubDialog({ open: true, club: c })}
                  onDelete={() => deleteClub(c)}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No clubs yet" hint="Add your first club with the button above." />
        )}
      </div>

      {/* volunteer responsibilities + path to the report section */}
      <Responsibilities onReports={internMode ? undefined : () => setView('reports')} />

      {/* elegant expand overlay: poster + full details + description, X to close */}
      <ClubExpandOverlay club={expanded} onClose={() => setExpanded(null)} admin={admin} onEdit={(c) => { setExpanded(null); setClubDialog({ open: true, club: c }) }} />

      <ClubDialog open={clubDialog.open} onOpenChange={(v) => setClubDialog((s) => ({ ...s, open: v }))} club={clubDialog.club} />
      <EventDialog open={eventDialog.open} onOpenChange={(v) => setEventDialog((s) => ({ ...s, open: v }))} event={eventDialog.event} />
    </div>
  )
}

function ViewModeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex h-7 w-8 items-center justify-center rounded-full transition',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

/* poster fallback shared by the cards: the chosen club icon on a soft tile */
function PosterFallback({ club, compact }: { club: Club; compact?: boolean }) {
  const Icon = clubIcon(club.icon)?.Icon || Sparkles
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary to-background p-4 text-center">
      <div className={cn('flex items-center justify-center rounded-full bg-primary/10 text-primary', compact ? 'h-12 w-12' : 'h-16 w-16')}>
        <Icon className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
      </div>
      {!compact && <div className="px-2 text-sm font-extrabold leading-tight text-foreground/80" dir="auto">{club.name}</div>}
    </div>
  )
}

/* meta line shared by the cards: days · time · room */
function ClubMeta({ club }: { club: Club }) {
  const days = (club.days || []).length ? club.days.join(' / ') : 'no day set'
  const time = club.time || 'no time set'
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {days}</span>
      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {time}</span>
      {club.room && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {club.room}</span>}
    </div>
  )
}

/* frequency + duration line, only when it says something */
function ClubFreqLine({ club }: { club: Club }) {
  const freq = fmtFreq(club.freq)
  const range = fmtRange(club.from, club.until)
  if (club.freq === 'weekly' && !range) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[var(--aso-gold)]">
      {club.freq && club.freq !== 'weekly' && (
        <span className="inline-flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" /> {freq}</span>
      )}
      {range && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {range}</span>}
    </div>
  )
}

function LeadLine({ club }: { club: Club }) {
  return (
    <div className="text-xs">
      {club.lead ? (
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          <User className="h-3.5 w-3.5" /> Lead: {club.lead}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--aso-gold)]">
          <AlertTriangle className="h-3.5 w-3.5" /> Needs a lead
        </span>
      )}
    </div>
  )
}

function ClubListCard({
  club,
  admin,
  onExpand,
  onEdit,
  onDelete,
}: {
  club: Club
  admin: boolean
  onExpand: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const vol = (club.vol || []).join(', ')

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md"
      onClick={onExpand}
    >
      <div className="flex">
        {/* poster: natural A4 ratio, stretches to fill taller rows */}
        <div className="flex w-[96px] shrink-0 bg-secondary sm:w-[144px]">
          {club.poster ? (
            <img src={club.poster} alt={`${club.name} poster`} className="aspect-[848/1200] min-h-full w-full object-cover" />
          ) : (
            <PosterFallback club={club} compact />
          )}
        </div>

        {/* content on the right */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold" dir="auto">{club.name}</h3>
            {club.placeholder && <Chip tone="gold">placeholder</Chip>}
          </div>
          <ClubMeta club={club} />
          <ClubFreqLine club={club} />
          <LeadLine club={club} />

          {/* learn more expandable */}
          <div>
            <button
              onClick={(ev) => { ev.stopPropagation(); setOpen((o) => !o) }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
              {open ? 'Hide' : 'Learn more'}
            </button>
            {open && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2 text-[13px]">
                {club.desc && (
                  <div dir="auto"><span className="font-bold text-muted-foreground">About:</span> {club.desc}</div>
                )}
                {vol && (
                  <div dir="auto"><span className="font-bold text-muted-foreground">Volunteers:</span> {vol}</div>
                )}
                {club.url && (
                  <div>
                    <span className="font-bold text-muted-foreground">Link:</span>{' '}
                    <a href={club.url} target="_blank" rel="noopener" onClick={(ev) => ev.stopPropagation()} className="font-semibold text-primary hover:underline">
                      {club.url}
                    </a>
                  </div>
                )}
                {!club.desc && !vol && !club.url && (
                  <div className="text-muted-foreground">No extra details yet.</div>
                )}
              </div>
            )}
          </div>

          {/* actions */}
          <div className="flex items-center gap-2 pt-1" onClick={(ev) => ev.stopPropagation()}>
            {admin ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </>
            ) : (
              club.url && (
                <a href={club.url} target="_blank" rel="noopener">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Open link
                  </Button>
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClubGridCard({
  club,
  admin,
  onExpand,
  onEdit,
  onDelete,
}: {
  club: Club
  admin: boolean
  onExpand: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const vol = (club.vol || []).join(', ')

  return (
    <div
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md"
      onClick={onExpand}
    >
      {/* poster at its true A4 ratio, zero crop */}
      <div className="aspect-[848/1200] w-full bg-secondary">
        {club.poster ? (
          <img src={club.poster} alt={`${club.name} poster`} className="h-full w-full object-cover" />
        ) : (
          <PosterFallback club={club} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold leading-tight" dir="auto">{club.name}</h3>
          {club.placeholder && <Chip tone="gold">placeholder</Chip>}
        </div>
        <ClubMeta club={club} />
        <ClubFreqLine club={club} />
        <LeadLine club={club} />

        {club.desc && <p className="line-clamp-2 text-[13px] text-muted-foreground" dir="auto">{club.desc}</p>}

        {(vol || club.url) && (
          <div className="text-xs font-semibold text-muted-foreground">
            {vol && <span className="truncate" dir="auto">{vol}</span>}
            {vol && club.url && <span> · </span>}
            {club.url && <span className="text-primary">link</span>}
          </div>
        )}

        {/* actions pinned to the bottom so rows stay symmetric */}
        <div className="mt-auto flex items-center gap-2 pt-1" onClick={(ev) => ev.stopPropagation()}>
          {admin ? (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          ) : (
            club.url && (
              <a href={club.url} target="_blank" rel="noopener">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" /> Open link
                </Button>
              </a>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
   Elegant expand overlay: the whole club in one calm card with an X to close
   ------------------------------------------------------------------------- */
function ClubExpandOverlay({
  club,
  onClose,
  admin,
  onEdit,
}: {
  club: Club | null
  onClose: () => void
  admin: boolean
  onEdit: (c: Club) => void
}) {
  React.useEffect(() => {
    if (!club) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [club, onClose])

  if (!club) return null
  const vol = (club.vol || []).join(', ')
  const Icon = clubIcon(club.icon)?.Icon || Sparkles
  const range = fmtRange(club.from, club.until)
  const showFreq = Boolean(club.freq && club.freq !== 'weekly')
  const showChips = Boolean(club.placeholder || showFreq || range)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={club.name}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl md:max-h-[86vh] md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT — the poster, full height, the visual anchor of the card */}
        <div className="relative aspect-[848/1200] w-full shrink-0 overflow-hidden md:aspect-auto md:w-[300px] md:min-h-[424px]">
          {club.poster ? (
            <img src={club.poster} alt={`${club.name} poster`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary to-background px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-7 w-7" />
              </div>
              <div className="text-[13px] font-extrabold leading-tight text-foreground/80" dir="auto">{club.name}</div>
            </div>
          )}
        </div>

        {/* RIGHT — the details, one calm balanced column */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-y-auto scroll-thin px-6 pb-4 pt-5 md:px-7">
            <div className="my-auto flex flex-col gap-4">
              {/* title + badges */}
              <div className="flex flex-col gap-2 pr-9">
                <h3 className="text-[22px] font-extrabold leading-tight" dir="auto">{club.name}</h3>
                {showChips && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {club.placeholder && <Chip tone="gold">placeholder</Chip>}
                    {showFreq && (
                      <Chip tone="gold">
                        <Repeat2 className="h-3 w-3" /> {fmtFreq(club.freq)}
                      </Chip>
                    )}
                    {range && <Chip tone="gold">{range}</Chip>}
                  </div>
                )}
              </div>

              {/* meta tiles, a calm symmetric grid */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MetaCell icon={CalendarDays} label="Day" value={(club.days || []).length ? club.days.join(' / ') : 'Not set'} />
                <MetaCell icon={Clock} label="Time" value={club.time || 'Not set'} />
                <MetaCell icon={MapPin} label="Room" value={club.room || 'Not set'} />
                <MetaCell icon={User} label="Lead" value={club.lead || 'Not set'} />
              </div>

              {/* about */}
              {club.desc && (
                <div className="rounded-2xl bg-secondary/60 px-4 py-3">
                  <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">About</div>
                  <p className="text-[13px] leading-relaxed text-foreground" dir="auto">{club.desc}</p>
                </div>
              )}

              {/* volunteers */}
              {vol && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-secondary/50 px-3.5 py-2.5">
                  <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Volunteers</div>
                    <div className="text-[13px] font-semibold leading-snug text-foreground" dir="auto">{vol}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* actions, pinned to the bottom edge */}
          {(admin || club.url) && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-secondary/30 px-6 py-3.5 md:px-7">
              {admin && (
                <Button variant="outline" size="sm" onClick={() => onEdit(club)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit club
                </Button>
              )}
              {club.url && (
                <a href={club.url} target="_blank" rel="noopener">
                  <Button size="sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Open link
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>

        {/* X to go back, top right */}
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* one quiet tile of the meta grid: small icon + tiny uppercase label + value */
function MetaCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-secondary/50 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-[13px] font-semibold text-foreground" dir="auto" title={value}>{value}</div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
   Volunteer responsibilities: the full club cycle and where everything goes
   ------------------------------------------------------------------------- */
function Responsibilities({ onReports }: { onReports?: () => void }) {
  const steps = [
    {
      icon: Palette,
      n: 1,
      title: 'Before the club',
      text: 'Create the poster and write the description of your club, then send both to the lead coordinator.',
    },
    {
      icon: Camera,
      n: 2,
      title: 'During the club',
      text: 'Count attendance at every session and take pictures of the club in action.',
    },
    {
      icon: FileText,
      n: 3,
      title: 'After the club',
      text: 'Write the report and submit it on the official reporting platform, the same one used for class reports.',
    },
  ]

  return (
    <div className="mt-7">
      <SectionHeader
        title={
          <span className="inline-flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-primary" /> Volunteer responsibilities
          </span>
        }
        right={
          onReports ? (
            <LinkButton icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={onReports}>
              Report guide
            </LinkButton>
          ) : undefined
        }
      />
      <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
        Every club volunteer owns their club from the first poster to the final report. Here is the cycle and where everything goes.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <div className="text-[13.5px] font-extrabold leading-tight">{s.title}</div>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--aso-gold-tint)] bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 font-extrabold">
          <Send className="h-4 w-4 text-[var(--aso-gold)]" /> Where everything goes
        </div>
        <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aso-gold)]" />
            <span><b className="text-foreground">The report</b> is submitted on the official reporting platform, under your own ASO account.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aso-gold)]" />
            <span><b className="text-foreground">Pictures and a small summary</b> of the session go to the lead coordinator, so they can be posted online.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aso-gold)]" />
            <span><b className="text-foreground">Everything else</b> (poster, description, attendance, questions) passes through the lead coordinator.</span>
          </li>
        </ul>
        {onReports && (
          <div className="mt-3.5">
            <Button size="sm" onClick={onReports}>
              <FileText className="h-3.5 w-3.5" /> Go to the report section
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({
  event,
  nextDate,
  admin,
  onEdit,
  onDelete,
}: {
  event: EventEntry
  nextDate: Date
  admin: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const when = fmtEventWhen(event)
  const isOnce = isOnceEvent(event)
  const nextStr = fmtD(nextDate, { weekday: 'long', day: 'numeric', month: 'long' })
  const repeat = fmtRepeat(event)
  const range = fmtRange(event.from, event.until)
  const Icon = clubIcon(event.icon)?.Icon || CalendarDays

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--aso-gold-tint)] bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {/* poster area: the real poster when there is one, the gold badge otherwise */}
        {event.poster ? (
          <div className="flex w-full shrink-0 justify-center bg-secondary p-4 sm:w-[150px]">
            <img
              src={event.poster}
              alt={`${event.title} poster`}
              className="aspect-[848/1200] w-28 rounded-lg object-cover shadow-sm sm:w-full"
            />
          </div>
        ) : (
          <div className="flex h-44 shrink-0 items-center justify-center bg-gradient-to-br from-[var(--aso-gold-tint)] to-secondary sm:h-auto sm:w-[170px]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]">
              <Icon className="h-7 w-7" />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold" dir="auto">{event.title}</h3>
            <Chip tone={isOnce ? 'primary' : 'gold'}>{when}</Chip>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {nextStr}</span>
            {event.time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {event.time}</span>}
          </div>
          {event.place && (
            <div className="text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.place}</span>
            </div>
          )}

          <div>
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
              {open ? 'Hide' : 'Learn more'}
            </button>
            {open && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2 text-[13px]">
                {event.desc && (
                  <div dir="auto"><span className="font-bold text-muted-foreground">About:</span> {event.desc}</div>
                )}
                {repeat && (
                  <div><span className="font-bold text-muted-foreground">Repeats:</span> {repeat}</div>
                )}
                {range && (
                  <div><span className="font-bold text-muted-foreground">Runs:</span> {range}</div>
                )}
                {isOnce && event.date && (
                  <div><span className="font-bold text-muted-foreground">Date:</span> {event.date}</div>
                )}
                {!event.desc && !repeat && !range && !(isOnce && event.date) && (
                  <div className="text-muted-foreground">No extra details.</div>
                )}
              </div>
            )}
          </div>

          {admin && (
            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
