/* Calendar chips for the public main page: classes by level (no codes, teachers or rooms),
   clubs and events, with cancelled days for the given week. */
import type { GridItem } from '@/components/weekly-grid'
import {
  classStatusOn,
  clubStatusOn,
  eventStatusOn,
  isOnceEvent,
  isoOf,
  parseISO,
  splitDaysByStatus,
  toneClassForClub,
  toneClassForLevel,
  addDays,
} from './app-utils'
import { DAY_KEYS } from './constants'
import type { State } from './types'

/* one chip per level and time slot; two groups at the same time read as one chip */
export function publicClassItems(state: State, monday: Date): GridItem[] {
  const buckets = new Map<string, { level: string; days: string[]; time: string; classes: State['classes'] }>()
  for (const c of state.classes || []) {
    if (!(c.days || []).length || !c.time) continue
    const key = [c.level, c.time, [...c.days].join()].join('|')
    const b = buckets.get(key) || { level: c.level, days: c.days, time: c.time, classes: [] }
    b.classes.push(c)
    buckets.set(key, b)
  }
  const out: GridItem[] = []
  for (const [key, b] of buckets) {
    const label = b.level + (b.classes.length > 1 ? ` · ${b.classes.length} groups` : '')
    const tone = toneClassForLevel(state, b.level)
    const normal: string[] = []
    const cancelled: string[] = []
    for (const d of b.days) {
      const di = DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])
      const iso = isoOf(addDays(monday, Math.max(di, 0)))
      // off only when every group of this slot is cancelled that day
      const allOff = b.classes.every((c) => classStatusOn(state, c, iso).kind === 'cancelled')
      ;(allOff ? cancelled : normal).push(d)
    }
    if (normal.length) out.push({ id: 'cls:' + key, days: normal, slot: b.time, code: label, tone })
    if (cancelled.length) out.push({ id: 'cls:' + key + ':off', days: cancelled, slot: b.time, code: label + ' · cancelled', tone: 'tone-8' })
  }
  return out
}

export function publicClubItems(state: State, monday: Date): GridItem[] {
  return (state.clubs || [])
    .filter((c) => (c.days || []).length && c.time)
    .flatMap((c) => {
      const base = { slot: c.time, code: c.name, room: c.room, icon: c.icon }
      const tone = toneClassForClub(state, c.id)
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
      tone: off ? 'tone-8' : 'tone-7',
    })
  }
  return out
}
