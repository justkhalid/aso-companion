import { posterItems, type PosterKind } from './poster-items'
import { paintPosterOverlay } from './poster-overlay'
import type { State } from './types'

/* Clubs export: one PNG with every club on a single page. */



export { whenOf } from './poster-items'

/* One PNG with every club side by side, four to a row: poster in full (never cropped),
   name, days and time, and place underneath. Returns false when there is nothing to draw. */
export async function downloadClubsPng(state: State, kind: PosterKind = 'clubs'): Promise<boolean> {
  const clubs = posterItems(state, kind)
  if (!clubs.length) return false
  const COLS = 4
  const CW = 560 // column width
  const PH = Math.round((CW * 1200) / 848) // poster box height (A4 ratio)
  const GAP = 48
  const M = 72
  /* the info block under a poster is as tall as the longest name and schedule need */
  const sc = document.createElement('canvas').getContext('2d')!
  const nLines = (text: string, px: number, wt: number) => {
    sc.font = `${wt} ${px}px -apple-system, "Segoe UI", Inter, Arial, sans-serif`
    let lines = 0
    let cur = ''
    for (const w of text.split(/\s+/)) {
      const t = cur ? cur + ' ' + w : w
      if (sc.measureText(t).width > CW && cur) { lines++; cur = w } else cur = t
    }
    return Math.min(2, lines + (cur ? 1 : 0))
  }
  const INFO = Math.max(170, ...clubs.map((c) => 22 + nLines(c.name, 36, 800) * 42 + 16 + nLines(c.when || 'To be confirmed', 28, 600) * 34 + 8 + 34 + 10))
  const HEAD = 190
  const rows = Math.ceil(clubs.length / COLS)
  const W = M * 2 + COLS * CW + (COLS - 1) * GAP
  const H = HEAD + rows * (PH + INFO) + (rows - 1) * GAP + M
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  const font = (w: number, px: number) => `${w} ${px}px -apple-system, "Segoe UI", Inter, Arial, sans-serif`

  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  const load = (src: string) =>
    new Promise<HTMLImageElement | null>((res) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = src
    })
  const [imgs, logo] = await Promise.all([
    Promise.all(clubs.map((c) => (c.poster ? load(c.poster) : Promise.resolve(null)))),
    load('/aso-logo.webp'),
  ])

  /* header: the logo to the left of the title, the pair centred on the page */
  const title = `${state.settings.institute} ${kind}`
  const sub = `${clubs.length} ${kind} · ${state.settings.year}`
  const LOGO = 120
  g.font = font(800, 64)
  const wTitle = g.measureText(title).width
  g.font = font(500, 34)
  const wSub = g.measureText(sub).width
  const textW = Math.max(wTitle, wSub)
  const gapL = logo ? 28 : 0
  const startX = (W - ((logo ? LOGO : 0) + gapL + textW)) / 2
  const hy = 36
  if (logo) {
    const k = Math.min(LOGO / logo.width, LOGO / logo.height)
    g.drawImage(logo, startX + (LOGO - logo.width * k) / 2, hy + (LOGO - logo.height * k) / 2, logo.width * k, logo.height * k)
  }
  const tx = startX + (logo ? LOGO + gapL : 0)
  g.textBaseline = 'top'
  g.fillStyle = '#1c1c1e'
  g.font = font(800, 64)
  g.fillText(title, tx, hy + 4)
  g.fillStyle = '#5c5c63'
  g.font = font(500, 34)
  g.fillText(sub, tx, hy + 82)

  const wrap = (text: string, max: number, maxLines: number) => {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w
      if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w } else cur = t
    }
    if (cur) lines.push(cur)
    return lines.slice(0, maxLines)
  }

  clubs.forEach((c, i) => {
    /* a last row with fewer clubs sits in the middle */
    const inRow = Math.min(COLS, clubs.length - Math.floor(i / COLS) * COLS)
    const x = M + ((COLS - inRow) * (CW + GAP)) / 2 + (i % COLS) * (CW + GAP)
    const y = HEAD + Math.floor(i / COLS) * (PH + INFO + GAP)
    const im = imgs[i]
    if (im) {
      const k = Math.min(CW / im.width, PH / im.height)
      const w = im.width * k
      const h = im.height * k
      const px = x + (CW - w) / 2
      const py = y + (PH - h) / 2
      g.save()
      g.beginPath()
      g.roundRect(px, py, w, h, 18)
      g.clip()
      g.drawImage(im, px, py, w, h)
      paintPosterOverlay(g, logo, px, py, w, h)
      g.restore()
      g.strokeStyle = '#d8d8de'
      g.lineWidth = 2
      g.beginPath()
      g.roundRect(px, py, w, h, 18)
      g.stroke()
    } else {
      g.fillStyle = '#eef3fd'
      g.beginPath()
      g.roundRect(x, y, CW, PH, 18)
      g.fill()
      g.fillStyle = '#0b5ce6'
      g.font = font(800, 48)
      g.textAlign = 'center'
      wrap(c.name, CW - 80, 4).forEach((l, n) => g.fillText(l, x + CW / 2, y + PH / 2 - 60 + n * 60))
      g.textAlign = 'left'
      g.save()
      g.beginPath()
      g.roundRect(x, y, CW, PH, 18)
      g.clip()
      paintPosterOverlay(g, logo, x, y, CW, PH)
      g.restore()
    }
    g.textAlign = 'center'
    g.fillStyle = '#1c1c1e'
    g.font = font(800, 36)
    wrap(c.name, CW, 2).forEach((l, n) => g.fillText(l, x + CW / 2, y + PH + 22 + n * 42))
    const nameLines = wrap(c.name, CW, 2).length
    g.fillStyle = '#0b5ce6'
    g.font = font(600, 28)
    g.font = font(600, 28)
    const whenLines = wrap(c.when || 'To be confirmed', CW, 2)
    whenLines.forEach((l, n) => g.fillText(l, x + CW / 2, y + PH + 22 + nameLines * 42 + 8 + n * 34))
    /* the place, in bold */
    const ly = y + PH + 22 + nameLines * 42 + 16 + whenLines.length * 34 + 8
    g.fillStyle = '#1c1c1e'
    g.font = font(800, 28)
    if (c.room) g.fillText(c.room, x + CW / 2, ly, CW)
    g.textAlign = 'left'
  })

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ASO_${kind === 'clubs' ? 'Clubs' : 'Events'}_${(state.settings.year || '').replace(/[^0-9-]/g, '')}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
