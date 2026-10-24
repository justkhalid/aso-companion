/* What still has to be posted: clubs and events that happen soon and have no fresh post, or changed since the last one. */
import type { Club, EventEntry, State } from './types'
import { addDays, clubStatusOn, eventStatusOn, isOnceEvent, isoOf, nextOccurrence, parseISO, startOfDay } from './app-utils'
import { DAY_KEYS } from './constants'
import { kitRec } from './kit/derive'

export type Reason = 'never' | 'changed' | 'stale'
export interface QueueItem {
  kind: 'club' | 'event'
  id: string
  name: string
  when: Date
  daysAway: number
  reason: Reason
}

/** what a post shows: if one of these changes after posting, the club needs a new post */
export function kitSig(kind: 'club' | 'event', item: Club | EventEntry): string {
  const r = kitRec(kind, item)
  return [r.top, r.word || r.name, r.day, r.time, r.venue, r.poster || ''].join('|')
}

/* the next session of a club in the coming days, from its weekdays (every other week is not tracked, a club may show a week early) */
function nextClubDay(c: Club, from: Date, within: number): Date | null {
  const wanted = (c.days || []).map((d) => DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])).filter((i) => i >= 0)
  if (!wanted.length) return null
  for (let i = 0; i <= within; i++) {
    const d = addDays(from, i)
    if (c.from && d < parseISO(c.from)) continue
    if (c.until && d > parseISO(c.until)) continue
    if (wanted.includes(d.getDay() === 0 ? 6 : d.getDay() - 1)) return d
  }
  return null
}

const DAY = 86400000

export function postQueue(state: State, now = new Date()): QueueItem[] {
  const today = startOfDay(now)
  const out: QueueItem[] = []
  const judge = (kind: 'club' | 'event', item: Club | EventEntry, when: Date | null, name: string, once: boolean) => {
    if (!when || (item as Club).placeholder) return
    const daysAway = Math.round((startOfDay(when).getTime() - today.getTime()) / DAY)
    if (daysAway < 0 || daysAway > (once ? 3 : 1)) return
    const canceled = kind === 'club' ? clubStatusOn(state, item.id, isoOf(when)).kind === 'canceled' : eventStatusOn(state, item.id, isoOf(when)).kind === 'canceled'
    if (canceled) return
    if (item.kit?.skip === isoOf(when)) return
    const posts = item.kit?.posts || []
    const last = posts[posts.length - 1]
    let reason: Reason | null = null
    if (!last) reason = 'never'
    else if (last.sig && last.sig !== kitSig(kind, item)) reason = 'changed'
    else if (!once && now.getTime() - new Date(last.t).getTime() > 5 * DAY) reason = 'stale'
    if (reason) out.push({ kind, id: item.id, name, when, daysAway, reason })
  }
  for (const c of state.clubs) judge('club', c, nextClubDay(c, today, 1), c.name, false)
  for (const e of state.events) judge('event', e, nextOccurrence(e, now), e.title, isOnceEvent(e))
  return out.sort((a, b) => a.when.getTime() - b.when.getTime())
}

export const reasonText: Record<Reason, string> = { never: 'Not posted yet', changed: 'Changed since the last post', stale: 'Last post is from an earlier session' }
