/* ASO Companion - pure helper functions (no React) */
import { DAY_KEYS, DAY_FULL, ROOM_OPTIONS } from './constants'
import { closedHoliday } from './holidays'
import type { State, Level, EventEntry, ClassEntry, Absence, TeamMember } from './types'

export function parseISO(iso: string): Date {
  const p = String(iso || '').split('-')
  return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1)
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function fmtD(d: Date, o?: Intl.DateTimeFormatOptions): string {
  try {
    return d.toLocaleDateString('en-GB', o || { day: 'numeric', month: 'short' })
  } catch {
    return String(d)
  }
}

export function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/* day key for today, Mon-Sun */
export function todayKey(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
}

/* ---- term math ---- */
export function totalWeeks(state: State): number {
  return state.levels.reduce((m, l) => Math.max(m, l.weeks.length), 0)
}

export function s1Weeks(state: State): number {
  const tot = totalWeeks(state)
  return Math.max(1, Math.min(tot, +(state.settings.s1Weeks || 15)))
}

export type TermStatus = {
  mode: 'before' | 's1' | 'break' | 's2' | 'after'
  week?: number
  daysTo?: number
  nextWeek?: number
  s1: Date
  s2: Date
  n1: number
}

export function termStatus(state: State, ref?: Date): TermStatus {
  const today = startOfDay(ref || new Date())
  const s1 = startOfDay(parseISO(state.settings.s1Start))
  const s2 = startOfDay(parseISO(state.settings.s2Start))
  const n1 = s1Weeks(state)
  const tot = totalWeeks(state)
  const s1End = addDays(s1, n1 * 7 - 1)
  const s2End = addDays(s2, Math.max(1, tot - n1) * 7 - 1)
  if (today < s1)
    return { mode: 'before', daysTo: Math.round((s1.getTime() - today.getTime()) / 86400000), s1, s2, n1 }
  if (today <= s1End)
    return { mode: 's1', week: Math.min(n1, Math.floor((today.getTime() - s1.getTime()) / 604800000) + 1), s1, s2, n1 }
  if (today < s2)
    return {
      mode: 'break',
      daysTo: Math.round((s2.getTime() - today.getTime()) / 86400000),
      nextWeek: n1 + 1,
      s1,
      s2,
      n1,
    }
  if (today <= s2End)
    return { mode: 's2', week: Math.min(tot, n1 + Math.floor((today.getTime() - s2.getTime()) / 604800000) + 1), s1, s2, n1 }
  return { mode: 'after', s1, s2, n1 }
}

export function weekMonday(state: State, wi: number): Date {
  const n1 = s1Weeks(state)
  if (wi < n1) return addDays(startOfDay(parseISO(state.settings.s1Start)), wi * 7)
  return addDays(startOfDay(parseISO(state.settings.s2Start)), (wi - n1) * 7)
}

export function semOf(state: State, wi: number): string {
  return wi < s1Weeks(state) ? 'Semester 1' : 'Semester 2'
}

export function noteFor(state: State, wi: number): string {
  const n = (state.notes || []).find((x) => +x.week === wi + 1)
  return n ? String(n.text) : ''
}

/* ---- timetable slot parsing ----
   Rounds the start time to the nearest hour for the row key, so events
   starting in the same hour (15:00-17:00 and 15:30-17:30) share a row.
   The full time range is kept as the label (AM/PM). Stored times are 24h. */
export interface Slot {
  k: string
  label: string
  mins: number
}

export function ttPad(n: number): string {
  return String(n).padStart(2, '0')
}

/* ---- 12-hour clock ----
   Times are stored as 24h text ("14:00-16:00") and shown everywhere as AM/PM ("2:00 PM - 4:00 PM"). */
const mer = (mins: number) => (Math.floor(mins / 60) % 24 >= 12 ? 'PM' : 'AM')
const clock12 = (mins: number) => {
  const h = Math.floor(mins / 60) % 24
  return `${h % 12 || 12}:${String(mins % 60).padStart(2, '0')}`
}
/** minutes since midnight -> "2:30 PM" */
export function fmt12Min(mins: number): string {
  return `${clock12(mins)} ${mer(mins)}`
}
/** a range in minutes -> "2:00 PM - 4:00 PM" (AM or PM always written on both ends) */
export function fmtRange12(a: number, b: number): string {
  return `${fmt12Min(a)} - ${fmt12Min(b)}`
}
/** "9 AM" for an hour on an axis */
export function hourLabel12(h: number): string {
  return `${h % 12 || 12} ${h % 24 >= 12 ? 'PM' : 'AM'}`
}
/** rewrite every 24h time or time range inside a piece of text to AM/PM */
export function fmtTime(text: string | undefined | null): string {
  const s = String(text ?? '')
  return s
    .replace(/\b(\d{1,2}):(\d{2})\s*[-\u2013]\s*(\d{1,2}):(\d{2})\b(?!\s*[AaPp][Mm])/g, (_m, h1, m1, h2, m2) => fmtRange12(+h1 * 60 + +m1, +h2 * 60 + +m2))
    .replace(/\b(\d{1,2}):(\d{2})\b(?!\s*[AaPp][Mm])/g, (_m, h, mm) => fmt12Min(+h * 60 + +mm))
}

