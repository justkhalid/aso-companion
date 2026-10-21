/* The month calendar as an Instagram story (1080x1920): month name, a grid of the month with the clubs and events on their days,
   and a list under it. Everything comes from the app's own clubs and events, so a new club shows up by itself.
   The corner decorations are separate layers, so the same layers give a still picture and a looping animation. Browser only. */
import type { Club, EventEntry, State } from '../types'
import { MONTH_THEMES } from '../month-themes'
import { monthOccurrences, type Occ } from '../month-export'
import { closedHoliday, holidaysOf } from '../holidays'
import { iconImage } from '../clubs-calendar-export'
import { clubIcon } from '../icons'
import { Sparkles } from 'lucide-react'
import { KIT_BG_BASE, cv, drawLogo, fit, get, grain, loadKitFonts, loadImage, measure, spaced } from './engine'

const W = 1080
const H = 1920
const CX = 540
export const LOOP_SECONDS = 15
const RECORD_SECONDS = LOOP_SECONDS + 0.7

type RGB = [number, number, number]
const hx = (h: string): RGB => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB }
const shade = (c: RGB, a: number): RGB => c.map((v) => Math.max(0, Math.min(255, Math.round(v + 255 * a)))) as RGB
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t)) as RGB
const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const hex = (c: RGB) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
const cap = (px: number) => Math.floor(px * 0.72)
const ARABIC = /[؀-ۿ]/

/* small deterministic random numbers, so a month always looks the same */
function rng(seed: number) {
  let a = seed >>> 0
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { random: r, uniform: (a: number, b: number) => a + (b - a) * r(), pick: <T,>(l: T[]) => l[Math.floor(r() * l.length)] }
}

/* ---------------------------------------------------------------- decorations (one picture each, drawn at the origin) */

const OVAL = 'M0 -100 C62 -58 66 48 0 100 C-66 48 -62 -58 0 -100 Z'
const MAPLE = 'M0 -104 L16 -66 L50 -84 L40 -38 L92 -34 L58 2 L76 46 L28 36 L0 104 L-28 36 L-76 46 L-58 2 L-92 -34 L-40 -38 L-50 -84 L-16 -66 Z'

type Kind = 'oval' | 'maple' | 'flake' | 'blossom' | 'flower' | 'drop' | 'sun' | 'bubble'

function piece(kind: Kind, i: number, c: RGB, size: number): string {
  const col = hex(c)
  const col2 = hex(shade(c, -0.22))
  let g = `<g transform="scale(${size / 100})">`
  if (kind === 'oval' || kind === 'maple') {
    const p = kind === 'oval' ? OVAL : MAPLE
    g += `<defs><linearGradient id="g${i}" x1="0" y1="-100" x2="0" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${col2}"/></linearGradient></defs>`
    g += `<path d="${p}" fill="url(#g${i})" stroke="url(#g${i})" stroke-width="5" stroke-linejoin="round"/><path d="M0 -90 L0 110 M0 -40 L34 -64 M0 -40 L-34 -64 M0 10 L40 -16 M0 10 L-40 -16" stroke="#fff" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round" fill="none"/>`
  } else if (kind === 'flake') {
    let arms = ''
    for (let k = 0; k < 6; k++) arms += `<g transform="rotate(${k * 60})"><path d="M0 0 L0 100 M0 55 L26 82 M0 55 L-26 82 M0 30 L14 44 M0 30 L-14 44"/></g>`
    g += `<g stroke="${col}" stroke-width="8" stroke-linecap="round" fill="none">${arms}</g>`
  } else if (kind === 'blossom' || kind === 'flower') {
    const n = kind === 'blossom' ? 5 : 6
    let pet = ''
    for (let k = 0; k < n; k++) pet += `<ellipse cx="0" cy="-58" rx="${kind === 'flower' ? 30 : 34}" ry="${kind === 'flower' ? 50 : 44}" transform="rotate(${(k * 360) / n})" fill="${col}" fill-opacity="0.95"/>`
    g += pet + `<circle r="26" fill="${kind === 'flower' ? '#FFC107' : '#FFF176'}"/><circle r="26" fill="none" stroke="${col2}" stroke-width="3" stroke-opacity="0.5"/>`
  } else if (kind === 'drop') {
    g += `<path d="M0 -100 C70 -10 64 90 0 90 C-64 90 -70 -10 0 -100Z" fill="${col}" fill-opacity="0.9"/><path d="M-22 20 C-26 46 -14 64 6 68" stroke="#fff" stroke-opacity="0.6" stroke-width="7" fill="none" stroke-linecap="round"/>`
  } else if (kind === 'sun') {
    let rays = ''
    for (let k = 0; k < 14; k++) rays += `<line x1="0" y1="-135" x2="0" y2="${-(k % 2 ? 175 : 205)}" transform="rotate(${(k * 360) / 14})"/>`
    g += `<defs><radialGradient id="g${i}"><stop offset="0" stop-color="#FFF3C4"/><stop offset="1" stop-color="${col}"/></radialGradient></defs><g stroke="${col2}" stroke-width="14" stroke-linecap="round">${rays}</g><circle r="115" fill="url(#g${i})"/>`
  } else {
    g += `<circle r="90" fill="none" stroke="${col}" stroke-width="10" stroke-opacity="0.8"/><circle cx="-30" cy="-30" r="14" fill="#fff" fill-opacity="0.7"/>`
  }
  return g + '</g>'
}

