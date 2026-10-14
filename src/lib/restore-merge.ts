import type { State } from './types'

/* What the admin types in (clubs, events, classes, absences, people, reports) can come back from an unsaved copy
   without touching the lesson plans, library or settings, which stay as the live copy has them. */
const LISTS = ['clubs', 'events', 'classes', 'absences', 'team', 'volunteers', 'reports'] as const

type Row = { id?: string }

export function mergeUnsaved(live: State, unsaved: State): { state: State; added: number; changed: number } {
  const out = JSON.parse(JSON.stringify(live)) as State
  let added = 0
  let changed = 0
  for (const key of LISTS) {
    const from = ((unsaved as unknown as Record<string, Row[]>)[key] || []) as Row[]
    const to = (((out as unknown as Record<string, Row[]>)[key] ||= [])) as Row[]
    for (const row of from) {
      const at = row.id ? to.findIndex((x) => x.id === row.id) : -1
      if (at === -1) {
        if (!to.some((x) => JSON.stringify(x) === JSON.stringify(row))) {
          to.push(JSON.parse(JSON.stringify(row)))
          added += 1
        }
      } else if (JSON.stringify(to[at]) !== JSON.stringify(row)) {
        to[at] = JSON.parse(JSON.stringify(row))
        changed += 1
      }
    }
  }
  out.libraryPins = Array.from(new Set([...(out.libraryPins || []), ...(unsaved.libraryPins || [])]))
  out._rev = (live._rev || 0) + 1
  out._updated = new Date().toISOString()
  return { state: out, added, changed }
}
