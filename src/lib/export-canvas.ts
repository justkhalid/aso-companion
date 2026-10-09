'use client'

import type { GridItem, LegendEntry } from '@/components/weekly-grid'
import { DAY_KEYS, DAY_FULL } from './constants'

/* Tones matching the old vanilla JS export (also reused by the Word exports) */
export const TONE_RGB: { bg: string; line: string; txt: string }[] = [
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

export function toneIdx(tone: string): number {
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

/* ---------- shared parsing helpers ---------- */

export type ParsedExport = { item: GridItem; startMin: number; endMin: number; label: string }

export function parseExportItems(items: GridItem[]): ParsedExport[] {
  const parsed: ParsedExport[] = []
  for (const it of items) {
    const r = parseRange(it.slot)
    if (!r) continue
    parsed.push({ item: it, startMin: r.startMin, endMin: r.endMin, label: r.label })
  }
  return parsed
}

export function groupByDay(parsed: ParsedExport[]): Record<string, ParsedExport[]> {
  const byDay: Record<string, ParsedExport[]> = {}
  for (const p of parsed) {
    for (const d of p.item.days) {
      ;(byDay[d] ||= []).push(p)
    }
  }
  return byDay
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement | null>((res) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = '/aso-logo.png'
  })
}

function drawHeader(ctx: CanvasRenderingContext2D, o: ExportOptions, logo: HTMLImageElement | null, W: number, PAD: number, titleSize = 28, subSize = 14, logoH = 56): number {
  /* returns the y where the header ends */
  let x = PAD
  if (logo) {
    const h = logoH
    const w = h * (logo.width / logo.height)
    ctx.drawImage(logo, x, 26, w, h)
    x += w + 22
  } else x += 8
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '800 ' + titleSize + 'px ' + FONT
  ctx.fillText(clipTo(ctx, o.title, W - PAD - x), x, 60)
  ctx.fillStyle = '#66666E'
  ctx.font = '500 ' + subSize + 'px ' + FONT
  ctx.fillText(clipTo(ctx, o.subtitle, W - PAD - x), x, 60 + titleSize + 8)
  return Math.max(118, 60 + titleSize + 8 + 16)
}

function drawFooterRule(ctx: CanvasRenderingContext2D, W: number, PAD: number, y: number): void {
  ctx.strokeStyle = 'rgba(60,60,67,.12)'
  ctx.beginPath(); ctx.moveTo(PAD, y + .5); ctx.lineTo(W - PAD, y + .5); ctx.stroke()
  ctx.fillStyle = '#8A8A90'
  ctx.font = '500 12px ' + FONT
}

/**
 * Canvas-based PNG export matching the old vanilla JS design:
 * - Days on the LEFT (rows), hours on the TOP (columns) - flipped
 * - Colored chips with level, hours · room, teacher
 * - Legend at the bottom
 * - 2x HD resolution
 *
 * v4.9: the hour axis now trims to the actual session window (rounded out
 * to whole hours, min 6 hours) so rows no longer stretch across empty
 * morning hours; the canvas is narrower and every text size is up, so the
 * export reads dense and close-up instead of zoomed out.
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
  const W = 1320
  const PAD = 48
  const DAY_LABEL_W = 72
  const HEADER_H = 118
  const HOUR_HEAD_H = 48
  /* v4.7: compact chips stacked vertically when simultaneous (matches the web grid) */
  const CHIP_H = 56
  const CHIP_GAP = 4
  const ROW_PAD = 6
  const ROW_H_EMPTY = 44
  /* v4.9: hour window trims to the sessions that actually exist; if the
     natural window is under 6 hours it grows downward, never past the
     last session into empty evening hours */
  const parsed0 = o.items.map((it) => ({ it, r: parseRange(it.slot) })).filter((x) => x.r)
  let START_HOUR = 9
  let END_HOUR = 18
  if (parsed0.length) {
    const minStart = Math.min(...parsed0.map((x) => x.r!.startMin))
    const maxEnd = Math.max(...parsed0.map((x) => x.r!.endMin))
    START_HOUR = Math.max(0, Math.floor(minStart / 60))
    END_HOUR = Math.min(21, Math.ceil(maxEnd / 60))
    if (END_HOUR - START_HOUR < 6) START_HOUR = Math.max(0, END_HOUR - 6)
  }
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
    const h = 60
    const w = h * (logo.width / logo.height)
    ctx.drawImage(logo, x, 24, w, h)
    x += w + 22
  } else x += 8
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '800 30px ' + FONT
  ctx.fillText(o.title, x, 60)
  ctx.fillStyle = '#66666E'
  ctx.font = '500 15px ' + FONT
  ctx.fillText(o.subtitle, x, 86)

  // Hour header row
  const ty = HEADER_H
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '700 16px ' + FONT
  ctx.textAlign = 'center'
  hours.forEach((h, i) => {
    ctx.fillText(pad2(h) + ':00', PAD + DAY_LABEL_W + i * HOUR_W + HOUR_W / 2, ty + HOUR_HEAD_H / 2 + 6)
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
    ctx.font = '700 15px ' + FONT
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
      ctx.font = '800 13.5px ' + FONT
      ctx.fillText(clipTo(ctx, e.item.code, cw - 26), cx + 15, cy + 20)
      // Line 2: hours · room
      ctx.font = '600 11px ' + FONT
      const hoursRoom = e.label + (e.item.room ? ' · ' + e.item.room : '')
      ctx.fillText(clipTo(ctx, hoursRoom, cw - 26), cx + 15, cy + 35)
      // Line 3: teacher/lead
      if (e.item.lead) {
        ctx.font = '500 11px ' + FONT
        ctx.globalAlpha = .8
        ctx.fillText(clipTo(ctx, e.item.lead, cw - 26), cx + 15, cy + 49)
        ctx.globalAlpha = 1
      }
    }
  })

  // Legend
  const legendY = ty + HOUR_HEAD_H + gridH + 22
  ctx.font = '600 13px ' + FONT
  let lx = PAD
  ctx.textAlign = 'left'
  o.legend.forEach(l => {
    const tone = TONE_RGB[toneIdx(l.tone)]
    ctx.fillStyle = tone.txt
    ctx.beginPath(); ctx.arc(lx + 5, legendY - 4, 5, 0, 7); ctx.fill()
    ctx.fillStyle = '#66666E'
    ctx.fillText(clipTo(ctx, l.label, 200), lx + 16, legendY)
    lx += 22 + ctx.measureText(clipTo(ctx, l.label, 200)).width + 26
  })

  // Rooms line
  if (o.rooms) {
    ctx.fillStyle = '#A6A6AD'
    ctx.font = '500 12px ' + FONT
    ctx.fillText(o.rooms, PAD, legendY + 26)
  }

  return new Promise(res => cv.toBlob(res, 'image/png'))
}

