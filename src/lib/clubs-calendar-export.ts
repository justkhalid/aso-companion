import { DAY_FULL, DAY_KEYS } from './constants'
import { clubDayOrder, fmtTime, hourLabel12, parseSlot } from './app-utils'
import { TONE_RGB } from './export-canvas'
import { clubIcon } from './icons'
import { createElement, type ElementType } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Sparkles } from 'lucide-react'
import type { Club, State } from './types'

/* Clubs as a calendar, every poster shown in full (never cropped), dressed like the website:
   iOS grey page, white cards with a faint blue gradient, Playfair headings, the blue pill.
   grid     a week timetable on top, the cards below it */
export type ClubsCalendarStyle = 'grid'

export type Fonts = { body: string; display: string }
const RATIO = 1200 / 848 // A4 poster, used when a club has none
export const INK = '#1c1c1e'
export const MUTED = '#6b6b73'
export const BLUE = '#0b5ce6'
export const PAGE = '#f2f2f7'
const TONES = TONE_RGB

export const load = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = src
  })

/* a club's own icon (the one chosen in the editor and shown on the calendars), drawn as an image */
export async function iconImage(Icon: ElementType, color: string, size: number): Promise<HTMLImageElement | null> {
  try {
    const host = document.createElement('div')
    const root = createRoot(host)
    flushSync(() => root.render(createElement(Icon, { size, color, strokeWidth: 2.3 })))
    const svg = host.querySelector('svg')
    if (!svg) return null
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' }))
    const im = await load(url)
    URL.revokeObjectURL(url)
    root.unmount()
    return im
  } catch {
    return null
  }
}

/* the fonts the page itself is using, so the image reads like the site */
export async function siteFonts(): Promise<Fonts> {
  let body = '-apple-system, "Segoe UI", Inter, Arial, sans-serif'
  let display = 'Georgia, serif'
  try {
    const cs = getComputedStyle(document.body)
    body = cs.fontFamily || body
    const pf = cs.getPropertyValue('--font-playfair').trim()
    if (pf) display = pf + ', Georgia, serif'
    await Promise.all([document.fonts.load(`800 40px ${display}`), document.fonts.load(`600 24px ${body}`), document.fonts.load(`800 24px ${body}`)])
  } catch {
    /* system fonts are fine */
  }
  return { body, display }
}

const tracking = (g: CanvasRenderingContext2D, text: string) => {
  /* small caps label: upper case with a little air between the letters */
  void g
  return text.toUpperCase().split('').join(' ')
}

export function wrap(g: CanvasRenderingContext2D, text: string, max: number, maxLines: number): string[] {
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

export function shadowCard(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 30) {
  g.save()
  g.shadowColor = 'rgba(16,24,40,.12)'
  g.shadowBlur = 36
  g.shadowOffsetY = 12
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fill()
  g.restore()
  const grad = g.createLinearGradient(x, y, x + w * 0.4, y + h)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.5, '#f8fbff')
  grad.addColorStop(1, '#ecf3fd')
  g.fillStyle = grad
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fill()
  g.strokeStyle = 'rgba(60,60,67,.14)'
  g.lineWidth = 2
  g.stroke()
}

export const pill = (g: CanvasRenderingContext2D, text: string, cx: number, y: number, bg: string, fg: string, font: string, h = 50) => {
  g.font = font
  const w = g.measureText(text).width + 44
  g.fillStyle = bg
  g.beginPath()
  g.roundRect(cx - w / 2, y, w, h, h / 2)
  g.fill()
  g.fillStyle = fg
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, cx, y + h / 2 + 1)
  g.textAlign = 'left'
  return w
}

type Card = { h: number; draw: (g: CanvasRenderingContext2D, x: number, y: number) => void }