export interface Sprite {
  img: HTMLImageElement
  x: number
  y: number
  r: number // half the picture, in px
  ang: number
  mode: 'sway' | 'spin' | 'static'
  k: number // how many times it sways in one loop (1 or 2)
  ph: number // phase
  dir: number
}

async function spriteImage(svg: string, r: number): Promise<HTMLImageElement> {
  const d = Math.ceil(r * 2)
  return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="${-r} ${-r} ${r * 2} ${r * 2}">${svg}</svg>`))
}

async function makeSprites(monthIdx: number, motif: string, cols: RGB[], title: RGB): Promise<Sprite[]> {
  const r = rng(monthIdx * 7 + 3)
  const out: Sprite[] = []
  const anchors: [number, number, number, number, number][] = [[40, 30, 1, 1, 3], [1040, 30, -1, 1, 4], [40, 1890, 1, -1, 3], [1040, 1890, -1, -1, 4]]
  let n = 0
  for (const [ax, ay, sx, sy, count] of anchors) {
    for (let k = 0; k < count; k++) {
      const size = k ? r.uniform(52, 92) : r.uniform(80, 112)
      const x = ax + sx * (Math.pow(r.random(), 1.5) * 190 + (k ? 0 : 20))
      const y = ay + sy * (Math.pow(r.random(), 1.4) * (sy > 0 ? 110 : 90) + (k ? 0 : 12))
      const ang = r.uniform(-80, 80)
      let c = cols[Math.floor(r.random() * cols.length)]
      let kind: Kind
      let sz = size
      if (motif === 'leaves') kind = r.pick<Kind>(['oval', 'maple'])
      else if (motif === 'snow') kind = 'flake'
      else if (motif === 'blossom') kind = 'blossom'
      else if (motif === 'flowers') kind = 'flower'
      else if (motif === 'rain') {
        kind = r.random() < 0.7 ? 'drop' : 'flower'
        c = kind === 'drop' ? (r.random() < 0.5 ? cols[0] : cols[1]) : cols[2]
      } else if (motif === 'sun') {
        kind = 'flower'
        c = r.random() < 0.5 ? cols[0] : cols[1]
        sz *= 0.75
      } else {
        kind = sy > 0 ? 'bubble' : 'drop'
        c = cols[Math.floor(r.random() * 2)]
      }
      const rad = sz * 2.1
      out.push({ img: await spriteImage(piece(kind, n++, c, sz), rad), x, y, r: rad, ang, mode: kind === 'flake' ? 'spin' : 'sway', k: 2 + (n % 2), ph: r.uniform(0, Math.PI * 2), dir: n % 2 ? 1 : -1 })
    }
  }
  if (motif === 'sun') out.push({ img: await spriteImage(piece('sun', n++, cols[0], 70), 70 * 2.1), x: 1010, y: 70, r: 70 * 2.1, ang: 0, mode: 'sway', k: 1, ph: 0, dir: 1 })
  if (motif === 'waves') {
    let body = ''
    ;[[cols[0], 0], [cols[1], 1.6]].forEach(([c, ph], k) => {
      for (const side of [0, 1]) {
        const x0 = side === 0 ? 0 : 1080
        const pts: string[] = []
        for (let x = 0; x < 340; x += 10) pts.push(`${(x0 + (side === 0 ? 1 : -1) * x).toFixed(0)},${(1920 - 120 - 60 * k - 18 * Math.sin(x / 55 + (ph as number)) - x * 0.12).toFixed(0)}`)
        body += `<path d="M${pts.join(' L')} L${x0 + (side === 0 ? 340 : -340)},1920 L${x0},1920Z" fill="${hex(c as RGB)}" fill-opacity="${0.55 - 0.15 * k}"/>`
      }
    })
    const full = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`))
    out.push({ img: full, x: W / 2, y: H / 2, r: W / 2, ang: 0, mode: 'static', k: 1, ph: 0, dir: 1 })
  }
  void title
  return out
}

