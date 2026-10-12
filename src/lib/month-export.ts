import { DAY_FULL, DAY_KEYS } from './constants'
import { addDays, clubStatusOn, eventStatusOn, fmtTime, isOnceEvent, isoOf, parseISO, parseSlot } from './app-utils'
import { PUBLIC_CLUB_TONE, PUBLIC_EVENT_TONE } from './calendar-items'
import { TONE_RGB } from './export-canvas'
import { BLUE, INK, MUTED, PAGE, footer, load, shadowCard, siteFonts, wrap } from './clubs-calendar-export'
import type { State } from './types'

/* A month of clubs and events as one calendar picture in the site's style, with big readable names and times.
   Clubs are purple, events gold, cancelled sessions grey. */

export interface MonthOptions {
  year: number
  month: number // 0-11
  clubs: boolean
  events: boolean
}

interface Occ {
  kind: 'club' | 'event'
  title: string
  time: string
  startMin: number
  place: string
  icon?: string
  off: boolean
  cover?: string
}

const WEEK_MS = 604800000

/* shorten a title with an ellipsis so it fits the chip */
function fit(g: CanvasRenderingContext2D, text: string, max: number): string {
  if (g.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && g.measureText(t + '...').width > max) t = t.slice(0, -1)
  return t.trimEnd() + '...'
}
const dayIdx = (d: Date) => (d.getDay() === 0 ? 6 : d.getDay() - 1) // Mon = 0

/* does a repeating item fall on this date (weekday, series start and end, every 2 or 4 weeks)? */
function repeatsOn(d: Date, dayKeys: string[], recur: string | undefined, from: string | undefined, until: string | undefined, anchorFallback: string): boolean {
  const iso = isoOf(d)
  if (!dayKeys.includes(DAY_KEYS[dayIdx(d)])) return false
  if (from && iso < from) return false
  if (until && iso > until) return false
  const step = recur === 'biweekly' ? 2 : recur === 'monthly' ? 4 : 1
  if (step === 1) return true
  const anchor = parseISO(from || anchorFallback)
  const anchorDay = addDays(anchor, (dayIdx(d) - dayIdx(anchor) + 7) % 7)
  return Math.round((d.getTime() - anchorDay.getTime()) / WEEK_MS) % step === 0
}

