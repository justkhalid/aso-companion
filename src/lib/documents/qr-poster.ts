import { ASO_COMMUNITY_URL } from '@/lib/kit/bundle'
import { WA_GREEN, cv, drawQR, get, grad, iconCanvas, loadKitFonts, spaced, ICON_STROKE } from '@/lib/kit/engine'
import { rg, type RGB } from '@/lib/kit/decor'
import { FOOT_H, defaultLook, drawFoot, drawHead, drawLogoAt, evenGap, finishPage, measureHead, paintPage, type HeadFields, type LookFields } from './common'

/* The social media QR poster: one QR code per channel, nothing boxed, on the shared page of every document. */

export type QrChannel = 'instagram' | 'facebook' | 'whatsapp'

export interface QrItem {
  id: QrChannel
  on: boolean
  label: string
  caption: string
  url: string
}

export interface QrPosterFields extends LookFields, HeadFields {
  items: QrItem[]
  icons: boolean
}

export const IG_HANDLE = 'americanspaceoujda'

export function defaultQrPoster(igHandle = IG_HANDLE): QrPosterFields {
  return {
    ...defaultLook(),
    kicker: 'FOLLOW AMERICAN SPACE OUJDA',
    headline: 'Scan and stay in the loop',
    subtitle: 'Events, clubs, English classes and everything happening at the space.',
    footer: 'American Space Oujda',
    items: [
      { id: 'instagram', on: true, label: 'INSTAGRAM', caption: `@${igHandle}`, url: `https://www.instagram.com/${igHandle}/` },
      { id: 'facebook', on: true, label: 'FACEBOOK', caption: 'American Space Oujda', url: '' },
      { id: 'whatsapp', on: true, label: 'WHATSAPP', caption: 'Join the ASO Community', url: ASO_COMMUNITY_URL },
    ],
    icons: true,
  }
}

/** null when the link can go in a QR code, else a short message for the field */
export function checkLink(url: string): string | null {
  const u = url.trim()
  if (!u) return 'Add the link this code should open'
  try {
    const p = new URL(u)
    if (p.protocol !== 'https:' && p.protocol !== 'http:') return 'The link must start with https://'
  } catch {
    return 'This is not a link (start with https://)'
  }
  return u.length > 400 ? 'This link is too long for a QR code' : null
}

/** what stops the poster from being saved, in words for the director */
export function posterProblems(f: QrPosterFields): string[] {
  const on = f.items.filter((i) => i.on)
  const out: string[] = []
  if (!on.length) out.push('Switch on at least one QR code')
  for (const i of on) {
    const m = checkLink(i.url)
    if (m) out.push(`${i.label.charAt(0) + i.label.slice(1).toLowerCase()}: ${m}`)
  }
  return out
}

/* where the codes sit on each way round: preferred code size by count, the gap between two codes (bracket to bracket),
   icon size, and the small gaps inside a column */
const BODY = {
  portrait: { qs: [420, 320, 230], gapB: [0, 110, 64], icon: [72, 60], iconGap: 26, labelGap: 30, captionGap: 38 },
  landscape: { qs: [260, 240, 230], gapB: [0, 140, 90], icon: [52, 48], iconGap: 20, labelGap: 26, captionGap: 30 },
} as const

const FB_BLUE: [RGB, RGB] = [[24, 119, 242], [14, 60, 150]]

/* line icons for the two channels the kit has no icon for, in the same family: 24 grid, round caps, the kit's stroke weight */
const CHANNEL_SVG: Partial<Record<QrChannel, string>> = {
  instagram: '<rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none"/><circle cx="12" cy="12" r="4.2" fill="none"/><circle cx="17.6" cy="6.4" r="0.6" fill="none"/>',
  facebook: '<path d="M17.5 2.5h-3a4.5 4.5 0 0 0-4.5 4.5v3H7v4h3v8h4v-8h2.8l.7-4H14V7.2a.8.8 0 0 1 .8-.8h2.7z" fill="none"/>',
}