/* ---------------------------------------------------------------- the story */

export interface MonthStory {
  back: HTMLCanvasElement // the background
  front: HTMLCanvasElement // logo, title, grid and list (transparent)
  grain: HTMLCanvasElement
  sprites: Sprite[]
  shadow: string
}

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const KEY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

/* "16:00-18:00" -> "4 - 6 PM", "10:00-12:00" -> "10 AM - 12 PM", "14:30-16:30" -> "2:30 - 4:30 PM" */
export function compactTime(r: string | undefined): string {
  if (!r || !r.includes('-')) return ''
  const f = (s: string) => { const [h, m] = s.split(':').map(Number); return { t: `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}`, ap: h >= 12 ? 'PM' : 'AM' } }
  const [a, b] = r.split('-').map(f)
  return a.ap === b.ap ? `${a.t} - ${b.t} ${b.ap}` : `${a.t} ${a.ap} - ${b.t} ${b.ap}`
}

/* the short names tried inside the grid, longest first: the kit's "short name" if set, else the name without "American Space", "Club" and "Activity" */
function shortNames(name: string, short?: string): string[] {
  if (short?.trim()) return [short.trim()]
  let n = name.replace(/^American Space\s+/i, '').trim()
  if (n.includes(':')) n = n.split(':').pop()!.trim()
  const clubEnd = /\s+Club$/i.test(n)
  const bare = n.replace(/\s+(Club|Activity)$/i, '').trim()
  const first = bare.split(/\s+/)[0]
  const list = bare.split(/\s+/).length === 1 && clubEnd && !ARABIC.test(bare) ? [bare + ' Club'] : [bare]
  if (clubEnd && bare.split(/\s+/).length > 1 && !ARABIC.test(bare)) list.push(first + ' Club')
  return list
}
const longName = (name: string) => name.replace(/^American Space\s+/i, '').trim()

