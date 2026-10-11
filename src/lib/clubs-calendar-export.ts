import { DAY_FULL, DAY_KEYS } from './constants'
import { clubDayOrder, fmtTime, hourLabel12, parseSlot } from './app-utils'
import type { Club, State } from './types'

/* Clubs as a calendar, with every poster shown in full (never cropped).
   week     one column per day, the day's posters stacked under its name
   rows     one row per day, the day's posters side by side
   grid     a week timetable on top, the numbered posters below it */
export type ClubsCalendarStyle = 'week' | 'rows' | 'grid'

const FONT = '-apple-system, "Segoe UI", Inter, Arial, sans-serif'
const font = (w: number, px: number) => `${w} ${px}px ${FONT}`
const RATIO = 1200 / 848 // A4 poster, used when a club has none
const PALETTE = ['#0B5CE6', '#AF52DE', '#FF9500', '#34C759', '#FF3B30', '#00A6C7', '#B38600', '#E5488C']

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = src
  })

function wrap(g: CanvasRenderingContext2D, text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (g.measureText(t).width > max && cur) {
      lines.push(cur)
      cur = w
    } else cur = t
  }
  if (cur) lines.push(cur)
  return lines.slice(0, maxLines)
}

/* the poster inside a w-wide box: full image, rounded, thin border. Returns its height. */
function drawPoster(g: CanvasRenderingContext2D, im: HTMLImageElement | null, name: string, x: number, y: number, w: number): number {
  const h = im ? Math.round((w * im.height) / im.width) : Math.round(w * RATIO)
  g.save()
  g.beginPath()
  g.roundRect(x, y, w, h, 16)
  g.clip()
  if (im) g.drawImage(im, x, y, w, h)
  else {
    g.fillStyle = '#eef3fd'
    g.fillRect(x, y, w, h)
    g.fillStyle = '#0b5ce6'
    g.font = font(800, Math.round(w / 12))
    g.textAlign = 'center'
    g.textBaseline = 'top'
    wrap(g, name, w - 60, 4).forEach((l, n) => g.fillText(l, x + w / 2, y + h / 2 - 40 + n * Math.round(w / 10)))
    g.textAlign = 'left'
  }
  g.restore()
  g.strokeStyle = '#d8d8de'
  g.lineWidth = 2
  g.beginPath()
  g.roundRect(x, y, w, h, 16)
  g.stroke()
  return h
}

/* name, then time (blue) and place (bold), centred under a poster. Returns the height used. */
function drawCaption(g: CanvasRenderingContext2D, c: Club, x: number, y: number, w: number, opts: { day?: boolean } = {}): number {
  g.textAlign = 'center'
  g.textBaseline = 'top'
  g.fillStyle = '#1c1c1e'
  g.font = font(800, 34)
  const lines = wrap(g, c.name, w, 2)
  lines.forEach((l, n) => g.fillText(l, x + w / 2, y + n * 40))
  let yy = y + lines.length * 40 + 6
  g.fillStyle = '#0b5ce6'
  g.font = font(600, 27)
  const when = (opts.day ? (c.days || []).map((d) => DAY_FULL[d] || d).join(' and ') + ' · ' : '') + (fmtTime(c.time) || 'Time to be confirmed')
  g.fillText(when, x + w / 2, yy, w)
  yy += 38
  if (c.room) {
    g.fillStyle = '#1c1c1e'
    g.font = font(800, 27)
    g.fillText(c.room, x + w / 2, yy, w)
    yy += 38
  }
  g.textAlign = 'left'
  return yy - y
}

function drawHeader(g: CanvasRenderingContext2D, W: number, logo: HTMLImageElement | null, title: string, sub: string) {
  const LOGO = 120
  g.textBaseline = 'top'
  g.font = font(800, 64)
  const wT = g.measureText(title).width
  g.font = font(500, 34)
  const wS = g.measureText(sub).width
  const gap = logo ? 28 : 0
  const startX = (W - ((logo ? LOGO : 0) + gap + Math.max(wT, wS))) / 2
  const hy = 36
  if (logo) {
    const k = Math.min(LOGO / logo.width, LOGO / logo.height)
    g.drawImage(logo, startX + (LOGO - logo.width * k) / 2, hy + (LOGO - logo.height * k) / 2, logo.width * k, logo.height * k)
  }
  const tx = startX + (logo ? LOGO + gap : 0)
  g.fillStyle = '#1c1c1e'
  g.font = font(800, 64)
  g.fillText(title, tx, hy + 4)
  g.fillStyle = '#5c5c63'
  g.font = font(500, 34)
  g.fillText(sub, tx, hy + 82)
}

