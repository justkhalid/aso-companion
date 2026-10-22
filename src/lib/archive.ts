/* One rule for "is this over": used by Clubs, Events, Classes and Posts so they always agree.
   A club or class is over after its last day (`until`); an event is over after its date, or after the end of its series. */
import type { Club, ClassEntry, EventEntry } from './types'
import { isOnceEvent, isoOf } from './app-utils'

export const todayIso = () => isoOf(new Date())
export const isClubOver = (c: Club, today = todayIso()) => !!c.until && c.until < today
export const isClassOver = (c: ClassEntry, today = todayIso()) => !!c.until && c.until < today
export const isEventOver = (e: EventEntry, today = todayIso()) => (isOnceEvent(e) ? !!e.date && e.date < today : !!e.until && e.until < today)
export const isOver = (kind: 'club' | 'event', item: Club | EventEntry, today = todayIso()) => (kind === 'club' ? isClubOver(item as Club, today) : isEventOver(item as EventEntry, today))