/* one club: white card, the poster in full, the name, then time and place as pills */
function makeCard(f: Fonts, scratch: CanvasRenderingContext2D, c: Club, im: HTMLImageElement | null, w: number, withDay = false): Card {
  const P = Math.round(w * 0.045)
  const pw = w - P * 2
  const ph = im ? Math.round((pw * im.height) / im.width) : Math.round(pw * RATIO)
  const nameSize = Math.round(w * 0.066)
  scratch.font = `800 ${nameSize}px ${f.display}`
  const nameLines = wrap(scratch, c.name, pw, 2)
  const lh = Math.round(nameSize * 1.25)
  const days = (c.days || []).map((d) => DAY_FULL[d] || d).join(' and ')
  const time = fmtTime(c.time) || 'Time to be confirmed'
  const pillFont = `700 ${Math.round(w * 0.05)}px ${f.body}`
  const pillH = Math.round(w * 0.092)
  scratch.font = pillFont
  const wTime = scratch.measureText(time).width + 44
  const wRoom = c.room ? scratch.measureText(c.room).width + 44 : 0
  const stacked = wTime + wRoom + 14 > pw
  const dayH = withDay ? Math.round(w * 0.06) + 12 : 0
  const info = 22 + dayH + nameLines.length * lh + 18 + (stacked && c.room ? pillH * 2 + 12 : pillH)
  const h = P + ph + info + P
  return {
    h,
    draw(g, x, y) {
      shadowCard(g, x, y, w, h)
      /* poster, full */
      g.save()
      g.beginPath()
      g.roundRect(x + P, y + P, pw, ph, 20)
      g.clip()
      if (im) g.drawImage(im, x + P, y + P, pw, ph)
      else {
        g.fillStyle = '#eef3fd'
        g.fillRect(x + P, y + P, pw, ph)
        g.fillStyle = BLUE
        g.font = `800 ${Math.round(pw / 11)}px ${f.display}`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        wrap(g, c.name, pw - 60, 4).forEach((l, n, a) => g.fillText(l, x + P + pw / 2, y + P + ph / 2 + (n - (a.length - 1) / 2) * Math.round(pw / 9)))
        g.textAlign = 'left'
      }
      g.restore()
      g.strokeStyle = 'rgba(60,60,67,.16)'
      g.lineWidth = 2
      g.beginPath()
      g.roundRect(x + P, y + P, pw, ph, 20)
      g.stroke()
      let yy = y + P + ph + 22
      g.textAlign = 'center'
      g.textBaseline = 'top'
      if (withDay) {
        g.fillStyle = BLUE
        g.font = `800 ${Math.round(w * 0.04)}px ${f.body}`
        g.fillText(tracking(g, days), x + w / 2, yy + 2)
        yy += dayH
      }
      g.fillStyle = INK
      g.font = `800 ${nameSize}px ${f.display}`
      nameLines.forEach((l, n) => g.fillText(l, x + w / 2, yy + n * lh))
      yy += nameLines.length * lh + 18
      g.textAlign = 'left'
      if (stacked && c.room) {
        pill(g, time, x + w / 2, yy, 'rgba(11,92,230,.12)', '#0A54C4', pillFont, pillH)
        pill(g, c.room, x + w / 2, yy + pillH + 12, 'rgba(120,120,128,.16)', INK, `800 ${Math.round(w * 0.05)}px ${f.body}`, pillH)
      } else {
        const total = wTime + (c.room ? wRoom + 14 : 0)
        const left = x + w / 2 - total / 2
        pill(g, time, left + wTime / 2, yy, 'rgba(11,92,230,.12)', '#0A54C4', pillFont, pillH)
        if (c.room) pill(g, c.room, left + wTime + 14 + wRoom / 2, yy, 'rgba(120,120,128,.16)', INK, `800 ${Math.round(w * 0.05)}px ${f.body}`, pillH)
      }
    },
  }
}

