import { DAY_FULL, DAY_KEYS } from './constants'
import { isRTL, addDays, clubStatusOn, eventStatusOn, fmtTime, isOnceEvent, isoOf, parseISO, parseSlot } from './app-utils'
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

/* the diagonal stripes of a closed day (same look as "not available" in the free-rooms calendar) */
function hatch(g: CanvasRenderingContext2D, color: string): CanvasPattern | string {
  const c = document.createElement('canvas')
  c.width = 28
  c.height = 28
  const k = c.getContext('2d')!
  k.fillStyle = 'rgba(255,255,255,.35)'
  k.fillRect(0, 0, 28, 28)
  k.strokeStyle = color + '2e'
  k.lineWidth = 5
  k.beginPath()
  k.moveTo(-4, 32)
  k.lineTo(32, -4)
  k.moveTo(-4, 4)
  k.lineTo(4, -4)
  k.moveTo(24, 32)
  k.lineTo(32, 24)
  k.stroke()
  return g.createPattern(c, 'repeat') || 'rgba(0,0,0,.05)'
}

/* every club and event keeps its own time line */
interface Block {
  kind: 'club' | 'event'
  off: boolean
  names: { title: string; icon?: string }[]
  time: string
}
function blocksOf(list: Occ[]): Block[] {
  const out: Block[] = []
  for (const x of list) {
    out.push({ kind: x.kind, off: x.off, names: [{ title: x.title, icon: x.icon }], time: x.time })
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
  /* on a public holiday the space is closed: nothing is held, the day says so */
  const closedOn = (iso: string) => (hol.get(iso) || []).some((h) => h.closed)
  for (const iso of Array.from(occ.keys())) if (closedOn(iso)) occ.delete(iso)
  /* each club and event keeps its own icon, drawn big in front of its name, in the same colour as the text */
  const iconKey = (icon: string | undefined, kind: 'club' | 'event', off: boolean) => `${icon || ''}|${off ? 'off' : kind}`
  const iconImgs = new Map<string, HTMLImageElement | null>()
  {
    const want = new Map<string, { icon?: string; kind: 'club' | 'event'; off: boolean }>()
    for (const list of occ.values()) for (const x of list) want.set(iconKey(x.icon, x.kind, x.off), { icon: x.icon, kind: x.kind, off: x.off })
    await Promise.all(
      Array.from(want.entries()).map(async ([k, v]) => {
        const Icon = clubIcon(v.icon)?.Icon || Sparkles
        iconImgs.set(k, await iconImage(Icon, v.off ? INKS.off : INKS[v.kind], 120))
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
  const blocksIn = (d: Date | null) => (d ? blocksOf(occ.get(isoOf(d)) || []) : [])
  const hasHol = (d: Date | null) => !!d && (hol.get(isoOf(d)) || []).length > 0
  const busyOf = (d: Date | null) => blocksIn(d).length > 0 || hasHol(d)

  /* column width follows what happens in it: empty columns are narrow, a column that holds several sessions is
     wide enough to put two side by side */
  const colWeight = Array.from({ length: 7 }, (_, i) => {
    const cells = Array.from({ length: weeks }, (_, w) => cellsOf(w)[i])
    if (!cells.some(busyOf)) return 0
    return Math.max(...cells.map((d) => blocksIn(d).length))
  })
  /* every column that has something in it gets the same width, so the busy days are symmetric; empty ones are narrow */
  const widest = Math.max(1, ...colWeight)
  const busyWeight = 1 + Math.min(1.2, 0.85 * (widest - 1))
  for (let i = 0; i < 7; i++) colWeight[i] = colWeight[i] === 0 ? 0.3 : busyWeight
  const inner = W - M * 2 - 20
  const weightSum = colWeight.reduce((a, b) => a + b, 0)
  const colW = colWeight.map((w) => (inner * w) / weightSum)
  const colX = colW.map((_, i) => M + 10 + colW.slice(0, i).reduce((a, c) => a + c, 0))
  const narrow = colWeight.map((w) => w <= 0.3)
  const busyRow = Array.from({ length: weeks }, (_, w) => cellsOf(w).some(busyOf))

  /* a block: each name with its own big icon on the left and the name beside it, one time line under them */
  const blockLayout = (bl: Block, laneW: number, NAME: number, TIME: number, s: number) => {
    scratch.font = `800 ${NAME}px ${f.body}`
    const isz = Math.round(NAME * 1.7)
    const textW = laneW - 40 - isz - 16
    /* a long name simply takes more lines (the text size shrinks to fit the slide), it is never cut */
    const rows = bl.names.map((n) => {
      const lines = wrap(scratch, n.title, textW, 99)
      const lineW = Math.max(...lines.map((l) => scratch.measureText(l).width))
      return { lines, lineW, h: Math.max(lines.length * (NAME + 4 * s), isz) }
    })
    const h = Math.round(rows.reduce((n, r) => n + r.h, 0) + (rows.length - 1) * 8 * s + (bl.off || bl.time ? TIME + 14 * s : 6 * s))
    return { rows, isz, textW, h }
  }
  const holFont = (d: Date, cw: number, HOL: number) => {
    scratch.font = `700 ${HOL}px ${f.body}`
    const words = (hol.get(isoOf(d)) || []).flatMap((h) => h.name.split(' '))
    const wMax = Math.max(1, ...words.map((w) => scratch.measureText(w).width))
    return Math.max(28, Math.min(HOL, Math.floor((HOL * (cw - 64)) / wMax)))
  }
  const holLines = (d: Date, cw: number, HOL0: number) => {
    const HOL = holFont(d, cw, HOL0)
    scratch.font = `700 ${HOL}px ${f.body}`
    const list = hol.get(isoOf(d)) || []
    const lines = list.filter((h, k, a) => a.findIndex((x) => x.name === h.name) === k).flatMap((h) => wrap(scratch, h.name, cw - 56, 2))
    if (closedOn(isoOf(d))) lines.push('Space closed')
    return lines
  }
  /* place the blocks of a cell in one or two lanes, shortest lane first */
  const placeCell = (d: Date, i: number, NAME: number, TIME: number, s: number, HOL: number) => {
    const lanes = 1
    const laneW = colW[i] / lanes
    const heights = Array(lanes).fill(0) as number[]
    const items: { bl: Block; lane: number; y: number; lay: ReturnType<typeof blockLayout>; laneW: number }[] = []
    for (const bl of blocksIn(d)) {
      const lay = blockLayout(bl, laneW, NAME, TIME, s)
      const lane = heights.indexOf(Math.min(...heights))
      items.push({ bl, lane, y: heights[lane], lay, laneW })
      heights[lane] += lay.h + Math.round(22 * s)
    }
    const hl = holLines(d, colW[i], HOL).length * (holFont(d, colW[i], HOL) + 4 * s) + (closedOn(isoOf(d)) ? 44 : 0)
    return { items, lanes, laneW, hl, h: hl + Math.max(0, ...heights) }
  }
  const layout = (s: number) => {
    const NAME = Math.round(56 * s)
    const TIME = Math.round(46 * s)
    const HOL = Math.max(32, Math.round(42 * s)) // holidays stay readable even in a crowded month
    const DAYH = Math.round(72 * s)
    const need = Array.from({ length: weeks }, (_, w) => {
      let tallest = 0
      cellsOf(w).forEach((d, i) => {
        if (d) tallest = Math.max(tallest, placeCell(d, i, NAME, TIME, s, HOL).h)
      })
      return Math.round(DAYH + tallest + 14 * s)
    })
    return { NAME, TIME, HOL, DAYH, need }
  }
  const WD = 84
  const room = (H: number) => H - TOP - WD - 56 - FOOT
  /* the biggest text that fits the slide */
  let s = 1.4
  while (layout(s).need.reduce((a, b) => a + b, 0) > room(H16) && s > 0.4) s = Math.round((s - 0.04) * 100) / 100
  const L = layout(s)
  const needSum = L.need.reduce((a, b) => a + b, 0)
  const H = Math.max(H16, TOP + WD + 56 + FOOT + needSum)
  const spare = Math.max(0, room(H) - needSum)
  const wsum = busyRow.reduce((n, b) => n + (b ? 1 : 0.4), 0)
  const rows = L.need.map((n, w) => n + (spare * (busyRow[w] ? 1 : 0.4)) / wsum)
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

  /* header: the school logo and the month name form one line of lettering, what it shows sits under it */
  const what = o.clubs && o.events ? 'Clubs and events' : o.clubs ? 'Clubs' : 'Events'
  g.textBaseline = 'top'
  g.font = `800 165px ${f.display}`
  const tw = g.measureText(theme.name).width
  const LOGO = 150
  const gapL = logo ? 36 : 0
  const startX = (W - ((logo ? LOGO : 0) + gapL + tw)) / 2
  if (logo) {
    const k = Math.min(LOGO / logo.width, LOGO / logo.height)
    g.drawImage(logo, startX + (LOGO - logo.width * k) / 2, 44 + 88 - (logo.height * k) / 2, logo.width * k, logo.height * k)
  }
  g.textAlign = 'left'
  g.fillStyle = theme.title
  g.fillText(theme.name, startX + (logo ? LOGO + gapL : 0), 44)
  g.textAlign = 'center'
  g.font = `600 46px ${f.body}`
  g.fillStyle = MUTED
  g.fillText(`${what} · ${o.year} · ${state.settings.institute}`, W / 2, 222)

  /* the calendar sits straight on the month's page: fine lines in the month's colour, and a large faint drawing
     in some of the empty days, the way a printed wall calendar does it */
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
    g.font = `800 ${narrow[i] ? 30 : 46}px ${f.display}`
    g.fillText(narrow[i] ? (DAY_FULL[d] || d).slice(0, 3) : DAY_FULL[d] || d, colX[i] + colW[i] / 2, TOP + WD / 2 - 4)
  })
  g.textAlign = 'left'
  {
    let yy = TOP + WD
    for (let w = 0; w < weeks; w++) {
      cellsOf(w).forEach((d, i) => {
        if (d && !busyOf(d) && !narrow[i] && (d.getDate() * 7 + o.month * 3) % 4 === 0) {
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
      const nr = Math.round(40 * s)
      g.textBaseline = 'middle'
      g.textAlign = 'center'
      if (isToday) {
        g.fillStyle = theme.accent
        g.beginPath()
        g.roundRect(x + 12, y + 12, nr * 1.9, nr * 1.45, nr * 0.72)
        g.fill()
      }
      g.fillStyle = isToday ? '#ffffff' : MUTED
      g.font = `800 ${nr}px ${f.body}`
      g.fillText(String(d.getDate()), x + 12 + nr * 0.95, y + 12 + nr * 0.73)
      let cy = y + L.DAYH
      const closed = closedOn(iso)
      if (closed) {
        /* a closed day is a hatched box, like "not available" in the free-rooms calendar, saying the space is closed */
        const bx = x + 1
        const by = y + 1
        const bw = colW[i] - 2
        const bh = rows[w] - 2
        g.save()
        g.beginPath()
        g.rect(bx, by, bw, bh)
        g.clip()
        g.globalAlpha = 0.38
        g.fillStyle = hatch(g, theme.accent)
        g.fillRect(bx, by, bw, bh)
        g.restore()
        const names = (hol.get(iso) || []).filter((h, k, a) => a.findIndex((x2) => x2.name === h.name) === k).flatMap((h) => wrap(scratch, h.name, bw - 40, 3))
        const lh = L.HOL + 6 * s
        const total = names.length * lh + L.HOL + 10
        let ty2 = by + L.DAYH * 0.7 + (bh - L.DAYH * 0.7 - total) / 2
        g.textBaseline = 'top'
        g.textAlign = 'center'
        g.font = `800 ${L.HOL}px ${f.body}`
        for (const nm of names) {
          g.fillStyle = theme.title
          g.fillText(nm, bx + bw / 2, ty2)
          ty2 += lh
        }
        g.fillStyle = MUTED
        g.font = `700 ${Math.round(L.HOL * 0.9)}px ${f.body}`
        g.fillText('Space closed', bx + bw / 2, ty2 + 8)
        return
      }
      /* holidays under the date (a closed day is drawn above) */
      const HF = holFont(d, colW[i], L.HOL)
      g.font = `700 ${HF}px ${f.body}`
      for (const ln of holLines(d, colW[i], L.HOL)) {
        const isClosedNote = ln === 'Space closed'
        g.fillStyle = isClosedNote ? MUTED : theme.title
        g.textBaseline = 'middle'
        const wTxt = g.measureText(ln).width
        if (!isClosedNote && colW[i] > 300) {
          g.fillStyle = theme.accent
          star(g, x + colW[i] / 2 - wTxt / 2 - HF * 0.55, cy + HF * 0.5, HF * 0.34)
          g.fillStyle = theme.title
        }
        g.fillText(ln, x + colW[i] / 2 + (isClosedNote ? 0 : HF * 0.15), cy + HF * 0.5)
        cy += HF + 4 * s
      }
      const pc = placeCell(d, i, L.NAME, L.TIME, s, L.HOL)
      for (const it of pc.items) {
        const lx = x + it.lane * pc.laneW
        const ink = it.bl.off ? INKS.off : INKS[it.bl.kind]
        g.fillStyle = ink
        g.textBaseline = 'top'
        g.font = `800 ${L.NAME}px ${f.body}`
        let ty = cy + it.y
        it.lay.rows.forEach((row, n) => {
          const img = iconImgs.get(iconKey(it.bl.names[n].icon, it.bl.kind, it.bl.off))
          /* icon and name are one group, centred in the lane; the lines of a long name are centred under each other */
          const groupW = it.lay.isz + 16 + row.lineW
          const gx0 = lx + (pc.laneW - groupW) / 2
          if (img) g.drawImage(img, gx0, ty + (row.h - it.lay.isz) / 2, it.lay.isz, it.lay.isz)
          const cx0 = gx0 + it.lay.isz + 16 + row.lineW / 2
          const blockTextH = row.lines.length * (L.NAME + 4 * s)
          let ly = ty + (row.h - blockTextH) / 2
          g.textAlign = 'center'
          g.direction = isRTL(it.bl.names[n].title) ? 'rtl' : 'ltr'
          row.lines.forEach((l) => {
            g.fillText(l, cx0, ly)
            if (it.bl.off) g.fillRect(cx0 - g.measureText(l).width / 2, ly + L.NAME * 0.56, g.measureText(l).width, 4)
            ly += L.NAME + 4 * s
          })
          g.direction = 'ltr'
          ty += row.h + 8 * s
        })
        g.textAlign = 'center'
        g.font = `700 ${L.TIME}px ${f.body}`
        if (it.bl.off) g.fillText('Cancelled', lx + pc.laneW / 2, ty + 2)
        else if (it.bl.time) g.fillText(fmtTime(it.bl.time), lx + pc.laneW / 2, ty + 2)
      }
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