function ellipsize(g: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (g.measureText(text).width <= maxW) return text
  const words = text.split(/\s+/)
  while (words.length > 1) {
    words.pop()
    const t = words.join(' ')
    if (g.measureText(t).width <= maxW) return t
  }
  let t = text
  while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

const iconCache = new Map<string, HTMLImageElement | null>()
async function appIcon(key: string | undefined, color: string): Promise<HTMLImageElement | null> {
  const k = (key || '') + '|' + color
  if (iconCache.has(k)) return iconCache.get(k)!
  const im = await iconImage(clubIcon(key)?.Icon || Sparkles, color, 120)
  iconCache.set(k, im)
  return im
}

interface Row { name: string; sub: string; time: string }

export async function buildMonthStory(state: State, year: number, month: number): Promise<MonthStory> {
  await loadKitFonts()
  const th = MONTH_THEMES[month]
  const T = hx(th.title)
  const A = hx(th.accent)
  const cols = th.colors.map(hx)
  const oct = month === 9
  const INK: RGB = oct ? [58, 24, 30] : shade(T, -0.38)
  const EVC: RGB = oct ? [198, 40, 40] : A
  const CLC: RGB = oct ? [22, 38, 100] : shade(T, -0.3)
  const stops: RGB[] = oct ? [[118, 20, 40], [196, 36, 40], [232, 104, 32], [240, 150, 38]] : [shade(T, -0.2), T, A, mix(A, [255, 255, 255], 0.25)]
  const DK = stops[0]
  const OR = oct ? ([232, 110, 32] as RGB) : stops[stops.length - 1]

  /* background: the kit's pearl washed with the month colours */
  const back = cv(W, H)
  const bg = back.getContext('2d')!
  bg.drawImage(await get(KIT_BG_BASE), 0, 0)
  const wash = bg.createLinearGradient(0, 0, 0, H)
  wash.addColorStop(0, th.bg[0])
  wash.addColorStop(1, th.bg[1])
  bg.globalAlpha = 0.6
  bg.fillStyle = wash
  bg.fillRect(0, 0, W, H)
  bg.globalAlpha = 1

  const sprites = await makeSprites(month + 1, th.motif, cols, T)

  /* the content */
  const front = cv(W, H)
  const g = front.getContext('2d')!
  await drawLogo(g, CX, 120, 84)

  const word = th.name.toUpperCase()
  const fw = fit(g, (s) => `italic 600 ${s}px Bodoni`, word, 820, 150, -6)
  g.font = `italic 600 ${fw}px Bodoni`
  const tm = g.measureText(word)
  const base = 200 + tm.actualBoundingBoxAscent
  const by1 = base + tm.actualBoundingBoxDescent
  const tw = measure(g, word, -6)
  const grd = g.createLinearGradient(CX - tw / 2, 0, CX + tw / 2, 0)
  stops.forEach((c, i) => grd.addColorStop(i / (stops.length - 1), css(c)))
  g.save()
  g.shadowColor = 'rgba(40,30,60,.26)'
  g.shadowBlur = 26
  g.shadowOffsetY = 10
  spaced(g, word, CX, base, -6, grd)
  g.restore()

  const subB = by1 + 44 + cap(26)
  g.font = '700 26px ManropeA'
  spaced(g, `${year}   ·   CLUBS AND EVENTS`, CX, subB, 8, css(INK))
  const lineGrad = (x0: number, x1: number, a = 1) => {
    const lg = g.createLinearGradient(x0, 0, x1, 0)
    lg.addColorStop(0, css(DK, a))
    lg.addColorStop(1, css(OR, a))
    return lg
  }
  for (const [sx, x0, x1] of [[96, 126, 236], [984, 844, 954]] as const) {
    g.fillStyle = lineGrad(x0, x1)
    g.fillRect(x0, subB - 9, x1 - x0, 2)
    g.fillStyle = css(EVC)
    g.beginPath()
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 === 0 ? 12 : 5
      const a = -Math.PI / 2 + (k * Math.PI) / 5
      const px = sx + rr * Math.cos(a)
      const py = subB - 9 + rr * Math.sin(a)
      if (k === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
    g.fill()
  }

  /* the month's days, with what happens on each */
  const occ = monthOccurrences(state, { year, month, clubs: true, events: true })
  const LEFT = 60
  const CW = [88, 88, 140, 140, 150, 184, 170]
  const CX0 = CW.map((_, k) => LEFT + CW.slice(0, k).reduce((a, b) => a + b, 0))
  const first = new Date(year, month, 1)
  const ndays = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(((first.getDay() + 6) % 7)).fill(null).concat(Array.from({ length: ndays }, (_, i) => i + 1))
  while (cells.length % 7) cells.push(null)
  const rows = cells.length / 7
  const RH = rows <= 4 ? 150 : rows === 5 ? 136 : 122
  const wdB = subB + 66
  const names = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  g.font = '700 20px ManropeA'
  names.forEach((n, k) => spaced(g, n, Math.round(CX0[k] + CW[k] / 2), wdB, 5, css(k < 5 ? INK : EVC)))
  const G0 = wdB + 22
  const hline = (y: number, a: number) => { g.fillStyle = lineGrad(LEFT, LEFT + 960, a / 255); g.fillRect(LEFT, Math.round(y), 960, 2) }
  hline(G0, 255)

  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const itemOf = (o: Occ): { club?: Club; event?: EventEntry } => (o.kind === 'club' ? { club: state.clubs.find((c) => c.name === o.title) } : { event: state.events.find((e) => e.title === o.title) })

  for (let r = 0; r < rows; r++) {
    const yTop = G0 + r * RH
    for (let c = 0; c < 7; c++) {
      const n = cells[r * 7 + c]
      if (n === null) continue
      const x0 = CX0[c]
      const id = iso(n)
      const closed = closedHoliday(id)
      if (closed) {
        const xa = x0 + 5, xb = x0 + CW[c] - 5, ya = yTop + 8, yb = yTop + RH - 8
        g.save()
        g.beginPath()
        g.roundRect(xa, ya, xb - xa, yb - ya, 12)
        g.clip()
        g.strokeStyle = css(EVC, 0.3)
        g.lineWidth = 2
        for (let k = -300; k < 400; k += 15) { g.beginPath(); g.moveTo(xa + k, yb); g.lineTo(xa + k + 140, ya); g.stroke() }
        g.restore()
      }
      const list = closed ? [] : (occ.get(id) || []).slice().sort((a, b) => (a.kind === b.kind ? a.startMin - b.startMin : a.kind === 'club' ? -1 : 1))
      const has = list.length > 0 || !!closed
      g.textBaseline = 'top'
      g.textAlign = 'left'
      g.font = '700 24px ManropeA'
      g.fillStyle = css(INK, has ? 1 : 0.85)
      g.fillText(String(n), x0 + 10, yTop + 12)
      const room = Math.floor((RH - 44) / 22)
      const shown = list.length > room ? room - 1 : list.length
      let yy = yTop + 46
      for (const o of list.slice(0, shown)) {
        const { club, event } = itemOf(o)
        const item = club || event
        const colr = o.kind === 'club' ? CLC : EVC
        const icon = await appIcon(item?.icon, hex(colr))
        g.globalAlpha = o.off ? 0.45 : 1
        if (icon) g.drawImage(icon, x0 + 10, yy, 20, 20)
        const cands = shortNames(o.title, item?.kit?.short)
        const ar = ARABIC.test(cands[0])
        g.font = ar ? '700 16px Cairo' : '700 15px ManropeA'
        g.fillStyle = css(colr)
        g.textBaseline = 'middle'
        const room1 = CW[c] - 36 - 6
        const text = cands.find((x) => g.measureText(x).width <= room1) || ellipsize(g, cands[0], room1)
        g.fillText(text, x0 + 36, yy + 10)
        if (o.off) { const w = g.measureText(text).width; g.fillRect(x0 + 36, yy + 10, w, 1.5) }
        g.globalAlpha = 1
        yy += 22
      }
      if (shown < list.length) {
        g.font = '500 14px ManropeA'
        g.fillStyle = css(INK, 0.75)
        g.textBaseline = 'middle'
        g.fillText(`+${list.length - shown} more`, x0 + 10, yy + 10)
      }
      if (closed) {
        g.font = '700 16px ManropeA'
        spaced(g, 'CLOSED', Math.round(x0 + CW[c] / 2), Math.round(yTop + 92 + 6), 3, css(EVC))
        g.font = '500 13px ManropeA'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillStyle = css(EVC, 0.9)
        g.fillText(ellipsize(g, closed.name, CW[c] - 12), x0 + CW[c] / 2, yTop + 112)
        g.textAlign = 'left'
      } else {
        const occasion = (holidaysOf(year).get(id) || []).find((h) => !h.closed)
        if (occasion) {
          g.font = '500 14px ManropeA'
          g.textBaseline = 'middle'
          g.fillStyle = css(INK, 0.75)
          g.fillText(ellipsize(g, occasion.name, CW[c] - 14), x0 + 10, yTop + RH - 18)
        }
      }
    }
    hline(G0 + (r + 1) * RH, r < rows - 1 ? 150 : 255)
  }
  const G1 = G0 + rows * RH
  for (let k = 1; k < 7; k++) { g.fillStyle = css(DK, 55 / 255); g.fillRect(CX0[k], G0, 2, G1 - G0) }

  /* the list under the grid: clubs by day, then events */
  const groups: [string, Row[], boolean][] = []
  const byDay = new Map<number, (Row & { at: number })[]>()
  for (const c of state.clubs) {
    if (c.placeholder || !c.time || !(c.days || []).length) continue
    const days = new Set<number>()
    for (let d = 1; d <= ndays; d++) {
      const hit = (occ.get(iso(d)) || []).some((o) => o.kind === 'club' && o.title === c.name && !o.off)
      if (hit && !closedHoliday(iso(d))) days.add((new Date(year, month, d).getDay() + 6) % 7)
    }
    for (const wd of days) {
      const note = [c.freq === 'biweekly' ? `every other ${DAYS[wd]}` : c.freq === 'monthly' ? 'once a month' : '', c.outside && c.room ? c.room : ''].filter(Boolean).join('  ·  ')
      byDay.set(wd, [...(byDay.get(wd) || []), { name: longName(c.name), sub: note, time: compactTime(c.time), at: parseInt(c.time) }])
    }
  }
  for (const wd of [...byDay.keys()].sort((a, b) => a - b)) groups.push([`EVERY ${DAYS[wd].toUpperCase()}`, byDay.get(wd)!.sort((a, b) => a.at - b.at), false])
  const evRows: (Row & { first: number; ar: boolean })[] = []
  for (const e of state.events) {
    const dates: number[] = []
    for (let d = 1; d <= ndays; d++) if ((occ.get(iso(d)) || []).some((o) => o.kind === 'event' && o.title === e.title)) dates.push(d)
    if (!dates.length) continue
    const wd = DAYS[(new Date(year, month, dates[0]).getDay() + 6) % 7]
    const ar = ARABIC.test(e.title)
    const once = !e.recur || e.recur === 'once' || e.recur === 'none'
    let sub: string
    if (once) sub = `${wd.slice(0, 3)} ${dates[0]} ${MON3[month]}`
    else if (ar) sub = dates.length > 1 ? `${wd.slice(0, 3)} ${dates[0]} - ${dates[dates.length - 1]} ${MON3[month]}` : `${wd.slice(0, 3)} ${dates[0]} ${MON3[month]}`
    else {
      const u = e.until ? new Date(e.until + 'T00:00:00') : null
      sub = `${wd}s${u ? ` until ${u.getDate()} ${MON3[u.getMonth()]}` : ''}`
    }
    evRows.push({ name: e.title, sub, time: compactTime(e.time), first: dates[0], ar })
  }
  if (evRows.length) groups.push(['EVENTS', evRows.sort((a, b) => a.first - b.first), true])
  if (!groups.length) groups.push(['SCHEDULE', [{ name: 'Nothing planned yet', sub: '', time: '' }], false])

  const XL = 130
  const XR = 950
  let LH = 36
  const HH = 28
  const total = () => groups.reduce((a, [, rs]) => a + HH + 14 + LH * rs.length + 20, 0)
  if (G1 + 36 + total() > 1835) LH = 32
  if (G1 + 36 + total() > 1835) LH = 28
  let y = G1 + 36
  g.textBaseline = 'alphabetic'
  for (const [gname, rws, evs] of groups) {
    g.font = '700 19px ManropeA'
    const wl = measure(g, gname, 5) + 5
    spaced(g, gname, XL + wl / 2, y + cap(19), 5, css(EVC))
    g.fillStyle = css(EVC, 120 / 255)
    g.fillRect(XL + wl + 14, y + Math.floor(cap(19) / 2) + 2, XR - (XL + wl + 14), 2)
    y += cap(19) + 16
    for (const rw of rws) {
      g.textBaseline = 'middle'
      const ar = evs && ARABIC.test(rw.name)
      if (ar) {
        g.font = '700 27px Cairo'
        g.textAlign = 'right'
        g.fillStyle = css(INK)
        g.fillText(rw.name, XR, y + 18)
        g.font = '500 20px ManropeA'
        g.textAlign = 'left'
        g.fillText([rw.sub, rw.time].filter(Boolean).join(',  '), XL, y + 20)
        y += LH + 2
        continue
      }
      g.font = '700 23px ManropeA'
      g.textAlign = 'left'
      g.fillStyle = css(INK)
      g.fillText(rw.name, XL, y + 18)
      const wn = g.measureText(rw.name).width
      if (rw.sub) {
        g.font = '500 18px ManropeA'
        g.fillStyle = css(EVC)
        g.fillText(rw.sub, XL + wn + 12, y + 20)
      }
      g.font = '500 21px ManropeA'
      g.fillStyle = css(INK)
      g.textAlign = 'right'
      g.fillText(rw.time, XR, y + 18)
      g.textAlign = 'left'
      y += LH
    }
    y += 20
  }

  const gr = cv(W, H)
  grain(gr.getContext('2d')!, W, H)
  return { back, front, grain: gr, sprites, shadow: css(shade(T, -0.4), 0.2) }
}

/* one picture of the story at time t (seconds); the corner decorations sway and drift, and the loop closes after LOOP_SECONDS */
export function drawMonthStory(g: CanvasRenderingContext2D, m: MonthStory, t: number) {
  g.clearRect(0, 0, W, H)
  g.drawImage(m.back, 0, 0)
  const u = (2 * Math.PI * t) / LOOP_SECONDS
  for (const s of m.sprites) {
    g.save()
    g.shadowColor = m.shadow
    g.shadowBlur = 14
    g.shadowOffsetY = 8
    if (s.mode === 'static') {
      g.drawImage(s.img, s.x - s.r, s.y - s.r)
    } else {
      const sway = s.mode === 'spin' ? (s.dir * 60 * t) / LOOP_SECONDS : Math.sin(u * s.k + s.ph) * 6
      const bob = Math.sin(u * s.k + s.ph + 1.3) * 7
      g.translate(s.x, s.y + bob)
      g.rotate(((s.ang + sway) * Math.PI) / 180)
      const sc = 1 + Math.sin(u * 2 + s.ph) * 0.025
      g.scale(sc, sc)
      g.drawImage(s.img, -s.r, -s.r)
    }
    g.restore()
  }
  g.drawImage(m.front, 0, 0)
  g.drawImage(m.grain, 0, 0)
}

export function monthStoryStill(m: MonthStory): HTMLCanvasElement {
  const c = cv(W, H)
  drawMonthStory(c.getContext('2d')!, m, 0)
  return c
}

export interface Music {
  file: Blob // the song the person chose (their own file)
  start: number // where in the song to begin, seconds
  volume: number // 0 to 1
}

/* a looping video of the story, with the chosen song mixed in: MP4 where the browser can make one (Instagram accepts it), else WebM.
   forPost makes a lighter file (about 3 MB) so it can be sent to Instagram and Facebook. */
export async function monthStoryVideo(m: MonthStory, o: { onProgress?: (p: number) => void; music?: Music | null; forPost?: boolean } = {}): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const c = cv(W, H)
  const g = c.getContext('2d')!
  const withAudio = !!o.music
  const types: [string, 'mp4' | 'webm'][] = withAudio
    ? [['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm', 'webm']]
    : [['video/mp4;codecs=avc1.640028', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm', 'webm']]
  const pick = types.find(([t]) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t))
  if (!pick) throw new Error('This browser cannot record video. Use Chrome or Edge.')
  drawMonthStory(g, m, 0)
  const canvasStream = c.captureStream(30)
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()]

  /* the song: decoded, started at the chosen point, faded in and out, and fed into the recording */
  let ac: AudioContext | null = null
  let src: AudioBufferSourceNode | null = null
  let gain: GainNode | null = null
  if (o.music) {
    ac = new AudioContext()
    await ac.resume().catch(() => undefined)
    const buf = await ac.decodeAudioData(await o.music.file.arrayBuffer())
    src = ac.createBufferSource()
    src.buffer = buf
    src.loop = true
    gain = ac.createGain()
    gain.gain.value = 0
    const dest = ac.createMediaStreamDestination()
    src.connect(gain)
    gain.connect(dest)
    tracks.push(...dest.stream.getAudioTracks())
  }

  const stream = new MediaStream(tracks)
  const rec = new MediaRecorder(stream, { mimeType: pick[0], videoBitsPerSecond: o.forPost ? 1_500_000 : 8_000_000, audioBitsPerSecond: 96_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise<void>((res) => { rec.onstop = () => res() })
  rec.start(500)
  if (ac && src && gain && o.music) {
    const t = ac.currentTime
    const v = Math.max(0, Math.min(1, o.music.volume))
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(v, t + 0.4)
    gain.gain.setValueAtTime(v, t + RECORD_SECONDS - 1.5)
    gain.gain.linearRampToValueAtTime(0, t + RECORD_SECONDS)
    const begin = Math.max(0, Math.min(o.music.start, Math.max(0, (src.buffer?.duration || 1) - 1)))
    src.start(0, begin)
  }
  const t0 = performance.now()
  await new Promise<void>((res) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      /* a little over one loop, so the file is never shorter than LOOP_SECONDS; the motion just carries on from the start */
      drawMonthStory(g, m, t % LOOP_SECONDS)
      o.onProgress?.(Math.min(1, t / RECORD_SECONDS))
      if (t >= RECORD_SECONDS) res()
      else requestAnimationFrame(tick)
    }
    tick()
  })
  rec.stop()
  await done
  try { src?.stop() } catch { /* already stopped */ }
  void ac?.close()
  stream.getTracks().forEach((t) => t.stop())
  return { blob: new Blob(chunks, { type: pick[0].split(';')[0] }), ext: pick[1] }
}
