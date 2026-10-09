'use client'

import type { GridItem, LegendEntry } from '@/components/weekly-grid'
import { DAY_KEYS } from './constants'

/* Tones matching the old vanilla JS export */
const TONE_RGB: { bg: string; line: string; txt: string }[] = [
  { bg: 'rgba(11,92,230,.12)',  line: 'rgba(11,92,230,.30)',  txt: '#0A54C4' },
  { bg: 'rgba(255,149,0,.16)',  line: 'rgba(255,149,0,.34)',  txt: '#A85700' },
  { bg: 'rgba(52,199,89,.16)',  line: 'rgba(52,199,89,.32)',  txt: '#1E7A3A' },
  { bg: 'rgba(175,82,222,.14)', line: 'rgba(175,82,222,.30)', txt: '#8E44B3' },
  { bg: 'rgba(88,86,214,.14)',  line: 'rgba(88,86,214,.30)',  txt: '#4A48B8' },
  { bg: 'rgba(255,45,85,.14)',  line: 'rgba(255,45,85,.30)',  txt: '#C81E45' },
  { bg: 'rgba(48,176,199,.16)', line: 'rgba(48,176,199,.32)', txt: '#0F7A8C' },
  { bg: 'rgba(255,204,0,.18)',  line: 'rgba(255,204,0,.34)',  txt: '#8A6D00' },
  { bg: 'rgba(120,120,128,.16)',line: 'rgba(120,120,128,.30)',txt: '#5A5A66' },
]

function toneIdx(tone: string): number {
  const m = /tone-(\d+)/.exec(tone || '')
  return m ? Math.min(8, parseInt(m[1], 10)) : 0
}

function parseRange(t: string): { startMin: number; endMin: number; label: string } | null {
  const s = String(t || '').replace(/\s/g, '')
  const m = s.match(/^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/)
  if (!m) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return { startMin: +m[1]*60+(+m[2]), endMin: +m[3]*60+(+m[4]), label: `${pad(+m[1])}:${pad(+m[2])} - ${pad(+m[3])}:${pad(+m[4])}` }
}

