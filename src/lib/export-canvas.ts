'use client'

import type { GridItem, LegendEntry } from '@/components/weekly-grid'
import { packDayChips, lanesOf } from '@/components/weekly-grid'
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

export interface DocLink {
  name: string
  desc?: string
  url: string
}

export interface ExportOptions {
  title: string
  subtitle: string
  items: GridItem[]
  legend: LegendEntry[]
  rooms?: string
  /* Word docs only: library / drive links shown at the end of the document */
  libraryLinks?: DocLink[]
  appUrl?: string
  /* PNG only: text density. 1 = normal, 1.3 = Large, 1.6 = XL. Fonts and
     vertical rhythm scale by this factor while the canvas width grows less,
     so text reads clearly without zooming and the design keeps its shape. */
  zoom?: number
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

function drawHeader(
  ctx: CanvasRenderingContext2D,
  o: ExportOptions,
  logo: HTMLImageElement | null,
  W: number,
  PAD: number,
  titleSize = 28,
  subSize = 14,
  logoH = 56,
  S = 1,
): number {
  /* returns the y where the header ends */
  let x = PAD
  if (logo) {
    const h = logoH * S
    const w = h * (logo.width / logo.height)
    ctx.drawImage(logo, x, 26 * S, w, h)
    x += w + 22 * S
  } else x += 8 * S
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '800 ' + titleSize + 'px ' + FONT
  ctx.fillText(clipTo(ctx, o.title, W - PAD - x), x, 60 * S)
  ctx.fillStyle = '#66666E'
  ctx.font = '500 ' + subSize + 'px ' + FONT
  ctx.fillText(clipTo(ctx, o.subtitle, W - PAD - x), x, 60 * S + titleSize + 8 * S)
  return Math.max(118 * S, 60 * S + titleSize + 8 * S + 16 * S)
}

function drawFooterRule(ctx: CanvasRenderingContext2D, W: number, PAD: number, y: number): void {
  ctx.strokeStyle = 'rgba(60,60,67,.12)'
  ctx.beginPath(); ctx.moveTo(PAD, y + .5); ctx.lineTo(W - PAD, y + .5); ctx.stroke()
  ctx.fillStyle = '#8A8A90'
  ctx.font = '500 12px ' + FONT
}

/**
 * Draw "room · lead" as one meta line where the LEAD is always bold.
 * align 'right' composes the segments from the right edge; 'left' from x.
 */
function drawRoomLead(
  ctx: CanvasRenderingContext2D,
  room: string,
  lead: string,
  x: number,
  y: number,
  opts: { align: 'left' | 'right'; size: number; roomColor?: string; leadColor?: string },
): void {
  const size = opts.size
  const roomColor = opts.roomColor || '#66666E'
  const leadColor = opts.leadColor || '#3C3C43'
  const sep = room && lead ? ' · ' : ''
  const roomFont = '600 ' + size + 'px ' + FONT
  const sepFont = '600 ' + size + 'px ' + FONT
  const leadFont = '700 ' + size + 'px ' + FONT
  ctx.font = roomFont
  const wr = room ? ctx.measureText(room).width : 0
  ctx.font = sepFont
  const ws = sep ? ctx.measureText(sep).width : 0
  ctx.font = leadFont
  const wl = lead ? ctx.measureText(lead).width : 0
  let cx = opts.align === 'right' ? x - (wr + ws + wl) : x
  if (room) {
    ctx.font = roomFont
    ctx.fillStyle = roomColor
    ctx.fillText(room, cx, y)
    cx += wr
  }
  if (sep) {
    ctx.font = sepFont
    ctx.fillStyle = roomColor
    ctx.fillText(sep, cx, y)
    cx += ws
  }
  if (lead) {
    ctx.font = leadFont
    ctx.fillStyle = leadColor
    ctx.fillText(lead, cx, y)
  }
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
  /* zoom: fonts + vertical rhythm scale by S, width grows less, so text
     reads bigger relative to the sheet without changing the design */
  const S = Math.max(1, Math.min(2, o.zoom || 1))
  const W = Math.round(1320 * (1 + (S - 1) * 0.45))
  const PAD = Math.round(48 * S)
  const DAY_LABEL_W = Math.round(72 * S)
  const HEADER_H = Math.round(118 * S)
  const HOUR_HEAD_H = Math.round(48 * S)
  /* v4.7: compact chips stacked vertically when simultaneous (matches the web grid) */
  const CHIP_H = Math.round(56 * S)
  const CHIP_GAP = Math.round(4 * S)
  const ROW_PAD = Math.round(6 * S)
  const ROW_H_EMPTY = Math.round(44 * S)
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

  const legendH = Math.round(30 * S)
  const roomsH = o.rooms ? Math.round(30 * S) : 0

  /* First pass: cluster + lane packing per day (same model as the web grid):
     simultaneous events share a lane side by side, staggered ones stack. */
  type DayLayout = { evs: ParsedExport[]; placements: ReturnType<typeof packDayChips>; lanes: number; rowH: number; y: number }
  const dayLayouts: DayLayout[] = []
  let cursorY = HEADER_H + HOUR_HEAD_H
  for (const d of DAY_KEYS) {
    const evs = (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin)
    const placements = evs.length ? packDayChips(evs) : []
    const lanes = lanesOf(placements)
    const rowH = evs.length
      ? ROW_PAD * 2 + lanes * CHIP_H + (lanes - 1) * CHIP_GAP
      : ROW_H_EMPTY
    dayLayouts.push({ evs, placements, lanes, rowH, y: cursorY })
    cursorY += rowH
  }
  const gridH = cursorY - (HEADER_H + HOUR_HEAD_H)
  const H = HEADER_H + HOUR_HEAD_H + gridH + legendH + roomsH + Math.round(40 * S)

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
    const h = 60 * S
    const w = h * (logo.width / logo.height)
    ctx.drawImage(logo, x, 24 * S, w, h)
    x += w + 22 * S
  } else x += 8 * S
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '800 ' + 30 * S + 'px ' + FONT
  ctx.fillText(o.title, x, 60 * S)
  ctx.fillStyle = '#66666E'
  ctx.font = '500 ' + 15 * S + 'px ' + FONT
  ctx.fillText(o.subtitle, x, 86 * S)