export function parseSlot(t: string): Slot {
  const s = String(t || '').replace(/\s/g, '')
  let m = s.match(/^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/)
  if (m) {
    const startHour = +m[1]
    return {
      k: 'h' + ttPad(startHour),
      label: fmtRange12(startHour * 60 + +m[2], +m[3] * 60 + +m[4]),
      mins: startHour * 60 + +m[2],
    }
  }
  m = s.match(/^(\d{1,2})[:.](\d{2})$/)
  if (m) return { k: 'h' + ttPad(+m[1]), label: fmt12Min(+m[1] * 60 + +m[2]), mins: +m[1] * 60 + +m[2] }
  m = s.match(/^(\d{1,2})[:.](\d{2})?/)
  if (m)
    return { k: 'h' + ttPad(+m[1]), label: fmt12Min(+m[1] * 60 + +(m[2] || 0)), mins: +m[1] * 60 + +(m[2] || 0) }
  return { k: 'raw:' + s, label: s || '-', mins: 9999 }
}

/* ---- tone color for a class level (9 tones) ---- */
export function toneClassForLevel(state: State, levelLabel: string): string {
  let i = state.levels.findIndex((l) => l.label === levelLabel)
  if (i < 0) {
    const s = String(levelLabel || '?')
    let h = 0
    for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0
    i = h
  }
  return 'tone-' + (i % 9)
}

export function toneClassForClub(state: State, id: string): string {
  let i = (state.clubs || []).findIndex((c) => c.id === id)
  if (i < 0) {
    const s = String(id || '')
    for (let k = 0; k < s.length; k++) i += s.charCodeAt(k)
    i = Math.abs(i)
  }
  return 'tone-' + (i % 9)
}

/* ---- skills ---- */
export function skillsOf(w: { skills?: { L: string; S: string; R: string; W: string } } | undefined) {
  return w && w.skills ? w.skills : null
}

export function spotlightOf(wi: number): string {
  return ['L', 'S', 'R', 'W'][((wi % 4) + 4) % 4]
}

/* ---- events ----
   nextOccurrence respects the repeat frequency (weekly / bi-weekly / once a
   month), the optional start anchor (from) and the end of the series
   (until). Legacy events with recur 'none' are treated as one-off. */
export function isOnceEvent(e: Pick<EventEntry, 'recur'>): boolean {
  return e.recur === 'none' || e.recur === 'once'
}

function freqWeeks(recur: EventEntry['recur']): number {
  return recur === 'biweekly' ? 2 : recur === 'monthly' ? 4 : 1
}

export function nextOccurrence(e: EventEntry, ref?: Date): Date | null {
  if (isOnceEvent(e)) {
    if (!e.date) return null
    const d = parseISO(e.date)
    // past one-off events are no longer "upcoming"
    return d.getTime() < startOfDay(ref || new Date()).getTime() ? null : d
  }
  const di = DAY_KEYS.indexOf((e.day || '') as (typeof DAY_KEYS)[number])
  if (di < 0) return null
  const today = startOfDay(ref || new Date())
  // never before the anchor date of the series
  let base = today
  if (e.from) {
    const from = parseISO(e.from)
    if (from.getTime() > base.getTime()) base = from
  }
  const baseCur = base.getDay() === 0 ? 6 : base.getDay() - 1 // Mon = 0
  let candidate = addDays(base, (di - baseCur + 7) % 7)
  const step = freqWeeks(e.recur) // 1, 2 or 4 weeks between occurrences
  if (step > 1) {
    // the anchor fixes which weeks are "on"; walk forward until the week
    // distance from the anchor is a multiple of the step
    const anchor = e.from ? parseISO(e.from) : null
    for (let i = 0; i < step; i++) {
      if (!anchor) break
      const anchorCur = anchor.getDay() === 0 ? 6 : anchor.getDay() - 1
      const anchorDay = addDays(anchor, (di - anchorCur + 7) % 7)
      const weeks = Math.round((candidate.getTime() - anchorDay.getTime()) / 604800000)
      if (weeks % step === 0) break
      candidate = addDays(candidate, 7)
    }
  }
  if (e.until) {
    const until = parseISO(e.until)
    if (candidate.getTime() > until.getTime()) return null // series over
  }
  return candidate
}