const dayName = (d: string) => DAY_FULL[d] || d

export async function renderClubsCalendar(state: State, style: ClubsCalendarStyle): Promise<HTMLCanvasElement | null> {
  const clubs = (state.clubs || []).filter((c) => !c.placeholder && (c.days || []).length).sort((a, b) => clubDayOrder(a) - clubDayOrder(b))
  if (!clubs.length) return null
  const [imgs, logo] = await Promise.all([Promise.all(clubs.map((c) => (c.poster ? load(c.poster) : Promise.resolve(null)))), load('/aso-logo.png')])
  const imgOf = (c: Club) => imgs[clubs.indexOf(c)]
  const M = 72
  const HEAD = 200
  const title = `${state.settings.institute} clubs`
  const sub = `${clubs.length} clubs · weekly calendar · ${state.settings.year}`
  const days = DAY_KEYS.filter((d) => clubs.some((c) => c.days.includes(d)))
  const byDay = (d: string) => clubs.filter((c) => c.days.includes(d)).sort((a, b) => parseSlot(a.time).mins - parseSlot(b.time).mins)

  /* a canvas needs its size before drawing, so every style first measures, then paints */
  const mk = (W: number, H: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const g = canvas.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, W, H)
    drawHeader(g, W, logo, title, sub)
    return { canvas, g }
  }
  const scratch = document.createElement('canvas').getContext('2d')!

  if (style === 'week') {
    const CW = 520
    const GAP = 40
    const DH = 84
    const capH = (c: Club) => (imgOf(c) ? Math.round((CW * imgOf(c)!.height) / imgOf(c)!.width) : Math.round(CW * RATIO))
    const colH = (d: string) => byDay(d).reduce((n, c) => n + capH(c) + 160 + 48, DH + 28)
    const W = M * 2 + days.length * CW + (days.length - 1) * GAP
    const H = HEAD + Math.max(...days.map(colH)) + M
    const { canvas, g } = mk(Math.max(W, 1500), H)
    const offX = (canvas.width - W) / 2
    days.forEach((d, i) => {
      const x = offX + M + i * (CW + GAP)
      g.fillStyle = '#0b5ce6'
      g.beginPath()
      g.roundRect(x, HEAD, CW, DH, 20)
      g.fill()
      g.fillStyle = '#ffffff'
      g.font = font(800, 40)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(dayName(d), x + CW / 2, HEAD + DH / 2 + 2)
      g.textAlign = 'left'
      let y = HEAD + DH + 28
      for (const c of byDay(d)) {
        const h = drawPoster(g, imgOf(c), c.name, x, y, CW)
        y += h + 14
        y += drawCaption(g, c, x, y, CW) + 34
      }
    })
    void scratch
    return canvas
  }

  if (style === 'rows') {
    const CW = 440
    const GAP = 32
    const LABEL = 340
    const PER = 4
    const rowH = (n: number, d: string) => {
      const list = byDay(d)
      const lines = Math.ceil(list.length / PER)
      void n
      return lines * (Math.round(CW * RATIO) + 160 + 36) + 20
    }
    const W = M * 2 + LABEL + PER * CW + (PER - 1) * GAP
    const H = HEAD + days.reduce((n, d) => n + rowH(0, d), 0) + M
    const { canvas, g } = mk(W, H)
    let y = HEAD
    days.forEach((d, di) => {
      const list = byDay(d)
      const rh = rowH(0, d)
      if (di % 2 === 0) {
        g.fillStyle = '#f5f8ff'
        g.fillRect(M / 2, y - 10, W - M, rh)
      }
      g.fillStyle = '#0b5ce6'
      g.font = font(800, 54)
      g.textBaseline = 'top'
      g.fillText(dayName(d), M, y + 24)
      g.fillStyle = '#5c5c63'
      g.font = font(500, 28)
      g.fillText(list.length + (list.length === 1 ? ' club' : ' clubs'), M, y + 92)
      list.forEach((c, i) => {
        const line = Math.floor(i / PER)
        const inLine = Math.min(PER, list.length - line * PER)
        const x = M + LABEL + (i % PER) * (CW + GAP) + ((PER - inLine) * (CW + GAP)) / 2 * 0
        const yy = y + line * (Math.round(CW * RATIO) + 160 + 36)
        const h = drawPoster(g, imgOf(c), c.name, x, yy, CW)
        drawCaption(g, c, x, yy + h + 14, CW)
      })
      y += rh
    })
    return canvas
  }

  /* grid: week timetable (days down, hours across) on top, numbered posters under it */
  const COLS = 4
  const CW = 560
  const GAP = 48
  const W = M * 2 + COLS * CW + (COLS - 1) * GAP
  const mins = clubs.map((c) => parseSlot(c.time).mins)
  const ends = clubs.map((c) => {
    const m = /-(\d{1,2}):(\d{2})/.exec(c.time || '')
    return m ? +m[1] * 60 + +m[2] : parseSlot(c.time).mins + 120
  })
  const h0 = Math.min(9, Math.floor(Math.min(...mins) / 60))
  const h1 = Math.max(18, Math.ceil(Math.max(...ends) / 60))
  const LABEL = 190
  const ROW = 96
  const GRID_H = 70 + DAY_KEYS.length * ROW
  const rows = Math.ceil(clubs.length / COLS)
  const posterH = (c: Club) => (imgOf(c) ? Math.round((CW * imgOf(c)!.height) / imgOf(c)!.width) : Math.round(CW * RATIO))
  const rowH = (r: number) => Math.max(...clubs.slice(r * COLS, r * COLS + COLS).map(posterH)) + 190
  const postersH = Array.from({ length: rows }, (_, r) => rowH(r) + GAP).reduce((a, b) => a + b, 0)
  const H = HEAD + GRID_H + 60 + postersH + M
  const { canvas, g } = mk(W, H)
  const gx = M
  const gw = W - M * 2
  const hw = (gw - LABEL - 56) / (h1 - h0)
  g.fillStyle = '#f5f8ff'
  g.beginPath()
  g.roundRect(gx, HEAD, gw, GRID_H, 20)
  g.fill()
  g.textBaseline = 'middle'
  g.font = font(700, 26)
  g.fillStyle = '#5c5c63'
  for (let h = h0; h <= h1; h++) {
    const x = gx + LABEL + (h - h0) * hw
    g.textAlign = 'center'
    if (h < h1 || true) g.fillText(hourLabel12(h), x, HEAD + 35)
    g.strokeStyle = '#dfe6f5'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x, HEAD + 70)
    g.lineTo(x, HEAD + GRID_H)
    g.stroke()
  }
  DAY_KEYS.forEach((d, i) => {
    const y = HEAD + 70 + i * ROW
    g.textAlign = 'left'
    g.fillStyle = '#1c1c1e'
    g.font = font(800, 30)
    g.fillText(dayName(d), gx + 28, y + ROW / 2)
    g.strokeStyle = '#dfe6f5'
    g.beginPath()
    g.moveTo(gx, y)
    g.lineTo(gx + gw, y)
    g.stroke()
  })
  clubs.forEach((c, n) => {
    const s = parseSlot(c.time).mins
    const e = ends[n]
    c.days.forEach((d) => {
      const i = DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])
      if (i < 0) return
      const x = gx + LABEL + ((s - h0 * 60) / 60) * hw + 4
      const w = ((e - s) / 60) * hw - 8
      const y = HEAD + 70 + i * ROW + 10
      g.fillStyle = PALETTE[n % PALETTE.length]
      g.beginPath()
      g.roundRect(x, y, w, ROW - 20, 14)
      g.fill()
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.arc(x + 30, y + (ROW - 20) / 2, 20, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = PALETTE[n % PALETTE.length]
      g.font = font(800, 24)
      g.textAlign = 'center'
      g.fillText(String(n + 1), x + 30, y + (ROW - 20) / 2 + 1)
      g.fillStyle = '#ffffff'
      g.textAlign = 'left'
      g.font = font(800, 24)
      g.fillText(wrap(g, c.name, w - 80, 1)[0] || '', x + 62, y + 24, w - 76)
      g.font = font(600, 21)
      g.fillText(fmtTime(c.time), x + 62, y + 54, w - 76)
    })
  })
  let y = HEAD + GRID_H + 60
  clubs.forEach((c, n) => {
    const r = Math.floor(n / COLS)
    const x = M + (n % COLS) * (CW + GAP)
    if (n % COLS === 0 && n > 0) y += rowH(r - 1) + GAP
    const h = drawPoster(g, imgOf(c), c.name, x, y, CW)
    g.fillStyle = PALETTE[n % PALETTE.length]
    g.beginPath()
    g.strokeStyle = '#ffffff'
    g.lineWidth = 6
    g.arc(x + 30, y - 4, 30, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.fillStyle = '#ffffff'
    g.font = font(800, 32)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(n + 1), x + 30, y - 2)
    g.textAlign = 'left'
    drawCaption(g, c, x, y + h + 14, CW, { day: true })
  })
  return canvas
}

export async function downloadClubsCalendar(state: State, style: ClubsCalendarStyle): Promise<boolean> {
  const canvas = await renderClubsCalendar(state, style)
  if (!canvas) return false
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ASO_Clubs_Calendar_${style}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