/* ---------- shared legend painter for the poster / list variants ---------- */
function drawLegendRow(
  ctx: CanvasRenderingContext2D,
  legend: LegendEntry[],
  y: number,
  PAD: number,
  W: number,
): void {
  ctx.font = '600 13.5px ' + FONT
  let lx = PAD
  ctx.textAlign = 'left'
  for (const l of legend) {
    const tone = TONE_RGB[toneIdx(l.tone)]
    if (lx > W - PAD - 60) break // never overflow the right margin
    ctx.fillStyle = tone.txt
    ctx.beginPath(); ctx.arc(lx + 5, y - 4, 5, 0, 7); ctx.fill()
    const label = clipTo(ctx, l.label, 200)
    ctx.fillStyle = '#66666E'
    ctx.fillText(label, lx + 16, y)
    lx += 22 + ctx.measureText(label).width + 26
  }
}

/**
 * Poster variant: A4-portrait session blocks grouped by day. Bold, wall-ready.
 * v4.9: larger blocks and type so it reads close-up, not zoomed out.
 */
export async function renderPosterPNG(o: ExportOptions): Promise<Blob | null> {
  const logo = await loadLogo()
  const parsed = parseExportItems(o.items)
  const byDay = groupByDay(parsed)

  const W = 1240
  const PAD = 56
  const BLOCK_H = 64
  const BLOCK_GAP = 10
  const DAY_HEAD_H = 38
  const DAY_GAP = 30

  const days = DAY_KEYS.map((d) => ({
    d,
    evs: (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin),
  }))

  // measure
  let H = 118 + 20
  for (const day of days) H += DAY_HEAD_H + Math.max(1, day.evs.length) * (BLOCK_H + BLOCK_GAP) + DAY_GAP - BLOCK_GAP
  H += 62 + (o.legend.length ? 36 : 0)

  const SCALE = 2
  const cv = document.createElement('canvas')
  cv.width = W * SCALE
  cv.height = H * SCALE
  const ctx = cv.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const headEnd = drawHeader(ctx, o, logo, W, PAD, 34, 16, 64)
  ctx.strokeStyle = 'rgba(60,60,67,.14)'
  ctx.beginPath(); ctx.moveTo(PAD, headEnd + 2); ctx.lineTo(W - PAD, headEnd + 2); ctx.stroke()

  let y = headEnd + 20
  for (const day of days) {
    // day head
    ctx.fillStyle = '#1C1C1E'
    ctx.font = '800 19px ' + FONT
    ctx.fillText(day.d.toUpperCase(), PAD, y + 16)
    ctx.fillStyle = '#A6A6AD'
    ctx.font = '600 13px ' + FONT
    const countTxt = day.evs.length ? day.evs.length + (day.evs.length === 1 ? ' session' : ' sessions') : ''
    ctx.textAlign = 'right'
    ctx.fillText(countTxt, W - PAD, y + 16)
    ctx.textAlign = 'left'
    y += DAY_HEAD_H

    if (!day.evs.length) {
      ctx.fillStyle = '#B9B9C0'
      ctx.font = '600 14px ' + FONT
      ctx.fillText('No sessions', PAD + 4, y + 20)
      y += BLOCK_H
    } else {
      for (const e of day.evs) {
        const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
        ctx.fillStyle = tone.bg
        rrPath(ctx, PAD, y, W - PAD * 2, BLOCK_H, 12)
        ctx.fill()
        ctx.strokeStyle = tone.line
        ctx.lineWidth = 1
        rrPath(ctx, PAD, y, W - PAD * 2, BLOCK_H, 12)
        ctx.stroke()

        // accent bar
        ctx.save()
        rrPath(ctx, PAD, y, W - PAD * 2, BLOCK_H, 12)
        ctx.clip()
        ctx.globalAlpha = .5
        ctx.fillStyle = tone.txt
        ctx.fillRect(PAD, y + 8, 5, BLOCK_H - 16)
        ctx.restore()
        ctx.globalAlpha = 1

        // time | name | room · lead
        const cy = y + BLOCK_H / 2
        ctx.fillStyle = tone.txt
        ctx.font = '800 15px ' + FONT
        ctx.fillText(e.label, PAD + 22, cy + 5)

        const nx = PAD + 22 + 190
        ctx.fillStyle = '#1C1C1E'
        ctx.font = '800 17px ' + FONT
        ctx.fillText(clipTo(ctx, e.item.code, W - PAD * 2 - 400), nx, cy + 6)

        ctx.fillStyle = '#66666E'
        ctx.font = '600 13.5px ' + FONT
        ctx.textAlign = 'right'
        const meta = [e.item.room, e.item.lead].filter(Boolean).join(' · ')
        ctx.fillText(clipTo(ctx, meta, 340), W - PAD - 18, cy + 5)
        ctx.textAlign = 'left'
        y += BLOCK_H + BLOCK_GAP
      }
      y -= BLOCK_GAP
    }
    y += DAY_GAP
  }

  // footer: legend + credit
  if (o.legend.length) {
    drawLegendRow(ctx, o.legend, y + 10, PAD, W)
    y += 36
  }
  drawFooterRule(ctx, W, PAD, y + 4)
  ctx.fillStyle = '#8A8A90'
  ctx.font = '500 12.5px ' + FONT
  ctx.fillText([o.rooms, 'Made with ASO Companion'].filter(Boolean).join('  ·  '), PAD, y + 26)

  return new Promise((res) => cv.toBlob(res, 'image/png'))
}

