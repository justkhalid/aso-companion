import type { State } from './types'

/* Who looks after what. The class, club or event holds the name (teacher or lead); a person's "looks after" list is read from there,
   so setting a lead in a club and ticking the club on a person are the same thing and can never disagree. */

export interface Held {
  key: string // class:<id>, club:<id> or event:<id>
  label: string // code, name or title
  role: 'teacher' | 'lead' | 'helps'
}

const same = (a: string | undefined, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase()

export function heldBy(state: Pick<State, 'classes' | 'clubs' | 'events'>, name: string): Held[] {
  if (!name.trim()) return []
  const out: Held[] = []
  for (const c of state.classes || []) if (same(c.teacher, name)) out.push({ key: 'class:' + c.id, label: c.code, role: 'teacher' })
  for (const c of state.clubs || []) {
    if (c.placeholder) continue
    if (same(c.lead, name)) out.push({ key: 'club:' + c.id, label: c.name, role: 'lead' })
    else if ((c.vol || []).some((v) => same(v, name))) out.push({ key: 'club:' + c.id, label: c.name, role: 'helps' })
  }
  for (const e of state.events || []) if (same(e.lead, name)) out.push({ key: 'event:' + e.id, label: e.title, role: 'lead' })
  return out
}

/* the teacher or lead now named on an activity */
export function holderOf(state: Pick<State, 'classes' | 'clubs' | 'events'>, key: string): string {
  const [kind, id] = key.split(':')
  if (kind === 'class') return (state.classes || []).find((c) => c.id === id)?.teacher || ''
  if (kind === 'club') return (state.clubs || []).find((c) => c.id === id)?.lead || ''
  return (state.events || []).find((e) => e.id === id)?.lead || ''
}

export function setHolder(draft: State, key: string, name: string): void {
  const [kind, id] = key.split(':')
  if (kind === 'class') {
    const c = draft.classes.find((x) => x.id === id)
    if (c) c.teacher = name
  } else if (kind === 'club') {
    const c = draft.clubs.find((x) => x.id === id)
    if (c) c.lead = name
  } else {
    const e = draft.events.find((x) => x.id === id)
    if (e) e.lead = name || undefined
  }
}

/* what the "Looks after" picker on a person edits: the classes taught and the clubs and events led (helping in a club is set on the club) */
export const ownedKeys = (state: Pick<State, 'classes' | 'clubs' | 'events'>, name: string) => heldBy(state, name).filter((h) => h.role !== 'helps').map((h) => h.key)

/* a person's name changed: every place that held the old name now holds the new one */
export function renamePerson(draft: State, from: string, to: string): void {
  if (!from.trim() || same(from, to)) return
  for (const c of draft.classes || []) if (same(c.teacher, from)) c.teacher = to
  for (const c of draft.clubs || []) {
    if (same(c.lead, from)) c.lead = to
    c.vol = (c.vol || []).map((v) => (same(v, from) ? to : v))
  }
  for (const e of draft.events || []) if (same(e.lead, from)) e.lead = to
  for (const a of draft.absences || []) {
    if (same(a.teacher, from)) a.teacher = to
    if (same(a.cover, from)) a.cover = to
  }
}

/* older entries typed into the person's own list that no class, club or event backs up yet */
export function legacyLooks(state: Pick<State, 'classes' | 'clubs' | 'events'>, name: string, stored: string[] | undefined): string[] {
  /* "ASO-K1 Kids" and "ASO-K1" name the same class */
  const labels = heldBy(state, name).map((h) => h.label.toLowerCase())
  return (stored || []).filter((s) => !labels.some((l) => s.toLowerCase().includes(l) || l.includes(s.toLowerCase())))
}
