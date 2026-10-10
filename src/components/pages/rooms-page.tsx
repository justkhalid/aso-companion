'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, DoorOpen, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_FULL, DAY_KEYS } from '@/lib/constants'
import { isOnceEvent, roomOptionsFor } from '@/lib/app-utils'
import { Chip, PageHead } from '@/components/ui-bits'
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
  class: 'bg-primary/10 text-primary',
  club: 'bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]',
  event: 'bg-secondary text-foreground/80',
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

const TIMES = Array.from({ length: (CLOSE - OPEN) / 30 + 1 }, (_, i) => fmt(OPEN + i * 30))

export function RoomsPage() {
  const state = useStore((s) => s.state)
  const [monday, setMonday] = React.useState(() => mondayOf(new Date()))
  const [fDay, setFDay] = React.useState<string>(() => dayKeyOf(new Date()))
  const [fFrom, setFFrom] = React.useState('14:00')
  const [fTo, setFTo] = React.useState('16:00')

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

  /* free-room finder */
  const want: Booking = { room: '', day: fDay, start: toMin(fFrom), end: toMin(fTo), label: '', kind: 'class' }
  const validWant = want.end > want.start
  const finder = rooms.map((room) => {
    const clash = bookings.filter((b) => b.room === room && b.day === fDay && validWant && overlaps(b, want))
    return { room, clash }
  })
  const freeRooms = finder.filter((f) => f.clash.length === 0)

  const clashes = React.useMemo(() => {
    const out: string[] = []
    for (const room of rooms) {
      for (const day of DAY_KEYS) {
        const list = bookings.filter((b) => b.room === room && b.day === day)
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
          if (overlaps(list[i], list[j])) out.push(`${room}, ${DAY_FULL[day]}: ${list[i].label} and ${list[j].label}`)
        }
      }
    }
    return out
  }, [bookings, rooms])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead title="Rooms" subtitle={`Which room is free and when, from ${fmt(OPEN)} to ${fmt(CLOSE)}. Classes and clubs repeat every week; events count on their own date.`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => shift(-1)} className="rounded-full border border-border bg-card p-1.5 hover:bg-secondary" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
        <div className="min-w-[13rem] text-center text-sm font-bold">{range}</div>
        <button onClick={() => shift(1)} className="rounded-full border border-border bg-card p-1.5 hover:bg-secondary" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
        {iso(monday) !== thisMonday && (
          <button onClick={() => setMonday(mondayOf(new Date()))} className="text-xs font-bold text-primary hover:underline">This week</button>
        )}
      </div>

      {/* free-room finder */}
      <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-extrabold"><Search className="h-4 w-4 text-primary" /> Find a free room</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={fDay} onChange={(e) => setFDay(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-1.5" aria-label="Day">
            {DAY_KEYS.map((d) => <option key={d} value={d}>{DAY_FULL[d]}</option>)}
          </select>
          <select value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-1.5" aria-label="From">
            {TIMES.slice(0, -1).map((t) => <option key={t}>{t}</option>)}
          </select>
          <span className="text-muted-foreground">to</span>
          <select value={fTo} onChange={(e) => setFTo(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-1.5" aria-label="To">
            {TIMES.slice(1).map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {!validWant ? (
          <p className="mt-3 text-sm text-muted-foreground">Pick an end time after the start time.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            <div>
              {freeRooms.length ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">Free:</span>
                  {freeRooms.map((f) => <Chip key={f.room} tone="ok">{f.room}</Chip>)}
                </span>
              ) : (
                <span className="font-semibold text-destructive">No room is free at that time.</span>
              )}
            </div>
            {finder.filter((f) => f.clash.length).map((f) => (
              <div key={f.room} className="text-muted-foreground">
                <span className="font-semibold text-foreground">{f.room}</span> is used by {f.clash.map((b) => `${b.label} (${fmt(b.start)}-${fmt(b.end)})`).join(', ')}
              </div>
            ))}
          </div>
        )}
      </div>

      {clashes.length > 0 && (
        <div className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="mb-1 font-extrabold text-destructive">Double bookings this week</div>
          <ul className="list-disc pl-5 text-foreground/90">{clashes.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}

      {/* one card per room, one row per day */}
      <div className="grid gap-4 md:grid-cols-2">
        {rooms.map((room) => (
          <div key={room} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <DoorOpen className="h-4 w-4 text-primary" />
              <h2 className="text-[15px] font-extrabold">{room}</h2>
            </div>
            <div className="divide-y divide-border">
              {DAY_KEYS.map((day, i) => {
                const list = bookings.filter((b) => b.room === room && b.day === day).sort((a, b) => a.start - b.start)
                const free = freeWindows(list)
                const date = new Date(monday); date.setDate(date.getDate() + i)
                return (
                  <div key={day} className="flex gap-3 px-4 py-2.5">
                    <div className="w-14 shrink-0 text-xs font-bold text-muted-foreground">
                      <div>{day}</div>
                      <div className="font-medium">{date.getDate()}/{date.getMonth() + 1}</div>
                    </div>
                    <div className="min-w-0 flex-1 text-[13px]">
                      <div className="flex flex-wrap gap-1">
                        {list.map((b, k) => (
                          <span key={k} className={cn('rounded-md px-1.5 py-0.5 font-semibold', KIND_STYLE[b.kind])}>
                            {fmt(b.start)}-{fmt(b.end)} {b.label}{b.note ? ` (${b.note})` : ''}
                          </span>
                        ))}
                      </div>
                      <div className={cn('mt-0.5 text-xs', list.length ? 'text-muted-foreground' : 'font-semibold text-emerald-600 dark:text-emerald-400')}>
                        {list.length === 0 ? 'Free all day' : free.length ? 'Free ' + windowText(free) : 'Fully booked'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
