import { DAY_FULL, DAY_KEYS, ROOM_UNAVAILABLE } from './constants'
import { fmt12Min, isoOf, parseSlot, roomOptionsFor } from './app-utils'
import { MUTED, load, siteFonts, wrap } from './clubs-calendar-export'
import { closedHoliday } from './holidays'
import { MONTH_THEMES } from './month-themes'
import { paintBackdrop, paintFooter, paintHeader } from './month-frame'
import { monthOccurrences } from './month-export'
import { ACTIVITY, STATUS } from './activity-colors'
import type { State } from './types'

/* Rooms in the month picture: every day box says which rooms are free.
   room = null: the overview (a colored pill for each room); room = "Main Hall": that room's bookings and free time. */
const OPEN = 9 * 60
const CLOSE = 18 * 60
const GRAY = '#7A7A85'
const INKS = { class: ACTIVITY.class.ink, club: ACTIVITY.club.ink, event: ACTIVITY.event.ink }
const ROUND_CLOSED = (r: string, dk: string) => ROOM_UNAVAILABLE[r]?.includes(dk)

export interface Slot {
  start: number
  end: number
  name: string
  kind: 'class' | 'club' | 'event'
}

const endOf = (time: string, start: number) => {
  const m = /-(\d{1,2}):(\d{2})/.exec(time || '')
  return m ? +m[1] * 60 + +m[2] : start + 120
}

function freeWindows(slots: Slot[]): [number, number][] {
  const out: [number, number][] = []
  let cur = OPEN
  for (const s of slots.slice().sort((a, b) => a.start - b.start)) {
    if (s.start > cur) out.push([cur, s.start])
    cur = Math.max(cur, s.end)
  }
  if (cur < CLOSE) out.push([cur, Math.max(cur, CLOSE)])
  return out.filter(([a, b]) => b - a >= 30)
}

export type RoomStatus = 'free' | 'part' | 'booked' | 'closed'

/* free: nothing booked; partially booked: booked for less than half of the open day; booked: half the day or more */
export function roomStatus(slots: Slot[], closed: boolean): RoomStatus {
  if (closed) return 'closed'
  if (!slots.length) return 'free'
  const free = freeWindows(slots).reduce((a, [s, e]) => a + (e - s), 0)
  const used = CLOSE - OPEN - free
  return used < (CLOSE - OPEN) / 2 ? 'part' : 'booked'
}