  // Hour header row
  const ty = HEADER_H
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '700 ' + 16 * S + 'px ' + FONT
  /* hour labels sit ON the vertical line marking the start of each hour */
  ctx.textAlign = 'center'
  hours.forEach((h, i) => {
    ctx.fillText(pad2(h) + ':00', PAD + DAY_LABEL_W + i * HOUR_W, ty + HOUR_HEAD_H / 2 + 6 * S)
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
    ctx.font = '700 ' + 15 * S + 'px ' + FONT
    ctx.textAlign = 'center'
    ctx.fillText(d.toUpperCase(), PAD + DAY_LABEL_W / 2, y + rowH / 2 + 5 * S)
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

    // Event chips: simultaneous events stack one on top of the other, each
    // using the full width of its time span (side-by-side is poster-only).
    for (const p of lay.placements) {
      const e = p.ev
      const startOffset = e.startMin - START_HOUR * 60 + p.leftMin
      const chipLeft = PAD + DAY_LABEL_W + (startOffset / 60) * HOUR_W
      const chipW = (p.widthMin / 60) * HOUR_W
      const cx = chipLeft + 3
      const cw = chipW - 6
      const cy = y + ROW_PAD + p.lane * (CHIP_H + CHIP_GAP)
      const ch = CHIP_H

      const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
      ctx.fillStyle = tone.bg
      rrPath(ctx, cx, cy, cw, ch, 8 * S)
      ctx.fill()
      ctx.strokeStyle = tone.line
      ctx.lineWidth = 1
      rrPath(ctx, cx, cy, cw, ch, 8 * S)
      ctx.stroke()

      /* slim accent bar on the left edge, clipped to the chip */
      ctx.save()
      rrPath(ctx, cx, cy, cw, ch, 8 * S)
      ctx.clip()
      ctx.globalAlpha = .45
      ctx.fillStyle = tone.txt
      ctx.fillRect(cx, cy + 5 * S, 4 * S, ch - 10 * S)
      ctx.restore()
      ctx.globalAlpha = 1

      ctx.fillStyle = tone.txt
      // Line 1: level/club name
      ctx.font = '800 ' + 13.5 * S + 'px ' + FONT
      ctx.fillText(clipTo(ctx, e.item.code, cw - 26 * S), cx + 15 * S, cy + 20 * S)
      // Line 2: hours · room
      ctx.font = '600 ' + 11 * S + 'px ' + FONT
      const hoursRoom = e.label + (e.item.room ? ' · ' + e.item.room : '')
      ctx.fillText(clipTo(ctx, hoursRoom, cw - 26 * S), cx + 15 * S, cy + 35 * S)
      // Line 3: teacher/lead, always bold
      if (e.item.lead) {
        ctx.font = '700 ' + 11 * S + 'px ' + FONT
        ctx.globalAlpha = 0.9
        ctx.fillText(clipTo(ctx, e.item.lead, cw - 26 * S), cx + 15 * S, cy + 49 * S)
        ctx.globalAlpha = 1
      }
    }
  })

