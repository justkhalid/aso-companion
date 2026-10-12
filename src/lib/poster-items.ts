import { DAY_FULL, DAY_KEYS } from './constants'
import { fmtTime, isOnceEvent, parseISO, parseSlot } from './app-utils'
import type { Club, EventEntry, State } from './types'

/* Clubs and events share one export design: this is the common shape both are turned into. */
export type PosterKind = 'clubs' | 'events'

export interface PosterItem {
  name: string
  days: string[]
  time: string
  room: string
  icon?: string
  poster?: string
  when: string // "Every Saturday · 10:00 AM - 12:00 PM"
  dayText: string // "Saturday" or "Saturday 3 October"
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dayKeyOf = (d: Date) => DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
const dateText = (iso: string) => {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function whenOf(c: Club): string {
  const names = (c.days || []).map((d) => DAY_FULL[d] || d).join(' and ')
  const lead = !names ? '' : c.freq === 'biweekly' ? 'Every other ' + names : c.freq === 'monthly' ? 'Monthly on ' + names : 'Every ' + names
  return [lead, fmtTime(c.time)].filter(Boolean).join(' · ')
}

function clubItem(c: Club): PosterItem {
  return { name: c.name, days: c.days || [], time: c.time, room: c.room, icon: c.icon, poster: c.poster, when: whenOf(c), dayText: (c.days || []).map((d) => DAY_FULL[d] || d).join(' and ') }
}

function eventItem(e: EventEntry): PosterItem {
  const once = isOnceEvent(e)
  const key = once ? (e.date ? dayKeyOf(parseISO(e.date)) : '') : e.day || ''
  const dayName = DAY_FULL[key] || key
  let lead = ''
  if (once) lead = e.date ? `${dayName} ${dateText(e.date)}` : ''
  else {
    lead = !dayName ? '' : e.recur === 'biweekly' ? `Every other ${dayName}` : e.recur === 'monthly' ? `Monthly on ${dayName}` : `Every ${dayName}`
    if (e.from && e.until) lead += ` · ${dateText(e.from)} to ${dateText(e.until)}`
    else if (e.until) lead += ` · until ${dateText(e.until)}`
  }
  return {
    name: e.title,
    days: key ? [key] : [],
    time: e.time,
    room: e.place,
    icon: e.icon || 'calendar',
    poster: e.poster,
    when: [lead, fmtTime(e.time)].filter(Boolean).join(' · '),
    dayText: once && e.date ? `${dayName} ${dateText(e.date)}` : dayName,
  }
}

/* in week order: Monday first, then by time; one-off events by their date */
export function posterItems(state: State, kind: PosterKind): PosterItem[] {
  const list: { it: PosterItem; sort: number }[] =
    kind === 'clubs'
      ? (state.clubs || []).filter((c) => !c.placeholder).map((c) => ({ it: clubItem(c), sort: 0 }))
      : (state.events || []).map((e) => ({ it: eventItem(e), sort: isOnceEvent(e) && e.date ? parseISO(e.date).getTime() : 0 }))
  const wk = (it: PosterItem) => {
    const i = Math.min(...it.days.map((d) => DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])).filter((n) => n >= 0), 99)
    return i * 10000 + (it.time ? parseSlot(it.time).mins : 9999)
  }
  return list.sort((a, b) => (kind === 'events' ? a.sort - b.sort || wk(a.it) - wk(b.it) : wk(a.it) - wk(b.it))).map((x) => x.it)
}
