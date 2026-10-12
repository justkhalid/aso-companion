import { DAY_FULL, DAY_KEYS } from './constants'
import { addDays, clubStatusOn, eventStatusOn, fmtEventWhen, fmtTime, isOnceEvent, isoOf, parseISO, parseSlot } from './app-utils'
import { PUBLIC_CLUB_TONE, PUBLIC_EVENT_TONE } from './calendar-items'
import { clubIcon } from './icons'
import { TONE_RGB } from './export-canvas'
import { BLUE, INK, MUTED, PAGE, footer, header as drawHeader, iconImage, load, shadowCard, siteFonts, wrap, type Fonts } from './clubs-calendar-export'
import { Sparkles } from 'lucide-react'
import type { Club, EventEntry, State } from './types'

/* A month of clubs and events as one picture: the days as a calendar grid in the site's style, then the
   events of the month and the clubs underneath. Clubs are purple, events gold, cancelled sessions grey. */

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
  const icons = new Map<string, HTMLImageElement | null>()
  for (const [key, color] of [['club', TONES.club.txt], ['event', TONES.event.txt], ['off', TONES.off.txt]] as const) {
    for (const list of occ.values()) {
      for (const x of list) {
        const k = `${x.kind}:${x.icon || ''}:${x.off ? 'off' : key}`
        if (!icons.has(k)) icons.set(k, null)
      }
    }
    void color
  }
  await Promise.all(
    Array.from(icons.keys()).map(async (k) => {
      const [kind, icon, off] = k.split(':')
      const Icon = clubIcon(icon || undefined)?.Icon || Sparkles
      const color = off === 'off' ? TONES.off.txt : kind === 'event' ? TONES.event.txt : TONES.club.txt
      icons.set(k, await iconImage(Icon, color, 40))
    }),
  )

  const scratch = document.createElement('canvas').getContext('2d')!
  const M = 80
  const CW = 330
  const W = M * 2 + CW * 7
  const HEAD = 270
  const DAYH = 64
  const CHIP = 74
  const GAPC = 8
  const first = new Date(o.year, o.month, 1)
  const lead = dayIdx(first)
  const daysInMonth = new Date(o.year, o.month + 1, 0).getDate()
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const cellsOf = (w: number) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = w * 7 + i - lead + 1
      return day >= 1 && day <= daysInMonth ? new Date(o.year, o.month, day) : null
    })
  const rowH = (w: number) => Math.max(190, DAYH + Math.max(0, ...cellsOf(w).map((d) => (d ? (occ.get(isoOf(d)) || []).length : 0))) * (CHIP + GAPC) + 16)
  const rows = Array.from({ length: weeks }, (_, w) => rowH(w))
  const WD = 70
  const gridH = WD + rows.reduce((a, b) => a + b, 0) + 24

  /* the lists under the grid */
  const eventsList: { iso: string; e: EventEntry }[] = []
  if (o.events) {
    const seen = new Set<string>()
    for (const [iso, list] of occ) for (const x of list) if (x.kind === 'event' && !seen.has(x.title)) {
      seen.add(x.title)
      const e = (state.events || []).find((v) => v.title === x.title)
      if (e) eventsList.push({ iso, e })
    }
    eventsList.sort((a, b) => a.iso.localeCompare(b.iso))
  }
  const clubsList: Club[] = o.clubs ? (state.clubs || []).filter((c) => !c.placeholder && Array.from(occ.values()).some((l) => l.some((x) => x.kind === 'club' && x.title === c.name))) : []
  const LROW = 118
  const hasBoth = o.clubs && o.events
  const colW = hasBoth ? (W - M * 2 - 40) / 2 : W - M * 2
  const listRows = Math.max(eventsList.length, clubsList.length)
  const listH = listRows ? 90 + listRows * LROW + 24 : 0
  void scratch

  const H = HEAD + gridH + (listH ? 60 + listH : 0) + 120
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  g.fillStyle = PAGE
  g.fillRect(0, 0, W, H)
  const nSessions = Array.from(occ.values()).reduce((n, l) => n + l.length, 0)
  const what = o.clubs && o.events ? 'Clubs and events' : o.clubs ? 'Clubs' : 'Events'
  drawHeader(g, f, W, logo, `${what} · ${monthLabel(o.year, o.month)}`, `${state.settings.institute} · ${nSessions} ${nSessions === 1 ? 'session' : 'sessions'}`)
  footer(g, f, W, H, `${state.settings.institute} · ${monthLabel(o.year, o.month)}`)

  /* grid card */
  shadowCard(g, M, HEAD, W - M * 2, gridH, 36)
  const gx = M + 8
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  DAY_KEYS.forEach((d, i) => {
    g.fillStyle = MUTED
    g.font = `800 24px ${f.body}`
    g.fillText((DAY_FULL[d] || d).toUpperCase().split('').join(' '), gx + i * CW + CW / 2, HEAD + WD / 2)
  })
  g.textAlign = 'left'
  let y = HEAD + WD
  const todayIso = isoOf(new Date())
  for (let w = 0; w < weeks; w++) {
    g.strokeStyle = 'rgba(60,60,67,.12)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(M + 20, y)
    g.lineTo(W - M - 20, y)
    g.stroke()
    cellsOf(w).forEach((d, i) => {
      const x = gx + i * CW
      if (i > 0) {
        g.beginPath()
        g.moveTo(x, y + 12)
        g.lineTo(x, y + rows[w] - 12)
        g.stroke()
      }
      if (!d) return
      const iso = isoOf(d)
      const isToday = iso === todayIso
      if (isToday) {
        g.fillStyle = BLUE
        g.beginPath()
        g.roundRect(x + 16, y + 12, 48, 40, 20)
        g.fill()
      }
      g.fillStyle = isToday ? '#ffffff' : INK
      g.font = `800 26px ${f.body}`
      g.textAlign = 'center'
      g.fillText(String(d.getDate()), x + 40, y + 33)
      g.textAlign = 'left'
      let cy = y + DAYH
      for (const x2 of occ.get(iso) || []) {
        const tone = x2.off ? TONES.off : x2.kind === 'event' ? TONES.event : TONES.club
        g.fillStyle = tone.bg
        g.beginPath()
        g.roundRect(x + 10, cy, CW - 20, CHIP, 14)
        g.fill()
        g.strokeStyle = tone.line
        g.beginPath()
        g.roundRect(x + 10, cy, CW - 20, CHIP, 14)
        g.stroke()
        const ic = icons.get(`${x2.kind}:${x2.icon || ''}:${x2.off ? 'off' : x2.kind}`)
        if (ic) g.drawImage(ic, x + 22, cy + CHIP / 2 - 13, 26, 26)
        g.save()
        g.beginPath()
        g.rect(x + 56, cy, CW - 70, CHIP)
        g.clip()
        g.fillStyle = tone.txt
        g.font = `800 22px ${f.body}`
        g.fillText(fit(g, x2.title, CW - 76), x + 56, cy + 27)
        g.font = `600 19px ${f.body}`
        g.fillText(x2.off ? 'Cancelled' : fmtTime(x2.time) || '', x + 56, cy + 53)
        g.restore()
        cy += CHIP + GAPC
      }
    })
    y += rows[w]
  }

  /* lists */
  if (listH) {
    let ly = HEAD + gridH + 60
    const drawList = (title: string, x: number, items: { head: string; name: string; sub: string; place?: string; tone: typeof TONES.club }[]) => {
      shadowCard(g, x, ly, colW, listH, 36)
      g.fillStyle = INK
      g.font = `800 36px ${f.display}`
      g.textBaseline = 'top'
      g.textAlign = 'left'
      g.fillText(title, x + 36, ly + 30)
      items.forEach((it, n) => {
        const iy = ly + 90 + n * LROW
        g.fillStyle = it.tone.bg
        g.beginPath()
        g.roundRect(x + 30, iy + 6, 150, 90, 20)
        g.fill()
        g.fillStyle = it.tone.txt
        g.font = `800 24px ${f.body}`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        wrap(g, it.head, 130, 2).forEach((l, k, a) => g.fillText(l, x + 105, iy + 51 + (k - (a.length - 1) / 2) * 28))
        g.textAlign = 'left'
        g.textBaseline = 'top'
        g.fillStyle = INK
        g.font = `800 28px ${f.body}`
        g.fillText(wrap(g, it.name, colW - 260, 1)[0] || '', x + 204, iy + 8, colW - 240)
        g.fillStyle = MUTED
        g.font = `600 23px ${f.body}`
        g.fillText(it.sub, x + 204, iy + 46, colW - 240)
        if (it.place) {
          g.fillStyle = INK
          g.font = `800 23px ${f.body}`
          g.fillText(it.place, x + 204, iy + 76, colW - 240)
        }
      })
    }
    let cx = M
    if (o.events) {
      drawList('Events this month', cx, eventsList.map(({ iso, e }) => {
        const d = parseISO(iso)
        return { head: `${DAY_FULL[DAY_KEYS[dayIdx(d)]]?.slice(0, 3)} ${d.getDate()}`, name: e.title, sub: [isOnceEvent(e) ? '' : fmtEventWhen(e), fmtTime(e.time)].filter(Boolean).join(' · '), place: e.place, tone: TONES.event }
      }))
      cx += colW + 40
    }
    if (o.clubs) {
      drawList('Clubs', hasBoth ? cx : M, clubsList.map((c) => ({
        head: (c.days || []).map((d) => (DAY_FULL[d] || d).slice(0, 3)).join(' '),
        name: c.name,
        sub: fmtTime(c.time),
        place: c.room,
        tone: TONES.club,
      })))
    }
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