export function fmtEventWhen(e: EventEntry): string {
  if (isOnceEvent(e)) {
    return e.date ? fmtD(parseISO(e.date), { weekday: 'short', day: 'numeric', month: 'short' }) : 'One-off'
  }
  if (e.recur === 'biweekly') return 'Every 2 weeks'
  if (e.recur === 'monthly') return 'Once a month'
  return 'Every ' + (DAY_FULL[e.day || ''] || e.day || 'week')
}

/* long form for the details line: "Every Monday · every 2 weeks · until 30 Jun 2026" */
export function fmtRepeat(e: Pick<EventEntry, 'recur' | 'day' | 'from' | 'until'>): string {
  if (isOnceEvent(e as EventEntry)) return ''
  const bits: string[] = []
  if (e.day) bits.push('Every ' + (DAY_FULL[e.day] || e.day))
  if (e.recur === 'biweekly') bits.push('every 2 weeks')
  if (e.recur === 'monthly') bits.push('once a month')
  if (e.until) bits.push('until ' + fmtD(parseISO(e.until), { day: 'numeric', month: 'short', year: 'numeric' }))
  return bits.join(' · ')
}

/* repeat frequency label shared by clubs and events */
export function fmtFreq(recur: string | undefined): string {
  return recur === 'biweekly' ? 'Every 2 weeks' : recur === 'monthly' ? 'Once a month' : 'Every week'
}

/* runs-from/until line shared by clubs and events, e.g. "Runs 12 Jan to 30 May" */
export function fmtRange(from?: string, until?: string): string {
  if (!from && !until) return ''
  const a = from ? fmtD(parseISO(from), { day: 'numeric', month: 'short' }) : ''
  const b = until ? fmtD(parseISO(until), { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  if (a && b) return 'Runs ' + a + ' to ' + b
  if (a) return 'Starts ' + a
  return 'Until ' + b
}

/* sort order for the All clubs section: Monday first, Sunday last,
   then by start time. Clubs with no day go last. */
export function clubDayOrder(c: { days?: string[]; time?: string }): number {
  const days = c.days || []
  if (!days.length) return 99
  let best = 99
  for (const d of days) {
    const i = DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])
    if (i >= 0 && i < best) best = i
  }
  const t = c.time || '99:99'
  const m = t.match(/^(\d{1,2})[:.](\d{2})/)
  return best * 10000 + (m ? +m[1] * 60 + +m[2] : 9999)
}

/* true when the string contains Arabic / Hebrew characters (right-to-left) */
export function isRTL(s: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(s || ''))
}

/* ---- people ---- */
export const PEOPLE_ROLES = ['Coordinator', 'Administrator', 'Teacher', 'Intern', 'Volunteer'] as const

/* a person's roles; older entries only have the one free-text role */
export function rolesOf(m: Pick<TeamMember, 'roles' | 'role'>): string[] {
  if (m.roles && m.roles.length) return m.roles
  const r = (m.role || '').trim()
  if (!r) return []
  if (/volunteer teacher/i.test(r)) return ['Teacher', 'Volunteer']
  return r.split(/\s*[+,/]\s*/).filter(Boolean)
}

/* everyone: the team list plus volunteers kept in an older copy of the data (no duplicates by name) */
export function peopleOf(state: Pick<State, 'team' | 'volunteers'>): TeamMember[] {
  const out = [...(state.team || [])]
  const seen = new Set(out.map((m) => m.name.trim().toLowerCase()))
  for (const v of state.volunteers || []) {
    if (seen.has(v.name.trim().toLowerCase())) continue
    out.push({ id: v.id, name: v.name, roles: [v.role && /intern/i.test(v.role) ? 'Intern' : 'Volunteer'], phone: v.phone, email: v.email, aso: v.aso })
  }
  return out
}

