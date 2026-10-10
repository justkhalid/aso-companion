'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS, ROOM_UNAVAILABLE } from '@/lib/constants'
import { isOnceEvent, roomOptionsFor, toneClassForClub, toneClassForLevel } from '@/lib/app-utils'
import { clubIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { State } from '@/lib/types'

/* Admin: which rooms are free through the week. Classes and clubs repeat every
   week; events count on their own date (one-off) or their weekday (repeating).
   Opening hours below only set the window the free time is measured in. */
const OPEN = 9 * 60
const CLOSE = 18 * 60 // ASO closes at 18:00; free time is only counted inside OPEN-CLOSE

type Kind = 'class' | 'club' | 'event'
interface Booking {
  room: string
  day: string
  start: number
  end: number
  label: string
  kind: Kind
  tone: string // same tone classes as the other calendars
  icon?: string
  lead?: string
  group: string // legend label
  note?: string
}


const toMin = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}
const fmt = (n: number) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0')
function parseSlot(slot: string): [number, number] | null {
  const [a, b] = String(slot || '').split('-')
  if (!a || !b) return null
  const s = toMin(a)
  const e = toMin(b)
  return Number.isNaN(s) || Number.isNaN(e) || e <= s ? null : [s, e]
}

const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
const dayKeyOf = (d: Date) => DAY_KEYS[(d.getDay() + 6) % 7]

function bookingsForWeek(state: State, monday: Date): Booking[] {
  const out: Booking[] = []
  const weekStart = iso(monday)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const weekEnd = iso(sunday)
  const inSeries = (from?: string, until?: string) => (!from || from <= weekEnd) && (!until || until >= weekStart)

  for (const c of state.classes || []) {
    const slot = parseSlot(c.time)
    if (!slot || !c.room) continue
    for (const day of c.days || []) out.push({ room: c.room.trim(), day, start: slot[0], end: slot[1], label: c.code, kind: 'class', tone: toneClassForLevel(state, c.level), lead: c.teacher, group: c.level })
  }
  for (const c of state.clubs || []) {
    const slot = parseSlot(c.time)
    if (!slot || !c.room || !inSeries(c.from, c.until)) continue
    const note = c.freq === 'biweekly' ? 'every 2 weeks' : c.freq === 'monthly' ? 'monthly' : undefined
    for (const day of c.days || []) out.push({ room: c.room.trim(), day, start: slot[0], end: slot[1], label: c.name, kind: 'club', note, tone: toneClassForClub(state, c.id), icon: c.icon, lead: c.lead, group: c.name })
  }
  for (const e of state.events || []) {
    const slot = parseSlot(e.time)
    if (!slot || !e.place) continue
    if (isOnceEvent(e)) {
      if (!e.date || e.date < weekStart || e.date > weekEnd) continue
      const [y, m, d] = e.date.split('-').map(Number)
      out.push({ room: e.place.trim(), day: dayKeyOf(new Date(y, m - 1, d)), start: slot[0], end: slot[1], label: e.title, kind: 'event', note: 'one-off', tone: 'tone-7', icon: e.icon || 'calendar', group: 'Special events' })
    } else if (e.day && inSeries(e.from, e.until)) {
      const note = e.recur === 'biweekly' ? 'every 2 weeks' : e.recur === 'monthly' ? 'monthly' : undefined
      out.push({ room: e.place.trim(), day: e.day, start: slot[0], end: slot[1], label: e.title, kind: 'event', note, tone: 'tone-7', icon: e.icon || 'calendar', group: 'Special events' })
    }
  }
  return out
}

/* free windows inside [from, to] once the busy slots are taken out */
function freeWindows(busy: Booking[], from = OPEN, to = CLOSE): [number, number][] {
  const sorted = [...busy].sort((a, b) => a.start - b.start)
  const out: [number, number][] = []
  let cur = from
  for (const b of sorted) {
    if (b.end <= cur) continue
    if (b.start > cur) out.push([cur, Math.min(b.start, to)])
    cur = Math.max(cur, b.end)
    if (cur >= to) break
  }
  if (cur < to) out.push([cur, to])
  return out.filter(([a, b]) => b > a)
}
const overlaps = (a: Booking, b: Booking) => a.start < b.end && b.start < a.end