  // Legend
  const legendY = ty + HOUR_HEAD_H + gridH + Math.round(22 * S)
  ctx.font = '600 ' + 13 * S + 'px ' + FONT
  let lx = PAD
  ctx.textAlign = 'left'
  o.legend.forEach(l => {
    const tone = TONE_RGB[toneIdx(l.tone)]
    ctx.fillStyle = tone.txt
    ctx.beginPath(); ctx.arc(lx + 5 * S, legendY - 4 * S, 5 * S, 0, 7); ctx.fill()
    ctx.fillStyle = '#66666E'
    ctx.fillText(clipTo(ctx, l.label, 200 * S), lx + 16 * S, legendY)
    lx += 22 * S + ctx.measureText(clipTo(ctx, l.label, 200 * S)).width + 26 * S
  })

  // Rooms line
  if (o.rooms) {
    ctx.fillStyle = '#A6A6AD'
    ctx.font = '500 ' + 12 * S + 'px ' + FONT
    ctx.fillText(o.rooms, PAD, legendY + 26 * S)
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
  S = 1,
): void {
  ctx.font = '600 ' + 13.5 * S + 'px ' + FONT
  let lx = PAD
  ctx.textAlign = 'left'
  for (const l of legend) {
    const tone = TONE_RGB[toneIdx(l.tone)]
    if (lx > W - PAD - 60 * S) break // never overflow the right margin
    ctx.fillStyle = tone.txt
    ctx.beginPath(); ctx.arc(lx + 5 * S, y - 4 * S, 5 * S, 0, 7); ctx.fill()
    const label = clipTo(ctx, l.label, 200 * S)
    ctx.fillStyle = '#66666E'
    ctx.fillText(label, lx + 16 * S, y)
    lx += 22 * S + ctx.measureText(label).width + 26 * S
  }
}

/**
 * Poster variant: A4-portrait session blocks grouped by day. Bold, wall-ready.
 * v4.9: larger blocks and type so it reads close-up, not zoomed out.
 * v4.10: sessions happening at the same time share ONE row: the time prints
 * once on the left and the session blocks sit next to each other, so the
 * design stays clean and the time never repeats.
 */
export async function renderPosterPNG(o: ExportOptions): Promise<Blob | null> {
  const logo = await loadLogo()
  const parsed = parseExportItems(o.items)
  const byDay = groupByDay(parsed)

  /* zoom: fonts + block rhythm scale by S, width grows less */
  const S = Math.max(1, Math.min(2, o.zoom || 1))
  const W = Math.round(1240 * (1 + (S - 1) * 0.35))
  const PAD = Math.round(56 * S)
  const BLOCK_H = Math.round(64 * S)
  const BLOCK_GAP = Math.round(10 * S)
  const DAY_HEAD_H = Math.round(38 * S)
  const DAY_GAP = Math.round(30 * S)
  const TIME_W = Math.round(190 * S) // left column reserved for the time label

  const days = DAY_KEYS.map((d) => ({
    d,
    evs: (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin),
  }))

  // measure
  let H = Math.round((118 + 20) * S)
  for (const day of days) H += DAY_HEAD_H + Math.max(1, day.evs.length) * (BLOCK_H + BLOCK_GAP) + DAY_GAP - BLOCK_GAP
  H += Math.round(62 * S + (o.legend.length ? 36 * S : 0))

  const SCALE = 2
  const cv = document.createElement('canvas')
  cv.width = W * SCALE
  cv.height = H * SCALE
  const ctx = cv.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const headEnd = drawHeader(ctx, o, logo, W, PAD, 34 * S, 16 * S, 64 * S, S)
  ctx.strokeStyle = 'rgba(60,60,67,.14)'
  ctx.beginPath(); ctx.moveTo(PAD, headEnd + 2); ctx.lineTo(W - PAD, headEnd + 2); ctx.stroke()

  let y = headEnd + Math.round(20 * S)
  for (const day of days) {
    // day head
    ctx.fillStyle = '#1C1C1E'
    ctx.font = '800 ' + 19 * S + 'px ' + FONT
    ctx.fillText(day.d.toUpperCase(), PAD, y + 16 * S)
    ctx.fillStyle = '#A6A6AD'
    ctx.font = '600 ' + 13 * S + 'px ' + FONT
    const countTxt = day.evs.length ? day.evs.length + (day.evs.length === 1 ? ' session' : ' sessions') : ''
    ctx.textAlign = 'right'
    ctx.fillText(countTxt, W - PAD, y + 16 * S)
    ctx.textAlign = 'left'
    y += DAY_HEAD_H

    if (!day.evs.length) {
      ctx.fillStyle = '#B9B9C0'
      ctx.font = '600 ' + 14 * S + 'px ' + FONT
      ctx.fillText('No sessions', PAD + 4 * S, y + 20 * S)
      y += BLOCK_H
    } else {
      // cluster sessions that share the exact same time slot
      type Cluster = { label: string; evs: ParsedExport[] }
      const clusters: Cluster[] = []
      for (const e of day.evs) {
        const last = clusters[clusters.length - 1]
        if (last && last.label === e.label) last.evs.push(e)
        else clusters.push({ label: e.label, evs: [e] })
      }

      for (const cl of clusters) {
        const n = cl.evs.length
        const rowW = W - PAD * 2

        if (n === 1) {
          /* classic single row: time | name | room · lead */
          const e = cl.evs[0]
          const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
          ctx.fillStyle = tone.bg
          rrPath(ctx, PAD, y, rowW, BLOCK_H, 12 * S)
          ctx.fill()
          ctx.strokeStyle = tone.line
          ctx.lineWidth = 1
          rrPath(ctx, PAD, y, rowW, BLOCK_H, 12 * S)
          ctx.stroke()

          // accent bar
          ctx.save()
          rrPath(ctx, PAD, y, rowW, BLOCK_H, 12 * S)
          ctx.clip()
          ctx.globalAlpha = .5
          ctx.fillStyle = tone.txt
          ctx.fillRect(PAD, y + 8 * S, 5 * S, BLOCK_H - 16 * S)
          ctx.restore()
          ctx.globalAlpha = 1

          const cy = y + BLOCK_H / 2
          ctx.fillStyle = tone.txt
          ctx.font = '800 ' + 15 * S + 'px ' + FONT
          ctx.fillText(e.label, PAD + 22 * S, cy + 5 * S)

          const nx = PAD + 22 * S + TIME_W
          ctx.fillStyle = '#1C1C1E'
          ctx.font = '800 ' + 17 * S + 'px ' + FONT
          ctx.fillText(clipTo(ctx, e.item.code, W - PAD * 2 - Math.round(400 * S)), nx, cy + 6 * S)

          // room normal · lead bold, composed from the right edge
          ctx.font = '600 ' + 13.5 * S + 'px ' + FONT
          const metaRoom = e.item.room || ''
          const metaLead = e.item.lead || ''
          const avail = Math.round(340 * S)
          const clippedLead = metaLead ? clipTo(ctx, metaLead, avail - (metaRoom ? ctx.measureText(metaRoom).width + 14 * S : 0)) : ''
          drawRoomLead(ctx, metaRoom, clippedLead, W - PAD - 18 * S, cy + 5 * S, { align: 'right', size: 13.5 * S })
        } else {
          /* shared row: time printed ONCE, blocks side by side */
          const tone0 = TONE_RGB[toneIdx(cl.evs[0].item.tone)] || TONE_RGB[0]
          ctx.fillStyle = tone0.txt
          ctx.font = '800 ' + 15 * S + 'px ' + FONT
          ctx.fillText(cl.label, PAD + 22 * S, y + BLOCK_H / 2 + 5 * S)

          const blocksX = PAD + 22 * S + TIME_W
          const blocksW = W - PAD - 18 * S - blocksX
          const innerGap = Math.round(10 * S)
          const bw = (blocksW - innerGap * (n - 1)) / n
          cl.evs.forEach((e, i) => {
            const bx = blocksX + i * (bw + innerGap)
            const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
            ctx.fillStyle = tone.bg
            rrPath(ctx, bx, y, bw, BLOCK_H, 12 * S)
            ctx.fill()
            ctx.strokeStyle = tone.line
            ctx.lineWidth = 1
            rrPath(ctx, bx, y, bw, BLOCK_H, 12 * S)
            ctx.stroke()

            // accent bar
            ctx.save()
            rrPath(ctx, bx, y, bw, BLOCK_H, 12 * S)
            ctx.clip()
            ctx.globalAlpha = .5
            ctx.fillStyle = tone.txt
            ctx.fillRect(bx, y + 8 * S, 5 * S, BLOCK_H - 16 * S)
            ctx.restore()
            ctx.globalAlpha = 1

            // name + room · bold lead stacked inside the block
            const padL = Math.round(16 * S)
            ctx.fillStyle = '#1C1C1E'
            ctx.font = '800 ' + 15.5 * S + 'px ' + FONT
            ctx.fillText(clipTo(ctx, e.item.code, bw - padL * 2 - 8 * S), bx + padL, y + 27 * S)
            ctx.font = '600 ' + 12.5 * S + 'px ' + FONT
            const metaRoom = e.item.room || ''
            const metaLead = e.item.lead || ''
            const avail2 = bw - padL * 2 - 8 * S
            const clippedLead2 = metaLead ? clipTo(ctx, metaLead, avail2 - (metaRoom ? ctx.measureText(metaRoom).width + 12 * S : 0)) : ''
            drawRoomLead(ctx, metaRoom, clippedLead2, bx + padL, y + 46 * S, { align: 'left', size: 12.5 * S })
          })
        }
        y += BLOCK_H + BLOCK_GAP
      }
      y -= BLOCK_GAP
    }
    y += DAY_GAP
  }

  // footer: legend + rooms
  if (o.legend.length) {
    drawLegendRow(ctx, o.legend, y + 10 * S, PAD, W, S)
    y += Math.round(36 * S)
  }
  drawFooterRule(ctx, W, PAD, y + 4 * S)
  ctx.fillStyle = '#8A8A90'
  ctx.font = '500 ' + 12.5 * S + 'px ' + FONT
  ctx.fillText(o.rooms || '', PAD, y + 26 * S)

  return new Promise((res) => cv.toBlob(res, 'image/png'))
}

/**
 * Week strip variant: a symmetric grid of day cards. Four cards on the top
 * row, three centered below; every card lists its sessions as calm rows
 * (tone dot, time, name, room · lead). Equal heights per row keep the whole
 * sheet perfectly symmetric - no hour ruler, no pills, nothing wobbly.
 */
export async function renderWeekStripPNG(o: ExportOptions): Promise<Blob | null> {
  const logo = await loadLogo()
  const parsed = parseExportItems(o.items)
  const byDay = groupByDay(parsed)

  /* zoom: fonts + card rhythm scale by S, width grows less */
  const S = Math.max(1, Math.min(2, o.zoom || 1))
  const W = Math.round(1400 * (1 + (S - 1) * 0.45))
  const PAD = Math.round(52 * S)
  const COLS = 4
  const GAP = Math.round(18 * S)
  const HEAD_H = Math.round(52 * S) // day name + count inside the card
  const ROW_H = Math.round(40 * S) // one session row
  const CARD_PAD = Math.round(12 * S)

  const days = DAY_KEYS.map((d) => ({
    d,
    evs: (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin),
  }))

  const cardW = (W - PAD * 2 - GAP * (COLS - 1)) / COLS
  const rows: (typeof days)[] = []
  for (let i = 0; i < days.length; i += COLS) rows.push(days.slice(i, i + COLS))
  // every card in a row shares the tallest card's height: symmetric rows
  const rowHs = rows.map((r) =>
    Math.max(...r.map((day) => HEAD_H + Math.max(1, day.evs.length) * ROW_H + CARD_PAD * 2)),
  )

  const gridH = rowHs.reduce((s, h) => s + h + GAP, -GAP)
  const H = Math.round((118 + 24) * S) + gridH + Math.round(72 * S) + (o.legend.length ? Math.round(36 * S) : 0)

  const SCALE = 2
  const cv = document.createElement('canvas')
  cv.width = W * SCALE
  cv.height = H * SCALE
  const ctx = cv.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const headEnd = drawHeader(ctx, o, logo, W, PAD, 34 * S, 16 * S, 64 * S, S)

  let y = headEnd + Math.round(24 * S)
  rows.forEach((row, ri) => {
    const rowH = rowHs[ri]
    // center the cards of this row (last row has fewer cards)
    const total = row.length * cardW + (row.length - 1) * GAP
    let x = (W - total) / 2

    for (const day of row) {
      const n = Math.max(1, day.evs.length)
      const bodyH = HEAD_H + n * ROW_H + CARD_PAD * 2

      // card
      ctx.fillStyle = '#FBFCFE'
      rrPath(ctx, x, y, cardW, rowH, 16 * S)
      ctx.fill()
      ctx.strokeStyle = 'rgba(60,60,67,.12)'
      ctx.lineWidth = 1
      rrPath(ctx, x, y, cardW, rowH, 16 * S)
      ctx.stroke()

      // day head, centered
      ctx.textAlign = 'center'
      ctx.fillStyle = day.evs.length ? '#1C1C1E' : '#B9B9C0'
      ctx.font = '800 ' + 14.5 * S + 'px ' + FONT
      ctx.fillText(DAY_FULL[day.d] || day.d, x + cardW / 2, y + 22 * S)
      ctx.fillStyle = day.evs.length ? '#8A8A90' : '#C7C7CC'
      ctx.font = '600 ' + 11 * S + 'px ' + FONT
      ctx.fillText(day.evs.length ? day.evs.length + (day.evs.length === 1 ? ' session' : ' sessions') : 'free day', x + cardW / 2, y + 38 * S)
      ctx.textAlign = 'left'

      // head divider
      ctx.strokeStyle = 'rgba(60,60,67,.08)'
      ctx.beginPath(); ctx.moveTo(x + 14 * S, y + HEAD_H - 6 * S + .5); ctx.lineTo(x + cardW - 14 * S, y + HEAD_H - 6 * S + .5); ctx.stroke()

      if (!day.evs.length) {
        ctx.fillStyle = '#B9B9C0'
        ctx.font = '600 ' + 12.5 * S + 'px ' + FONT
        ctx.textAlign = 'center'
        ctx.fillText('No sessions', x + cardW / 2, y + HEAD_H + ROW_H / 2 + 4 * S)
        ctx.textAlign = 'left'
      } else {
        day.evs.forEach((e, i2) => {
          const ry = y + HEAD_H + 6 * S + i2 * ROW_H
          const cy = ry + ROW_H / 2
          const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]

          // tone dot
          ctx.fillStyle = tone.txt
          ctx.beginPath(); ctx.arc(x + 20 * S, cy - 8 * S, 3.5 * S, 0, 7); ctx.fill()

          // line 1: time (tone) + room right
          ctx.fillStyle = tone.txt
          ctx.font = '800 ' + 11.5 * S + 'px ' + FONT
          ctx.fillText(e.label, x + 30 * S, cy - 4 * S)
          if (e.item.room) {
            ctx.fillStyle = '#8A8A90'
            ctx.font = '600 ' + 10.5 * S + 'px ' + FONT
            ctx.textAlign = 'right'
            ctx.fillText(clipTo(ctx, e.item.room, 120 * S), x + cardW - 16 * S, cy - 4 * S)
            ctx.textAlign = 'left'
          }

          // line 2: name ( + bold lead )
          ctx.fillStyle = '#1C1C1E'
          ctx.font = '700 ' + 12.5 * S + 'px ' + FONT
          const nameW = cardW - 30 * S - 16 * S - (e.item.lead ? 90 * S : 0)
          ctx.fillText(clipTo(ctx, e.item.code, nameW), x + 30 * S, cy + 12 * S)
          if (e.item.lead) {
            ctx.fillStyle = '#636368'
            ctx.font = '700 ' + 10.5 * S + 'px ' + FONT
            ctx.textAlign = 'right'
            ctx.fillText(clipTo(ctx, e.item.lead, 90 * S), x + cardW - 16 * S, cy + 12 * S)
            ctx.textAlign = 'left'
          }

          // row hairline
          if (i2 < day.evs.length - 1) {
            ctx.strokeStyle = 'rgba(60,60,67,.05)'
            ctx.beginPath(); ctx.moveTo(x + 14 * S, ry + ROW_H - 2 * S + .5); ctx.lineTo(x + cardW - 14 * S, ry + ROW_H - 2 * S + .5); ctx.stroke()
          }
        })
      }
      x += cardW + GAP
    }
    y += rowH + GAP
  })

  // footer: legend + rooms
  let fy = y - GAP + 16 * S
  if (o.legend.length) {
    drawLegendRow(ctx, o.legend, fy, PAD, W, S)
    fy += Math.round(36 * S)
  }
  drawFooterRule(ctx, W, PAD, fy + 2 * S)
  ctx.fillStyle = '#8A8A90'
  ctx.font = '500 ' + 12.5 * S + 'px ' + FONT
  ctx.fillText(o.rooms || '', PAD, fy + 24 * S)

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
