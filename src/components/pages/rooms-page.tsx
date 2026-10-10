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
const CLOSE = 19 * 60

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
const MIN_GRID = 780 // below this width the calendar scrolls sideways
const CHIP_H = 50
const HOURS = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => OPEN / 60 + i)
/* position along the time axis as a percentage; times outside the opening window are clamped to its edges */
const pct = (min: number) => (Math.min(Math.max(min, OPEN), CLOSE) - OPEN) / (CLOSE - OPEN) * 100

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
  const [picked, setPicked] = React.useState<string>('')

  const bookings = React.useMemo(() => bookingsForWeek(state, monday), [state, monday])
  const rooms = React.useMemo(() => {
    const set = new Set<string>(roomOptionsFor(state))
    bookings.forEach((b) => set.add(b.room))
    return Array.from(set)
  }, [state, bookings])
  const room = rooms.includes(picked) ? picked : rooms[0]

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const range = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const thisMonday = iso(mondayOf(new Date()))
  const shift = (n: number) => setMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + n * 7); return d })

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = iso(monday) === thisMonday && nowMin >= OPEN && nowMin <= CLOSE

  const roomBookings = bookings.filter((b) => b.room === room)
  const legendItems = Array.from(new Map(roomBookings.map((b) => [b.group, { label: b.group, tone: b.tone }])).values())
  const circle = 'flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06] text-foreground/70 transition active:scale-95 dark:bg-white/10'

  const rows = DAY_KEYS.map((day, i) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    const closed = !!ROOM_UNAVAILABLE[room]?.includes(day)
    const list = roomBookings.filter((b) => b.day === day && b.end > OPEN && b.start < CLOSE)
    const lanes = withLanes(list)
    const laneCount = Math.max(1, ...lanes.map((l) => l.lane + 1))
    return {
      day,
      date,
      closed,
      lanes,
      free: closed ? [] : freeWindows(list),
      height: laneCount * CHIP_H + (laneCount + 1) * 4,
      isToday: iso(date) === iso(now),
    }
  })
  const clash = rooms.length > 0 && roomBookings.some((a, i) => roomBookings.some((b, j) => j > i && a.day === b.day && overlaps(a, b)))

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

      {/* room picker */}
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-[10px] bg-black/[0.06] p-0.5 dark:bg-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Room">
        {rooms.map((r) => {
          const on = r === room
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
              {r}
            </button>
          )
        })}
      </div>

      {clash && (
        <div className="mb-2 rounded-xl bg-[#FF3B30]/10 px-3.5 py-2 text-[13px] font-medium text-[#D70015] dark:text-[#FF6961]">
          Two bookings overlap in this room. They are stacked in the same row.
        </div>
      )}

      {/* days on the left, hours across the top, like the other calendars */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <div style={{ minWidth: MIN_GRID }}>
          <div className="flex border-b border-border bg-secondary/40 text-[11px] font-bold text-muted-foreground">
            <div style={{ width: LABEL_W }} className="shrink-0" />
            {HOURS.slice(0, -1).map((h) => (
              <div key={h} className="min-w-0 flex-1 border-l border-border/60 px-1.5 py-1.5 tabular-nums">{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>

          <div className="relative">
            {rows.map((r, ri) => (
              <div key={r.day} className={cn('flex', ri > 0 && 'border-t border-border', r.isToday && 'bg-primary/[0.04]')} style={{ height: r.height }}>
                <div style={{ width: LABEL_W }} className="flex shrink-0 flex-col items-center justify-center border-r border-border bg-secondary/40 leading-tight">
                  <span className={cn('text-[11px] font-bold uppercase', r.isToday ? 'text-primary' : 'text-muted-foreground')}>{r.day}</span>
                  <span className={cn('text-[11px] font-medium tabular-nums', r.isToday ? 'text-primary' : 'text-muted-foreground')}>{r.date.getDate()}/{r.date.getMonth() + 1}</span>
                </div>
                <div
                  className="relative min-w-0 flex-1"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(120,120,128,0.14) 1px, transparent 1px)',
                    backgroundSize: `${100 / HOURS.slice(0, -1).length}% 100%`,
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

                  {/* free slots */}
                  {r.free.map(([a, b], k) => (
                    <div
                      key={'f' + k}
                      className="absolute inset-y-1 flex flex-col items-start justify-center overflow-hidden rounded-lg px-2.5 border border-emerald-600/25 bg-emerald-500/12 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200"
                      style={{ left: `calc(${pct(a)}% + 2px)`, width: `calc(${pct(b) - pct(a)}% - 4px)` }}
                      title={`Free ${fmt(a)} - ${fmt(b)}`}
                    >
                      <span className="text-[11px] font-bold leading-[13px]">Free</span>
                      {(pct(b) - pct(a)) * (MIN_GRID - LABEL_W) / 100 >= 90 && <span className="text-[10px] font-semibold leading-[12px] tabular-nums opacity-80">{fmt(a)} - {fmt(b)}</span>}
                    </div>
                  ))}

                  {/* bookings, same chip design as the other calendars */}
                  {r.lanes.map(({ b, lane }, k) => {
                    const Icon = clubIcon(b.icon)?.Icon
                    return (
                      <div
                        key={'b' + k}
                        className={cn('absolute', b.tone)}
                        style={{ left: `calc(${pct(b.start)}% + 2px)`, width: `calc(${pct(b.end) - pct(b.start)}% - 4px)`, top: 4 + lane * (CHIP_H + 4), height: CHIP_H }}
                        title={`${b.label} ${fmt(b.start)}-${fmt(b.end)}${b.note ? ' (' + b.note + ')' : ''}`}
                      >
                        <div
                          className="relative flex h-full w-full flex-col justify-center gap-[3px] overflow-hidden rounded-lg border px-2 py-1 pl-[13px] text-left"
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
                          {b.lead && <span className="truncate text-[10px] font-medium leading-[12px]" style={{ opacity: 0.75 }}>{b.lead}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {showNow && (
              <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: LABEL_W, right: 0 }}>
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
        {rows.some((r) => r.closed) && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <i className="inline-block h-2 w-2 rounded-full bg-black/20 dark:bg-white/30" /> Not available
          </span>
        )}
      </div>
    </div>
  )
}