/* the blue pill used for the active tab on the site */
function bluePill(g: CanvasRenderingContext2D, f: Fonts, text: string, x: number, y: number, w: number, h: number, size: number) {
  const grad = g.createLinearGradient(x, y, x + w, y + h)
  grad.addColorStop(0, '#0A4FB8')
  grad.addColorStop(0.52, '#1173D4')
  grad.addColorStop(1, '#2E9BE0')
  g.save()
  g.shadowColor = 'rgba(13,90,190,.32)'
  g.shadowBlur = 16
  g.shadowOffsetY = 5
  g.fillStyle = grad
  g.beginPath()
  g.roundRect(x, y, w, h, h / 2)
  g.fill()
  g.restore()
  g.fillStyle = '#ffffff'
  g.font = `800 ${size}px ${f.body}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, x + w / 2, y + h / 2 + 2)
  g.textAlign = 'left'
}

export function header(g: CanvasRenderingContext2D, f: Fonts, W: number, logo: HTMLImageElement | null, title: string, sub: string) {
  const LOGO = 124
  g.textBaseline = 'top'
  g.font = `800 68px ${f.display}`
  const wT = g.measureText(title).width
  g.font = `500 32px ${f.body}`
  const wS = g.measureText(sub).width
  const gap = logo ? 30 : 0
  const startX = (W - ((logo ? LOGO : 0) + gap + Math.max(wT, wS))) / 2
  const hy = 54
  if (logo) {
    const k = Math.min(LOGO / logo.width, LOGO / logo.height)
    g.drawImage(logo, startX + (LOGO - logo.width * k) / 2, hy + (LOGO - logo.height * k) / 2, logo.width * k, logo.height * k)
  }
  const tx = startX + (logo ? LOGO + gap : 0)
  g.fillStyle = INK
  g.font = `800 68px ${f.display}`
  g.fillText(title, tx, hy + 4)
  g.fillStyle = MUTED
  g.font = `500 32px ${f.body}`
  g.fillText(sub, tx, hy + 90)
}

export const footer = (g: CanvasRenderingContext2D, f: Fonts, W: number, H: number, text: string) => {
  g.fillStyle = MUTED
  g.font = `600 24px ${f.body}`
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.fillText(text, W / 2, H - 34)
  g.textAlign = 'left'
}

export async function renderClubsCalendar(state: State, style: ClubsCalendarStyle): Promise<HTMLCanvasElement | null> {
  const clubs = (state.clubs || []).filter((c) => !c.placeholder && (c.days || []).length).sort((a, b) => clubDayOrder(a) - clubDayOrder(b))
  if (!clubs.length) return null
  const [imgs, logo, f] = await Promise.all([Promise.all(clubs.map((c) => (c.poster ? load(c.poster) : Promise.resolve(null)))), load('/aso-logo.png'), siteFonts()])
  const imgOf = (c: Club) => imgs[clubs.indexOf(c)]
  const scratch = document.createElement('canvas').getContext('2d')!
  const M = 80
  const HEAD = 260
  const FOOT = 90
  const title = `${state.settings.institute} clubs`
  const sub = `${clubs.length} clubs · weekly calendar · ${state.settings.year}`
  const foot = `${state.settings.institute} · ${state.settings.year}`
  const days = DAY_KEYS.filter((d) => clubs.some((c) => c.days.includes(d)))
  const byDay = (d: string) => clubs.filter((c) => c.days.includes(d)).sort((a, b) => parseSlot(a.time).mins - parseSlot(b.time).mins)
  const mk = (W: number, H: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const g = canvas.getContext('2d')!
    g.fillStyle = PAGE
    g.fillRect(0, 0, W, H)
    header(g, f, W, logo, title, sub)
    footer(g, f, W, H, foot)
    return { canvas, g }
  }

  /* grid: week timetable in one card (each club with its own icon), the club cards under it */
  const COLS = 4
  const CW = 560
  const GAP = 44
  const W = M * 2 + COLS * CW + (COLS - 1) * GAP
  const cards = clubs.map((c) => makeCard(f, scratch, c, imgOf(c), CW, true))
  const icons = await Promise.all(clubs.map((c) => iconImage(clubIcon(c.icon)?.Icon || Sparkles, '#ffffff', 48)))
  const ends_ = clubs.map((c) => {
    const m = /-(\d{1,2}):(\d{2})/.exec(c.time || '')
    return m ? +m[1] * 60 + +m[2] : parseSlot(c.time).mins + 120
  })
  const starts = clubs.map((c) => parseSlot(c.time).mins)
  /* the timetable covers the hours the clubs actually use, so every block is wide enough to read */
  const h0 = Math.floor(Math.min(...starts) / 60)
  const h1 = Math.max(h0 + 4, Math.ceil(Math.max(...ends_) / 60))
  const LABEL = 210
  const ROW = 100
  const HEADROW = 76
  /* clubs on the same day that overlap in time get their own lane, so nothing is drawn on top of anything */
  const laneOf: Record<string, number> = {}
  const lanesIn: Record<string, number> = {}
  DAY_KEYS.forEach((d) => {
    const ends: number[] = []
    clubs
      .map((c, n) => ({ c, n }))
      .filter((x) => x.c.days.includes(d))
      .sort((p, q) => starts[p.n] - starts[q.n])
      .forEach(({ n }) => {
        let lane = ends.findIndex((e) => e <= starts[n])
        if (lane < 0) lane = ends.length
        ends[lane] = Math.max(ends[lane] || 0, ends_[n])
        laneOf[d + n] = lane
      })
    lanesIn[d] = Math.max(1, ends.length)
  })
  const rowTop: Record<string, number> = {}
  let acc = HEADROW
  DAY_KEYS.forEach((d) => {
    rowTop[d] = acc
    acc += ROW * lanesIn[d]
  })
  const GRID_H = acc + 24
  const rowHs: number[] = []
  for (let r = 0; r * COLS < cards.length; r++) rowHs.push(Math.max(...cards.slice(r * COLS, r * COLS + COLS).map((c) => c.h)))
  const cardsH = rowHs.reduce((n, h) => n + h + 44, -44)
  const { canvas, g } = mk(W, HEAD + GRID_H + 70 + cardsH + FOOT + 20)
  shadowCard(g, M, HEAD, W - M * 2, GRID_H, 36)
  const gx = M + 30
  const gw = W - M * 2 - 60
  const hw = (gw - LABEL - 40) / (h1 - h0)
  g.textBaseline = 'middle'
  for (let h = h0; h <= h1; h++) {
    const x = gx + LABEL + (h - h0) * hw
    g.fillStyle = MUTED
    g.font = `700 25px ${f.body}`
    g.textAlign = 'center'
    g.fillText(hourLabel12(h), x, HEAD + HEADROW / 2)
    g.strokeStyle = 'rgba(60,60,67,.10)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x, HEAD + HEADROW)
    g.lineTo(x, HEAD + GRID_H - 24)
    g.stroke()
  }
  DAY_KEYS.forEach((d) => {
    const y = HEAD + rowTop[d]
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillStyle = days.includes(d) ? INK : MUTED
    g.font = `800 29px ${f.display}`
    g.fillText(DAY_FULL[d] || d, gx + 6, y + (ROW * lanesIn[d]) / 2)
    g.strokeStyle = 'rgba(60,60,67,.10)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(gx, y)
    g.lineTo(gx + gw, y)
    g.stroke()
  })
  const toneOf = (n: number) => TONES[n % 8]
  clubs.forEach((c, n) => {
    const s = starts[n]
    const e = ends_[n]
    const tone = toneOf(n)
    c.days.forEach((d) => {
      if (!DAY_KEYS.includes(d as (typeof DAY_KEYS)[number])) return
      const x = gx + LABEL + ((s - h0 * 60) / 60) * hw + 5
      const w = ((e - s) / 60) * hw - 10
      const y = HEAD + rowTop[d] + (laneOf[d + n] || 0) * ROW + 12
      const h = ROW - 24
      g.fillStyle = tone.bg
      g.beginPath()
      g.roundRect(x, y, w, h, 16)
      g.fill()
      g.strokeStyle = tone.line
      g.lineWidth = 2
      g.stroke()
      g.fillStyle = tone.txt
      g.beginPath()
      g.arc(x + Math.min(36, w / 2), y + h / 2, 22, 0, Math.PI * 2)
      g.fill()
      const ic = icons[n]
      if (ic) g.drawImage(ic, x + Math.min(36, w / 2) - 13, y + h / 2 - 13, 26, 26)
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      g.fillStyle = tone.txt
      if (w >= 330) {
        g.font = `800 25px ${f.body}`
        g.fillText(c.name, x + 70, y + h / 2 - 16, w - 82)
        g.font = `600 22px ${f.body}`
        g.fillText(fmtTime(c.time), x + 70, y + h / 2 + 18, w - 82)
      } else {
        /* a short session: the name and time sit to the left of its block */
        g.textAlign = 'right'
        g.font = `800 25px ${f.body}`
        g.fillText(c.name, x - 16, y + h / 2 - 16)
        g.font = `600 22px ${f.body}`
        g.fillText(fmtTime(c.time), x - 16, y + h / 2 + 18)
        g.textAlign = 'left'
      }
    })
  })
  let y = HEAD + GRID_H + 70
  cards.forEach((card, n) => {
    const r = Math.floor(n / COLS)
    if (n % COLS === 0 && n > 0) y += rowHs[r - 1] + 44
    const inRow = Math.min(COLS, cards.length - r * COLS)
    const x = M + ((COLS - inRow) * (CW + GAP)) / 2 + (n % COLS) * (CW + GAP)
    card.draw(g, x, y)
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