export async function renderRoomsMonth(state: State, o: { year: number; month: number; transparent?: boolean; scale?: number }, room: string | null = null): Promise<HTMLCanvasElement> {
  const [logo, f] = await Promise.all([load('/aso-logo.webp'), siteFonts()])
  const theme = MONTH_THEMES[o.month]
  const W = 3200
  const H = 1800
  const M = 80
  const TOP = 250
  const FOOT = 128
  const occ = monthOccurrences(state, { year: o.year, month: o.month, clubs: true, events: true, classes: true })
  const rooms = roomOptionsFor(state).filter((r) => r !== 'Online')
  const shownRooms = room ? [room] : rooms

  const canvas = document.createElement('canvas')
  const dpr = o.scale || 1
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  const g = canvas.getContext('2d')!
  g.scale(dpr, dpr)
  paintBackdrop(g, theme, o.month, W, H, o.transparent ? 'none' : 'all')
  paintHeader(g, f, theme, o.year, [room ? room.toUpperCase() : 'ROOMS'])

  const first = new Date(o.year, o.month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(o.year, o.month + 1, 0).getDate()
  const weeks = Math.ceil((lead + days) / 7)
  const gridX = M
  const gridW = W - M * 2
  const colW = gridW / 7
  const LEG = 70
  const gridTop = TOP + 70
  const gridBottom = H - FOOT - LEG
  /* one-room view: the text size is the biggest that lets the fullest week fit; overview rows are all equal */
  const dayModel = (day: number, sc: number) => {
    const iso = isoOf(new Date(o.year, o.month, day))
    const dk = DAY_KEYS[(lead + day - 1) % 7]
    const list = (occ.get(iso) || []).filter((x) => !x.off)
    const slots: Slot[] = room
      ? list.filter((x) => !x.outside && x.place === room).map((x) => ({ start: parseSlot(x.time).mins, end: endOf(x.time, parseSlot(x.time).mins), name: x.title, kind: x.kind })).sort((a, b) => a.start - b.start)
      : []
    const closedRoom = !!(room && ROOM_UNAVAILABLE[room]?.includes(dk))
    const free = freeWindows(slots)
    g.font = `800 ${Math.round(32 * sc)}px ${f.body}`
    const lines = slots.map((x) => wrap(g, x.name, colW - 40, 3))
    const h = 58 + lines.reduce((a, l) => a + l.length * 36 * sc + 40 * sc + 6, 0) + (free.length ? Math.max(1, Math.min(2, free.length)) * 36 * sc : 36 * sc) + 14
    return { slots, lines, free, closedRoom, h }
  }
  let sc = 1
  if (room) {
    const need = (k: number) => {
      let tot = 0
      for (let w = 0; w < weeks; w++) {
        let mx = 150
        for (let c = 0; c < 7; c++) {
          const day = w * 7 + c - lead + 1
          if (day >= 1 && day <= days) mx = Math.max(mx, dayModel(day, k).h)
        }
        tot += mx
      }
      return tot
    }
    while (need(sc) > gridBottom - gridTop && sc > 0.5) sc = Math.round((sc - 0.04) * 100) / 100
  }
  const rowHs: number[] = Array.from({ length: weeks }, (_, w) => {
    if (!room) return (gridBottom - gridTop) / weeks
    let mx = 150
    for (let c = 0; c < 7; c++) {
      const day = w * 7 + c - lead + 1
      if (day >= 1 && day <= days) mx = Math.max(mx, dayModel(day, sc).h)
    }
    return mx
  })
  if (room) {
    const spare = Math.max(0, gridBottom - gridTop - rowHs.reduce((a, b) => a + b, 0))
    for (let w = 0; w < weeks; w++) rowHs[w] += spare / weeks
  }
  const rowTops = rowHs.map((_, w) => gridTop + rowHs.slice(0, w).reduce((a, b) => a + b, 0))

  /* weekday header and lines */
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  g.font = `800 40px ${f.display}`
  g.fillStyle = theme.accent
  DAY_KEYS.forEach((d, i) => g.fillText(DAY_FULL[d] || d, gridX + colW * i + colW / 2, TOP + 34))
  g.strokeStyle = theme.accent + '55'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(gridX, TOP + 70)
  g.lineTo(gridX + gridW, TOP + 70)
  g.moveTo(gridX, TOP + 62)
  g.lineTo(gridX + gridW, TOP + 62)
  g.stroke()
  g.strokeStyle = theme.accent + '40'
  g.lineWidth = 2
  for (let i = 1; i < 7; i++) {
    g.beginPath()
    g.moveTo(gridX + colW * i, gridTop)
    g.lineTo(gridX + colW * i, gridBottom)
    g.stroke()
  }
  for (let w = 1; w < weeks; w++) {
    g.beginPath()
    g.moveTo(gridX, rowTops[w])
    g.lineTo(gridX + gridW, rowTops[w])
    g.stroke()
  }

  const todayIso = isoOf(new Date())
  for (let day = 1; day <= days; day++) {
    const idx = lead + day - 1
    const col = idx % 7
    const row = Math.floor(idx / 7)
    const x = gridX + colW * col
    const y = rowTops[row]
    const rowH = rowHs[row]
    const d = new Date(o.year, o.month, day)
    const iso = isoOf(d)
    const dk = DAY_KEYS[col]
    /* date number */
    g.textAlign = 'left'
    g.textBaseline = 'top'
    g.font = `800 36px ${f.body}`
    g.fillStyle = iso === todayIso ? theme.accent : MUTED
    g.fillText(String(day), x + 16, y + 12)
    const hol = closedHoliday(iso)
    const list = (occ.get(iso) || []).filter((s) => !s.off)
    const slotsOf = (r: string): Slot[] =>
      list
        .filter((s) => !s.outside && s.place === r)
        .map((s) => ({ start: parseSlot(s.time).mins, end: endOf(s.time, parseSlot(s.time).mins), name: s.title, kind: s.kind }))
    if (hol) {
      /* the whole day is closed */
      g.save()
      g.beginPath()
      g.rect(x + 1, y + 1, colW - 2, rowH - 2)
      g.clip()
      g.globalAlpha = 0.3
      g.strokeStyle = theme.accent
      g.lineWidth = 3
      for (let k = -rowH; k < colW + rowH; k += 26) {
        g.beginPath()
        g.moveTo(x + k, y + rowH)
        g.lineTo(x + k + rowH, y)
        g.stroke()
      }
      g.restore()
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillStyle = MUTED
      g.font = `800 38px ${f.body}`
      g.fillText('Space closed', x + colW / 2, y + rowH / 2 + 10)
      g.font = `700 30px ${f.body}`
      g.fillStyle = theme.title
      g.fillText(hol.name, x + colW / 2, y + rowH - 30, colW - 30)
      continue
    }
    if (!room) {
      /* overview: one thin timeline for each room, 9 AM to 6 PM. Green is free time, a colored block is an activity. */
      const rowsN = shownRooms.length
      const areaTop = y + 60
      const gap = 8
      const rh = Math.min(46, (rowH - 60 - 14 - gap * (rowsN - 1)) / rowsN)
      const lx = x + 16
      const tx = x + 92
      const tw = colW - 92 - 18
      const SHORT: Record<string, string> = { 'Main Hall': 'Hall', Library: 'Library' }
      shownRooms.forEach((r, n) => {
        const ry = areaTop + n * (rh + gap)
        const closed = !!ROUND_CLOSED(r, dk)
        g.textAlign = 'left'
        g.textBaseline = 'middle'
        g.font = `800 ${Math.round(rh * 0.5)}px ${f.body}`
        g.fillStyle = closed ? STATUS.closed.ink : '#2a2a31'
        g.fillText(SHORT[r] || r.replace('Room ', 'Room '), lx, ry + rh / 2 + 1, 74)
        g.beginPath()
        g.roundRect(tx, ry, tw, rh, rh / 2)
        if (closed) {
          g.fillStyle = STATUS.closed.tint
          g.fill()
          g.save()
          g.clip()
          g.strokeStyle = STATUS.closed.ink + '88'
          g.lineWidth = 3
          for (let k = -rh; k < tw + rh; k += 14) {
            g.beginPath()
            g.moveTo(tx + k, ry + rh)
            g.lineTo(tx + k + rh, ry)
            g.stroke()
          }
          g.restore()
          return
        }
        g.fillStyle = STATUS.free.tint
        g.fill()
        g.save()
        g.beginPath()
        g.roundRect(tx, ry, tw, rh, rh / 2)
        g.clip()
        for (const sl of slotsOf(r)) {
          const a0 = Math.max(OPEN, sl.start)
          const a1 = Math.min(CLOSE, Math.max(sl.end, sl.start + 30))
          g.fillStyle = ACTIVITY[sl.kind].ink
          g.fillRect(tx + ((a0 - OPEN) / (CLOSE - OPEN)) * tw, ry, Math.max(6, ((a1 - a0) / (CLOSE - OPEN)) * tw), rh)
        }
        g.restore()
      })
    } else {
      /* one room: what is in it, then the free time */
      const m = dayModel(day, sc)
      if (m.closedRoom) {
        g.font = `800 ${Math.round(34 * sc)}px ${f.body}`
        g.fillStyle = MUTED
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText('Not available', x + colW / 2, y + rowH / 2 + 10)
        continue
      }
      let ty = y + 58
      g.textAlign = 'left'
      g.textBaseline = 'top'
      m.slots.forEach((sl, i) => {
        g.fillStyle = INKS[sl.kind]
        g.font = `800 ${Math.round(32 * sc)}px ${f.body}`
        m.lines[i].forEach((l) => {
          g.fillText(l, x + 18, ty)
          ty += 36 * sc
        })
        g.font = `700 ${Math.round(28 * sc)}px ${f.body}`
        g.fillText(`${fmt12Min(sl.start)} - ${fmt12Min(sl.end)}`, x + 18, ty)
        ty += 40 * sc + 6
      })
      g.font = `800 ${Math.round(30 * sc)}px ${f.body}`
      g.fillStyle = STATUS.free.ink
      if (!m.free.length) {
        g.fillStyle = GRAY
        g.fillText('Booked all day', x + 18, ty)
      } else if (!m.slots.length) g.fillText('Free all day', x + 18, ty)
      else m.free.slice(0, 2).forEach(([a, b2]) => {
        g.fillText(`Free ${fmt12Min(a)} - ${fmt12Min(b2)}`, x + 18, ty, colW - 30)
        ty += 36 * sc
      })
    }
  }

  /* legend */
  const ly = gridBottom + LEG / 2 + 6
  const items: [string, string][] = room
    ? [[STATUS.free.ink, 'Free'], [INKS.class, 'Class'], [INKS.club, 'Club'], [INKS.event, 'Event']]
    : [[STATUS.free.tint, 'Free'], [ACTIVITY.class.ink, 'Class'], [ACTIVITY.club.ink, 'Club'], [ACTIVITY.event.ink, 'Event'], [STATUS.closed.ink, 'Closed']]
  g.font = `700 32px ${f.body}`
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  const widths = items.map(([, t]) => g.measureText(t).width + 78)
  let lx = (W - widths.reduce((a, b) => a + b, 0)) / 2
  items.forEach(([c, t], i) => {
    g.fillStyle = c
    g.beginPath()
    g.roundRect(lx, ly - 12, 34, 24, 12)
    g.fill()
    g.fillStyle = '#3a3a42'
    g.fillText(t, lx + 46, ly + 1)
    lx += widths[i]
  })
  paintFooter(g, f, logo, state.settings.institute, W, H, gridBottom + LEG)
  return canvas
}

export async function downloadRoomsMonth(state: State, o: { year: number; month: number }, room: string | null = null): Promise<boolean> {
  const canvas = await renderRoomsMonth(state, o, room)
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ASO_Rooms_${o.year}-${String(o.month + 1).padStart(2, '0')}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}

/* the clickable day boxes of the overview picture, as fractions of the picture (it is always 3200 x 1800) */
export function roomsCells(year: number, month: number): { day: number; iso: string; x: number; y: number; w: number; h: number }[] {
  const W = 3200
  const H = 1800
  const M = 80
  const TOP = 250
  const FOOT = 128
  const LEG = 70
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const weeks = Math.ceil((lead + days) / 7)
  const gridTop = TOP + 70
  const gridBottom = H - FOOT - LEG
  const rowH = (gridBottom - gridTop) / weeks
  const colW = (W - M * 2) / 7
  return Array.from({ length: days }, (_, i) => {
    const idx = lead + i
    return { day: i + 1, iso: isoOf(new Date(year, month, i + 1)), x: (M + colW * (idx % 7)) / W, y: (gridTop + rowH * Math.floor(idx / 7)) / H, w: colW / W, h: rowH / H }
  })
}

export interface RoomDay {
  room: string
  closed: boolean
  holiday?: string
  slots: Slot[]
  free: [number, number][]
}

/* what happens outside the space on one date (a park, another venue) */
export function outsideDay(state: State, iso: string): { title: string; kind: 'club' | 'event' | 'class'; place: string; time: string }[] {
  const d = new Date(iso + 'T00:00:00')
  const occ = monthOccurrences(state, { year: d.getFullYear(), month: d.getMonth(), clubs: true, events: true, classes: true })
  return (occ.get(iso) || []).filter((x) => x.outside && !x.off).map((x) => ({ title: x.title, kind: x.kind, place: x.place, time: x.time }))
}

/* what is in each room on one date: bookings and the free hours between them */
export function roomDayDetail(state: State, iso: string): RoomDay[] {
  const d = new Date(iso + 'T00:00:00')
  const occ = monthOccurrences(state, { year: d.getFullYear(), month: d.getMonth(), clubs: true, events: true, classes: true })
  const list = (occ.get(iso) || []).filter((x) => !x.off)
  const dk = DAY_KEYS[(d.getDay() + 6) % 7]
  const hol = closedHoliday(iso)
  return roomOptionsFor(state)
    .filter((r) => r !== 'Online')
    .map((room) => {
      const slots: Slot[] = list
        .filter((x) => !x.outside && x.place === room)
        .map((x) => ({ start: parseSlot(x.time).mins, end: endOf(x.time, parseSlot(x.time).mins), name: x.title, kind: x.kind }))
        .sort((a, b) => a.start - b.start)
      const closed = !!hol || !!ROOM_UNAVAILABLE[room]?.includes(dk)
      return { room, closed, holiday: hol?.name, slots, free: closed ? [] : freeWindows(slots) }
    })
}