async function channelIcon(id: QrChannel, size: number, c1: RGB, c2: RGB) {
  const inner = CHANNEL_SVG[id]
  if (!inner) return iconCanvas('i-whatsapp', size, c1, c2)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><g stroke="#000" stroke-width="${ICON_STROKE * 1.6}" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`
  const layer = await get('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
  const c = cv(size, size), x = c.getContext('2d')!
  x.drawImage(layer, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = grad(x, 0, size, c1, c2)
  x.fillRect(0, 0, size, size)
  return c
}

/** The poster as a canvas `width` pixels wide, A4 shaped. Channels that are off are left out; the caller checks the links first.
 *  Spacing is worked out, not guessed (see evenGap): the margin above the logo equals the margin under the name of the space,
 *  and the groups are separated by the same gap. */
export async function renderQrPoster(f: QrPosterFields, width: number): Promise<HTMLCanvasElement> {
  await loadKitFonts()
  const p = await paintPage(f, width)
  const { x, L, CX, C1, C2, INK } = p
  const B = BODY[f.landscape ? 'landscape' : 'portrait']
  const head = measureHead(p, f)

  const items = f.items.filter((i) => i.on && !checkLink(i.url))
  const n = items.length
  const labelFs = n === 3 ? 19 : 22, capFs = n === 3 ? 24 : 28
  const isz = f.icons ? B.icon[n === 3 ? 1 : 0] : 0
  const labelCap = Math.round(labelFs * 0.72), capCap = Math.round(capFs * 0.72)
  const hasCaption = items.some((i) => i.caption.trim())
  const iconPart = isz ? isz + B.iconGap : 0
  const fixed = iconPart + labelCap + B.labelGap + B.captionGap + (hasCaption ? capCap + 6 : 0)
  let qs = 0, m = 0, blockH = 0
  if (n) {
    const avail = L.h - 2 * L.margin - L.logoH - head.height - FOOT_H - 3 * L.gapMin
    const byWidth = (L.w - 2 * L.sideMargin - (n - 1) * B.gapB[n - 1]) / (n * 1.2)
    qs = Math.max(120, Math.floor(Math.min(B.qs[n - 1], byWidth, (avail - fixed) / 1.2)))
    m = Math.round(qs * 0.1)
    blockH = fixed + qs + 2 * m
  }
  const g = evenGap(p, head.height, [blockH])

  const logoTop = L.margin
  await drawLogoAt(p, logoTop)
  const headTop = logoTop + L.logoH + g
  drawHead(p, head, headTop)

  const blockTop = headTop + head.height + g
  if (n) {
    const colW = qs + 2 * m, gapB = B.gapB[n - 1]
    const left = CX - (n * colW + (n - 1) * gapB) / 2
    for (let i = 0; i < n; i++) {
      const it = items[i], cx = left + colW / 2 + i * (colW + gapB)
      const pair: [RGB, RGB] = it.id === 'whatsapp' ? WA_GREEN : it.id === 'facebook' ? FB_BLUE : [C1, C2]
      if (isz) {
        /* the icons are drawn on a 24 grid with a little air round them: scale so the drawing itself is isz tall */
        const full = Math.round(isz * 24 / 19.3), ic = await channelIcon(it.id, 240, pair[0], pair[1])
        x.save()
        x.shadowColor = 'rgba(40,30,60,.26)'
        x.shadowBlur = 18
        x.shadowOffsetY = 8
        x.drawImage(ic, cx - full / 2, blockTop + isz / 2 - full / 2, full, full)
        x.restore()
      }
      const labelBase = blockTop + iconPart + labelCap
      x.font = `700 ${labelFs}px ManropeA`
      spaced(x, it.label.trim().toUpperCase(), cx, labelBase, n === 3 ? 4 : 6, rg(INK, 0.92))
      const qrTop = labelBase + B.labelGap + m
      drawQR(x, it.url, cx, qrTop + qs / 2, qs, pair[0], pair[1], C1, C2)
      if (it.caption.trim()) {
        x.font = `500 ${capFs}px ManropeA`
        x.textAlign = 'center'
        x.fillStyle = rg(INK, 0.62)
        x.fillText(it.caption.trim(), cx, qrTop + qs + m + B.captionGap + capCap, colW + gapB - 12)
      }
    }
  }

  drawFoot(p, f.footer, blockTop + blockH + g)
  const c = finishPage(p)
  c.dataset.overflow = head.cut ? '1' : ''
  return c
}