/* ---- misc ---- */
export function uid(): string {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/* ---- class codes ---- */

/* band prefix used in class codes: ASO-K1, ASO-T2, ASO-A3 */
const BAND_LETTER: Record<string, string> = { kids: 'K', teens: 'T', adults: 'A' }

/**
 * Suggest the next free class code for a level, e.g. "Kids · Intermediate"
 * with existing ASO-K1..K4 -> "ASO-K5". Uses the level's band for the letter.
 */
export function suggestClassCode(classes: { code?: string }[], levelLabel: string): string {
  const band = String(levelLabel || '').split('·')[0].trim().toLowerCase()
  const letter = BAND_LETTER[band] || (String(levelLabel || 'X').trim()[0] || 'X').toUpperCase()
  const prefix = 'ASO-' + letter
  const used = new Set(classes.map((c) => String(c.code || '').trim()).filter(Boolean))
  let n = 1
  while (used.has(prefix + n)) n++
  return prefix + n
}

/**
 * Room dropdown options: the canonical rooms first, then every room / place
 * already in use anywhere in the state (so nothing ever disappears).
 */
export function roomOptionsFor(state: Pick<State, 'classes' | 'clubs' | 'events'>): string[] {
  const set = new Set<string>(ROOM_OPTIONS as readonly string[])
  ;(state.classes || []).forEach((c) => c.room && set.add(c.room))
  ;(state.clubs || []).forEach((c) => c.room && set.add(c.room))
  ;(state.events || []).forEach((e) => e.place && set.add(e.place))
  return Array.from(set)
}

export function initials(name: string): string {
  return String(name || '?')
    .split(/\s+/)
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n))
}

export function visLevels(state: State): Level[] {
  return (state.levels || []).slice()
}


/* ---- absences: teachers, clubs and events ----
   A class, club session or event is cancelled (or covered by someone else) on a date when an
   absence covers that date and applies to it. */
export type ClassStatus =
  | { kind: 'normal' }
  | { kind: 'cancelled'; absence: Absence }
  | { kind: 'cover'; absence: Absence; cover: string }

/* a public holiday closes the space: everything that day counts as cancelled, the reason is the holiday's name */
function holidayAbsence(iso: string): Absence | undefined {
  const h = closedHoliday(iso)
  return h ? ({ id: 'holiday-' + iso, from: iso, to: iso, reason: h.name } as unknown as Absence) : undefined
}

function statusFrom(a: Absence | undefined): ClassStatus {
  if (!a) return { kind: 'normal' }
  return a.cover ? { kind: 'cover', absence: a, cover: a.cover } : { kind: 'cancelled', absence: a }
}
const within = (a: Absence, iso: string) => iso >= a.from && iso <= a.to

export function classStatusOn(state: Pick<State, 'absences'>, c: ClassEntry, iso: string): ClassStatus {
  return statusFrom(
    holidayAbsence(iso) ||
    (state.absences || []).find(
      (a) => (!a.kind || a.kind === 'teacher') && a.teacher && a.teacher === c.teacher && (!a.classId || a.classId === c.id) && within(a, iso),
    ),
  )
}

export function clubStatusOn(state: Pick<State, 'absences'>, clubId: string, iso: string): ClassStatus {
  return statusFrom(holidayAbsence(iso) || (state.absences || []).find((a) => a.kind === 'club' && a.clubId === clubId && within(a, iso)))
}

export function eventStatusOn(state: Pick<State, 'absences'>, eventId: string, iso: string): ClassStatus {
  return statusFrom(holidayAbsence(iso) || (state.absences || []).find((a) => a.kind === 'event' && a.eventId === eventId && within(a, iso)))
}

/* split a weekly pattern's days into normal days, cancelled days and covered days for one week */
export function splitDaysByStatus(
  days: string[],
  monday: Date,
  statusOn: (iso: string) => ClassStatus,
): { normal: string[]; cancelled: string[]; why: string; covered: Record<string, string[]> } {
  const out = { normal: [] as string[], cancelled: [] as string[], why: '', covered: {} as Record<string, string[]> }
  for (const d of days) {
    const di = DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])
    const stt = di < 0 ? ({ kind: 'normal' } as ClassStatus) : statusOn(isoOf(addDays(monday, di)))
    if (stt.kind === 'cancelled') {
      out.cancelled.push(d)
      out.why = stt.absence.reason
    } else if (stt.kind === 'cover') (out.covered[stt.cover] ||= []).push(d)
    else out.normal.push(d)
  }
  return out
}

/* Monday of the week that contains d */
export function mondayOfWeek(d: Date): Date {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}

/* "12 Oct" or "12 to 16 Oct" */
export function fmtAbsenceRange(a: Pick<Absence, 'from' | 'to'>): string {
  const f = parseISO(a.from)
  const t = parseISO(a.to)
  if (a.from === a.to) return fmtD(f, { weekday: 'short', day: 'numeric', month: 'short' })
  const sameMonth = f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()
  return sameMonth
    ? `${fmtD(f, { day: 'numeric' })} to ${fmtD(t, { day: 'numeric', month: 'short' })}`
    : `${fmtD(f, { day: 'numeric', month: 'short' })} to ${fmtD(t, { day: 'numeric', month: 'short' })}`
}

export function isoOf(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
