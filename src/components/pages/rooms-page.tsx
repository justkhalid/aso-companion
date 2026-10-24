'use client'

import * as React from 'react'
import { Download, ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS, ROOM_UNAVAILABLE } from '@/lib/constants'
import { PUBLIC_CLASS_TONE, PUBLIC_CLUB_TONE, PUBLIC_EVENT_TONE } from '@/lib/calendar-items'
import { classStatusOn, clubStatusOn, clubWhere, eventStatusOn, eventWhere, isOnceEvent, isoOf, roomOptionsFor, fmt12Min, hourLabel12 } from '@/lib/app-utils'
import { clubIcon } from '@/lib/icons'
import { classMark, type ClassMark } from '@/lib/class-marks'
import { ClassMarkIcons } from '@/components/class-mark'
import { closedHoliday } from '@/lib/holidays'
import { cn } from '@/lib/utils'
import type { ClassEntry, Club, EventEntry, State } from '@/lib/types'
import { moveSession } from '@/lib/move-session'
import { ClassDialog } from '@/components/dialogs/class-dialog'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { openQuickAdd } from '@/components/admin/quick-add'

/* Admin: which rooms are free through the week. Classes and clubs repeat every
   week; events count on their own date (one-off) or their weekday (repeating).
   Opening hours below only set the window the free time is measured in. */
const OPEN = 9 * 60
const CLOSE = 18 * 60 // ASO closes at 6 PM; free time is only counted inside OPEN-CLOSE

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
  mark?: ClassMark
  lead?: string
  group: string // legend label
  canceled?: string // teacher away: the class does not run (value = reason)
  note?: string
  id: string // class, club or event this booking comes from
}


const toMin = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}
const fmt = (n: number) => fmt12Min(n)
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

