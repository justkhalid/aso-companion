'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS, ROOM_UNAVAILABLE } from '@/lib/constants'
import { isOnceEvent, roomOptionsFor } from '@/lib/app-utils'
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
  note?: string
}

/* iOS system colors: blue, orange and gray; tinted block, solid edge, colored text */
const KIND_STYLE: Record<Kind, string> = {
  class: 'border-l-[#007AFF] bg-[#007AFF]/15 text-[#0A58B8] dark:text-[#64B1FF]',
  club: 'border-l-[#FF9500] bg-[#FF9500]/18 text-[#A15C00] dark:text-[#FFB84D]',
  event: 'border-l-[#8E8E93] bg-[#8E8E93]/20 text-[#48484A] dark:text-[#C7C7CC]',
}
const KIND_DOT: Record<Kind, string> = { class: 'bg-[#007AFF]', club: 'bg-[#FF9500]', event: 'bg-[#8E8E93]' }
const KIND_NAME: Record<Kind, string> = { class: 'Class', club: 'Club', event: 'Event' }

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
    for (const day of c.days || []) out.push({ room: c.room.trim(), day, start: slot[0], end: slot[1], label: c.code, kind: 'class' })
  }
  for (const c of state.clubs || []) {
    const slot = parseSlot(c.time)
    if (!slot || !c.room || !inSeries(c.from, c.until)) continue
    const note = c.freq === 'biweekly' ? 'every 2 weeks' : c.freq === 'monthly' ? 'monthly' : undefined
    for (const day of c.days || []) out.push({ room: c.room.trim(), day, start: slot[0], end: slot[1], label: c.name, kind: 'club', note })
  }
  for (const e of state.events || []) {
    const slot = parseSlot(e.time)
    if (!slot || !e.place) continue
    if (isOnceEvent(e)) {
      if (!e.date || e.date < weekStart || e.date > weekEnd) continue
      const [y, m, d] = e.date.split('-').map(Number)
      out.push({ room: e.place.trim(), day: dayKeyOf(new Date(y, m - 1, d)), start: slot[0], end: slot[1], label: e.title, kind: 'event', note: 'one-off' })
    } else if (e.day && inSeries(e.from, e.until)) {
      const note = e.recur === 'biweekly' ? 'every 2 weeks' : e.recur === 'monthly' ? 'monthly' : undefined
      out.push({ room: e.place.trim(), day: e.day, start: slot[0], end: slot[1], label: e.title, kind: 'event', note })
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


const HOUR_PX = 38
const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif"
const HOURS = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => OPEN / 60 + i)

/* side-by-side lanes for bookings that overlap in the same room */
function withLanes(list: Booking[]): { b: Booking; lane: number; lanes: number }[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end)
  const laneEnd: number[] = []
  const placed = sorted.map((b) => {
    let lane = laneEnd.findIndex((e) => e <= b.start)
    if (lane < 0) lane = laneEnd.length
    laneEnd[lane] = b.end
    return { b, lane }
  })
  return placed.map((x) => {
    const group = placed.filter((y) => overlaps(x.b, y.b))
    return { ...x, lanes: Math.max(...group.map((g) => g.lane)) + 1 }
  })
}

