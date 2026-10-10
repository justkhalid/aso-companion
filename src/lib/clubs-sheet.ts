import { DAY_FULL } from './constants'
import type { Club, State } from './types'

/* Clubs export: one PNG with every club on a single page. */



export function whenOf(c: Club): string {
  const names = (c.days || []).map((d) => DAY_FULL[d] || d).join(' and ')
  const lead = !names ? '' : c.freq === 'biweekly' ? 'Every other ' + names : c.freq === 'monthly' ? 'Monthly on ' + names : 'Every ' + names
  return [lead, c.time].filter(Boolean).join(' · ')
}

/* One PNG with every club side by side, four to a row: poster in full (never cropped),
   name, days and time, and place underneath. Returns false when there is nothing to draw. */
export async function downloadClubsPng(state: State): Promise<boolean> {
  const clubs = (state.clubs || []).filter((c) => !c.placeholder)
  if (!clubs.length) return false
  const COLS = 4
  const CW = 560 // column width
  const PH = Math.round((CW * 1200) / 848) // poster box height (A4 ratio)
  const GAP = 48
  const M = 72
  const INFO = 170
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
  g.fillStyle = '#1c1c1e'
  g.font = font(800, 64)
  g.textBaseline = 'top'
  g.fillText(`${state.settings.institute} clubs`, M, 64)
  g.fillStyle = '#5c5c63'
  g.font = font(500, 34)
  g.fillText(`${clubs.length} clubs · ${state.settings.year}`, M, 142)

  const load = (src: string) =>
    new Promise<HTMLImageElement | null>((res) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = src
    })
  const imgs = await Promise.all(clubs.map((c) => (c.poster ? load(c.poster) : Promise.resolve(null))))

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
    const x = M + (i % COLS) * (CW + GAP)
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
    }
    g.textAlign = 'center'
    g.fillStyle = '#1c1c1e'
    g.font = font(800, 36)
    wrap(c.name, CW, 2).forEach((l, n) => g.fillText(l, x + CW / 2, y + PH + 22 + n * 42))
    const nameLines = wrap(c.name, CW, 2).length
    g.fillStyle = '#0b5ce6'
    g.font = font(600, 28)
    g.fillText(whenOf(c) || 'To be confirmed', x + CW / 2, y + PH + 22 + nameLines * 42 + 8, CW)
    g.fillStyle = '#5c5c63'
    g.font = font(500, 26)
    g.fillText([c.room, state.settings.institute].filter(Boolean).join(' · '), x + CW / 2, y + PH + 22 + nameLines * 42 + 50, CW)
    g.textAlign = 'left'
  })

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ASO_Clubs_${(state.settings.year || '').replace(/[^0-9-]/g, '')}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
