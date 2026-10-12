import { DAY_FULL, DAY_KEYS } from './constants'
import { addDays, clubStatusOn, eventStatusOn, fmtTime, isOnceEvent, isoOf, parseISO, parseSlot } from './app-utils'
import { MUTED, footer, iconImage, load, siteFonts, wrap } from './clubs-calendar-export'
import { clubIcon } from './icons'
import { Sparkles } from 'lucide-react'
import { MONTH_THEMES, drawMotif } from './month-themes'
import { holidaysOf, type Holiday } from './holidays'
import type { State } from './types'

/* A month of clubs and events as one calendar picture in the site's style, with big readable names and times.
   Clubs are purple, events gold, cancelled sessions grey. */

export interface MonthOptions {
  year: number
  month: number // 0-11
  clubs: boolean
  events: boolean
  holidays?: boolean
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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthLabel = (year: number, month: number) => `${MONTHS[month]} ${year}`

/* sessions of one day that share a time and a kind are written once under that time */
interface Block {
  kind: 'club' | 'event'
  off: boolean
  names: { title: string; icon?: string }[]
  time: string
}
function blocksOf(list: Occ[]): Block[] {
  const out: Block[] = []
  for (const x of list) {
    const hit = !x.off && out.find((b) => !b.off && b.kind === x.kind && b.time === x.time)
    if (hit) hit.names.push({ title: x.title, icon: x.icon })
    else out.push({ kind: x.kind, off: x.off, names: [{ title: x.title, icon: x.icon }], time: x.time })
  }
  return out
}

/* text colours sit straight on the page: dark enough to read on every month's background */
const INKS = { club: '#6B2D8F', event: '#8A5A00', off: '#8A8A93' }

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  g.closePath()
  g.fill()
}