function bookingsForWeek(state: State, monday: Date, plain: boolean): Booking[] {
  const out: Booking[] = []
  const weekStart = iso(monday)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const weekEnd = iso(sunday)
  const inSeries = (from?: string, until?: string) => (!from || from <= weekEnd) && (!until || until >= weekStart)

  for (const c of state.classes || []) {
    const slot = parseSlot(c.time)
    if (!slot || !c.room) continue
    for (const day of c.days || []) {
      const di = DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number])
      const date = new Date(monday)
      date.setDate(date.getDate() + Math.max(di, 0))
      const stt = classStatusOn(state, c, isoOf(date))
      out.push({
        id: c.id, room: c.room.trim(), day, start: slot[0], end: slot[1], kind: 'class',
        // interns only need to know an English class is on, not which group it is
        label: plain ? 'English class' : c.code,
        tone: PUBLIC_CLASS_TONE,
        mark: classMark(state, c) || undefined,
        lead: plain ? undefined : stt.kind === 'cover' ? 'Cover: ' + stt.cover : c.teacher,
        group: 'English classes',
        canceled: stt.kind === 'canceled' ? stt.absence.reason || 'Teacher away' : undefined,
      })
    }
  }
  for (const c of state.clubs || []) {
    if (!inSeries(c.from, c.until)) continue
    const note = c.freq === 'biweekly' ? 'every 2 weeks' : c.freq === 'monthly' ? 'monthly' : undefined
    for (const day of c.days || []) {
      const di = DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number])
      const date = new Date(monday)
      date.setDate(date.getDate() + Math.max(di, 0))
      const stt = clubStatusOn(state, c.id, isoOf(date))
      /* held outside the space, on this date or always: no room is used */
      const w = clubWhere(state, c, isoOf(date))
      const slot = parseSlot(w.time)
      if (w.outside || !slot || !w.place) continue
      out.push({
        id: c.id, room: w.place.trim(), day, start: slot[0], end: slot[1], label: c.name, kind: 'club', note,
        tone: PUBLIC_CLUB_TONE, icon: c.icon,
        lead: stt.kind === 'cover' ? 'Led by ' + stt.cover : c.lead,
        group: 'Clubs',
        canceled: stt.kind === 'canceled' ? stt.absence.reason || 'Canceled' : undefined,
      })
    }
  }
  for (const e of state.events || []) {
    if (isOnceEvent(e)) {
      if (!e.date || e.date < weekStart || e.date > weekEnd) continue
      const [y, m, d] = e.date.split('-').map(Number)
      const stt = eventStatusOn(state, e.id, e.date)
      const w = eventWhere(state, e, e.date)
      const slot = parseSlot(w.time)
      if (w.outside || !slot || !w.place) continue
      out.push({ id: e.id, room: w.place.trim(), day: dayKeyOf(new Date(y, m - 1, d)), start: slot[0], end: slot[1], label: e.title, kind: 'event', note: 'one-off', tone: PUBLIC_EVENT_TONE, icon: e.icon || 'calendar', group: 'Events', canceled: stt.kind === 'canceled' ? stt.absence.reason || 'Canceled' : undefined })
    } else if (e.day && inSeries(e.from, e.until)) {
      const note = e.recur === 'biweekly' ? 'every 2 weeks' : e.recur === 'monthly' ? 'monthly' : undefined
      const di = DAY_KEYS.indexOf(e.day as (typeof DAY_KEYS)[number])
      const date = new Date(monday)
      date.setDate(date.getDate() + Math.max(di, 0))
      const stt = eventStatusOn(state, e.id, isoOf(date))
      const w = eventWhere(state, e, isoOf(date))
      const slot = parseSlot(w.time)
      if (w.outside || !slot || !w.place) continue
      out.push({ id: e.id, room: w.place.trim(), day: e.day, start: slot[0], end: slot[1], label: e.title, kind: 'event', note, tone: PUBLIC_EVENT_TONE, icon: e.icon || 'calendar', group: 'Events', canceled: stt.kind === 'canceled' ? stt.absence.reason || 'Canceled' : undefined })
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
const FOCUS = '__focus' // the rooms a group cares about most (teachers: Room 1 and Room 2)

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

/* focus: rooms that get a combined first tab; only: the tabs are those rooms plus one overview of every space (teachers) */
export function RoomsPage({ embedded = false, focus, only = false }: { embedded?: boolean; focus?: string[]; only?: boolean }) {
  const state = useStore((s) => s.state)
  const [monday, setMonday] = React.useState(() => mondayOf(new Date()))
  const [picked, setPicked] = React.useState<string>(focus ? FOCUS : ALL)

  /* the signed-in admin edits from here; the public site, its preview and teachers only look */
  const canEdit = useStore((s) => s.admin && !s.pubView) && !only
  const patch = useStore((s) => s.patch)
  const toastMsg = useStore((s) => s.toast)
  const [editing, setEditing] = React.useState<{ cls?: ClassEntry; club?: Club; event?: EventEntry } | null>(null)
  const [drag, setDrag] = React.useState<{ key: string; dx: number; dy: number } | null>(null)
  const justDragged = React.useRef(false)
  const bookings = React.useMemo(() => bookingsForWeek(state, monday, embedded && !canEdit), [state, monday, embedded, canEdit])
  const rooms = React.useMemo(() => {
    const set = new Set<string>(roomOptionsFor(state))
    bookings.forEach((b) => set.add(b.room))
    return Array.from(set)
  }, [state, bookings])
  const focusRooms = (focus || []).filter((f) => rooms.includes(f))
  const hasFocus = focusRooms.length > 1
  /* teachers (only): Room 1 and 2 together, each of them, and one overview of every space */
  const tabRooms = only ? focusRooms : rooms
  const mode = picked === ALL || (picked === FOCUS && hasFocus) || tabRooms.includes(picked) ? picked : hasFocus ? FOCUS : ALL
  const all = mode === ALL || mode === FOCUS // several rooms in one calendar
  const shown = mode === ALL ? rooms : mode === FOCUS ? focusRooms : [mode]
  const CHIP_H = all ? 56 : 72

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const range = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const thisMonday = iso(mondayOf(new Date()))
  const shift = (n: number) => setMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + n * 7); return d })

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const inShown = bookings.filter((b) => shown.includes(b.room))
  const visible = inShown.filter((b) => !b.canceled)
  /* admin only: a canceled class stays on the calendar as a dashed note, the room is free */
  const cancelledAll = embedded ? [] : inShown.filter((b) => b.canceled)

  /* the time axis stretches to fit anything outside opening hours (an evening event), measured over
     every room so the axis does not jump when you switch tabs */
  const viewOpen = Math.min(OPEN, Math.floor(Math.min(...bookings.map((b) => b.start), OPEN) / 60) * 60)
  const viewClose = Math.max(CLOSE, Math.ceil(Math.max(...bookings.map((b) => b.end), CLOSE) / 60) * 60)
  const HOURS = Array.from({ length: (viewClose - viewOpen) / 60 + 1 }, (_, i) => viewOpen / 60 + i)
  const pct = (min: number) => (Math.min(Math.max(min, viewOpen), viewClose) - viewOpen) / (viewClose - viewOpen) * 100
  const showNow = iso(monday) === thisMonday && nowMin >= viewOpen && nowMin <= viewClose
  const edit = (b: Booking) => {
    const cls = state.classes.find((c) => c.id === b.id)
    const club = state.clubs.find((c) => c.id === b.id)
    const event = state.events.find((e) => e.id === b.id)
    if (cls || club || event) setEditing({ cls, club, event })
  }
  /* drag a booking: sideways changes the hour, up or down changes the day and the room */
  const beginDrag = (ev: React.PointerEvent<HTMLElement>, b: Booking, key: string) => {
    if (!canEdit || ev.button !== 0 || ev.pointerType === 'touch') return
    const sx = ev.clientX
    const sy = ev.clientY
    const track = ev.currentTarget.closest<HTMLElement>('[data-slot]')
    let moved = false
    const mv = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return
      moved = true
      setDrag({ key, dx: e.clientX - sx, dy: e.clientY - sy })
    }
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      if (!moved) return
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 60)
      const w = track?.getBoundingClientRect().width || 1
      const delta = Math.round(((e.clientX - sx) * ((viewClose - viewOpen) / w)) / 15) * 15
      const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-slot]'))
      const target = slots.find((el) => {
        const r = el.getBoundingClientRect()
        return e.clientY >= r.top && e.clientY < r.bottom && e.clientX >= r.left - 80 && e.clientX <= r.right + 80
      })
      const toDay = target?.dataset.day || b.day
      const toRoom = target?.dataset.room || b.room
      if (toDay === b.day && toRoom === b.room && delta === 0) return
      moveSession(state, patch, toastMsg, { id: b.id, label: b.label, from: b.day, to: toDay, delta, room: toRoom })
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const legendItems = Array.from(new Map(visible.map((b) => [b.group, { label: b.group, tone: b.tone }])).values())
  const circle = 'flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06] text-foreground/70 transition active:scale-95 dark:bg-white/10'
  const labelW = LABEL_W + (all ? ROOM_W : 0)

  /* one block per day; inside it one row per room shown */
  const days = DAY_KEYS.map((day, i) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    const rowsForDay = shown.map((room) => {
      const holiday = closedHoliday(iso(date))
      const closed = !!ROOM_UNAVAILABLE[room]?.includes(day) || !!holiday
      const list = visible.filter((b) => b.room === room && b.day === day)
      const lanes = withLanes(list)
      const cancelledHere = cancelledAll.filter((b) => b.room === room && b.day === day)
      const laneCount = Math.max(1, ...lanes.map((l) => l.lane + 1))
      return { room, closed, holiday: holiday?.name, lanes, cancelledHere, free: closed ? [] : freeWindows(list), height: laneCount * CHIP_H + (laneCount + 1) * 4 }
    })
    return { day, date, isToday: iso(date) === iso(now), rows: rowsForDay }
  })
  /* the week as one picture: who has which room and when, the same chips and text size as the page */
  const toast = useStore((s) => s.toast)
  const downloadWeek = async () => {
    const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const items = bookings.filter((b) => !b.canceled && (mode === ALL || mode === FOCUS || b.room === mode)).map((b, i) => ({ id: 'b' + i, days: [b.day], slot: `${hhmm(b.start)}-${hhmm(b.end)}`, code: b.label, room: b.room, lead: b.lead, tone: b.tone, mark: b.mark, icon: b.icon }))
    const legend = [{ label: 'English classes', tone: PUBLIC_CLASS_TONE }, { label: 'Clubs', tone: PUBLIC_CLUB_TONE }, { label: 'Events', tone: PUBLIC_EVENT_TONE }]
    const { renderTimetablePNG, downloadBlob } = await import('@/lib/export-canvas')
    const blob = await renderTimetablePNG({ title: `ASO - Rooms, ${range}`, subtitle: mode === ALL || mode === FOCUS ? 'Who has which room' : mode, items, legend, zoom: 1 })
    if (!blob) return toast('Nothing to export', false)
    downloadBlob(blob, `ASO_Rooms_week_${iso(monday)}.png`)
    toast('Image downloaded')
  }

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
          {embedded && (
            <button onClick={() => void downloadWeek()} className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold hover:bg-secondary"><Download className="h-4 w-4" aria-hidden /> Download week</button>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Pencil className="h-3.5 w-3.5" aria-hidden /> Tap a booking to edit it, drag it to another hour, day or room</span>
          <button type="button" onClick={() => openQuickAdd('class')} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"><Plus className="h-3.5 w-3.5" aria-hidden /> Class</button>
          <button type="button" onClick={() => openQuickAdd('club')} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"><Plus className="h-3.5 w-3.5" aria-hidden /> Club</button>
          <button type="button" onClick={() => openQuickAdd('event')} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"><Plus className="h-3.5 w-3.5" aria-hidden /> Event</button>
        </div>
      )}

      {/* all rooms, or one room */}
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-[10px] bg-black/[0.06] p-0.5 dark:bg-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Room">
        {[...(hasFocus ? [FOCUS] : []), ...(only ? [...tabRooms, ALL] : [ALL, ...tabRooms])].map((r) => {
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
              {r === ALL ? (only ? 'All spaces' : 'All rooms') : r === FOCUS ? focusRooms.map((x) => x.replace(/^Room /, '')).join(' and ').replace(/^/, 'Room ') : r}
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
      <div className="overflow-x-auto rounded-2xl border border-border bg-card aso-no-glow shadow-sm">
        <div style={{ minWidth: MIN_GRID }}>
          <div className="flex border-b border-border bg-secondary/40 text-[11px] font-bold text-muted-foreground">
            <div style={{ width: labelW }} className="shrink-0" />
            {HOURS.slice(0, -1).map((h) => (
              <div key={h} className={cn('min-w-0 flex-1 border-l border-border/60 px-1.5 py-1.5 tabular-nums', (h * 60 < OPEN || h * 60 >= CLOSE) && 'opacity-50')}>{hourLabel12(h)}</div>
            ))}
          </div>

          <div className="relative">
            {days.map((d, di) => (
              <div key={d.day} className={cn('flex', di > 0 && 'border-t-[3px] border-foreground/30', d.isToday && 'bg-primary/[0.04]')}>
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
                        data-slot
                        data-day={d.day}
                        data-room={r.room}
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
                            {r.holiday ? `Space closed · ${r.holiday}` : 'Not available'}
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

                        {/* canceled classes (admin only): the room is free, the note says why */}
                        {r.cancelledHere.map((b, k) => (
                          <div
                            key={'c' + k}
                            className="absolute flex flex-col justify-center overflow-hidden rounded-lg border border-dashed border-foreground/35 px-2 text-[10px] leading-[12px] text-foreground/70"
                            style={{ left: `calc(${pct(b.start)}% + 2px)`, width: `calc(${pct(b.end) - pct(b.start)}% - 4px)`, bottom: 4, height: all ? 15 : 20 }}
                            title={`${b.label} canceled (${b.canceled}) ${fmt(b.start)}-${fmt(b.end)}`}
                          >
                            <span className="truncate font-semibold"><span className="line-through">{b.label}</span> · {(b.canceled || '').toLowerCase()}</span>
                          </div>
                        ))}

                        {/* bookings, same chip design as the other calendars */}
                        {r.lanes.map(({ b, lane }, k) => {
                          const Icon = clubIcon(b.icon)?.Icon
                          const dkey = d.day + r.room + b.id + k
                          const dragging = drag?.key === dkey
                          return (
                            <div
                              key={'b' + k}
                              className={cn('absolute', b.tone)}
                              style={{ left: `calc(${pct(b.start)}% + 2px)`, width: `calc(${pct(b.end) - pct(b.start)}% - 4px)`, top: 4 + lane * (CHIP_H + 4), height: CHIP_H, zIndex: dragging ? 60 : undefined, transform: dragging ? `translate(${drag!.dx}px, ${drag!.dy}px)` : undefined, opacity: dragging ? 0.85 : undefined, touchAction: canEdit ? 'pan-y' : undefined }}
                              title={`${b.label} · ${b.room} · ${fmt(b.start)}-${fmt(b.end)}${b.note ? ' (' + b.note + ')' : ''}`}
                              onPointerDown={canEdit ? (ev) => beginDrag(ev, b, dkey) : undefined}
                            >
                              <div
                                role={canEdit ? 'button' : undefined}
                                tabIndex={canEdit ? 0 : undefined}
                                onClick={canEdit ? () => { if (!justDragged.current) edit(b) } : undefined}
                                onKeyDown={canEdit ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit(b) } } : undefined}
                                className={cn('relative flex h-full w-full flex-col justify-center overflow-hidden rounded-lg border px-2 py-1 pl-[13px] text-left transition', all ? 'gap-[1px]' : 'gap-[3px]', canEdit && (dragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab hover:shadow-md hover:brightness-[1.04]'))}
                                style={{ background: 'var(--tone-bg)', borderColor: 'var(--tone-line)', color: 'var(--tone-txt)' }}
                              >
                                <span aria-hidden className="absolute left-[3px] top-1 bottom-1 w-[3px] rounded-full" style={{ background: 'var(--tone-txt)', opacity: 0.45 }} />
                                <span className="flex w-full items-center gap-1 text-[11px] font-bold leading-[13px]">
                                  {b.mark ? <ClassMarkIcons mark={b.mark} className="h-3 w-3 shrink-0" /> : Icon ? <Icon className="h-3 w-3 shrink-0" /> : <i className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--tone-txt)' }} />}
                                  <span className="line-clamp-2 break-words leading-[12px]" dir="auto">{b.label}</span>
                                </span>
                                {b.lead && <span className="truncate text-[10px] font-medium leading-[12px] opacity-85" dir="auto">{b.lead}</span>}
                                <span className="truncate text-[10px] font-semibold leading-[12px] tabular-nums" style={{ opacity: 0.92 }}>
                                  {fmt(b.start)}-{fmt(b.end)}{b.note ? ' · ' + b.note : ''}
                                </span>
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
        {cancelledAll.length > 0 && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <i className="inline-block h-2 w-2 rounded-sm border border-dashed border-foreground/50" /> Canceled
          </span>
        )}
        {(viewOpen < OPEN || viewClose > CLOSE) && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <i className="inline-block h-2 w-2 rounded-sm bg-black/15 dark:bg-white/25" /> Outside opening hours (9 AM - 6 PM)
          </span>
        )}
        {days.some((d) => d.rows.some((r) => r.closed)) && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <i className="inline-block h-2 w-2 rounded-full bg-black/20 dark:bg-white/30" /> Not available
          </span>
        )}
      </div>
      {canEdit && (
        <>
          <ClassDialog open={!!editing?.cls} onOpenChange={(v) => !v && setEditing(null)} cls={editing?.cls ?? null} />
          <ClubDialog open={!!editing?.club} onOpenChange={(v) => !v && setEditing(null)} club={editing?.club ?? null} />
          <EventDialog open={!!editing?.event} onOpenChange={(v) => !v && setEditing(null)} event={editing?.event ?? null} />
        </>
      )}
    </div>
  )
}
