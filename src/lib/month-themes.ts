/* One look per month for the monthly calendar picture: background, title colour and a drawn motif
   (leaves in autumn, snow in winter, blossom and flowers in spring, sun and waves in summer). Everything is
   drawn with the canvas, no image files. */

export interface MonthTheme {
  name: string
  bg: [string, string]
  title: string
  accent: string // weekday names and today
  motif: 'snow' | 'blossom' | 'flowers' | 'rain' | 'sun' | 'waves' | 'leaves'
  colors: string[] // colours used by the motif
}

export const MONTH_THEMES: MonthTheme[] = [
  { name: 'January', bg: ['#E6F0FA', '#F8FBFF'], title: '#1F4E8C', accent: '#2F6DB5', motif: 'snow', colors: ['#FFFFFF', '#CFE3F7', '#9CC3EA'] },
  { name: 'February', bg: ['#FCEAF0', '#FFF8FA'], title: '#B03A5B', accent: '#C2557A', motif: 'blossom', colors: ['#F8BBD0', '#F48FB1', '#FFE0EB'] },
  { name: 'March', bg: ['#E8F6EA', '#FBFFF8'], title: '#2E7D32', accent: '#3C8F40', motif: 'flowers', colors: ['#FFFFFF', '#FFD54F', '#A5D6A7'] },
  { name: 'April', bg: ['#E4F2FB', '#F6FBFF'], title: '#1D6FA5', accent: '#2A82BC', motif: 'rain', colors: ['#7FB9E6', '#A9D3F2', '#F8BBD0'] },
  { name: 'May', bg: ['#FFEEF2', '#FFFAF6'], title: '#BF1E5A', accent: '#D0306C', motif: 'flowers', colors: ['#EC407A', '#F48FB1', '#C2185B'] },
  { name: 'June', bg: ['#FFF6D9', '#FFFDF4'], title: '#D98200', accent: '#E69500', motif: 'sun', colors: ['#FFC107', '#FFB300', '#FFE082'] },
  { name: 'July', bg: ['#DDF5F8', '#F6FEFF'], title: '#00838F', accent: '#0097A7', motif: 'waves', colors: ['#4DD0E1', '#26C6DA', '#FFC107'] },
  { name: 'August', bg: ['#FFEFDC', '#FFFAF2'], title: '#C9601A', accent: '#DD7125', motif: 'sun', colors: ['#FF9800', '#F57C00', '#FFCC80'] },
  { name: 'September', bg: ['#FFF3D6', '#FFFCF2'], title: '#A87400', accent: '#BC8500', motif: 'leaves', colors: ['#F9A825', '#FBC02D', '#E6A000', '#8BC34A'] },
  { name: 'October', bg: ['#FCE8D8', '#FFF8F1'], title: '#C62828', accent: '#C62828', motif: 'leaves', colors: ['#E64A19', '#F57C00', '#FBC02D', '#C62828', '#EF6C00'] },
  { name: 'November', bg: ['#F2E6DD', '#FBF6F2'], title: '#7B3F20', accent: '#8D4A26', motif: 'leaves', colors: ['#8D4A26', '#B5651D', '#A1362B', '#C98A3D'] },
  { name: 'December', bg: ['#E5ECF8', '#F7F9FF'], title: '#1B3A6B', accent: '#C62828', motif: 'snow', colors: ['#FFFFFF', '#C7D8F2', '#E57373'] },
]

/* small deterministic random numbers, so a month always looks the same */
function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function leaf(g: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  const grad = g.createLinearGradient(-size * 0.5, -size, size * 0.5, size)
  grad.addColorStop(0, color)
  grad.addColorStop(1, shade(color, -0.25))
  g.fillStyle = grad
  g.beginPath()
  g.moveTo(0, -size)
  g.bezierCurveTo(size * 0.95, -size * 0.45, size * 0.8, size * 0.55, 0, size)
  g.bezierCurveTo(-size * 0.8, size * 0.55, -size * 0.95, -size * 0.45, 0, -size)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,.35)'
  g.lineWidth = Math.max(2, size * 0.04)
  g.beginPath()
  g.moveTo(0, -size * 0.85)
  g.lineTo(0, size * 1.15)
  for (let k = -2; k <= 2; k++) {
    g.moveTo(0, k * size * 0.28)
    g.lineTo(size * 0.45, k * size * 0.28 - size * 0.22)
    g.moveTo(0, k * size * 0.28)
    g.lineTo(-size * 0.45, k * size * 0.28 - size * 0.22)
  }
  g.stroke()
  g.restore()
}

function flake(g: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.strokeStyle = color
  g.lineWidth = Math.max(3, size * 0.07)
  g.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    g.rotate(Math.PI / 3)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, size)
    g.moveTo(0, size * 0.55)
    g.lineTo(size * 0.25, size * 0.8)
    g.moveTo(0, size * 0.55)
    g.lineTo(-size * 0.25, size * 0.8)
    g.stroke()
  }
  g.restore()
}

