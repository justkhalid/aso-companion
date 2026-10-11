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
import type { State } from './types'

/* classes as "English class ASO-K1" with teacher and room, all in one color; cancelled days in gray */
export const PUBLIC_CLASS_TONE = 'tone-6' // classes: teal
export const PUBLIC_CLUB_TONE = 'tone-3' // clubs: purple
export const PUBLIC_EVENT_TONE = 'tone-7' // events: gold
export function publicClassItems(state: State, monday: Date): GridItem[] {
  return (state.classes || [])
    .filter((c) => (c.days || []).length && c.time)
    .flatMap((c) => {
      const base = { slot: c.time, code: 'English class ' + (c.code || c.level), room: c.room }
      const tone = PUBLIC_CLASS_TONE
      const sp = splitDaysByStatus(c.days, monday, (iso) => classStatusOn(state, c, iso))
      const out: GridItem[] = []
      if (sp.normal.length) out.push({ ...base, id: c.id, days: sp.normal, lead: c.teacher, tone })
      if (sp.cancelled.length) out.push({ ...base, id: c.id + ':off', days: sp.cancelled, code: base.code + ' · cancelled', lead: c.teacher, tone: 'tone-8' })
      for (const [who, days] of Object.entries(sp.covered)) out.push({ ...base, id: c.id + ':cov:' + who, days, lead: 'Cover: ' + who, tone })
      return out
    })
}

export function publicClubItems(state: State, monday: Date): GridItem[] {
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

export function publicEventItems(state: State, monday: Date): GridItem[] {
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
