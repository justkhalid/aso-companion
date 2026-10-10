'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS } from '@/lib/constants'
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

const KIND_STYLE: Record<Kind, string> = {
  class: 'bg-primary text-primary-foreground',
  club: 'bg-amber-600 text-white',
  event: 'bg-slate-600 text-white',
}
const KIND_DOT: Record<Kind, string> = { class: 'bg-primary', club: 'bg-amber-600', event: 'bg-slate-600' }
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
  const range = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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
  const cols = `3rem repeat(${rooms.length}, minmax(0, 1fr))`

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-bold tracking-tight">Rooms</h1>
        <div className="ml-auto flex items-center gap-1 text-sm tabular-nums">
          <button onClick={() => shift(-1)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[7.5rem] text-center font-medium">{range}</span>
          <button onClick={() => shift(1)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
          {iso(monday) !== thisMonday && (
            <button onClick={() => { setMonday(mondayOf(new Date())); setDay(dayKeyOf(new Date())) }} className="ml-2 text-xs font-medium text-primary hover:underline">Today</button>
          )}
        </div>
      </div>

      {/* days */}
      <div className="mb-4 grid grid-cols-7 border-b border-border" role="tablist" aria-label="Day of the week">
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
                '-mb-px border-b-2 px-1 pb-2 pt-1 text-center transition-colors',
                active ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              <div className={cn('text-[11px] font-medium uppercase', active ? 'text-primary' : 'text-muted-foreground')}>{d}</div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums',
                  isToday ? 'bg-primary font-semibold text-primary-foreground' : active ? 'font-semibold' : 'text-foreground/80',
                )}
              >
                {date.getDate()}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold">{dayLabel}</h2>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {(Object.keys(KIND_DOT) as Kind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-sm', KIND_DOT[k])} /> {KIND_NAME[k]}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm border border-border bg-card" /> Free</span>
        </div>
      </div>

      {hasClash && (
        <div className="mb-2 border-l-2 border-destructive bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
          Two bookings overlap in the same room on this day. They are shown side by side.
        </div>
      )}

      {/* time down the side, one column per room */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <div className="min-w-[440px]">
          <div className="grid border-b border-border text-xs font-medium" style={{ gridTemplateColumns: cols }}>
            <div />
            {rooms.map((r) => (
              <div key={r} className="truncate border-l border-border px-2 py-1.5">{r}</div>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: cols, height: (CLOSE - OPEN) / 60 * HOUR_PX }}>
            <div className="relative">
              {HOURS.slice(0, -1).map((h) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground" style={{ top: (h * 60 - OPEN) / 60 * HOUR_PX + (h * 60 === OPEN ? 6 : 0) }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {rooms.map((room) => {
              const list = withLanes(dayBookings.filter((b) => b.room === room))
              return (
                <div key={room} className="relative border-l border-border">
                  {HOURS.slice(1, -1).map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: (h * 60 - OPEN) / 60 * HOUR_PX }} />
                  ))}
                  {list.map(({ b, lane, lanes }, k) => {
                    const tall = b.end - b.start >= 60
                    return (
                      <div
                        key={k}
                        className={cn('absolute overflow-hidden rounded-[3px] px-1.5 py-1 text-[11px] leading-tight', KIND_STYLE[b.kind])}
                        style={{
                          top: (b.start - OPEN) / 60 * HOUR_PX + 1,
                          height: (b.end - b.start) / 60 * HOUR_PX - 2,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        }}
                        title={`${b.label} ${fmt(b.start)}-${fmt(b.end)}${b.note ? ' (' + b.note + ')' : ''}`}
                      >
                        <div className="truncate font-semibold">{b.label}</div>
                        {tall && <div className="truncate text-[10px] tabular-nums opacity-85">{fmt(b.start)} - {fmt(b.end)}{b.note ? ', ' + b.note : ''}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {showNow && (
              <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-destructive" style={{ top: (nowMin - OPEN) / 60 * HOUR_PX }}>
                <span className="absolute -top-[3px] left-[3rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-destructive" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* free time, plain table */}
      <table className="mt-4 w-full text-sm">
        <caption className="pb-1 text-left text-xs font-medium text-muted-foreground">Free on {dayLabel}</caption>
        <tbody className="divide-y divide-border border-y border-border">
          {rooms.map((room) => {
            const free = freeWindows(dayBookings.filter((b) => b.room === room))
            const all = free.length === 1 && free[0][0] === OPEN && free[0][1] === CLOSE
            return (
              <tr key={room}>
                <th scope="row" className="w-32 py-1.5 pr-3 text-left font-medium">{room}</th>
                <td className="py-1.5 tabular-nums text-foreground/80">
                  {all ? 'All day' : free.length ? free.map(([a, b]) => fmt(a) + ' - ' + fmt(b)).join(',  ') : 'Not free'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
