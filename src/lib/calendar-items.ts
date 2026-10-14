/* Calendar chips for the public main page: classes, clubs and events, with cancelled days for the given week. */
import type { GridItem } from '@/components/weekly-grid'
import {
  classStatusOn,
  clubStatusOn,
  eventStatusOn,
  isOnceEvent,
  isoOf,
  parseISO,
  splitDaysByStatus,
  addDays,
} from './app-utils'
import { DAY_KEYS } from './constants'
import { closedHoliday } from './holidays'
import type { State } from './types'

/* classes as "English class ASO-K1" with teacher and room, all in one color; cancelled days in gray */
export const PUBLIC_CLASS_TONE = 'tone-9' // classes: teal (see activity-colors.ts)
export const PUBLIC_CLUB_TONE = 'tone-10' // clubs: violet
export const PUBLIC_EVENT_TONE = 'tone-11' // events: orange
/* ASO-K1 -> "Kids 1", ASO-T2 -> "Teens 2", ASO-A3 -> "Adults 3": the public sees the group, not the internal code */
export function publicGroupName(code: string, fallback: string): string {
  const m = /^ASO-([KTA])\s*(\d+)/i.exec(String(code || '').trim())
  if (!m) return code || fallback
  return ({ K: 'Kids', T: 'Teens', A: 'Adults' } as Record<string, string>)[m[1].toUpperCase()] + ' ' + m[2]
}


/* a public holiday closes the space: those days show as "closed" rather than "cancelled" */
function withHolidays(items: GridItem[], monday: Date): GridItem[] {
  const closedName = (day: string): string | null => {
    const di = DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number])
    return di < 0 ? null : closedHoliday(isoOf(addDays(monday, di)))?.name || null
  }
  const out: GridItem[] = []
  for (const it of items) {
    const closed = it.days.filter((d) => closedName(d))
    if (!closed.length) {
      out.push(it)
      continue
    }
    const open = it.days.filter((d) => !closedName(d))
    if (open.length) out.push({ ...it, days: open })
    out.push({ ...it, id: it.id + ':closed', days: closed, code: it.code.replace(/ · cancelled$/, '') + ' · closed', lead: closedName(closed[0]) || undefined, tone: 'tone-8' })
  }
  /* the same session closed by a holiday and by an absence shows once */
  const seen = new Set<string>()
  return out.filter((i) => {
    const k = i.code + '|' + i.slot + '|' + i.days.join()
    if (!i.id.endsWith(':closed')) return true
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function rawClassItems(state: State, monday: Date): GridItem[] {
  return (state.classes || [])
    .filter((c) => (c.days || []).length && c.time)
    .flatMap((c) => {
      const base = { slot: c.time, code: 'English class ' + publicGroupName(c.code, c.level), room: c.room, icon: c.icon }
      const tone = PUBLIC_CLASS_TONE
      const sp = splitDaysByStatus(c.days, monday, (iso) => classStatusOn(state, c, iso))
      const out: GridItem[] = []
      if (sp.normal.length) out.push({ ...base, id: c.id, days: sp.normal, lead: c.teacher, tone })
      if (sp.cancelled.length) out.push({ ...base, id: c.id + ':off', days: sp.cancelled, code: base.code + ' · cancelled', lead: c.teacher, tone: 'tone-8' })
      for (const [who, days] of Object.entries(sp.covered)) out.push({ ...base, id: c.id + ':cov:' + who, days, lead: 'Cover: ' + who, tone })
      return out
    })
}

function rawClubItems(state: State, monday: Date): GridItem[] {
  return (state.clubs || [])
    .filter((c) => (c.days || []).length && c.time)
    .flatMap((c) => {
      const base = { slot: c.time, code: c.name, room: c.room, icon: c.icon }
      const tone = PUBLIC_CLUB_TONE
      const lead = c.lead || undefined
      const sp = splitDaysByStatus(c.days, monday, (iso) => clubStatusOn(state, c.id, iso))
      const out: GridItem[] = []
      if (sp.normal.length) out.push({ ...base, id: c.id, days: sp.normal, lead, tone })
      if (sp.cancelled.length) out.push({ ...base, id: c.id + ':off', days: sp.cancelled, code: c.name + ' · cancelled', tone: 'tone-8' })
      for (const [who, days] of Object.entries(sp.covered)) out.push({ ...base, id: c.id + ':cov:' + who, days, lead: who, tone })
      return out
    })
}

function rawEventItems(state: State, monday: Date): GridItem[] {
  const out: GridItem[] = []
  for (const e of state.events || []) {
    let day = ''
    if (!isOnceEvent(e)) day = e.day || ''
    else if (e.date) {
      const d = parseISO(e.date)
      day = DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1] || ''
    }
    if (!day || !e.time) continue
    const off = splitDaysByStatus([day], monday, (iso) => eventStatusOn(state, e.id, isOnceEvent(e) && e.date ? e.date : iso)).cancelled.length > 0
    out.push({
      id: off ? e.id + ':off' : e.id,
      days: [day],
      slot: e.time,
      code: off ? e.title + ' · cancelled' : e.title,
      room: e.place || '',
      icon: e.icon || 'calendar',
      tone: off ? 'tone-8' : PUBLIC_EVENT_TONE,
    })
  }
  return out
}

export const publicClassItems = (state: State, monday: Date): GridItem[] => withHolidays(rawClassItems(state, monday), monday)
export const publicClubItems = (state: State, monday: Date): GridItem[] => withHolidays(rawClubItems(state, monday), monday)
export const publicEventItems = (state: State, monday: Date): GridItem[] => withHolidays(rawEventItems(state, monday), monday)