const LABEL_W = 64 // day label column
const ROOM_W = 84 // room label column in the all-rooms view
const MIN_GRID = 760 // below this width the calendar scrolls sideways
const ALL = '__all'

/* stacked lanes for bookings that overlap in the same room and day */
function withLanes(list: Booking[]): { b: Booking; lane: number }[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end)
  const laneEnd: number[] = []
  return sorted.map((b) => {
    let lane = laneEnd.findIndex((e) => e <= b.start)
    if (lane < 0) lane = laneEnd.length
    laneEnd[lane] = b.end
    return { b, lane }
  })
}

export function RoomsPage({ embedded = false }: { embedded?: boolean }) {
  const state = useStore((s) => s.state)
  const [monday, setMonday] = React.useState(() => mondayOf(new Date()))
  const [picked, setPicked] = React.useState<string>(ALL)

  const bookings = React.useMemo(() => bookingsForWeek(state, monday), [state, monday])
  const rooms = React.useMemo(() => {
    const set = new Set<string>(roomOptionsFor(state))
    bookings.forEach((b) => set.add(b.room))
    return Array.from(set)
  }, [state, bookings])
  const mode = picked === ALL || rooms.includes(picked) ? picked : ALL
  const all = mode === ALL
  const shown = all ? rooms : [mode]
  const CHIP_H = all ? 38 : 50

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const range = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const thisMonday = iso(mondayOf(new Date()))
  const shift = (n: number) => setMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + n * 7); return d })

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const visible = bookings.filter((b) => shown.includes(b.room))

  /* the time axis stretches to fit anything outside opening hours (an evening event), measured over
     every room so the axis does not jump when you switch tabs */
  const viewOpen = Math.min(OPEN, Math.floor(Math.min(...bookings.map((b) => b.start), OPEN) / 60) * 60)
  const viewClose = Math.max(CLOSE, Math.ceil(Math.max(...bookings.map((b) => b.end), CLOSE) / 60) * 60)
  const HOURS = Array.from({ length: (viewClose - viewOpen) / 60 + 1 }, (_, i) => viewOpen / 60 + i)
  const pct = (min: number) => (Math.min(Math.max(min, viewOpen), viewClose) - viewOpen) / (viewClose - viewOpen) * 100
  const showNow = iso(monday) === thisMonday && nowMin >= viewOpen && nowMin <= viewClose
  const legendItems = Array.from(new Map(visible.map((b) => [b.group, { label: b.group, tone: b.tone }])).values())
  const circle = 'flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06] text-foreground/70 transition active:scale-95 dark:bg-white/10'
  const labelW = LABEL_W + (all ? ROOM_W : 0)

  /* one block per day; inside it one row per room shown */
  const days = DAY_KEYS.map((day, i) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    const rowsForDay = shown.map((room) => {
      const closed = !!ROOM_UNAVAILABLE[room]?.includes(day)
      const list = visible.filter((b) => b.room === room && b.day === day)
      const lanes = withLanes(list)
      const laneCount = Math.max(1, ...lanes.map((l) => l.lane + 1))
      return { room, closed, lanes, free: closed ? [] : freeWindows(list), height: laneCount * CHIP_H + (laneCount + 1) * 4 }
    })
    return { day, date, isToday: iso(date) === iso(now), rows: rowsForDay }
  })
  const clash = visible.some((a, i) => visible.some((b, j) => j > i && a.room === b.room && a.day === b.day && overlaps(a, b)))

  return (
    <div className={embedded ? '' : 'mx-auto max-w-5xl px-4 py-5 sm:py-7'}>
      {/* title + week */}
      <div className="mb-4 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          {embedded ? (
            <h2 className="text-[15px] font-extrabold tracking-tight">Free rooms</h2>
          ) : (
            <h1 className="text-[28px] font-extrabold leading-none tracking-tight">Rooms</h1>
          )}
          <p className={cn('text-muted-foreground', embedded ? 'mt-0.5 text-xs font-semibold' : 'mt-1.5 text-sm')}>
            {range}{iso(monday) === thisMonday ? ' · this week' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 pb-0.5">
          <button onClick={() => shift(-1)} className={circle} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
          {iso(monday) !== thisMonday && (
            <button onClick={() => setMonday(mondayOf(new Date()))} className="px-1 text-sm font-semibold text-primary">Today</button>
          )}
          <button onClick={() => shift(1)} className={circle} aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* all rooms, or one room */}
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-[10px] bg-black/[0.06] p-0.5 dark:bg-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Room">
        {[ALL, ...rooms].map((r) => {
          const on = r === mode
          return (
            <button
              key={r}
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(r)}
              className={cn(
                'min-w-[5.5rem] flex-1 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-sm transition',
                on ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.06)]' : 'font-medium text-foreground/70 hover:bg-black/[0.04]',
              )}
            >
              {r === ALL ? 'All rooms' : r}
            </button>
          )
        })}
      </div>

      {clash && (
        <div className="mb-2 rounded-xl bg-[#FF3B30]/10 px-3.5 py-2 text-[13px] font-medium text-[#D70015] dark:text-[#FF6961]">
          Two bookings overlap in the same room. They are stacked in the same row.
        </div>
      )}

      {/* days on the left, hours across the top, like the other calendars */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <div style={{ minWidth: MIN_GRID }}>
          <div className="flex border-b border-border bg-secondary/40 text-[11px] font-bold text-muted-foreground">
            <div style={{ width: labelW }} className="shrink-0" />
            {HOURS.slice(0, -1).map((h) => (
              <div key={h} className={cn('min-w-0 flex-1 border-l border-border/60 px-1.5 py-1.5 tabular-nums', (h * 60 < OPEN || h * 60 >= CLOSE) && 'opacity-50')}>{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>

          <div className="relative">
            {days.map((d, di) => (
              <div key={d.day} className={cn('flex', di > 0 && 'border-t border-border', d.isToday && 'bg-primary/[0.04]')}>
                <div style={{ width: LABEL_W }} className="flex shrink-0 flex-col items-center justify-center border-r border-border bg-secondary/40 leading-tight">
                  <span className={cn('text-[11px] font-bold uppercase', d.isToday ? 'text-primary' : 'text-muted-foreground')}>{d.day}</span>
                  <span className={cn('text-[11px] font-medium tabular-nums', d.isToday ? 'text-primary' : 'text-muted-foreground')}>{d.date.getDate()}/{d.date.getMonth() + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  {d.rows.map((r, ri) => (
                    <div key={r.room} className={cn('flex', ri > 0 && 'border-t border-border/60')} style={{ height: r.height }}>
                      {all && (
                        <div style={{ width: ROOM_W }} className="flex shrink-0 items-center border-r border-border/60 px-2 text-[11px] font-semibold text-foreground/80">
                          <span className="truncate">{r.room}</span>
                        </div>
                      )}
                      <div
                        className="relative min-w-0 flex-1"
                        style={{
                          backgroundImage: 'linear-gradient(to right, rgba(120,120,128,0.14) 1px, transparent 1px)',
                          backgroundSize: `${100 / (HOURS.length - 1)}% 100%`,
                          ...(r.closed ? { backgroundColor: 'rgba(120,120,128,0.08)' } : null),
                        }}
                      >
                        {r.closed && (
                          <div
                            className="absolute inset-1 flex items-center justify-center rounded-lg text-[11px] font-semibold text-muted-foreground"
                            style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 7px, rgba(120,120,128,0.16) 7px 8px)' }}
                          >
                            Not available
                          </div>
                        )}

                        {/* hours outside opening time (only drawn when something is booked there) */}
                        {viewOpen < OPEN && (
                          <div className="absolute inset-y-0 left-0 bg-black/[0.05] dark:bg-white/[0.06]" style={{ width: `${pct(OPEN)}%` }} />
                        )}
                        {viewClose > CLOSE && (
                          <div className="absolute inset-y-0 right-0 bg-black/[0.05] dark:bg-white/[0.06]" style={{ left: `${pct(CLOSE)}%` }} />
                        )}

                        {/* free slots */}
                        {r.free.map(([a, b], k) => {
                          const wide = (pct(b) - pct(a)) * (MIN_GRID - labelW) / 100
                          return (
                            <div
                              key={'f' + k}
                              className="absolute inset-y-1 flex flex-col items-start justify-center overflow-hidden rounded-lg border border-emerald-600/25 bg-emerald-500/12 px-2.5 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200"
                              style={{ left: `calc(${pct(a)}% + 2px)`, width: `calc(${pct(b) - pct(a)}% - 4px)` }}
                              title={`Free ${fmt(a)} - ${fmt(b)}`}
                            >
                              <span className="text-[11px] font-bold leading-[13px]">Free</span>
                              {!all && wide >= 90 && <span className="text-[10px] font-semibold leading-[12px] tabular-nums opacity-80">{fmt(a)} - {fmt(b)}</span>}
                              {all && wide >= 130 && <span className="text-[10px] font-semibold leading-[12px] tabular-nums opacity-80">{fmt(a)} - {fmt(b)}</span>}
                            </div>
                          )
                        })}

                        {/* bookings, same chip design as the other calendars */}
                        {r.lanes.map(({ b, lane }, k) => {
                          const Icon = clubIcon(b.icon)?.Icon
                          return (
                            <div
                              key={'b' + k}
                              className={cn('absolute', b.tone)}
                              style={{ left: `calc(${pct(b.start)}% + 2px)`, width: `calc(${pct(b.end) - pct(b.start)}% - 4px)`, top: 4 + lane * (CHIP_H + 4), height: CHIP_H }}
                              title={`${b.label} · ${b.room} · ${fmt(b.start)}-${fmt(b.end)}${b.note ? ' (' + b.note + ')' : ''}`}
                            >
                              <div
                                className={cn('relative flex h-full w-full flex-col justify-center overflow-hidden rounded-lg border px-2 py-1 pl-[13px] text-left', all ? 'gap-[1px]' : 'gap-[3px]')}
                                style={{ background: 'var(--tone-bg)', borderColor: 'var(--tone-line)', color: 'var(--tone-txt)' }}
                              >
                                <span aria-hidden className="absolute left-[3px] top-1 bottom-1 w-[3px] rounded-full" style={{ background: 'var(--tone-txt)', opacity: 0.45 }} />
                                <span className="flex w-full items-center gap-1 text-[11px] font-bold leading-[13px]">
                                  {Icon ? <Icon className="h-3 w-3 shrink-0" /> : <i className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--tone-txt)' }} />}
                                  <span className="truncate" dir="auto">{b.label}</span>
                                </span>
                                <span className="truncate text-[10px] font-semibold leading-[12px] tabular-nums" style={{ opacity: 0.92 }}>
                                  {fmt(b.start)}-{fmt(b.end)}{b.note ? ' · ' + b.note : ''}
                                </span>
                                {!all && b.lead && <span className="truncate text-[10px] font-medium leading-[12px]" style={{ opacity: 0.75 }}>{b.lead}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {showNow && (
              <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: labelW, right: 0 }}>
                <div className="absolute inset-y-0 border-l border-[#FF3B30]" style={{ left: `${pct(nowMin)}%` }}>
                  <span className="absolute -left-[3px] -top-[1px] h-[7px] w-[7px] rounded-full bg-[#FF3B30]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* legend, same style as the other calendars */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
          <i className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Free
        </span>
        {legendItems.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <i className={`${l.tone} inline-block h-2 w-2 rounded-full`} style={{ background: 'var(--tone-txt)' }} />
            {l.label}
          </span>
        ))}
        {(viewOpen < OPEN || viewClose > CLOSE) && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <i className="inline-block h-2 w-2 rounded-sm bg-black/15 dark:bg-white/25" /> Outside opening hours (09:00-18:00)
          </span>
        )}
        {days.some((d) => d.rows.some((r) => r.closed)) && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <i className="inline-block h-2 w-2 rounded-full bg-black/20 dark:bg-white/30" /> Not available
          </span>
        )}
      </div>
    </div>
  )
}
