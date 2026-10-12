/* Moroccan national days, the occasions the American Space marks, and the Islamic holidays (whose dates follow
   the moon, so they can shift by a day). Used by the monthly calendar picture. */

export interface Holiday {
  name: string
  moon?: boolean // date depends on moon sighting
  closed?: boolean // a public holiday: the space is closed that day
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/* expected dates of the movable Islamic holidays */
const ISLAMIC: Record<number, { ramadan: string; fitr: string; adha: string; newYear: string; mawlid: string }> = {
  2026: { ramadan: '2026-02-18', fitr: '2026-03-20', adha: '2026-05-27', newYear: '2026-06-17', mawlid: '2026-08-26' },
  2027: { ramadan: '2027-02-08', fitr: '2027-03-10', adha: '2027-05-17', newYear: '2027-06-07', mawlid: '2027-08-15' },
  2028: { ramadan: '2028-01-28', fitr: '2028-02-26', adha: '2028-05-05', newYear: '2028-05-26', mawlid: '2028-08-04' },
}

export function holidaysOf(year: number): Map<string, Holiday[]> {
  const out = new Map<string, Holiday[]>()
  const add = (date: string, name: string, closed = false, moon = false) => out.set(date, [...(out.get(date) || []), { name, closed, moon }])
  const nextDay = (date: string) => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }
  add(iso(year, 1, 1), "New Year's Day", true)
  add(iso(year, 1, 11), 'Independence Manifesto', true)
  add(iso(year, 1, 14), 'Amazigh New Year', true)
  add(iso(year, 2, 14), "Valentine's Day")
  add(iso(year, 4, 22), 'Earth Day')
  add(iso(year, 5, 1), 'Labour Day', true)
  add(iso(year, 7, 30), 'Throne Day', true)
  add(iso(year, 8, 14), 'Oued Ed-Dahab Day', true)
  add(iso(year, 8, 20), 'Revolution of the King and the People', true)
  add(iso(year, 8, 21), 'Youth Day', true)
  add(iso(year, 10, 31), 'Unity Day', true)
  add(iso(year, 10, 31), 'Halloween')
  add(iso(year, 11, 6), 'Green March', true)
  add(iso(year, 11, 18), 'Independence Day', true)
  add(iso(year, 12, 25), 'Christmas')
  /* Thanksgiving: fourth Thursday of November */
  const nov1 = new Date(year, 10, 1).getDay()
  add(iso(year, 11, 1 + ((4 - nov1 + 7) % 7) + 21), 'Thanksgiving')
  const isl = ISLAMIC[year]
  if (isl) {
    add(isl.ramadan, 'Ramadan begins', false, true)
    add(isl.fitr, 'Eid al-Fitr', true, true)
    add(nextDay(isl.fitr), 'Eid al-Fitr', true, true)
    add(isl.adha, 'Eid al-Adha', true, true)
    add(nextDay(isl.adha), 'Eid al-Adha', true, true)
    add(isl.newYear, 'Islamic New Year', true, true)
    add(isl.mawlid, 'Mawlid', true, true)
    add(nextDay(isl.mawlid), 'Mawlid', true, true)
  }
  return out
}
