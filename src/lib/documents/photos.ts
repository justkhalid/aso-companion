import { loadImage } from '@/lib/kit/engine'

/* Photos on a document: chosen by the director, kept only in the browser, drawn whole (never cropped) as a collage. */

export interface DocPhoto {
  id: string
  name: string
  url: string /* an object URL of the file the director chose: it never leaves the browser */
}

/** the photo files the director may add: a real picture, not too heavy, nothing that can run code */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024
export const MAX_PHOTOS = 4

const FRAME = 6 /* the white edge round a photo */
const PHOTO_GAP = 14

const photoCache = new Map<string, HTMLImageElement>()
/** the loaded pictures of a list of photos; one that cannot be read is left out */
export async function loadPhotos(list: DocPhoto[]): Promise<HTMLImageElement[]> {
  const out = await Promise.all(
    list.slice(0, MAX_PHOTOS).map(async (ph) => {
      let im = photoCache.get(ph.url)
      if (!im) {
        try {
          im = await loadImage(ph.url)
        } catch {
          return null
        }
        photoCache.set(ph.url, im)
      }
      return im
    }),
  )
  return out.filter((i): i is HTMLImageElement => !!i)
}

/** a whole photo with a white edge and a soft shadow; (left, top) is the corner of the edge, w and h are the picture */
export function drawPhoto(x: CanvasRenderingContext2D, im: HTMLImageElement, left: number, top: number, w: number, h: number) {
  x.save()
  x.shadowColor = 'rgba(40,30,60,.22)'
  x.shadowBlur = 20
  x.shadowOffsetY = 8
  x.fillStyle = '#ffffff'
  x.fillRect(left, top, w + 2 * FRAME, h + 2 * FRAME)
  x.restore()
  x.drawImage(im, left + FRAME, top + FRAME, w, h)
}

export interface Placed {
  i: number
  x: number
  y: number
  w: number
  h: number
}

/** A collage of whole photos: they are cut into consecutive rows, every row as wide as the others and its photos one height,
 *  and the cut with the most picture area that fits the box is kept. Nothing is cropped. Returns where each photo goes
 *  (x, y of its frame, w and h of the picture) and the size of the whole, centred in the box. */
export function collage(asp: number[], boxW: number, boxH: number): { items: Placed[]; w: number; h: number } {
  const n = asp.length
  let best: { rows: number[][]; W: number; score: number } | null = null
  for (let mask = 0; mask < 1 << Math.max(0, n - 1); mask++) {
    const rows: number[][] = [[0]]
    for (let k = 1; k < n; k++) {
      if (mask & (1 << (k - 1))) rows.push([k])
      else rows[rows.length - 1].push(k)
    }
    const cs = rows.map((r) => 2 * FRAME * r.length + PHOTO_GAP * (r.length - 1))
    const As = rows.map((r) => r.reduce((a, k) => a + asp[k], 0))
    const fixed = 2 * FRAME * rows.length + PHOTO_GAP * (rows.length - 1)
    /* the widest the whole may be so that its height is boxH */
    const W = Math.min(boxW, (boxH - fixed + cs.reduce((a, c, r) => a + c / As[r], 0)) / As.reduce((a, A) => a + 1 / A, 0))
    if (W <= 0) continue
    const score = rows.reduce((a, r, ri) => {
      const h = (W - cs[ri]) / As[ri]
      return a + r.reduce((b, k) => b + h * h * asp[k], 0)
    }, 0)
    if (!best || score > best.score) best = { rows, W, score }
  }
  if (!best) return { items: [], w: 0, h: 0 }
  const { rows, W } = best
  const items: Placed[] = []
  let y = 0
  rows.forEach((r, ri) => {
    const c = 2 * FRAME * r.length + PHOTO_GAP * (r.length - 1)
    const h = (W - c) / r.reduce((a, k) => a + asp[k], 0)
    let x = 0
    for (const k of r) {
      const w = h * asp[k]
      items.push({ i: k, x: x + (boxW - W) / 2, y, w, h })
      x += w + 2 * FRAME + PHOTO_GAP
    }
    y += h + 2 * FRAME + (ri < rows.length - 1 ? PHOTO_GAP : 0)
  })
  return { items, w: W, h: y }
}

/** the collage drawn with its top left corner at (left, top), centred in a box of width boxW */
export function drawCollage(x: CanvasRenderingContext2D, imgs: HTMLImageElement[], cg: ReturnType<typeof collage>, left: number, top: number) {
  for (const it of cg.items) drawPhoto(x, imgs[it.i], left + it.x, top + it.y, it.w, it.h)
}

export const aspects = (imgs: HTMLImageElement[]) => imgs.map((i) => i.naturalWidth / i.naturalHeight)
