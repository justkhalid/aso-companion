import { DAY_FULL } from './constants'
import { fmtTime, isOnceEvent } from './app-utils'
import { publicGroupName } from './calendar-items'
import type { Absence, ChangeEntry, EventEntry, State } from './types'

/* Plain-words list of what a save changed on the calendar (classes, clubs, events, cancellations), shown to the director. */

const dayText = (d: string[] | string | undefined) => (Array.isArray(d) ? d : d ? [d] : []).map((x) => DAY_FULL[x] || x).join(' and ') || 'no day'
const dateText = (iso?: string) => {
  if (!iso) return 'no date'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '')

type Spec = { label: string; get: (x: never) => unknown; show: (v: unknown) => string }
const when = (v: unknown) => fmtTime(String(v || '')) || 'no time'

function diffList<T extends { id: string }>(kind: string, prev: T[], next: T[], name: (x: T) => string, fields: Spec[], addInfo: (x: T) => string): string[] {
  const out: string[] = []
  const pm = new Map(prev.map((x) => [x.id, x]))
  const nm = new Map(next.map((x) => [x.id, x]))
  for (const n of next) {
    const p = pm.get(n.id)
    if (!p) {
      out.push(`${kind} added: ${name(n)}${addInfo(n) ? ' (' + addInfo(n) + ')' : ''}`)
      continue
    }
    for (const f of fields) {
      const a = f.get(p as never)
      const b = f.get(n as never)
      if (!same(a, b)) out.push(`${name(n)}: ${f.label} changed from ${f.show(a)} to ${f.show(b)}`)
    }
  }
  for (const p of prev) if (!nm.has(p.id)) out.push(`${kind} removed: ${name(p)}`)
  return out
}

function absenceText(state: State, a: Absence): string {
  const who =
    a.kind === 'club'
      ? state.clubs.find((c) => c.id === a.clubId)?.name || 'A club'
      : a.kind === 'event'
        ? state.events.find((e) => e.id === a.eventId)?.title || 'An event'
        : (state.classes || []).filter((c) => c.teacher === a.teacher && (!a.classId || c.id === a.classId)).map((c) => publicGroupName(c.code, c.level)).join(', ') || 'A class'
  const range = a.from === a.to ? dateText(a.from) : `${dateText(a.from)} to ${dateText(a.to)}`
  if (a.moved) {
    const where = a.moved.place ? `${a.moved.outside ? 'outside, at' : 'in'} ${a.moved.place}` : 'at another time'
    return `${who} is held ${where}${a.moved.time ? ' at ' + fmtTime(a.moved.time) : ''} on ${range}`
  }
  return `${who}${a.cover ? ' has a cover teacher' : ' is canceled'} on ${range}`
}

export function describeChanges(prev: State, next: State): string[] {
  const out: string[] = []
  out.push(
    ...diffList(
      'Class',
      prev.classes || [],
      next.classes || [],
      (c) => publicGroupName(c.code, c.level),
      [
        { label: 'days', get: (c: { days: string[] }) => c.days, show: (v) => dayText(v as string[]) },
        { label: 'time', get: (c: { time: string }) => c.time, show: when },
        { label: 'room', get: (c: { room: string }) => c.room, show: (v) => String(v || 'no room') },
      ],
      (c) => `${dayText(c.days)}, ${when(c.time)}`,
    ),
  )
  out.push(
    ...diffList(
      'Club',
      prev.clubs || [],
      next.clubs || [],
      (c) => c.name,
      [
        { label: 'name', get: (c: { name: string }) => c.name, show: (v) => String(v) },
        { label: 'days', get: (c: { days: string[] }) => c.days, show: (v) => dayText(v as string[]) },
        { label: 'time', get: (c: { time: string }) => c.time, show: when },
        { label: 'room', get: (c: { room: string; outside?: boolean }) => (c.outside ? 'outside: ' : '') + c.room, show: (v) => String(v || 'no room') },
        { label: 'how often', get: (c: { freq?: string }) => c.freq || 'weekly', show: (v) => String(v) },
        { label: 'poster', get: (c: { poster?: string }) => (c.poster ? 'set' : ''), show: (v) => (v ? 'a poster' : 'no poster') },
      ],
      (c) => `${dayText(c.days)}, ${when(c.time)}`,
    ),
  )
  out.push(
    ...diffList(
      'Event',
      prev.events || [],
      next.events || [],
      (e) => e.title,
      [
        { label: 'title', get: (e: { title: string }) => e.title, show: (v) => String(v) },
        { label: 'day', get: (e: { day?: string; date?: string; recur: EventEntry['recur'] }) => (isOnceEvent(e) ? e.date : e.day), show: (v) => (/^\d{4}-/.test(String(v)) ? dateText(String(v)) : dayText(String(v || ''))) },
        { label: 'time', get: (e: { time: string }) => e.time, show: when },
        { label: 'place', get: (e: { place: string; outside?: boolean }) => (e.outside ? 'outside: ' : '') + e.place, show: (v) => String(v || 'no place') },
        { label: 'lead', get: (e: { lead?: string }) => e.lead || '', show: (v) => String(v || 'nobody') },
        { label: 'poster', get: (e: { poster?: string }) => (e.poster ? 'set' : ''), show: (v) => (v ? 'a poster' : 'no poster') },
      ],
      (e) => `${isOnceEvent(e) ? dateText(e.date) : dayText(e.day)}, ${when(e.time)}`,
    ),
  )
  const pa = new Set((prev.absences || []).map((a) => a.id))
  const na = new Set((next.absences || []).map((a) => a.id))
  for (const a of next.absences || []) if (!pa.has(a.id)) out.push(absenceText(next, a))
  for (const a of prev.absences || []) if (!na.has(a.id)) out.push(`Back on: ${absenceText(prev, a).replace(' is canceled', '').replace(' has a cover teacher', '').replace(' is held', ' was held elsewhere')}`)
  return out
}

export function addChanges(state: State, prev: State): void {
  const msgs = describeChanges(prev, state)
  if (!msgs.length) return
  const t = new Date().toISOString()
  const old = state._changes || prev._changes || []
  const fresh: ChangeEntry[] = msgs.filter((m) => !old.slice(0, 8).some((o) => o.text === m)).map((text) => ({ t, text }))
  if (fresh.length) state._changes = [...fresh, ...old].slice(0, 30)
}