/** everything that happens on each date of the month (keys are ISO dates) */
export function monthOccurrences(state: State, o: MonthOptions): Map<string, Occ[]> {
  const out = new Map<string, Occ[]>()
  const last = new Date(o.year, o.month + 1, 0).getDate()
  const anchor = state.settings.s1Start || isoOf(new Date(o.year, o.month, 1))
  const push = (iso: string, x: Occ) => out.set(iso, [...(out.get(iso) || []), x])
  for (let day = 1; day <= last; day++) {
    const d = new Date(o.year, o.month, day)
    const iso = isoOf(d)
    if (o.clubs) {
      for (const c of state.clubs || []) {
        if (c.placeholder || !c.time || !repeatsOn(d, c.days || [], c.freq, c.from, c.until, anchor)) continue
        const st = clubStatusOn(state, c.id, iso)
        push(iso, { kind: 'club', title: c.name, time: c.time, startMin: parseSlot(c.time).mins, place: c.room, icon: c.icon, off: st.kind === 'cancelled', cover: st.kind === 'cover' ? st.cover : undefined })
      }
    }
    if (o.events) {
      for (const e of state.events || []) {
        const hit = isOnceEvent(e) ? e.date === iso : !!e.day && repeatsOn(d, [e.day], e.recur, e.from, e.until, anchor)
        if (!hit) continue
        const st = eventStatusOn(state, e.id, iso)
        push(iso, { kind: 'event', title: e.title, time: e.time, startMin: e.time ? parseSlot(e.time).mins : 0, place: e.place || '', icon: e.icon || 'calendar', off: st.kind === 'cancelled' })
      }
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.startMin - b.startMin)
  return out
}

const TONES = { club: TONE_RGB[Number(PUBLIC_CLUB_TONE.slice(5))], event: TONE_RGB[Number(PUBLIC_EVENT_TONE.slice(5))], off: TONE_RGB[8] }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthLabel = (year: number, month: number) => `${MONTHS[month]} ${year}`

export async function renderMonth(state: State, o: MonthOptions): Promise<HTMLCanvasElement> {
  const occ = monthOccurrences(state, o)
  const [logo, f] = await Promise.all([load('/aso-logo.png'), siteFonts()])
  const scratch = document.createElement('canvas').getContext('2d')!
  const M = 70
  const CW = 370
  const W = M * 2 + CW * 7
  const HEAD = 330
  const DAYH = 70
  const GAP = 12
  const NAME = 36 // session names are big on purpose: this is printed and read from a distance
  const TIME = 30
  const first = new Date(o.year, o.month, 1)
  const lead = dayIdx(first)
  const daysInMonth = new Date(o.year, o.month + 1, 0).getDate()
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const cellsOf = (w: number) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = w * 7 + i - lead + 1
      return day >= 1 && day <= daysInMonth ? new Date(o.year, o.month, day) : null
    })

  /* every session becomes a tinted block: centred name (up to 3 lines) and the time under it */
  scratch.font = `800 ${NAME}px ${f.body}`
  const blockOf = (x: Occ) => {
    const all = wrap(scratch, x.title, CW - 56, 99)
    const lines = all.slice(0, 3)
    if (all.length > 3) lines[2] = fit(scratch, lines[2] + '...', CW - 56)
    return { x, lines, h: 26 + lines.length * (NAME + 6) + (x.off || x.time ? TIME + 20 : 8) }
  }
  const cellBlocks = (d: Date | null) => (d ? (occ.get(isoOf(d)) || []).map(blockOf) : [])
  const rows = Array.from({ length: weeks }, (_, w) =>
    Math.max(230, DAYH + Math.max(0, ...cellsOf(w).map((d) => cellBlocks(d).reduce((n, bl) => n + bl.h + GAP, 0))) + 14),
  )
  const WD = 84
  const gridH = WD + rows.reduce((a, b) => a + b, 0) + 24
  const H = HEAD + gridH + 130

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  g.fillStyle = PAGE
  g.fillRect(0, 0, W, H)
  const what = o.clubs && o.events ? 'Clubs and events' : o.clubs ? 'Clubs' : 'Events'

  /* header: logo and the month in big serif letters, what it shows underneath */
  const title = `${MONTHS[o.month]} ${o.year}`
  g.textBaseline = 'top'
  g.font = `800 120px ${f.display}`
  const tw = g.measureText(title).width
  const LOGO = 170
  const startX = (W - (LOGO + 40 + tw)) / 2
  if (logo) {
    const k = Math.min(LOGO / logo.width, LOGO / logo.height)
    g.drawImage(logo, startX + (LOGO - logo.width * k) / 2, 70 + (LOGO - logo.height * k) / 2, logo.width * k, logo.height * k)
  }
  g.fillStyle = INK
  g.fillText(title, startX + LOGO + 40, 52)
  g.fillStyle = MUTED
  g.font = `600 40px ${f.body}`
  g.fillText(`${what} · ${state.settings.institute}`, startX + LOGO + 44, 196)
  footer(g, f, W, H, `${state.settings.institute} · ${title}`)

  /* the calendar card */
  shadowCard(g, M, HEAD, W - M * 2, gridH, 40)
  const gx = M + 10
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  DAY_KEYS.forEach((d, i) => {
    g.fillStyle = BLUE
    g.font = `800 32px ${f.display}`
    g.fillText(DAY_FULL[d] || d, gx + i * CW + CW / 2, HEAD + WD / 2)
  })
  g.textAlign = 'left'
  let y = HEAD + WD
  const todayIso = isoOf(new Date())
  for (let w = 0; w < weeks; w++) {
    g.strokeStyle = 'rgba(60,60,67,.14)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(M + 24, y)
    g.lineTo(W - M - 24, y)
    g.stroke()
    cellsOf(w).forEach((d, i) => {
      const x = gx + i * CW
      if (i > 0) {
        g.beginPath()
        g.moveTo(x, y + 14)
        g.lineTo(x, y + rows[w] - 14)
        g.stroke()
      }
      if (!d) return
      const iso = isoOf(d)
      const isToday = iso === todayIso
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      if (isToday) {
        g.fillStyle = BLUE
        g.beginPath()
        g.roundRect(x + 14, y + 12, 56, 46, 23)
        g.fill()
      }
      g.fillStyle = isToday ? '#ffffff' : MUTED
      g.font = `800 30px ${f.body}`
      g.fillText(String(d.getDate()), x + 42, y + 36)
      let cy = y + DAYH
      for (const bl of cellBlocks(d)) {
        const tone = bl.x.off ? TONES.off : bl.x.kind === 'event' ? TONES.event : TONES.club
        g.fillStyle = tone.bg
        g.beginPath()
        g.roundRect(x + 12, cy, CW - 24, bl.h, 18)
        g.fill()
        g.strokeStyle = tone.line
        g.lineWidth = 2
        g.beginPath()
        g.roundRect(x + 12, cy, CW - 24, bl.h, 18)
        g.stroke()
        g.fillStyle = tone.txt
        g.font = `800 ${NAME}px ${f.body}`
        g.textBaseline = 'top'
        bl.lines.forEach((l, k) => g.fillText(l, x + CW / 2, cy + 16 + k * (NAME + 6)))
        g.font = `700 ${TIME}px ${f.body}`
        const ty = cy + 16 + bl.lines.length * (NAME + 6) + 2
        if (bl.x.off) g.fillText('Cancelled', x + CW / 2, ty)
        else if (bl.x.time) g.fillText(fmtTime(bl.x.time), x + CW / 2, ty)
        g.textBaseline = 'middle'
        cy += bl.h + GAP
      }
      g.textAlign = 'left'
    })
    y += rows[w]
  }
  return canvas
}

export async function downloadMonth(state: State, o: MonthOptions): Promise<boolean> {
  const canvas = await renderMonth(state, o)
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ASO_${o.clubs && o.events ? 'Clubs_Events' : o.clubs ? 'Clubs' : 'Events'}_${o.year}-${String(o.month + 1).padStart(2, '0')}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