export async function renderMonth(state: State, o: MonthOptions): Promise<HTMLCanvasElement> {
  const occ = monthOccurrences(state, o)
  const [logo, f] = await Promise.all([load('/aso-logo.png'), siteFonts()])
  const theme = MONTH_THEMES[o.month]
  const hol = o.holidays ? holidaysOf(o.year) : new Map<string, Holiday[]>()
  /* each club and event keeps its own icon, drawn big in front of its name, in the same colour as the text */
  const iconKey = (icon: string | undefined, kind: 'club' | 'event', off: boolean) => `${icon || ''}|${off ? 'off' : kind}`
  const iconImgs = new Map<string, HTMLImageElement | null>()
  {
    const want = new Map<string, { icon?: string; kind: 'club' | 'event'; off: boolean }>()
    for (const list of occ.values()) for (const x of list) want.set(iconKey(x.icon, x.kind, x.off), { icon: x.icon, kind: x.kind, off: x.off })
    await Promise.all(
      Array.from(want.entries()).map(async ([k, v]) => {
        const Icon = clubIcon(v.icon)?.Icon || Sparkles
        iconImgs.set(k, await iconImage(Icon, v.off ? INKS.off : INKS[v.kind], 96))
      }),
    )
  }
  const scratch = document.createElement('canvas').getContext('2d')!
  const W = 3200
  const H16 = 1800 // 16:9 like a slide; only taller when a month is too full
  const M = 70
  const TOP = 285
  const FOOT = 70
  const first = new Date(o.year, o.month, 1)
  const lead = dayIdx(first)
  const daysInMonth = new Date(o.year, o.month + 1, 0).getDate()
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const cellsOf = (w: number) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = w * 7 + i - lead + 1
      return day >= 1 && day <= daysInMonth ? new Date(o.year, o.month, day) : null
    })
  const busyOf = (d: Date | null) => !!d && ((occ.get(isoOf(d)) || []).length > 0 || (hol.get(isoOf(d)) || []).length > 0)

  /* columns with nothing all month take half the width of the busy ones */
  const busyCol = Array.from({ length: 7 }, (_, i) => Array.from({ length: weeks }, (_, w) => busyOf(cellsOf(w)[i])).some(Boolean))
  const inner = W - M * 2 - 20
  const weightSum = busyCol.reduce((n, b) => n + (b ? 1 : 0.5), 0)
  const colW = busyCol.map((b) => (inner * (b ? 1 : 0.5)) / weightSum)
  const colX = colW.map((_, i) => M + 10 + colW.slice(0, i).reduce((a, c) => a + c, 0))
  const busyRow = Array.from({ length: weeks }, (_, w) => cellsOf(w).some(busyOf))

  const blockH = (bl: Block, cw: number, NAME: number, TIME: number, s: number, maxLines: number) => {
    scratch.font = `800 ${NAME}px ${f.body}`
    const room = cw - 36 - NAME * 1.5
    const lines = bl.names.map((n) => {
      const all = wrap(scratch, n.title, room, 99)
      const cut = all.slice(0, maxLines)
      if (all.length > maxLines) cut[maxLines - 1] = fit(scratch, cut[maxLines - 1] + '...', room)
      return cut
    })
    const count = lines.reduce((n, l) => n + l.length, 0)
    const h = Math.round(count * (NAME + 6 * s) + (bl.names.length - 1) * 10 * s + (bl.off || bl.time ? TIME + 12 * s : 4 * s))
    return { lines, h }
  }
  const holLines = (d: Date, cw: number, HOL: number) => {
    scratch.font = `700 ${HOL}px ${f.body}`
    return (hol.get(isoOf(d)) || []).flatMap((h) => wrap(scratch, h.name, cw - 56, 2))
  }
  /* lay everything out at font scale s; returns what each row needs */
  const layout = (s: number) => {
    const NAME = Math.round(54 * s)
    const TIME = Math.round(44 * s)
    const HOL = Math.max(32, Math.round(40 * s)) // holidays stay readable even in a crowded month
    const DAYH = Math.round(72 * s)
    const GAP = Math.round(22 * s)
    const maxLines = 2
    const need = Array.from({ length: weeks }, (_, w) => {
      let tallest = 0
      cellsOf(w).forEach((d, i) => {
        if (!d) return
        let h = holLines(d, colW[i], HOL).length * (HOL + 4 * s)
        for (const bl of blocksOf(occ.get(isoOf(d)) || [])) h += blockH(bl, colW[i], NAME, TIME, s, maxLines).h + GAP
        tallest = Math.max(tallest, h)
      })
      return Math.round(DAYH + tallest + 14 * s)
    })
    return { NAME, TIME, HOL, DAYH, GAP, maxLines, need }
  }
  const WD = 84
  let s = 1.3
  let L = layout(s)
  const room = (H: number) => H - TOP - WD - 56 - FOOT
  while (L.need.reduce((a, b) => a + b, 0) > room(H16) && s > 0.5) {
    s = Math.round((s - 0.04) * 100) / 100
    L = layout(s)
  }
  const needSum = L.need.reduce((a, b) => a + b, 0)
  const H = Math.max(H16, TOP + WD + 56 + FOOT + needSum)
  const spare = Math.max(0, room(H) - needSum)
  const wsum = busyRow.reduce((n, b) => n + (b ? 1 : 0.5), 0)
  const rows = L.need.map((n, w) => n + (spare * (busyRow[w] ? 1 : 0.5)) / wsum)
  const gridH = WD + rows.reduce((a, b) => a + b, 0) + 24

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, W * 0.4, H)
  bg.addColorStop(0, theme.bg[0])
  bg.addColorStop(1, theme.bg[1])
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  drawMotif(g, theme, o.month, W, H, 'back')
  drawMotif(g, theme, o.month, W, H, 'front') // drawn before the calendar text, so it never covers a name

  /* header: month name in big serif letters, year and what it shows underneath, the logo on the right */
  const what = o.clubs && o.events ? 'Clubs and events' : o.clubs ? 'Clubs' : 'Events'
  g.textBaseline = 'top'
  g.textAlign = 'center'
  g.fillStyle = theme.title
  g.font = `800 165px ${f.display}`
  g.fillText(theme.name, W / 2, 44)
  g.font = `600 46px ${f.body}`
  g.fillStyle = MUTED
  g.fillText(`${what} · ${o.year} · ${state.settings.institute}`, W / 2, 222)
  g.textAlign = 'left'
  if (logo) {
    g.fillStyle = 'rgba(255,255,255,.88)'
    g.beginPath()
    g.arc(W - M - 110, 145, 110, 0, Math.PI * 2)
    g.fill()
    const k = Math.min(165 / logo.width, 165 / logo.height)
    g.drawImage(logo, W - M - 110 - (logo.width * k) / 2, 145 - (logo.height * k) / 2, logo.width * k, logo.height * k)
  }

  /* the calendar sits straight on the month's page: no card, just fine lines in the month's colour, and a large
     faint drawing in some of the empty days, the way a printed wall calendar does it */
  const line = theme.accent + '55'
  g.strokeStyle = line
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(M, TOP + WD)
  g.lineTo(W - M, TOP + WD)
  g.moveTo(M, TOP + WD - 8)
  g.lineTo(W - M, TOP + WD - 8)
  g.stroke()
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  DAY_KEYS.forEach((d, i) => {
    g.fillStyle = theme.accent
    g.font = `800 ${busyCol[i] ? 44 : 32}px ${f.display}`
    g.fillText(busyCol[i] ? DAY_FULL[d] || d : (DAY_FULL[d] || d).slice(0, 3), colX[i] + colW[i] / 2, TOP + WD / 2 - 4)
  })
  g.textAlign = 'left'
  /* faint drawings in a few empty cells */
  {
    let yy = TOP + WD
    for (let w = 0; w < weeks; w++) {
      cellsOf(w).forEach((d, i) => {
        if (d && !busyOf(d) && (d.getDate() * 7 + o.month * 3) % 5 === 0) {
          g.save()
          g.globalAlpha = 0.16
          drawMotif(g, theme, o.month * 100 + d.getDate(), W, H, 'cell', colX[i] + colW[i] / 2, yy + rows[w] / 2, Math.min(colW[i], rows[w]) * 0.4)
          g.restore()
        }
      })
      yy += rows[w]
    }
  }
  let y = TOP + WD
  const todayIso = isoOf(new Date())
  for (let w = 0; w < weeks; w++) {
    g.strokeStyle = line
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(M, y)
    g.lineTo(W - M, y)
    g.stroke()
    cellsOf(w).forEach((d, i) => {
      const x = colX[i]
      if (i > 0) {
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x, y + rows[w])
        g.stroke()
      }
      if (!d) return
      const iso = isoOf(d)
      const isToday = iso === todayIso
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      const nr = Math.round(40 * s)
      if (isToday) {
        g.fillStyle = theme.accent
        g.beginPath()
        g.roundRect(x + 12, y + 12, nr * 1.9, nr * 1.45, nr * 0.72)
        g.fill()
      }
      g.fillStyle = isToday ? '#ffffff' : MUTED
      g.font = `800 ${nr}px ${f.body}`
      g.textAlign = 'center'
      g.fillText(String(d.getDate()), x + 12 + nr * 0.95, y + 12 + nr * 0.73)
      g.textAlign = 'center'
      let cy = y + L.DAYH
      /* holidays of the day under the date, with a small star */
      g.font = `700 ${L.HOL}px ${f.body}`
      for (const ln of holLines(d, colW[i], L.HOL)) {
        g.fillStyle = theme.accent
        g.textBaseline = 'middle'
        const tw = g.measureText(ln).width
        star(g, x + colW[i] / 2 - tw / 2 - L.HOL * 0.55, cy + L.HOL * 0.5, L.HOL * 0.34)
        g.fillStyle = theme.title
        g.fillText(ln, x + colW[i] / 2 + L.HOL * 0.15, cy + L.HOL * 0.5)
        cy += L.HOL + 4 * s
      }
      for (const bl of blocksOf(occ.get(iso) || [])) {
        const bh = blockH(bl, colW[i], L.NAME, L.TIME, s, L.maxLines)
        const ink = bl.off ? INKS.off : INKS[bl.kind]
        g.fillStyle = ink
        g.textBaseline = 'top'
        g.font = `800 ${L.NAME}px ${f.body}`
        let ty = cy
        bh.lines.forEach((ls, n) => {
          const img = iconImgs.get(iconKey(bl.names[n].icon, bl.kind, bl.off))
          const isz = L.NAME * 1.35
          ls.forEach((l, k) => {
            const tw = g.measureText(l).width
            if (k === 0 && img) {
              const sx = x + colW[i] / 2 - (isz + 14 + tw) / 2
              g.drawImage(img, sx, ty + (L.NAME - isz) / 2 + 2, isz, isz)
              g.textAlign = 'left'
              g.fillText(l, sx + isz + 14, ty)
              if (bl.off) g.fillRect(sx + isz + 14, ty + L.NAME * 0.56, tw, 4)
              g.textAlign = 'center'
            } else {
              g.fillText(l, x + colW[i] / 2, ty)
              if (bl.off) g.fillRect(x + colW[i] / 2 - tw / 2, ty + L.NAME * 0.56, tw, 4)
            }
            ty += L.NAME + 6 * s
          })
          if (n < bh.lines.length - 1) ty += 10 * s
        })
        g.font = `700 ${L.TIME}px ${f.body}`
        if (bl.off) g.fillText('Cancelled', x + colW[i] / 2, ty + 2)
        else if (bl.time) g.fillText(fmtTime(bl.time), x + colW[i] / 2, ty + 2)
        cy += bh.h + L.GAP
      }
      g.textAlign = 'left'
    })
    y += rows[w]
  }
  const moon = Array.from(hol.entries()).some(([k, v]) => k.startsWith(`${o.year}-${String(o.month + 1).padStart(2, '0')}`) && v.some((h) => h.moon))
  footer(g, f, W, H, `${state.settings.institute} · ${theme.name} ${o.year}${moon ? ' · Islamic holiday dates follow the moon and can shift by a day' : ''}`)
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