function clipTo(ctx: CanvasRenderingContext2D, t: string, w: number): string {
  let s = String(t || '')
  if (ctx.measureText(s).width <= w) return s
  while (s.length > 1 && ctx.measureText(s + '...').width > w) s = s.slice(0, -1)
  return s + '...'
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, sans-serif'

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export interface ExportOptions {
  title: string
  subtitle: string
  items: GridItem[]
  legend: LegendEntry[]
  rooms?: string
}

/**
 * Canvas-based PNG export matching the old vanilla JS design:
 * - Logo + title + subtitle at the top
 * - Days on the LEFT (rows), hours on the TOP (columns) - flipped
 * - Colored chips with level, hours · room, teacher
 * - Legend at the bottom
 * - 2x HD resolution (3508px wide)
 */
export async function renderTimetablePNG(o: ExportOptions): Promise<Blob | null> {
  // Load logo
  let logo: HTMLImageElement | null = null
  try {
    logo = await new Promise<HTMLImageElement | null>(res => {
      const im = new Image()
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = '/aso-logo.png'
    })
  } catch { /* logo optional */ }

  const SCALE = 2
  const W = 1754
  const PAD = 56
  const DAY_LABEL_W = 80
  const HEADER_H = 118
  const HOUR_HEAD_H = 48
  /* v4.7: compact chips stacked vertically when simultaneous (matches the web grid) */
  const CHIP_H = 46
  const CHIP_GAP = 4
  const ROW_PAD = 6
  const ROW_H_EMPTY = 44
  const START_HOUR = 9
  const END_HOUR = 18
  const hours: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)
  const HOUR_W = (W - PAD * 2 - DAY_LABEL_W) / hours.length
  const pad2 = (n: number) => String(n).padStart(2, '0')

  // Parse items
  type Parsed = { item: GridItem; startMin: number; endMin: number; label: string }
  const parsed: Parsed[] = []
  for (const it of o.items) {
    const r = parseRange(it.slot)
    if (!r) continue
    parsed.push({ item: it, startMin: r.startMin, endMin: r.endMin, label: r.label })
  }

  // Group by day
  const byDay: Record<string, Parsed[]> = {}
  for (const p of parsed) {
    for (const d of p.item.days) {
      ;(byDay[d] ||= []).push(p)
    }
  }

  const legendH = 30
  const roomsH = o.rooms ? 30 : 0

  /* First pass: lane packing per day (same algorithm as the web grid), so
     rows can be sized exactly to the number of stacked layers. */
  type DayLayout = { evs: Parsed[]; laneOf: Map<string, number>; lanes: number; rowH: number; y: number }
  const dayLayouts: DayLayout[] = []
  let cursorY = HEADER_H + HOUR_HEAD_H
  for (const d of DAY_KEYS) {
    const evs = (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin)
    const layers: Parsed[][] = []
    const layerEnds: number[] = []
    const laneOf = new Map<string, number>()
    for (const e of evs) {
      let li = layerEnds.findIndex((end) => end <= e.startMin)
      if (li < 0) {
        li = layers.length
        layers.push([])
        layerEnds.push(0)
      }
      layers[li].push(e)
      layerEnds[li] = e.endMin
      laneOf.set(e.item.id, li)
    }
    const laneCount = Math.max(1, layers.length)
    const rowH = evs.length
      ? ROW_PAD * 2 + laneCount * CHIP_H + (laneCount - 1) * CHIP_GAP
      : ROW_H_EMPTY
    dayLayouts.push({ evs, laneOf, lanes: laneCount, rowH, y: cursorY })
    cursorY += rowH
  }
  const gridH = cursorY - (HEADER_H + HOUR_HEAD_H)
  const H = HEADER_H + HOUR_HEAD_H + gridH + legendH + roomsH + 40

  const cv = document.createElement('canvas')
  cv.width = W * SCALE
  cv.height = H * SCALE
  const ctx = cv.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  // Header
  let x = PAD
  if (logo) {
    const h = 56
    const w = h * (logo.width / logo.height)
    ctx.drawImage(logo, x, 26, w, h)
    x += w + 22
  } else x += 8
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '800 28px ' + FONT
  ctx.fillText(o.title, x, 60)
  ctx.fillStyle = '#66666E'
  ctx.font = '500 14px ' + FONT
  ctx.fillText(o.subtitle, x, 84)

  // Hour header row
  const ty = HEADER_H
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '700 15px ' + FONT
  ctx.textAlign = 'center'
  hours.forEach((h, i) => {
    ctx.fillText(pad2(h) + ':00', PAD + DAY_LABEL_W + i * HOUR_W + HOUR_W / 2, ty + HOUR_HEAD_H / 2 + 5)
  })
  ctx.textAlign = 'left'
  // Header borders
  ctx.strokeStyle = 'rgba(60,60,67,.18)'
  ctx.beginPath(); ctx.moveTo(PAD, ty + HOUR_HEAD_H + .5); ctx.lineTo(W - PAD, ty + HOUR_HEAD_H + .5); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(PAD, ty + .5); ctx.lineTo(W - PAD, ty + .5); ctx.stroke()

  // Day rows
  DAY_KEYS.forEach((d, di) => {
    const lay = dayLayouts[di]
    const y = lay.y
    const rowH = lay.rowH
    // Row border
    if (di > 0) {
      ctx.strokeStyle = 'rgba(60,60,67,.07)'
      ctx.beginPath(); ctx.moveTo(PAD, y + .5); ctx.lineTo(W - PAD, y + .5); ctx.stroke()
    }
    // Day label: generic day name, no date numbers
    ctx.fillStyle = '#1C1C1E'
    ctx.font = '700 14px ' + FONT
    ctx.textAlign = 'center'
    ctx.fillText(d.toUpperCase(), PAD + DAY_LABEL_W / 2, y + rowH / 2 + 5)
    ctx.textAlign = 'left'
    // Vertical line after day label
    ctx.strokeStyle = 'rgba(60,60,67,.12)'
    ctx.beginPath(); ctx.moveTo(PAD + DAY_LABEL_W + .5, y); ctx.lineTo(PAD + DAY_LABEL_W + .5, y + rowH); ctx.stroke()
    // Vertical hour lines
    hours.forEach((_, i) => {
      if (i > 0) {
        const lx = PAD + DAY_LABEL_W + i * HOUR_W
        ctx.strokeStyle = 'rgba(60,60,67,.05)'
        ctx.beginPath(); ctx.moveTo(lx + .5, y); ctx.lineTo(lx + .5, y + rowH); ctx.stroke()
      }
    })

    // Event chips: each event uses the FULL width of its time span;
    // simultaneous events stack one on top of the other (per layer).
    for (const e of lay.evs) {
      const lane = lay.laneOf.get(e.item.id) || 0
      const startOffset = e.startMin - START_HOUR * 60
      const duration = e.endMin - e.startMin
      const chipLeft = PAD + DAY_LABEL_W + (startOffset / 60) * HOUR_W
      const chipW = (duration / 60) * HOUR_W
      const cx = chipLeft + 3
      const cw = chipW - 6
      const cy = y + ROW_PAD + lane * (CHIP_H + CHIP_GAP)
      const ch = CHIP_H

      const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
      ctx.fillStyle = tone.bg
      rrPath(ctx, cx, cy, cw, ch, 8)
      ctx.fill()
      ctx.strokeStyle = tone.line
      ctx.lineWidth = 1
      rrPath(ctx, cx, cy, cw, ch, 8)
      ctx.stroke()

      /* slim accent bar on the left edge, clipped to the chip */
      ctx.save()
      rrPath(ctx, cx, cy, cw, ch, 8)
      ctx.clip()
      ctx.globalAlpha = .45
      ctx.fillStyle = tone.txt
      ctx.fillRect(cx, cy + 5, 4, ch - 10)
      ctx.restore()
      ctx.globalAlpha = 1

      ctx.fillStyle = tone.txt
      // Line 1: level/club name
      ctx.font = '800 12px ' + FONT
      ctx.fillText(clipTo(ctx, e.item.code, cw - 24), cx + 13, cy + 16)
      // Line 2: hours · room
      ctx.font = '600 10px ' + FONT
      const hoursRoom = e.label + (e.item.room ? ' · ' + e.item.room : '')
      ctx.fillText(clipTo(ctx, hoursRoom, cw - 24), cx + 13, cy + 29)
      // Line 3: teacher/lead
      if (e.item.lead) {
        ctx.font = '600 10px ' + FONT
        ctx.globalAlpha = .8
        ctx.fillText(clipTo(ctx, e.item.lead, cw - 24), cx + 13, cy + 42)
        ctx.globalAlpha = 1
      }
    }
  })

  // Legend
  const legendY = ty + HOUR_HEAD_H + gridH + 20
  ctx.font = '600 12px ' + FONT
  let lx = PAD
  ctx.textAlign = 'left'
  o.legend.forEach(l => {
    const tone = TONE_RGB[toneIdx(l.tone)]
    ctx.fillStyle = tone.txt
    ctx.beginPath(); ctx.arc(lx + 4, legendY - 4, 4.5, 0, 7); ctx.fill()
    ctx.fillStyle = '#66666E'
    ctx.fillText(clipTo(ctx, l.label, 200), lx + 14, legendY)
    lx += 20 + ctx.measureText(clipTo(ctx, l.label, 200)).width + 24
  })

  // Rooms line
  if (o.rooms) {
    ctx.fillStyle = '#A6A6AD'
    ctx.font = '500 11px ' + FONT
    ctx.fillText(o.rooms, PAD, legendY + 24)
  }

  return new Promise(res => cv.toBlob(res, 'image/png'))
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function openBlobInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
