/* the edge decorations of a story as separate moving pieces, like the corner decorations of the month story:
   every piece sways, bobs and breathes a little. Rings ripple outwards, sparkles twinkle, stripes slide,
   film strips and triangles scroll. Everything repeats exactly after one loop. */
import { DECOR, type RGB } from './decor'
import { cv, svgLayer } from './engine'

type Mode = 'sway' | 'pulse' | 'twinkle' | 'slide'
interface Piece { img: HTMLCanvasElement; cx: number; cy: number; mode: Mode; k: number; ph: number; dir: number }
export interface DecorAnim {
  draw(x: CanvasRenderingContext2D, time: number, loop: number, amount: number): void
}

const NS = 'http://www.w3.org/2000/svg'
const PAD = 14

const loadSvg = (svg: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image()
  im.onload = () => res(im)
  im.onerror = () => rej(new Error('decoration'))
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
})

/* the top-level pieces of a decoration, merged where two belong together (an atom ring and its electron) */
function pieces(body: string, decor: string): string[][] {
  const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${body}</svg>`, 'image/svg+xml')
  const kids = Array.from(doc.documentElement.children).map((n) => new XMLSerializer().serializeToString(n))
  if (decor !== 'atoms') return kids.map((k) => [k])
  const out: string[][] = []
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].startsWith('<ellipse') && kids[i + 1]?.startsWith('<circle')) { out.push([kids[i], kids[i + 1]]); i++ }
    else out.push([kids[i]])
  }
  return out
}

export async function makeDecorAnim(decor: string, c1: RGB, c2: RGB): Promise<DecorAnim | null> {
  if (!decor || decor === 'none' || !DECOR[decor]) return null
  const body = DECOR[decor](c1, c2)

  /* a pattern that runs along an edge scrolls: the pattern repeats, so the loop closes */
  if (decor === 'film' || decor === 'triangles') {
    const img = await svgLayer(body)
    const period = decor === 'film' ? 64 : 92
    return {
      draw(x, time, loop, amount) {
        if (amount <= 0) { x.drawImage(img, 0, 0); return }
        const u = ((time / loop) % 1) * period * amount
        const d = Math.round(u)
        if (decor === 'film') {
          x.drawImage(img, 0, d)
          x.save(); x.beginPath(); x.rect(0, 0, 1080, d); x.clip(); x.drawImage(img, 0, d - period * Math.max(1, amount)); x.restore()
        } else {
          /* top row drifts right, bottom row drifts left */
          x.save(); x.beginPath(); x.rect(0, 0, 1080, 960); x.clip(); x.drawImage(img, d, 0); x.beginPath(); x.rect(0, 0, d, 960); x.clip(); x.drawImage(img, d - period * Math.max(1, amount), 0); x.restore()
          x.save(); x.beginPath(); x.rect(0, 960, 1080, 960); x.clip(); x.drawImage(img, -d, 0); x.beginPath(); x.rect(1080 - d, 960, d, 960); x.clip(); x.drawImage(img, -d + period * Math.max(1, amount), 0); x.restore()
        }
      },
    }
  }

  /* measure every piece in a hidden page, with room around the picture for pieces that run off the edge */
  const OFF = 300
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', String(1080 + 2 * OFF)); svg.setAttribute('height', String(1920 + 2 * OFF))
  svg.setAttribute('viewBox', `${-OFF} ${-OFF} ${1080 + 2 * OFF} ${1920 + 2 * OFF}`)
  svg.style.cssText = 'position:fixed;left:-9000px;top:0;visibility:hidden'
  const groups = pieces(body, decor)
  const holders: SVGGElement[] = groups.map((g) => {
    const el = document.createElementNS(NS, 'g')
    el.innerHTML = g.join('')
    svg.appendChild(el)
    return el
  })
  document.body.appendChild(svg)
  const base = svg.getBoundingClientRect()
  const boxes = holders.map((h) => { const r = h.getBoundingClientRect(); return { x: r.left - base.left - OFF - PAD, y: r.top - base.top - OFF - PAD, w: r.width + 2 * PAD, h: r.height + 2 * PAD } })
  document.body.removeChild(svg)

  const list: Piece[] = []
  for (let i = 0; i < groups.length; i++) {
    const b = boxes[i]
    if (b.w < 4 || b.h < 4 || b.w > 3000 || b.h > 3000) continue
    const w = Math.ceil(b.w), h = Math.ceil(b.h)
    try {
      const im = await loadSvg(`<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">${groups[i].join('')}</svg>`)
      const c = cv(w, h)
      c.getContext('2d')!.drawImage(im, 0, 0, w, h)
      const sparkle = decor !== 'rings' && groups[i].length === 1 && groups[i][0].startsWith('<path') && Math.max(b.w, b.h) < 90
      const line = groups[i][0].startsWith('<line')
      list.push({
        img: c, cx: b.x + b.w / 2, cy: b.y + b.h / 2,
        mode: decor === 'rings' ? 'pulse' : sparkle ? 'twinkle' : line ? 'slide' : 'sway',
        k: 1 + (i % 3), ph: (i * 1.7) % (2 * Math.PI), dir: i % 2 ? 1 : -1,
      })
    } catch { /* a piece that cannot be drawn simply stays out */ }
  }

  return {
    draw(x, time, loop, amount) {
      const u = (2 * Math.PI * time) / loop
      for (const s of list) {
        const w = s.img.width, h = s.img.height
        x.save()
        if (s.mode === 'pulse') {
          /* rings breathe outwards one after another */
          const sc = 1 + 0.03 * amount * Math.sin(u * 2 - s.ph)
          x.translate(s.cx, s.cy); x.scale(sc, sc)
        } else if (s.mode === 'twinkle') {
          const v = Math.sin(u * 3 + s.ph)
          const sc = 1 + 0.35 * amount * v
          x.globalAlpha = 0.65 + 0.35 * (v + 1) / 2
          x.translate(s.cx, s.cy); x.rotate(0.35 * amount * Math.sin(u + s.ph)); x.scale(sc, sc)
        } else if (s.mode === 'slide') {
          const d = Math.sin(u + s.ph) * 22 * amount
          x.translate(s.cx + d * 0.7, s.cy - d * 0.7)
        } else {
          const sway = Math.sin(u * s.k + s.ph) * 5 * amount
          const bob = Math.sin(u * s.k + s.ph + 1.3) * 9 * amount
          const side = Math.cos(u * s.k + s.ph) * 5 * amount
          x.translate(s.cx + side, s.cy + bob); x.rotate((sway * Math.PI) / 180)
          const sc = 1 + Math.sin(u * 2 + s.ph) * 0.03 * amount
          x.scale(sc, sc)
        }
        x.drawImage(s.img, -w / 2, -h / 2)
        x.restore()
      }
    },
  }
}
