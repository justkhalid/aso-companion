import { MUTED } from './clubs-calendar-export'
import type { MonthTheme } from './month-themes'
import { MONTH_THEMES, drawMotif, type MotifSink } from './month-themes'

/* what every month picture shares: the themed page, the month heading, and the footer with the logo */

export function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  g.closePath()
  g.fill()
}

/* `none` leaves the canvas clear, for the layer that sits on top of the animated backdrop */
export function paintBackdrop(g: CanvasRenderingContext2D, t: MonthTheme, month: number, W: number, H: number, mode: 'all' | 'none' = 'all') {
  if (mode === 'none') return
  const bg = g.createLinearGradient(0, 0, W * 0.4, H)
  bg.addColorStop(0, t.bg[0])
  bg.addColorStop(1, t.bg[1])
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  drawMotif(g, t, month, W, H, 'back')
  drawMotif(g, t, month, W, H, 'front') // drawn before the calendar text, so it never covers a name
}

/* the month alone and large, a fine rule with a star under it carrying the year and what the page shows */
export function paintHeader(g: CanvasRenderingContext2D, f: { display: string; body: string }, t: MonthTheme, year: number, names: string[]) {
  const what = names.length > 1 ? names.slice(0, -1).join(', ') + ' AND ' + names[names.length - 1] : names[0] || ''
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  g.font = `800 140px ${f.display}`
  g.fillStyle = t.title
  const W = g.canvas.width
  g.fillText(t.name, W / 2, 104)
  g.font = `700 40px ${f.body}`
  g.letterSpacing = '8px'
  const sub = `${year}   ·   ${what}`
  const sw = g.measureText(sub).width
  g.fillStyle = t.accent
  g.fillText(sub, W / 2 + 4, 206)
  g.letterSpacing = '0px'
  g.strokeStyle = t.accent + '88'
  g.lineWidth = 3
  for (const dir of [-1, 1]) {
    g.beginPath()
    g.moveTo(W / 2 + dir * (sw / 2 + 50), 206)
    g.lineTo(W / 2 + dir * (sw / 2 + 330), 206)
    g.stroke()
  }
  g.fillStyle = t.accent
  star(g, W / 2 - (sw / 2 + 330) - 22, 206, 11)
  star(g, W / 2 + (sw / 2 + 330) + 22, 206, 11)
}

/* logo and text centred between the end of the calendar and the page edge */
export function paintFooter(g: CanvasRenderingContext2D, f: { body: string }, logo: HTMLImageElement | null, note: string, W: number, H: number, gridBottom: number) {
  g.font = `600 32px ${f.body}`
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillStyle = MUTED
  const nwid = g.measureText(note).width
  const LG = 92
  const fy = (gridBottom + H) / 2 - 4
  const fx = (W - (logo ? LG + 22 : 0) - nwid) / 2
  if (logo) {
    const k = Math.min(LG / logo.width, LG / logo.height)
    g.drawImage(logo, fx, fy - (logo.height * k) / 2, logo.width * k, logo.height * k)
  }
  g.fillText(note, fx + (logo ? LG + 22 : 0), fy)
}

export interface MotifSprite {
  url: string
  left: number // all positions are fractions of the picture
  top: number
  w: number
  h: number
  alpha: number
  turn: number // degrees to swing
  dur: number // seconds
  delay: number // seconds
}

/* the backdrop split into layers so the page can move it: the plain themed page, and every leaf, flake or flower on its own */
export function renderBackdropLayers(month: number, W = 3200, H = 1800): { bg: string; sprites: MotifSprite[] } {
  const t = MONTH_THEMES[month]
  const bg = document.createElement('canvas')
  bg.width = W / 2
  bg.height = H / 2
  const bgc = bg.getContext('2d')!
  bgc.scale(0.5, 0.5)
  const grad = bgc.createLinearGradient(0, 0, W * 0.4, H)
  grad.addColorStop(0, t.bg[0])
  grad.addColorStop(1, t.bg[1])
  bgc.fillStyle = grad
  bgc.fillRect(0, 0, W, H)
  const sprites: MotifSprite[] = []
  let n = 0
  const sink: MotifSink = (paint, x, y, size, alpha) => {
    const half = size * 1.5
    const px = Math.max(8, Math.round(half)) // sprite canvas is drawn at half scale
    const c = document.createElement('canvas')
    c.width = px
    c.height = px
    const g = c.getContext('2d')!
    g.scale(0.5, 0.5)
    g.globalAlpha = alpha
    paint(g, half, half)
    n++
    sprites.push({
      url: c.toDataURL('image/png'),
      left: (x - half) / W,
      top: (y - half) / H,
      w: (half * 2) / W,
      h: (half * 2) / H,
      alpha,
      turn: 5 + ((n * 37) % 7),
      dur: 2.2 + ((n * 13) % 9) / 5,
      delay: -((n * 17) % 10) / 5,
    })
  }
  drawMotif(bgc, t, month, W, H, 'back', 0, 0, 0, sink)
  drawMotif(bgc, t, month, W, H, 'front', 0, 0, 0, sink)
  return { bg: bg.toDataURL('image/jpeg', 0.9), sprites }
}
