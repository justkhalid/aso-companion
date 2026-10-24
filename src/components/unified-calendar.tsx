'use client'

import * as React from 'react'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Download, Pencil, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { isoOf, mondayOfWeek } from '@/lib/app-utils'
import { openQuickAdd } from '@/components/admin/quick-add'
import { ClassDialog } from '@/components/dialogs/class-dialog'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { EventDialog } from '@/components/dialogs/event-dialog'
import type { ClassEntry, Club, EventEntry } from '@/lib/types'
import { PUBLIC_CLASS_TONE, PUBLIC_CLUB_TONE, PUBLIC_EVENT_TONE, PUBLIC_OUTSIDE_TONE, publicClassItems, publicClubItems, publicEventItems } from '@/lib/calendar-items'
import { CalendarSwitch, type CalTab } from './calendar-switch'
import { MonthCalendarImage } from './month-calendar-image'
import { RoomsPage } from './pages/rooms-page'
import { WeeklyGrid, type GridItem, type LegendEntry } from './weekly-grid'
import { moveSession } from '@/lib/move-session'
import { cn } from '@/lib/utils'

type Span = 'month' | 'week'

/* The one calendar for the whole site: what to show (clubs and events, classes, rooms) and how far (a month picture or a week). */
export function UnifiedCalendar({ tab, onTab, counts, animated = false }: { tab: CalTab; onTab: (t: CalTab) => void; counts?: Partial<Record<CalTab, number>>; animated?: boolean }) {
  const state = useStore((s) => s.state)
  /* only the signed-in admin edits from the calendar; the public site, its preview and the director view only look */
  const canEdit = useStore((s) => s.admin && !s.pubView)
  /* classes and rooms open on the week, clubs and events on the month; a choice made on one tab stays on that tab */
  const [spans, setSpans] = React.useState<Partial<Record<CalTab, Span>>>({})
  /* on a phone the month picture is too small to read and the slowest thing to draw: the week opens first there, and the picture is the plain one (nothing moves) */
  const phone = typeof window !== 'undefined' && (window.innerWidth < 640 || window.matchMedia('(hover: none)').matches)
  const span: Span = spans[tab] ?? (tab === 'cluev' && !phone ? 'month' : 'week')
  const setSpan = (v: Span) => setSpans((s) => ({ ...s, [tab]: v }))
  const [offset, setOffset] = React.useState(0)
  const monday = React.useMemo(() => {
    const m = mondayOfWeek(new Date())
    m.setDate(m.getDate() + offset * 7)
    return m
  }, [offset])
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', o)
  const weekLabel = `${fmt(monday, { day: 'numeric', month: 'short' })} to ${fmt(sunday, { day: 'numeric', month: 'short' })}`

  const items = tab === 'classes' ? publicClassItems(state, monday) : [...publicClubItems(state, monday), ...publicEventItems(state, monday)]

  /* edit from the calendar: tap a chip to open its form, drag it to another day or hour to move it */
  const patch = useStore((s) => s.patch)
  const toastFn = useStore((s) => s.toast)
  const [editing, setEditing] = React.useState<{ cls?: ClassEntry; club?: Club; event?: EventEntry } | null>(null)
  const baseId = (id: string) => id.split(':')[0]
  const edit = (item: GridItem) => {
    const id = baseId(item.id)
    const cls = state.classes.find((c) => c.id === id)
    const club = state.clubs.find((c) => c.id === id)
    const event = state.events.find((e) => e.id === id)
    if (cls || club || event) setEditing({ cls, club, event })
  }
  const move = (item: GridItem, from: string, to: string, delta: number) => {
    const id = baseId(item.id)
    if (/:(off|cov)/.test(item.id.slice(id.length))) return toastFn('Open a canceled or covered session to change it', false)
    moveSession(state, patch, toastFn, { id, label: item.code, from, to, delta })
  }
  const legend: LegendEntry[] = [
    ...(items.some((i) => i.tone === PUBLIC_CLASS_TONE) ? [{ label: 'English classes', tone: PUBLIC_CLASS_TONE }] : []),
    ...(items.some((i) => i.tone === PUBLIC_CLUB_TONE) ? [{ label: 'Clubs', tone: PUBLIC_CLUB_TONE }] : []),
    ...(items.some((i) => i.tone === PUBLIC_EVENT_TONE) ? [{ label: 'Events', tone: PUBLIC_EVENT_TONE }] : []),
    ...(items.some((i) => i.tone === PUBLIC_OUTSIDE_TONE) ? [{ label: 'Outside', tone: PUBLIC_OUTSIDE_TONE }] : []),
    ...(items.some((i) => i.tone === 'tone-8') ? [{ label: 'Canceled', tone: 'tone-8' }] : []),
  ]

  /* the week as one picture: the same grid as on the page, in the same text size */
  const toast = useStore((s) => s.toast)
  const downloadWeek = async () => {
    const what = tab === 'classes' ? 'Classes' : 'Clubs and events'
    const { renderTimetablePNG, downloadBlob } = await import('@/lib/export-canvas')
    const blob = await renderTimetablePNG({ title: `ASO - ${what}, ${weekLabel}`, subtitle: state.settings.institute || '', items, legend, zoom: 1 })
    if (!blob) return toast('Nothing to export', false)
    downloadBlob(blob, `ASO_${what.replace(/ /g, '_')}_week_${isoOf(monday)}.png`)
    toast('Image downloaded')
  }

  const seg = (value: Span, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setSpan(value)}
      aria-pressed={span === value}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition', span === value ? 'aso-nav-pill shadow-sm' : 'text-foreground/70 hover:text-foreground')}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
    </button>
  )

  return (
    <div data-no-motion>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
        <CalendarSwitch tab={tab} onChange={onTab} rooms counts={counts} />
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-secondary/70 p-0.5" role="group" aria-label="Month or week">
          {seg('month', 'Month', CalendarDays)}
          {seg('week', 'Week', CalendarRange)}
        </div>
      </div>

      {span === 'month' ? (
        <div key={tab + 'm'} className="aso-tab-in">
          {tab === 'rooms' ? <MonthCalendarImage rooms animated={animated && !phone} /> : <MonthCalendarImage animated={animated && !phone} clubs={tab === 'cluev'} events={tab === 'cluev'} classes={tab === 'classes'} />}
        </div>
      ) : tab === 'rooms' ? (
        <div key="rw" className="aso-tab-in"><RoomsPage embedded /></div>
      ) : (
        <div key={tab + 'w'} className="aso-tab-in">
          <div className="mb-3 flex items-center justify-center gap-2">
            <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week" className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
            <div className="min-w-44 text-center text-base font-extrabold" aria-live="polite">{weekLabel}</div>
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next week" className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
            <button type="button" onClick={() => void downloadWeek()} className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold hover:bg-secondary"><Download className="h-4 w-4" aria-hidden /> Download week</button>
          </div>
          {canEdit && (
            <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Pencil className="h-3.5 w-3.5" aria-hidden /> Tap a session to edit it, drag it to move it</span>
              <button type="button" onClick={() => openQuickAdd(tab === 'classes' ? 'class' : 'event')} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"><Plus className="h-3.5 w-3.5" aria-hidden /> {tab === 'classes' ? 'Add class' : 'Add event'}</button>
              {tab !== 'classes' && <button type="button" onClick={() => openQuickAdd('club')} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"><Plus className="h-3.5 w-3.5" aria-hidden /> Add club</button>}
            </div>
          )}
          <div className="rounded-2xl bg-card">
            <WeeklyGrid items={items} legend={legend} weekMonday={monday} onCellClick={canEdit ? edit : undefined} onMove={canEdit ? move : undefined} emptyMessage="Nothing scheduled this week" />
          </div>
          {canEdit && (
            <>
            <ClassDialog open={!!editing?.cls} onOpenChange={(v) => !v && setEditing(null)} cls={editing?.cls ?? null} />
            <ClubDialog open={!!editing?.club} onOpenChange={(v) => !v && setEditing(null)} club={editing?.club ?? null} />
            <EventDialog open={!!editing?.event} onOpenChange={(v) => !v && setEditing(null)} event={editing?.event ?? null} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
