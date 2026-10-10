'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_FULL, DAY_KEYS } from '@/lib/constants'
import { isOnceEvent, roomOptionsFor } from '@/lib/app-utils'
import { PageHead } from '@/components/ui-bits'
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

const KIND_STYLE: Record<Kind, string> = {
  class: 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100',
  club: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
  event: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
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
const windowText = (w: [number, number][]) => w.map(([a, b]) => fmt(a) + '-' + fmt(b)).join(', ')

const HOUR_PX = 56
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

export function RoomsPage() {
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
  const range = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' to ' + sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const thisMonday = iso(mondayOf(new Date()))
  const shift = (n: number) => setMonday((m) => { const x = new Date(m); x.setDate(x.getDate() + n * 7); return x })

  const dayIndex = DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number])
  const dayDate = new Date(monday)
  dayDate.setDate(dayDate.getDate() + dayIndex)
  const dayLabel = dayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const dayBookings = bookings.filter((b) => b.day === day)

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = iso(dayDate) === iso(now) && nowMin >= OPEN && nowMin <= CLOSE

  const hasClash = rooms.some((r) => {
    const l = dayBookings.filter((b) => b.room === r)
    return l.some((x, i) => l.some((y, j) => j > i && overlaps(x, y)))
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead title="Rooms" subtitle="Pick a day. Green means the room is free, colored boxes mean it is taken." />

      {/* week */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => shift(-1)} className="rounded-full border border-border bg-card p-1.5 hover:bg-secondary" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
        <div className="min-w-[13rem] text-center text-sm font-bold">{range}</div>
        <button onClick={() => shift(1)} className="rounded-full border border-border bg-card p-1.5 hover:bg-secondary" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
        {iso(monday) !== thisMonday && (
          <button onClick={() => { setMonday(mondayOf(new Date())); setDay(dayKeyOf(new Date())) }} className="text-xs font-bold text-primary hover:underline">Back to this week</button>
        )}
      </div>

      {/* days */}
      <div className="mb-4 grid grid-cols-7 gap-1.5" role="tablist" aria-label="Day of the week">
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
                'rounded-xl border px-1 py-2 text-center transition',
                active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-card hover:bg-secondary',
              )}
            >
              <div className="text-[11px] font-bold uppercase tracking-wide opacity-80">{d}</div>
              <div className="text-base font-extrabold leading-tight">{date.getDate()}</div>
              {isToday && <div className={cn('text-[9px] font-bold', active ? 'opacity-90' : 'text-primary')}>today</div>}
            </button>
          )
        })}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-extrabold tracking-tight">{dayLabel}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">Free</span>
          <span className={cn('rounded-md px-1.5 py-0.5', KIND_STYLE.class)}>Class</span>
          <span className={cn('rounded-md px-1.5 py-0.5', KIND_STYLE.club)}>Club</span>
          <span className={cn('rounded-md px-1.5 py-0.5', KIND_STYLE.event)}>Event</span>
        </div>
      </div>

      {hasClash && (
        <div className="mb-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive">
          Two things are booked in the same room at the same time on this day (shown side by side).
        </div>
      )}

      {/* the calendar: time down the side, one column per room */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <div className="min-w-[520px]">
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `3.25rem repeat(${rooms.length}, minmax(0, 1fr))` }}>
            <div />
            {rooms.map((r) => (
              <div key={r} className="border-l border-border px-1 py-2 text-center text-[13px] font-extrabold">{r}</div>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: `3.25rem repeat(${rooms.length}, minmax(0, 1fr))`, height: (CLOSE - OPEN) / 60 * HOUR_PX }}>
            {/* time axis */}
            <div className="relative">
              {HOURS.slice(0, -1).map((h) => (
                <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground" style={{ top: (h * 60 - OPEN) / 60 * HOUR_PX + 8 }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {rooms.map((room) => {
              const list = withLanes(dayBookings.filter((b) => b.room === room))
              return (
                <div key={room} className="relative border-l border-border bg-emerald-500/10">
                  {HOURS.slice(1, -1).map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-emerald-600/15" style={{ top: (h * 60 - OPEN) / 60 * HOUR_PX }} />
                  ))}
                  {list.length === 0 && (
                    <div className="absolute inset-x-0 top-3 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">Free all day</div>
                  )}
                  {list.map(({ b, lane, lanes }, k) => (
                    <div
                      key={k}
                      className={cn('absolute overflow-hidden rounded-lg border border-card px-1.5 py-1 text-[11.5px] leading-tight shadow-sm', KIND_STYLE[b.kind])}
                      style={{
                        top: (b.start - OPEN) / 60 * HOUR_PX + 1,
                        height: (b.end - b.start) / 60 * HOUR_PX - 2,
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}
                      title={`${b.label} ${fmt(b.start)}-${fmt(b.end)}${b.note ? ' (' + b.note + ')' : ''}`}
                    >
                      <div className="font-extrabold">{b.label}</div>
                      <div className="font-semibold opacity-80">{fmt(b.start)}-{fmt(b.end)}</div>
                      {b.note && <div className="opacity-70">{b.note}</div>}
                    </div>
                  ))}
                </div>
              )
            })}
            {showNow && (
              <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive" style={{ top: (nowMin - OPEN) / 60 * HOUR_PX }}>
                <span className="absolute -top-2 left-0 rounded-r bg-destructive px-1 text-[9px] font-bold text-white">now</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* plain-words summary */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 text-sm font-extrabold">Free on {dayLabel}</div>
        <ul className="flex flex-col gap-1 text-sm">
          {rooms.map((room) => {
            const free = freeWindows(dayBookings.filter((b) => b.room === room))
            const all = free.length === 1 && free[0][0] === OPEN && free[0][1] === CLOSE
            return (
              <li key={room} className="flex flex-wrap gap-x-2">
                <span className="w-24 shrink-0 font-bold">{room}</span>
                <span className={cn(free.length ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}>
                  {all ? 'Free all day' : free.length ? windowText(free) : 'Not free today'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
