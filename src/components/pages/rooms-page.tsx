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
  class: 'border-l-blue-500 bg-blue-500/12 text-blue-950 dark:text-blue-100',
  club: 'border-l-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-100',
  event: 'border-l-slate-500 bg-slate-500/15 text-slate-900 dark:text-slate-100',
}
const KIND_DOT: Record<Kind, string> = { class: 'bg-blue-500', club: 'bg-amber-500', event: 'bg-slate-500' }
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
const shortTime = (n: number) => (n % 60 === 0 ? String(Math.floor(n / 60)) : fmt(n))
const shortWindows = (w: [number, number][]) => w.map(([a, b]) => shortTime(a) + '-' + shortTime(b)).join(', ')

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
  const cols = `2.5rem repeat(${rooms.length}, minmax(0, 1fr))`

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:py-6">
      {/* title + week */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-extrabold tracking-tight">Rooms</h1>
        <div className="ml-auto flex items-center gap-1 rounded-full border border-border bg-card p-0.5 text-xs font-bold shadow-sm">
          <button onClick={() => shift(-1)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Previous week"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <button
            onClick={() => { setMonday(mondayOf(new Date())); setDay(dayKeyOf(new Date())) }}
            className="min-w-[8.5rem] rounded-full px-2 py-1 text-center hover:bg-secondary"
            title="Back to this week"
          >
            {range}{iso(monday) === thisMonday ? ' · this week' : ''}
          </button>
          <button onClick={() => shift(1)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Next week"><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* days */}
      <div className="mb-3 grid grid-cols-7 gap-1 rounded-2xl bg-secondary/70 p-1" role="tablist" aria-label="Day of the week">
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
                'relative rounded-xl py-1.5 text-center leading-none transition',
                active ? 'bg-card shadow-sm ring-1 ring-border' : 'hover:bg-card/60',
              )}
            >
              <div className={cn('text-[10px] font-bold uppercase tracking-wide', active ? 'text-primary' : 'text-muted-foreground')}>{d}</div>
              <div className={cn('mt-1 text-[15px] font-extrabold', active ? 'text-foreground' : 'text-foreground/70')}>{date.getDate()}</div>
              {isToday && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-label="today" />}
            </button>
          )
        })}
      </div>

      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[13px] font-extrabold tracking-tight">{dayLabel}</h2>
        <div className="ml-auto flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/40" /> Free</span>
          {(Object.keys(KIND_DOT) as Kind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1"><span className={cn('h-2 w-2 rounded-sm', KIND_DOT[k])} /> {KIND_NAME[k]}</span>
          ))}
        </div>
      </div>

      {hasClash && (
        <div className="mb-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive">
          Two bookings overlap in the same room on this day (shown side by side).
        </div>
      )}

      {/* the calendar: time down the side, one column per room */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <div className="min-w-[440px]">
          <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
            <div />
            {rooms.map((r) => (
              <div key={r} className="truncate px-1 py-1.5 text-center text-[12px] font-bold">{r}</div>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: cols, height: (CLOSE - OPEN) / 60 * HOUR_PX }}>
            <div className="relative">
              {HOURS.slice(0, -1).map((h) => (
                <div key={h} className="absolute right-1.5 text-[10px] font-semibold leading-none text-muted-foreground" style={{ top: (h * 60 - OPEN) / 60 * HOUR_PX + 3 }}>
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>
            {rooms.map((room) => {
              const list = withLanes(dayBookings.filter((b) => b.room === room))
              return (
                <div key={room} className="relative border-l border-border/70 bg-emerald-500/[0.07]">
                  {HOURS.slice(0, -1).map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-border/50" style={{ top: (h * 60 - OPEN) / 60 * HOUR_PX }} />
                  ))}
                  {list.length === 0 && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[11px] font-bold text-emerald-700/80 dark:text-emerald-300/80">Free all day</div>
                  )}
                  {list.map(({ b, lane, lanes }, k) => {
                    const tall = b.end - b.start >= 60
                    return (
                      <div
                        key={k}
                        className={cn('absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] leading-tight', KIND_STYLE[b.kind])}
                        style={{
                          top: (b.start - OPEN) / 60 * HOUR_PX + 1,
                          height: (b.end - b.start) / 60 * HOUR_PX - 2,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        }}
                        title={`${b.label} ${fmt(b.start)}-${fmt(b.end)}${b.note ? ' (' + b.note + ')' : ''}`}
                      >
                        <div className="truncate font-bold">{b.label}</div>
                        {tall && <div className="truncate text-[10px] font-semibold opacity-70">{fmt(b.start)}-{fmt(b.end)}{b.note ? ' · ' + b.note : ''}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {showNow && (
              <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-destructive" style={{ top: (nowMin - OPEN) / 60 * HOUR_PX }}>
                <span className="absolute -top-[3px] left-[2.5rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-destructive" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* free time in plain words */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-bold text-muted-foreground">Free:</span>
        {rooms.map((room) => {
          const free = freeWindows(dayBookings.filter((b) => b.room === room))
          const all = free.length === 1 && free[0][0] === OPEN && free[0][1] === CLOSE
          return (
            <span key={room} className={cn('rounded-full px-2.5 py-1 font-semibold', free.length ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-200' : 'bg-secondary text-muted-foreground')}>
              {room} · {all ? 'all day' : free.length ? shortWindows(free) : 'full'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
