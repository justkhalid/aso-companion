/* The numbers of a monthly report, worked out from the app's own data. The director adds the words and the head counts. */
import type { Absence, State } from './types'
import { monthOccurrences } from './month-export'

export interface ReportItem {
  key: string // kind and name, the key of the director's note
  kind: 'club' | 'event' | 'class'
  name: string
  planned: number // sessions on the calendar
  held: number
  canceled: number
  dates: string[] // ISO dates of the sessions that ran
}
export interface ReportPost { name: string; t: string; to: string[] }
export interface ReportAbsence { who: string; kind: string; from: string; to: string; reason: string; cover: string }
export interface ReportData {
  items: ReportItem[]
  absences: ReportAbsence[]
  posts: ReportPost[]
  totals: { planned: number; held: number; canceled: number }
}

export const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`

export function buildReportData(state: State, year: number, month: number): ReportData {
  const occ = monthOccurrences(state, { year, month, clubs: true, events: true, classes: true })
  const map = new Map<string, ReportItem>()
  for (const [iso, list] of [...occ.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (const o of list) {
      const key = `${o.kind}:${o.title}`
      const it = map.get(key) || { key, kind: o.kind, name: o.title, planned: 0, held: 0, canceled: 0, dates: [] }
      it.planned++
      if (o.off) it.canceled++
      else { it.held++; it.dates.push(iso) }
      map.set(key, it)
    }
  }
  const items = [...map.values()].sort((a, b) => ['club', 'event', 'class'].indexOf(a.kind) - ['club', 'event', 'class'].indexOf(b.kind) || a.name.localeCompare(b.name))

  const first = `${monthKey(year, month)}-01`
  const last = `${monthKey(year, month)}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`
  const nameOf = (a: Absence) =>
    a.kind === 'club' ? state.clubs.find((c) => c.id === a.clubId)?.name || 'Club' : a.kind === 'event' ? state.events.find((e) => e.id === a.eventId)?.title || 'Event' : a.teacher
  const absences = (state.absences || [])
    .filter((a) => a.from <= last && a.to >= first)
    .map((a) => ({ who: nameOf(a), kind: a.kind || 'teacher', from: a.from, to: a.to, reason: a.reason, cover: a.moved ? `held elsewhere (${a.moved.place})` : a.cover || 'canceled' }))
    .sort((a, b) => a.from.localeCompare(b.from))

  const posts: ReportPost[] = []
  for (const [list, title] of [[state.clubs, (c: { name: string }) => c.name], [state.events, (e: { title: string }) => e.title]] as const) {
    for (const x of list as { kit?: { posts?: { t: string; to: string[] }[] } }[]) {
      for (const p of x.kit?.posts || []) if (p.t.startsWith(monthKey(year, month))) posts.push({ name: (title as (v: unknown) => string)(x), t: p.t, to: p.to })
    }
  }
  posts.sort((a, b) => a.t.localeCompare(b.t))

  const totals = items.reduce((t, i) => ({ planned: t.planned + i.planned, held: t.held + i.held, canceled: t.canceled + i.canceled }), { planned: 0, held: 0, canceled: 0 })
  return { items, absences, posts, totals }
}
