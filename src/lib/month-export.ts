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
  const TOP = 240
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
  /* a busy column is as wide as its widest entry plus the same margin on both sides; the days with nothing in them share what is left */
  const SIDE = 70
  const contentW = (i: number) => {
    let m = 0
    for (let w = 0; w < weeks; w++) {
      for (const bl of blocksIn(cellsOf(w)[i])) {
        scratch.font = `800 56px ${f.body}`
        const nw = scratch.measureText(bl.names[0].title).width
        scratch.font = `700 46px ${f.body}`
        const tw = scratch.measureText(bl.off ? 'Cancelled' : fmtTime(bl.time)).width
        m = Math.max(m, 95 + 18 + Math.max(nw, tw))
      }
    }
    return m
  }
  const widthsRaw = colWeight.map((c, i) => (c === 0 ? 0 : contentW(i) + SIDE * 2))
  const busyTotal = widthsRaw.reduce((a, b) => a + b, 0)
  const emptyN = widthsRaw.filter((x) => x === 0).length
  const avail = W - M * 2 - 20
  const emptyEach = emptyN ? Math.max(210, (avail - busyTotal) / emptyN) : 0
  const shrink = Math.min(1, (avail - emptyEach * emptyN) / Math.max(1, busyTotal))
  for (let i = 0; i < 7; i++) colWeight[i] = widthsRaw[i] === 0 ? emptyEach : widthsRaw[i] * shrink
  const inner = W - M * 2 - 20
  const weightSum = colWeight.reduce((a, b) => a + b, 0)
  const colW = colWeight.map((w) => (inner * w) / weightSum)
  const colX = colW.map((_, i) => M + 10 + colW.slice(0, i).reduce((a, c) => a + c, 0))
  const narrow = widthsRaw.map((x) => x === 0)
  const busyRow = Array.from({ length: weeks }, (_, w) => cellsOf(w).some(busyOf))

  /* a block: each name with its own big icon on the left and the name beside it, one time line under them */
  const PAD = 70
  const blockLayout = (bl: Block, laneW: number, NAME: number, TIME: number, s: number) => {
    scratch.font = `800 ${NAME}px ${f.body}`
    const isz = Math.round(NAME * 1.7)
    const textW = laneW - PAD - 30 - isz - 18
    /* a long name simply takes more lines (the text size shrinks to fit the slide), it is never cut */
    const rows = bl.names.map((n) => {
      const lines = wrap(scratch, n.title, textW, 99)
      const lineW = Math.max(...lines.map((l) => scratch.measureText(l).width))
      const hasTime = bl.off || !!bl.time
      return { lines, lineW, h: Math.max(lines.length * (NAME + 2 * s) + (hasTime ? TIME + 4 * s : 0), isz) }
    })
    const h = Math.round(rows.reduce((n, r) => n + r.h, 0))
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
      heights[lane] += lay.h + Math.round(18 * s)
    }
    const hl = holLines(d, colW[i], HOL).length * (holFont(d, colW[i], HOL) + 4 * s) + (closedOn(isoOf(d)) ? 44 : 0)
    return { items, lanes, laneW, hl, h: hl + Math.max(0, ...heights) }
  }
  /* a day that only holds sessions puts its date in the left strip, so the sessions start at the top of the cell */
  const headOf = (d: Date, DAYH: number, s: number) => (blocksIn(d).length > 0 && !hasHol(d) ? Math.round(14 * s) : DAYH)
  const layout = (s: number) => {
    const NAME = Math.round(56 * s)
    const TIME = Math.round(46 * s)
    const HOL = Math.max(32, Math.round(42 * s)) // holidays stay readable even in a crowded month
    const DAYH = Math.round(72 * s)
    const need = Array.from({ length: weeks }, (_, w) => {
      let tallest = 0
      cellsOf(w).forEach((d, i) => {
        if (d) tallest = Math.max(tallest, headOf(d, DAYH, s) + placeCell(d, i, NAME, TIME, s, HOL).h)
      })
      return Math.round(tallest + 14 * s)
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
  /* the entries of a column share one left edge, placed so the empty space on both sides of the column is equal */
  const colOff = colW.map((cw, i) => {
    if (narrow[i]) return PAD
    let widest = 0
    for (let w = 0; w < weeks; w++) {
      const d = cellsOf(w)[i]
      if (!d) continue
      for (const it of placeCell(d, i, L.NAME, L.TIME, s, L.HOL).items) {
        scratch.font = `700 ${L.TIME}px ${f.body}`
        const tw = it.bl.off ? scratch.measureText('Cancelled').width : scratch.measureText(fmtTime(it.bl.time)).width
        widest = Math.max(widest, it.lay.isz + 18 + Math.max(it.lay.rows[0].lineW, tw))
      }
    }
    return Math.max(PAD, (cw - widest) / 2)
  })
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

  /* header: the month name and the year with the school logo as the centre piece between them, what it shows underneath */
  const what = o.clubs && o.events ? 'Clubs and events' : o.clubs ? 'Clubs' : 'Events'
  const midY = 98
  const LOGO = 132
  g.textBaseline = 'middle'
  if (logo) {
    const k = Math.min(LOGO / logo.width, LOGO / logo.height)
    g.drawImage(logo, W / 2 - (logo.width * k) / 2, midY - (logo.height * k) / 2, logo.width * k, logo.height * k)
  }
  g.textAlign = 'right'
  g.font = `800 150px ${f.display}`
  g.fillStyle = theme.title
  g.fillText(theme.name, W / 2 - LOGO / 2 - 50, midY + 6)
  g.textAlign = 'left'
  g.fillStyle = theme.accent
  g.fillText(String(o.year), W / 2 + LOGO / 2 + 50, midY + 6)
  g.textAlign = 'center'
  g.font = `600 44px ${f.body}`
  g.fillStyle = MUTED
  g.fillText(`${what} · ${state.settings.institute}`, W / 2, 208)

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
    g.font = `800 ${narrow[i] ? 38 : 46}px ${f.display}`
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
      let cy = y + headOf(d, L.DAYH, s)
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
        const names = (hol.get(iso) || []).map((h) => h.name).filter((n, k, arr) => arr.indexOf(n) === k)
        const mid = by + L.DAYH * 0.7 + (bh - L.DAYH * 0.7) / 2
        g.textBaseline = 'middle'
        g.textAlign = 'center'
        g.fillStyle = MUTED
        if (bw < 300) {
          const sm = Math.round(L.HOL * 0.7)
          g.font = `800 ${sm}px ${f.body}`
          g.fillText('Space', bx + bw / 2, mid - sm * 0.6 - 20)
          g.fillText('closed', bx + bw / 2, mid + sm * 0.6 - 20)
        } else {
          g.font = `800 ${L.HOL}px ${f.body}`
          g.fillText('Space closed', bx + bw / 2, mid)
        }
        /* the holiday's own name in the bottom corner; two holidays take the left and the right corner */
        g.font = `700 ${Math.round(L.HOL * 0.85)}px ${f.body}`
        g.fillStyle = theme.title
        if (bw < 300) {
          /* a narrow weekday cell: both texts wrap and are centred */
          const small = Math.round(L.HOL * 0.7)
          g.font = `700 ${small}px ${f.body}`
          scratch.font = g.font
          const lines = names.flatMap((n) => wrap(scratch, n, bw - 16, 3))
          g.textAlign = 'center'
          let yy = by + bh - 14 - lines.length * (small + 4)
          for (const l of lines) {
            g.fillText(l, bx + bw / 2, yy + small / 2)
            yy += small + 4
          }
        } else {
          const cy2 = by + bh - Math.round(L.HOL * 0.85) * 0.7
          if (names.length === 1) {
            g.textAlign = 'right'
            g.fillText(names[0], bx + bw - 18, cy2)
          } else if (names.length >= 2) {
            g.textAlign = 'left'
            g.fillText(names[0], bx + 18, cy2)
            g.textAlign = 'right'
            g.fillText(names[1], bx + bw - 18, cy2)
          }
        }
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
        const ty = cy + it.y
        const row = it.lay.rows[0]
        const nm = it.bl.names[0]
        const img = iconImgs.get(iconKey(nm.icon, it.bl.kind, it.bl.off))
        /* the icon spans the name and the time; both texts start on one left edge shared by every entry */
        const gx0 = lx + colOff[i]
        if (img) g.drawImage(img, gx0, ty + (row.h - it.lay.isz) / 2, it.lay.isz, it.lay.isz)
        const tx0 = gx0 + it.lay.isz + 18
        const hasTime = it.bl.off || !!it.bl.time
        const textH = row.lines.length * (L.NAME + 2 * s) + (hasTime ? L.TIME + 4 * s : 0)
        let ly = ty + (row.h - textH) / 2
        g.textAlign = 'left'
        g.direction = 'ltr'
        g.font = `800 ${L.NAME}px ${f.body}`
        row.lines.forEach((l) => {
          g.fillText(l, tx0, ly)
          if (it.bl.off) g.fillRect(tx0, ly + L.NAME * 0.56, g.measureText(l).width, 4)
          ly += L.NAME + 2 * s
        })
        g.font = `700 ${L.TIME}px ${f.body}`
        if (it.bl.off) g.fillText('Cancelled', tx0, ly + 4 * s)
        else if (it.bl.time) g.fillText(fmtTime(it.bl.time), tx0, ly + 4 * s)
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
