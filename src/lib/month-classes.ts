import { DAY_FULL, DAY_KEYS } from './constants'
import { hourLabel12, isoOf, parseSlot } from './app-utils'
import { MUTED, load, siteFonts } from './clubs-calendar-export'
import { publicGroupName } from './calendar-items'
import { holidaysOf } from './holidays'
import { MONTH_THEMES } from './month-themes'
import { paintBackdrop, paintFooter, paintHeader } from './month-frame'
import type { MonthOptions } from './month-export'
import type { State } from './types'

/* Classes repeat every week, so the month picture shows the weekly timetable (days across, hours down) in the month's theme. */

const INK = '#0F6B66'
const fmt12 = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'PM' : 'AM'}`

interface Blk {
  name: string
  day: number
  start: number
  end: number
  room: string
  lane: number
  lanes: number
}

export async function renderClassesMonth(state: State, o: MonthOptions): Promise<HTMLCanvasElement> {
  const [logo, f] = await Promise.all([load('/aso-logo.png'), siteFonts()])
  const theme = MONTH_THEMES[o.month]
  const W = 3200
  const H = 1800
  const M = 70
  const TOP = 250
  const FOOT = 128
  const WD = 84

  const blks: Blk[] = []
  for (const c of state.classes || []) {
    const m = String(c.time || '').replace(/\s/g, '').match(/^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/)
    if (!m) continue
    const start = parseSlot(c.time).mins
    const end = +m[3] * 60 + +m[4]
    for (const d of c.days || []) {
      const day = DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])
      if (day >= 0) blks.push({ name: publicGroupName(c.code, c.level), day, start, end, room: c.room || '', lane: 0, lanes: 1 })
    }
  }
  /* overlapping classes of one day sit side by side */
  for (let d = 0; d < 7; d++) {
    const list = blks.filter((b) => b.day === d).sort((a, b) => a.start - b.start || a.name.localeCompare(b.name))
    let cluster: Blk[] = []
    let clusterEnd = -1
    const flush = () => {
      const n = cluster.reduce((mx, b) => Math.max(mx, b.lane + 1), 1)
      cluster.forEach((b) => (b.lanes = n))
      cluster = []
    }
    for (const b of list) {
      if (cluster.length && b.start >= clusterEnd) {
        flush()
        clusterEnd = -1
      }
      const used = new Set(cluster.filter((x) => x.end > b.start).map((x) => x.lane))
      let lane = 0
      while (used.has(lane)) lane++
      b.lane = lane
      cluster.push(b)
      clusterEnd = Math.max(clusterEnd, b.end)
    }
    flush()
  }

  /* closed days of the month, listed under the timetable */
  const closed: string[] = []
  if (o.holidays !== false) {
    const hol = holidaysOf(o.year)
    const last = new Date(o.year, o.month + 1, 0).getDate()
    for (let day = 1; day <= last; day++) {
      const d = new Date(o.year, o.month, day)
      const list = (hol.get(isoOf(d)) || []).filter((h) => h.closed)
      if (list.length) closed.push(`${(DAY_FULL[DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1]] || '').slice(0, 3)} ${day} ${theme.name.slice(0, 3)} · ${list.map((h) => h.name).join(' / ')}`)
    }
  }
  const moonNote = o.holidays !== false && Array.from(holidaysOf(o.year).entries()).some(([k, v]) => k.startsWith(`${o.year}-${String(o.month + 1).padStart(2, '0')}`) && v.some((h) => h.moon))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  paintBackdrop(g, theme, o.month, W, H)
  paintHeader(g, f, theme, o.year, ['CLASSES'])

  const CLOSEDH = closed.length ? 70 : 0
  const gridTop = TOP + WD
  const gridBottom = H - FOOT - CLOSEDH
  const hourW = 160
  const x0 = M + hourW
  const busy = Array.from({ length: 7 }, (_, d) => blks.some((b) => b.day === d))
  /* a day with classes side by side gets room for each of them */
  const wts = busy.map((b, d) => (b ? Math.max(1, ...blks.filter((x) => x.day === d).map((x) => x.lanes)) * 1.25 : 0.4))
  const wsum = wts.reduce((a, b) => a + b, 0)
  const colW = wts.map((w) => ((W - M - x0) * w) / wsum)
  const colX = colW.map((_, i) => x0 + colW.slice(0, i).reduce((a, c) => a + c, 0))

  const minStart = blks.length ? Math.min(...blks.map((b) => b.start)) : 9 * 60
  const maxEnd = blks.length ? Math.max(...blks.map((b) => b.end)) : 18 * 60
  let h0 = Math.floor(minStart / 60)
  let h1 = Math.ceil(maxEnd / 60)
  while (h1 - h0 < 6) {
    if (h1 < 22) h1++
    if (h1 - h0 < 6 && h0 > 7) h0--
  }
  const rowH = (gridBottom - gridTop) / (h1 - h0)
  const yOf = (min: number) => gridTop + ((min - h0 * 60) / 60) * rowH

  /* lines and hours */
  g.strokeStyle = theme.accent + '40'
  g.lineWidth = 2
  g.textBaseline = 'middle'
  g.textAlign = 'right'
  g.font = `700 40px ${f.body}`
  g.fillStyle = MUTED
  for (let h = h0; h <= h1; h++) {
    const y = gridTop + (h - h0) * rowH
    g.beginPath()
    g.moveTo(M + hourW - 20, y)
    g.lineTo(W - M, y)
    g.stroke()
    if (h < h1) g.fillText(hourLabel12(h), M + hourW - 40, y + 34)
  }
  g.strokeStyle = theme.accent + '55'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(M, gridTop - 8)
  g.lineTo(W - M, gridTop - 8)
  g.moveTo(M, gridTop - 16)
  g.lineTo(W - M, gridTop - 16)
  g.stroke()
  g.strokeStyle = theme.accent + '40'
  g.lineWidth = 2
  g.textAlign = 'center'
  DAY_KEYS.forEach((d, i) => {
    if (i > 0) {
      g.beginPath()
      g.moveTo(colX[i], gridTop - 16)
      g.lineTo(colX[i], gridBottom)
      g.stroke()
    }
    g.fillStyle = theme.accent
    g.font = `800 ${busy[i] ? 46 : 32}px ${f.display}`
    g.fillText(busy[i] ? DAY_FULL[d] || d : (DAY_FULL[d] || d).slice(0, 3), colX[i] + colW[i] / 2, TOP + WD / 2 - 4)
  })

  /* class blocks */
  const GAP = 10
  for (const b of blks) {
    const lw = (colW[b.day] - GAP * 2) / b.lanes
    const x = colX[b.day] + GAP + b.lane * lw
    const y = yOf(b.start) + GAP / 2
    const bh = yOf(b.end) - yOf(b.start) - GAP
    const w = lw - GAP
    g.fillStyle = INK + '1f'
    g.beginPath()
    g.roundRect(x, y, w, bh, 22)
    g.fill()
    g.strokeStyle = INK + '88'
    g.lineWidth = 3
    g.stroke()
    g.fillStyle = INK
    g.beginPath()
    g.roundRect(x, y, 14, bh, [22, 0, 0, 22])
    g.fill()
    /* name as big as the block allows, then the time under it (on two lines when it does not fit), left aligned on one edge */
    let ns = Math.min(78, bh * 0.3)
    g.font = `800 ${ns}px ${f.body}`
    while (g.measureText(b.name).width > w - 60 && ns > 30) {
      ns -= 2
      g.font = `800 ${ns}px ${f.body}`
    }
    const ts = Math.round(Math.max(34, ns * 0.64))
    const tx = x + 38
    const full = `${fmt12(b.start)} - ${fmt12(b.end)}`
    g.font = `700 ${ts}px ${f.body}`
    const timeLines = g.measureText(full).width <= w - 60 ? [full] : [`${fmt12(b.start)} -`, fmt12(b.end)]
    const lines = [{ t: b.name, s: ns, wt: 800 }, ...timeLines.map((t) => ({ t, s: ts, wt: 700 }))]
    if (b.room && bh > ns * 3.2 + ts * 1.25 * timeLines.length) lines.push({ t: b.room, s: ts, wt: 600 })
    const total = lines.reduce((a, l) => a + l.s * 1.25, 0)
    let ty = y + (bh - total) / 2
    g.textAlign = 'left'
    for (const l of lines) {
      g.font = `${l.wt} ${l.s}px ${f.body}`
      g.fillStyle = l.t === b.room ? MUTED : INK
      g.fillText(l.t, tx, ty + l.s * 0.62)
      ty += l.s * 1.25
    }
  }

  if (closed.length) {
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `700 36px ${f.body}`
    g.fillStyle = MUTED
    g.fillText('Space closed:  ' + closed.join('     ·     '), W / 2, gridBottom + CLOSEDH / 2 + 4)
  }
  paintFooter(g, f, logo, `${state.settings.institute}${moonNote ? ' · Islamic holiday dates follow the moon and can shift by a day' : ''}`, W, H, gridBottom + CLOSEDH)
  return canvas
}
