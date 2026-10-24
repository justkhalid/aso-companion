/* English dates for documents, from the yyyy-mm-dd of a date field (no time zones involved). */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const parseDay = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null
}

/** "16 September 2026", or empty when no valid date */
export function formatDay(s: string): string {
  const a = parseDay(s)
  return a ? `${a.d} ${MONTHS[a.mo]} ${a.y}` : ''
}