function flower(g: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, petal: string, centre: string, n = 6) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.fillStyle = petal
  for (let i = 0; i < n; i++) {
    g.rotate((Math.PI * 2) / n)
    g.beginPath()
    g.ellipse(0, -size * 0.58, size * 0.3, size * 0.5, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = centre
  g.beginPath()
  g.arc(0, 0, size * 0.28, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

function drop(g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(x, y - size)
  g.bezierCurveTo(x + size * 0.8, y, x + size * 0.7, y + size * 0.9, x, y + size * 0.9)
  g.bezierCurveTo(x - size * 0.7, y + size * 0.9, x - size * 0.8, y, x, y - size)
  g.fill()
}

function sun(g: CanvasRenderingContext2D, x: number, y: number, size: number, c1: string, c2: string) {
  g.save()
  g.translate(x, y)
  g.strokeStyle = c2
  g.lineWidth = size * 0.1
  g.lineCap = 'round'
  for (let i = 0; i < 14; i++) {
    g.rotate((Math.PI * 2) / 14)
    g.beginPath()
    g.moveTo(0, size * 1.15)
    g.lineTo(0, size * (i % 2 ? 1.45 : 1.65))
    g.stroke()
  }
  const grad = g.createRadialGradient(0, 0, size * 0.1, 0, 0, size)
  grad.addColorStop(0, '#FFF3C4')
  grad.addColorStop(1, c1)
  g.fillStyle = grad
  g.beginPath()
  g.arc(0, 0, size, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

function wave(g: CanvasRenderingContext2D, W: number, y: number, amp: number, color: string, phase: number) {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(0, y)
  for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x / 130 + phase) * amp)
  g.lineTo(W, y + amp * 6)
  g.lineTo(0, y + amp * 6)
  g.fill()
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

/* scatter the motif: dense in the top corners and bottom corners, a few along the edges; `front` pieces are
   drawn over the corners of the calendar card, `back` ones behind it */
export function drawMotif(g: CanvasRenderingContext2D, t: MonthTheme, month: number, W: number, H: number, layer: 'back' | 'front' | 'cell', cx = 0, cy = 0, cell = 0) {
  const r = rng(month + 3 + (layer === 'front' ? 50 : 0))
  const col = () => t.colors[Math.floor(r() * t.colors.length)]
  const place = (x: number, y: number, size: number) => {
    const rot = r() * Math.PI * 2
    if (t.motif === 'leaves') leaf(g, x, y, size, rot, col())
    else if (t.motif === 'snow') flake(g, x, y, size * 0.9, rot, col())
    else if (t.motif === 'blossom') flower(g, x, y, size * 0.8, rot, col(), '#FFF176', 5)
    else if (t.motif === 'flowers') flower(g, x, y, size * 0.8, rot, col(), '#FFC107', 6)
    else if (t.motif === 'rain') {
      if (r() < 0.65) drop(g, x, y, size * 0.45, col())
      else flower(g, x, y, size * 0.6, rot, t.colors[2], '#FFC107', 5)
    } else if (t.motif === 'sun') {
      flower(g, x, y, size * 0.5, rot, t.colors[2], t.colors[0], 8)
    } else if (t.motif === 'waves') {
      drop(g, x, y, size * 0.35, t.colors[0])
    }
  }
  if (layer === 'cell') {
    /* one big faint drawing in an empty day, like a printed wall calendar */
    if (t.motif === 'sun') sun(g, cx, cy, cell * 0.55, t.colors[0], t.colors[1])
    else if (t.motif === 'waves') drop(g, cx, cy, cell * 0.7, t.colors[0])
    else place(cx, cy, cell)
    return
  }
  const cluster = (px: number, py: number, spread: number, n: number, size: number) => {
    for (let i = 0; i < n; i++) place(px + (r() - 0.5) * spread, py + (r() - 0.5) * spread * 0.8, size * (0.55 + r() * 0.8))
  }
  g.save()
  g.globalAlpha = layer === 'front' ? 0.95 : 0.9
  if (layer === 'back') {
    cluster(120, 90, 420, 11, 120) // top left
    cluster(W - 150, 70, 300, 6, 100) // top right
    cluster(W * 0.2, 40, 440, 4, 70) // along the top, away from the month name
    cluster(W * 0.8, 40, 440, 4, 70)
    cluster(W - 120, H - 70, 420, 10, 120) // bottom right
    cluster(100, H - 60, 360, 6, 100) // bottom left
  } else {
    cluster(40, H - 40, 150, 4, 80) // only the bottom edge, clear of the last row
    cluster(W - 50, H - 40, 150, 4, 80)
  }
  g.restore()
  /* sun and sea add one big shape */
  if (layer === 'back') {
    if (t.motif === 'sun') sun(g, W - 330, 150, 78, t.colors[0], t.colors[1])
    if (t.motif === 'waves') {
      sun(g, 300, 150, 62, t.colors[2], '#FFD54F')
      g.globalAlpha = 0.55
      wave(g, W, H - 120, 14, t.colors[1], 0)
      g.globalAlpha = 0.4
      wave(g, W, H - 90, 12, t.colors[0], 2)
      g.globalAlpha = 1
    }
  }
}
