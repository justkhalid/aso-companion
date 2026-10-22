/* Moroccan national days, the occasions the American Space marks, and the Islamic holidays (whose dates follow
   the moon, so they can shift by a day). Used by the monthly calendar picture. */

export interface Holiday {
  name: string
  moon?: boolean // date depends on moon sighting
  closed?: boolean // a public holiday: the space is closed that day
}

/* what the admin changed in Settings > Holidays: moved dates (moon sightings), hidden ones, closed on/off, own holidays */
export interface CustomHoliday { id: string; date: string; name: string; closed?: boolean; yearly?: boolean }
export interface HolidayRules {
  moved?: Record<string, string> // holiday id -> new date
  hidden?: string[]
  closed?: Record<string, boolean> // holiday id -> closed or not
  custom?: CustomHoliday[]
}
/* one line of the yearly list */
export interface HolidayItem extends Holiday {
  id: string
  date: string // the date in use
  original: string // the date the app worked out
  hidden: boolean
  custom: boolean
  yearly?: boolean
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/* the movable Islamic holidays, worked out for any year from the Umm al-Qura calendar. Morocco follows the moon sighting,
   so a date can be a day off: it is changed in Settings > Holidays. These years were checked by hand. */
const ISLAMIC_CHECKED: Record<number, IslamicDates> = {
  2026: { ramadan: '2026-02-18', fitr: '2026-03-20', adha: '2026-05-27', newYear: '2026-06-17', mawlid: '2026-08-26' },
  2027: { ramadan: '2027-02-08', fitr: '2027-03-10', adha: '2027-05-17', newYear: '2027-06-07', mawlid: '2027-08-15' },
  2028: { ramadan: '2028-01-28', fitr: '2028-02-26', adha: '2028-05-05', newYear: '2028-05-26', mawlid: '2028-08-04' },
}
type IslamicDates = { ramadan?: string; fitr?: string; adha?: string; newYear?: string; mawlid?: string }

function computeIslamic(year: number): IslamicDates {
  const out: IslamicDates = {}
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', timeZone: 'UTC' })
    for (let t = Date.UTC(year, 0, 1, 12); new Date(t).getUTCFullYear() === year; t += 86_400_000) {
      const parts = f.formatToParts(new Date(t))
      const m = Number(parts.find((p) => p.type === 'month')?.value), d = Number(parts.find((p) => p.type === 'day')?.value)
      const date = new Date(t).toISOString().slice(0, 10)
      if (m === 9 && d === 1) out.ramadan = date
      else if (m === 10 && d === 1) out.fitr = date
      else if (m === 12 && d === 10) out.adha = date
      else if (m === 1 && d === 1) out.newYear = date
      else if (m === 3 && d === 12) out.mawlid = date
    }
  } catch { /* no Islamic calendar in this browser: those dates are added by hand */ }
  return out
}
const islamicOf = (year: number): IslamicDates => ISLAMIC_CHECKED[year] || computeIslamic(year)

let rules: HolidayRules = {}
const cache = new Map<number, Map<string, Holiday[]>>()
/** called whenever the saved settings change */
export function setHolidayRules(r: HolidayRules | undefined) {
  const next = r || {}
  if (JSON.stringify(next) === JSON.stringify(rules)) return
  rules = next
  cache.clear()
}

export function holidaysOf(year: number): Map<string, Holiday[]> {
  const hit = cache.get(year)
  if (hit) return hit
  const out = new Map<string, Holiday[]>()
  for (const h of holidayItems(year)) {
    if (h.hidden) continue
    out.set(h.date, [...(out.get(h.date) || []), { name: h.name, closed: h.closed, moon: h.moon }])
  }
  cache.set(year, out)
  return out
}

/** the public holiday that closes the space on this date (YYYY-MM-DD), if any */
export function closedHoliday(isoDate: string): Holiday | undefined {
  const y = Number(isoDate.slice(0, 4))
  if (!y) return undefined
  return (holidaysOf(y).get(isoDate) || []).find((h) => h.closed)
}

const nextDay = (date: string) => {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** every holiday of one year, with the admin's changes applied (hidden ones included, marked) */
export function holidayItems(year: number): HolidayItem[] {
  const items: HolidayItem[] = []
  const add = (id: string, date: string, name: string, closed = false, moon = false) => {
    const key = `${year}:${id}`
    items.push({
      id: key, name, moon, original: date, date: rules.moved?.[key] || date,
      closed: rules.closed?.[key] ?? closed, hidden: !!rules.hidden?.includes(key), custom: false,
    })
  }
  add('new-year', iso(year, 1, 1), "New Year's Day", true)
  add('manifesto', iso(year, 1, 11), 'Independence Manifesto', true)
  add('amazigh', iso(year, 1, 14), 'Amazigh New Year', true)
  add('valentine', iso(year, 2, 14), "Valentine's Day")
  add('earth', iso(year, 4, 22), 'Earth Day')
  add('labor', iso(year, 5, 1), 'Labor Day', true)
  add('throne', iso(year, 7, 30), 'Throne Day', true)
  add('dahab', iso(year, 8, 14), 'Oued Ed-Dahab Day', true)
  add('revolution', iso(year, 8, 20), 'Revolution of the King and the People', true)
  add('youth', iso(year, 8, 21), 'Youth Day', true)
  add('unity', iso(year, 10, 31), 'Unity Day', true)
  add('halloween', iso(year, 10, 31), 'Halloween')
  add('green-march', iso(year, 11, 6), 'Green March', true)
  add('independence', iso(year, 11, 18), 'Independence Day', true)
  add('christmas', iso(year, 12, 25), 'Christmas')
  /* Thanksgiving: fourth Thursday of November */
  const nov1 = new Date(year, 10, 1).getDay()
  add('thanksgiving', iso(year, 11, 1 + ((4 - nov1 + 7) % 7) + 21), 'Thanksgiving')
  const isl = islamicOf(year)
  if (isl.ramadan) add('ramadan', isl.ramadan, 'Ramadan begins', false, true)
  if (isl.fitr) { add('fitr-1', isl.fitr, 'Eid al-Fitr', true, true); add('fitr-2', nextDay(isl.fitr), 'Eid al-Fitr', true, true) }
  if (isl.adha) { add('adha-1', isl.adha, 'Eid al-Adha', true, true); add('adha-2', nextDay(isl.adha), 'Eid al-Adha', true, true) }
  if (isl.newYear) add('hijri', isl.newYear, 'Islamic New Year', true, true)
  if (isl.mawlid) { add('mawlid-1', isl.mawlid, 'Mawlid', true, true); add('mawlid-2', nextDay(isl.mawlid), 'Mawlid', true, true) }
  for (const c of rules.custom || []) {
    if (!c.date || !c.name) continue
    const inYear = c.yearly ? true : c.date.startsWith(String(year))
    if (!inYear) continue
    const date = c.yearly ? iso(year, Number(c.date.slice(5, 7)), Number(c.date.slice(8, 10))) : c.date
    items.push({ id: `c:${c.id}`, name: c.name, original: date, date, closed: !!c.closed, hidden: false, custom: true, yearly: !!c.yearly })
  }
  return items.sort((a, b) => a.date.localeCompare(b.date))
}
