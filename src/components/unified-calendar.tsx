'use client'

import * as React from 'react'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { mondayOfWeek } from '@/lib/app-utils'
import { PUBLIC_CLASS_TONE, PUBLIC_CLUB_TONE, PUBLIC_EVENT_TONE, publicClassItems, publicClubItems, publicEventItems } from '@/lib/calendar-items'
import { CalendarSwitch, type CalTab } from './calendar-switch'
import { MonthCalendarImage } from './month-calendar-image'
import { RoomsPage } from './pages/rooms-page'
import { WeeklyGrid, type LegendEntry } from './weekly-grid'
import { cn } from '@/lib/utils'

type Span = 'month' | 'week'

/* The one calendar for the whole site: what to show (clubs and events, classes, rooms) and how far (a month picture or a week). */
export function UnifiedCalendar({ tab, onTab, counts }: { tab: CalTab; onTab: (t: CalTab) => void; counts?: Partial<Record<CalTab, number>> }) {
  const state = useStore((s) => s.state)
  const [span, setSpan] = React.useState<Span>('month')
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
  const legend: LegendEntry[] = [
    ...(items.some((i) => i.tone === PUBLIC_CLASS_TONE) ? [{ label: 'English classes', tone: PUBLIC_CLASS_TONE }] : []),
    ...(items.some((i) => i.tone === PUBLIC_CLUB_TONE) ? [{ label: 'Clubs', tone: PUBLIC_CLUB_TONE }] : []),
    ...(items.some((i) => i.tone === PUBLIC_EVENT_TONE) ? [{ label: 'Events', tone: PUBLIC_EVENT_TONE }] : []),
    ...(items.some((i) => i.tone === 'tone-8') ? [{ label: 'Cancelled', tone: 'tone-8' }] : []),
  ]

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
          {tab === 'rooms' ? <MonthCalendarImage rooms /> : <MonthCalendarImage clubs={tab === 'cluev'} events={tab === 'cluev'} classes={tab === 'classes'} />}
        </div>
      ) : tab === 'rooms' ? (
        <div key="rw" className="aso-tab-in"><RoomsPage embedded /></div>
      ) : (
        <div key={tab + 'w'} className="aso-tab-in">
          <div className="mb-3 flex items-center justify-center gap-2">
            <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week" className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
            <div className="min-w-44 text-center text-base font-extrabold" aria-live="polite">{weekLabel}</div>
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next week" className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="rounded-2xl bg-card">
            <WeeklyGrid items={items} legend={legend} weekMonday={monday} emptyMessage="Nothing scheduled this week" />
          </div>
        </div>
      )}
    </div>
  )
}