/**
 * Agenda-list variant: minimal day-by-day list, print-friendly and calm.
 * v4.9: larger rows and type so it reads close-up, not zoomed out.
 */
export async function renderListPNG(o: ExportOptions): Promise<Blob | null> {
  const logo = await loadLogo()
  const parsed = parseExportItems(o.items)
  const byDay = groupByDay(parsed)

  const W = 1240
  const PAD = 60
  const ROW_H = 38
  const DAY_HEAD_H = 42
  const DAY_GAP = 18

  const days = DAY_KEYS.map((d) => ({
    d,
    evs: (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin),
  }))

  let H = 118 + 18
  for (const day of days) H += DAY_HEAD_H + Math.max(1, day.evs.length) * ROW_H
  H += DAY_GAP + 56 + (o.legend.length ? 34 : 0)

  const SCALE = 2
  const cv = document.createElement('canvas')
  cv.width = W * SCALE
  cv.height = H * SCALE
  const ctx = cv.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const headEnd = drawHeader(ctx, o, logo, W, PAD, 30, 15, 60)

  let y = headEnd + 18
  for (const day of days) {
    ctx.fillStyle = '#1C1C1E'
    ctx.font = '800 17px ' + FONT
    ctx.fillText(DAY_FULL[day.d] || day.d, PAD, y + 15)
    // day underline
    ctx.strokeStyle = 'rgba(60,60,67,.16)'
    ctx.beginPath(); ctx.moveTo(PAD, y + 24); ctx.lineTo(W - PAD, y + 24); ctx.stroke()
    y += DAY_HEAD_H

    if (!day.evs.length) {
      ctx.fillStyle = '#B9B9C0'
      ctx.font = '500 13.5px ' + FONT
      ctx.fillText('No sessions', PAD + 2, y + 18)
      y += ROW_H
    } else {
      for (const e of day.evs) {
        const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
        const cy = y + ROW_H / 2
        // time
        ctx.fillStyle = tone.txt
        ctx.font = '800 14.5px ' + FONT
        ctx.fillText(e.label, PAD + 2, cy + 5)
        // tone dot + name
        ctx.fillStyle = tone.txt
        ctx.beginPath(); ctx.arc(PAD + 196, cy - 1, 4.5, 0, 7); ctx.fill()
        ctx.fillStyle = '#1C1C1E'
        ctx.font = '700 15.5px ' + FONT
        ctx.fillText(clipTo(ctx, e.item.code, 600), PAD + 212, cy + 5)
        // room · lead right
        ctx.fillStyle = '#8A8A90'
        ctx.font = '600 13px ' + FONT
        ctx.textAlign = 'right'
        const meta = [e.item.room, e.item.lead].filter(Boolean).join(' · ')
        ctx.fillText(clipTo(ctx, meta, 340), W - PAD - 2, cy + 5)
        ctx.textAlign = 'left'
        // hairline
        ctx.strokeStyle = 'rgba(60,60,67,.06)'
        ctx.beginPath(); ctx.moveTo(PAD, y + ROW_H - 7); ctx.lineTo(W - PAD, y + ROW_H - 7); ctx.stroke()
        y += ROW_H
      }
    }
    y += DAY_GAP
  }

  if (o.legend.length) {
    drawLegendRow(ctx, o.legend, y + 8, PAD, W)
    y += 34
  }
  drawFooterRule(ctx, W, PAD, y + 2)
  ctx.fillStyle = '#8A8A90'
  ctx.font = '500 12.5px ' + FONT
  ctx.fillText([o.rooms, 'Made with ASO Companion'].filter(Boolean).join('  ·  '), PAD, y + 25)

  return new Promise((res) => cv.toBlob(res, 'image/png'))
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