export function RoomsPage({ embedded = false }: { embedded?: boolean }) {
  const state = useStore((s) => s.state)
  const [monday, setMonday] = React.useState(() => mondayOf(new Date()))
  const [day, setDay] = React.useState<string>(() => dayKeyOf(new Date()))

  const bookings = React.useMemo(() => bookingsForWeek(state, monday), [state, monday])
  const rooms = React.useMemo(() => {
    const set = new Set<string>(roomOptionsFor(state))
    bookings.forEach((b) => set.add(b.room))
    return Array.from(set)
  }, [state, bookings])

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const range = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const thisMonday = iso(mondayOf(new Date()))
  const shift = (n: number) => setMonday((m) => { const x = new Date(m); x.setDate(x.getDate() + n * 7); return x })

  const dayIndex = DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number])
  const dayDate = new Date(monday)
  dayDate.setDate(dayDate.getDate() + dayIndex)
  const dayLabel = dayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const dayBookings = bookings.filter((b) => b.day === day)
  const closed = (room: string) => !!ROOM_UNAVAILABLE[room]?.includes(day)

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = iso(dayDate) === iso(now) && nowMin >= OPEN && nowMin <= CLOSE

  const hasClash = rooms.some((r) => {
    const l = dayBookings.filter((b) => b.room === r)
    return l.some((x, i) => l.some((y, j) => j > i && overlaps(x, y)))
  })
  const cols = `2.75rem repeat(${rooms.length}, minmax(0, 1fr))`
  const circle = 'flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06] text-foreground/70 transition active:scale-95 dark:bg-white/10'

  return (
    <div
      className={embedded ? '' : 'mx-auto max-w-3xl px-4 py-5 sm:py-7'}
      style={{ fontFamily: IOS_FONT }}
    >
      {/* large title */}
      <div className="mb-4 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          {embedded ? (
            <h2 className="text-[22px] font-bold leading-none tracking-tight" style={{ fontFamily: IOS_FONT }}>Which rooms are free</h2>
          ) : (
            <h1 className="text-[32px] font-bold leading-none tracking-tight" style={{ fontFamily: IOS_FONT }}>Rooms</h1>
          )}
          <p className="mt-1.5 text-[15px] text-muted-foreground">{range}{iso(monday) === thisMonday ? ' · this week' : ''}</p>
        </div>
        <div className="flex items-center gap-1.5 pb-0.5">
          <button onClick={() => shift(-1)} className={circle} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
          {iso(monday) !== thisMonday && (
            <button onClick={() => { setMonday(mondayOf(new Date())); setDay(dayKeyOf(new Date())) }} className="px-1 text-[15px] font-medium text-[#007AFF]">Today</button>
          )}
          <button onClick={() => shift(1)} className={circle} aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* days: segmented control */}
      <div className="mb-5 grid grid-cols-7 rounded-[10px] bg-black/[0.06] p-0.5 dark:bg-white/10" role="tablist" aria-label="Day of the week">
        {DAY_KEYS.map((d, i) => {
          const date = new Date(monday)
          date.setDate(date.getDate() + i)
          const isToday = iso(date) === iso(now)
          const active = d === day
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              onClick={() => setDay(d)}
              className={cn(
                'rounded-[8px] py-1.5 text-center leading-none transition',
                active ? 'bg-card shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.06)]' : 'hover:bg-black/[0.04]',
              )}
            >
              <div className={cn('text-[10px] font-medium uppercase tracking-wide', isToday ? 'text-[#FF3B30]' : 'text-muted-foreground')}>{d}</div>
              <div className={cn('mt-1 text-[17px] tabular-nums', active ? 'font-semibold' : 'font-medium text-foreground/75', isToday && 'text-[#FF3B30]')}>{date.getDate()}</div>
            </button>
          )
        })}
      </div>

      <div className="mb-2 flex items-center gap-3 px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground" style={{ fontFamily: IOS_FONT }}>{dayLabel}</h2>
        <div className="ml-auto flex items-center gap-2.5 text-[12px] text-muted-foreground">
          {(Object.keys(KIND_DOT) as Kind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', KIND_DOT[k])} /> {KIND_NAME[k]}</span>
          ))}
          {rooms.some(closed) && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-black/15 dark:bg-white/25" /> Not available</span>}
        </div>
      </div>

      {hasClash && (
        <div className="mb-2 rounded-xl bg-[#FF3B30]/10 px-3.5 py-2 text-[13px] font-medium text-[#D70015] dark:text-[#FF6961]">
          Two bookings overlap in the same room on this day.
        </div>
      )}

      {/* calendar card */}
      <div className="overflow-x-auto rounded-[20px] bg-card shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_24px_rgba(0,0,0,0.04)]">
        <div className="min-w-[440px] px-1 pb-2 pt-1">
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div />
            {rooms.map((r) => (
              <div key={r} className="truncate px-1 py-2 text-center text-[12px] font-semibold text-foreground/80">{r}</div>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: cols, height: (CLOSE - OPEN) / 60 * HOUR_PX }}>
            {/* hairlines run across the whole width, like the iOS day view */}
            {HOURS.map((h) => (
              <div key={h} className="pointer-events-none absolute right-0 border-t border-black/[0.08] dark:border-white/10" style={{ left: '2.75rem', top: (h * 60 - OPEN) / 60 * HOUR_PX }} />
            ))}
            <div className="relative">
              {HOURS.map((h) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: (h * 60 - OPEN) / 60 * HOUR_PX + (h * 60 === OPEN ? 7 : 0) }}>
                  {String(h).padStart(2, '0') + ':00'}
                </div>
              ))}
            </div>
            {rooms.map((room) => {
              const list = withLanes(dayBookings.filter((b) => b.room === room))
              return (
                <div
                  key={room}
                  className={cn('relative', closed(room) && 'rounded-lg bg-black/[0.05] dark:bg-white/[0.06]')}
                  style={closed(room) ? { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 7px, rgba(120,120,128,0.14) 7px 8px)' } : undefined}
                >
                  {closed(room) && list.length === 0 && (
                    <div className="absolute inset-x-0 top-3 text-center text-[11px] font-semibold text-muted-foreground">Not available</div>
                  )}
                  {list.map(({ b, lane, lanes }, k) => {
                    const tall = b.end - b.start >= 60
                    return (
                      <div
                        key={k}
                        className={cn('absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-[12px] leading-tight', KIND_STYLE[b.kind])}
                        style={{
                          top: (b.start - OPEN) / 60 * HOUR_PX + 1,
                          height: (b.end - b.start) / 60 * HOUR_PX - 2,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        }}
                        title={`${b.label} ${fmt(b.start)}-${fmt(b.end)}${b.note ? ' (' + b.note + ')' : ''}`}
                      >
                        <div className="truncate font-semibold">{b.label}</div>
                        {tall && <div className="truncate text-[11px] tabular-nums opacity-80">{fmt(b.start)} - {fmt(b.end)}{b.note ? ', ' + b.note : ''}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {showNow && (
              <div className="pointer-events-none absolute right-0 z-10 border-t-[1.5px] border-[#FF3B30]" style={{ left: '2.75rem', top: (nowMin - OPEN) / 60 * HOUR_PX }}>
                <span className="absolute -left-[3px] -top-[4px] h-[7px] w-[7px] rounded-full bg-[#FF3B30]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* free time: inset grouped list */}
      <h3 className="mb-1.5 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground" style={{ fontFamily: IOS_FONT }}>Free</h3>
      <div className="overflow-hidden rounded-[16px] bg-card shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        {rooms.map((room, i) => {
          const isClosed = closed(room)
          const free = isClosed ? [] : freeWindows(dayBookings.filter((b) => b.room === room))
          const all = free.length === 1 && free[0][0] === OPEN && free[0][1] === CLOSE
          return (
            <div key={room} className={cn('flex items-baseline gap-3 py-2.5 pl-4 pr-4 text-[15px]', i > 0 && 'ml-4 border-t border-black/[0.08] pl-0 dark:border-white/10')}>
              <span className="w-28 shrink-0 font-medium">{room}</span>
              <span className={cn('min-w-0 flex-1 text-right tabular-nums', all ? 'font-medium text-[#248A3D] dark:text-[#30D158]' : isClosed ? 'text-muted-foreground' : free.length ? 'text-muted-foreground' : 'text-[#D70015] dark:text-[#FF6961]')}>
                {isClosed ? 'Not available' : all ? 'Free all day' : free.length ? free.map(([a, b]) => fmt(a) + ' - ' + fmt(b)).join(', ') : 'Fully booked'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
