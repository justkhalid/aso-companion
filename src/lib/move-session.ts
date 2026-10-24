/* Moving a class, club or event from a calendar: another day, another hour, and (in the rooms view) another room. */
import { addDays, isoOf, parseISO } from './app-utils'
import { DAY_KEYS } from './constants'
import type { State } from './types'

const SLOT = /^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/

export function shiftSlot(t: string, delta: number): string {
  const m = String(t || '').replace(/\s/g, '').match(SLOT)
  if (!m || !delta) return t
  const a = +m[1] * 60 + +m[2] + delta
  const b = +m[3] * 60 + +m[4] + delta
  if (a < 0 || b > 24 * 60) return t
  const f = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  return `${f(a)}-${f(b)}`
}

/* a session that lands on another one in the same room is flagged right away, so the two lists never disagree silently */
export function clashWith(state: State, id: string, room: string | undefined, outside: boolean | undefined, days: string[], time: string): string {
  const r = SLOT.exec(String(time || '').replace(/\s/g, ''))
  if (!r || !room || outside) return ''
  const a = +r[1] * 60 + +r[2]
  const b = +r[3] * 60 + +r[4]
  const hit = (name: string, oid: string, oroom: string | undefined, oout: boolean | undefined, odays: string[], otime: string) => {
    const o = SLOT.exec(String(otime || '').replace(/\s/g, ''))
    if (!o || oid === id || oroom !== room || oout || !odays.some((d) => days.includes(d))) return ''
    return a < +o[3] * 60 + +o[4] && +o[1] * 60 + +o[2] < b ? name : ''
  }
  for (const c of state.classes) { const h = hit(c.code, c.id, c.room, false, c.days || [], c.time); if (h) return h }
  for (const c of state.clubs) { const h = hit(c.name, c.id, c.room, c.outside, c.days || [], c.time); if (h) return h }
  for (const e of state.events) { const h = hit(e.title, e.id, e.place, e.outside, e.day ? [e.day] : [], e.time); if (h) return h }
  return ''
}

type Patch = (fn: (d: State) => void) => void
type Toast = (msg: string, ok?: boolean, action?: { label: string; run: () => void }) => void

export function moveSession(
  state: State, patch: Patch, toast: Toast,
  m: { id: string; label: string; from: string; to: string; delta: number; room?: string },
) {
  const { id, label, from, to, delta, room } = m
  const cls = state.classes.find((c) => c.id === id)
  const club = state.clubs.find((c) => c.id === id)
  const ev = state.events.find((e) => e.id === id)
  const where = (r?: string) => (room && room !== r ? `, ${room}` : '')
  if (cls || club) {
    const rec = (cls || club)!
    const was = { days: rec.days, time: rec.time, room: rec.room }
    const swap = (days: string[]) => Array.from(new Set(days.map((d) => (d === from ? to : d))))
    const next = { days: swap(rec.days), time: shiftSlot(rec.time, delta), room: room || rec.room }
    const set = (v: typeof was) => patch((d) => { const t = (cls ? d.classes : d.clubs).find((x) => x.id === id); if (t) { t.days = v.days; t.time = v.time; t.room = v.room } })
    set(next)
    const clash = clashWith(state, id, next.room, 'outside' in rec ? rec.outside : false, next.days, next.time)
    return toast(`${label} moved to ${to}, ${next.time.replace('-', ' to ')}${where(was.room)}${clash ? `. Same room as ${clash} at that time` : ''}`, !clash, { label: 'Undo', run: () => set(was) })
  }
  if (ev) {
    const was = { day: ev.day, date: ev.date, time: ev.time, place: ev.place }
    const diff = DAY_KEYS.indexOf(to as (typeof DAY_KEYS)[number]) - DAY_KEYS.indexOf(from as (typeof DAY_KEYS)[number])
    const next = { day: to, date: ev.date ? isoOf(addDays(parseISO(ev.date), diff)) : ev.date, time: shiftSlot(ev.time, delta), place: room || ev.place }
    const set = (v: typeof was) => patch((d) => { const t = d.events.find((x) => x.id === id); if (t) { if (t.date) t.date = v.date; else t.day = v.day; t.time = v.time; t.place = v.place } })
    set(next)
    const clash = clashWith(state, id, next.place, ev.outside, next.day ? [next.day] : [], next.time)
    return toast(`${label} moved to ${to}, ${next.time.replace('-', ' to ')}${where(was.place)}${clash ? `. Same room as ${clash} at that time` : ''}`, !clash, { label: 'Undo', run: () => set(was) })
  }
}
