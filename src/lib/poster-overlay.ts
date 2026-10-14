/* the same poster finish for the downloaded pictures: a soft shade at the top and the logo in a white badge top right.
   Call it inside the clip of the poster's rectangle. */
export function paintPosterOverlay(g: CanvasRenderingContext2D, logo: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  const shade = g.createLinearGradient(0, y, 0, y + Math.round(h * 0.28))
  shade.addColorStop(0, 'rgba(0,0,0,.4)')
  shade.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shade
  g.fillRect(x, y, w, Math.round(h * 0.28))
  if (!logo) return
  const d = Math.round(w * 0.15)
  const inset = Math.round(w * 0.04)
  const cx = x + w - inset - d / 2
  const cy = y + inset + d / 2
  g.save()
  g.shadowColor = 'rgba(0,0,0,.32)'
  g.shadowBlur = d * 0.18
  g.shadowOffsetY = d * 0.05
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(cx, cy, d / 2, 0, Math.PI * 2)
  g.fill()
  g.restore()
  const k = Math.min((d * 0.68) / logo.width, (d * 0.68) / logo.height)
  g.drawImage(logo, cx - (logo.width * k) / 2, cy - (logo.height * k) / 2, logo.width * k, logo.height * k)
}
