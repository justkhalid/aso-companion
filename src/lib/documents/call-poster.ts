import { dim, drawQR, fit, gradTitle, grad, loadKitFonts, measure, spaced } from '@/lib/kit/engine'
import { rg } from '@/lib/kit/decor'
import { FOOT_H, defaultLook, drawFoot, drawHead, drawLogoAt, evenGap, finishPage, measureHead, paintPage, type HeadFields, type LookFields } from './common'
import { checkLink } from './qr-poster'
import { aspects, collage, drawCollage, loadPhotos, type DocPhoto } from './photos'
import { MONTHS, parseDay } from './dates'

/* The volunteers and interns call: an intro, the opportunities, the registration dates with a button, a code to apply and
   the photos of the space. Photos are never cropped: each one is drawn whole, whatever its shape. */

export interface CallPosterFields extends LookFields, HeadFields {
  rolesLabel: string
  roles: string[]
  dateLabel: string
  /* yyyy-mm-dd, or empty */
  dateFrom: string
  dateTo: string
  /* the words on the button (empty: no button) */
  cta: string
  /* up to three lines: e-mail, phone, address */
  contact: string
  qrOn: boolean
  qrUrl: string
  qrCaption: string
  photos: DocPhoto[]
}

export const MAX_ROLES = 6

export function defaultCallPoster(): CallPosterFields {
  return {
    ...defaultLook(),
    kicker: 'JOIN THE TEAM',
    headline: 'Volunteers and interns needed',
    subtitle: 'Are you passionate about your community? Join the American Space Oujda and help us run clubs, events and English classes.',
    footer: 'American Space Oujda',
    rolesLabel: 'OPPORTUNITIES AVAILABLE',
    roles: ['English teachers', 'Club moderators', 'Event support', 'Program development'],
    dateLabel: 'REGISTRATION PERIOD',
    dateFrom: '',
    dateTo: '',
    cta: 'JOIN US!',
    contact: 'americanspaceoujda.app@gmail.com',
    qrOn: false,
    qrUrl: '',
    qrCaption: 'Scan to register',
    photos: [],
  }
}

/** "16 - 30 September 2026", "28 September - 5 October 2026", "From ..." or "Until ..."; empty when no date is set */
export function formatDates(from: string, to: string): string {
  const a = parseDay(from), b = parseDay(to)
  if (a && b) {
    if (a.y === b.y && a.mo === b.mo) return a.d === b.d ? `${a.d} ${MONTHS[a.mo]} ${a.y}` : `${a.d} - ${b.d} ${MONTHS[a.mo]} ${a.y}`
    if (a.y === b.y) return `${a.d} ${MONTHS[a.mo]} - ${b.d} ${MONTHS[b.mo]} ${a.y}`
    return `${a.d} ${MONTHS[a.mo]} ${a.y} - ${b.d} ${MONTHS[b.mo]} ${b.y}`
  }
  if (a) return `From ${a.d} ${MONTHS[a.mo]} ${a.y}`
  if (b) return `Until ${b.d} ${MONTHS[b.mo]} ${b.y}`
  return ''
}

export function callProblems(f: CallPosterFields): string[] {
  const out: string[] = []
  if (!f.headline.trim()) out.push('Add a title')
  if (f.dateFrom && f.dateTo && f.dateTo < f.dateFrom) out.push('The end date is before the start date')
  if (f.qrOn) {
    const m = checkLink(f.qrUrl)
    if (m) out.push(`Code: ${m}`)
  }
  return out
}

/* sizes and gaps on each way round (units of the sheet) */
const B = {
  portrait: { side: 64, photoPref: 250, qsPref: 190, rowGapText: 90, gapMin: 40 },
  landscape: { side: 70, panelW: 440, panelGap: 70, qsPref: 150, rowGapText: 70, gapMin: 28 },
} as const

const ROLE_FS = 28, ROLE_LINE = 42, LABEL_FS = 22, DATE_SIZE = 44, CT_FS = 26, CT_LINE = 38, PILL_H = 62

/** The poster as a canvas `width` pixels wide, A4 shaped. `dataset.overflow` is "1" when the page is too full to keep the gaps. */
export async function renderCallPoster(f: CallPosterFields, width: number): Promise<HTMLCanvasElement> {
  await loadKitFonts()
  const p = await paintPage(f, width)
  const { x, L, C1, C2, INK } = p
  const land = f.landscape
  const photos = await loadPhotos(f.photos)
  const asp = aspects(photos)
  const n = photos.length

  /* the column the writing lives in: the whole width, or the left part when the photos stand on the right */
  const sideP = land ? B.landscape.side : B.portrait.side
  const panelW = land && n ? B.landscape.panelW : 0
  const colLeft = sideP, colRight = L.w - sideP - (panelW ? panelW + B.landscape.panelGap : 0)
  const colW = colRight - colLeft
  p.CX = (colLeft + colRight) / 2
  const CX = p.CX
  const gapMin = land ? B.landscape.gapMin : B.portrait.gapMin
  const qsPref = land ? B.landscape.qsPref : B.portrait.qsPref
  const rowGapText = land ? B.landscape.rowGapText : B.portrait.rowGapText

  const head = measureHead(p, f, colW, 3)

  /* ---- the opportunities ---- */
  const roles = f.roles.map((r) => r.trim()).filter(Boolean).slice(0, MAX_ROLES)
  const rolesLabel = f.rolesLabel.trim().toUpperCase()
  const roleCols = roles.length > 4 ? 2 : 1
  const roleRows = Math.ceil(roles.length / roleCols)
  const LABEL_CAP = Math.round(LABEL_FS * 0.72), roleCap = Math.round(ROLE_FS * 0.72)
  let rolesH = 0
  if (rolesLabel) rolesH = LABEL_CAP
  if (roles.length) rolesH += (rolesH ? 26 : 0) + roleCap + (roleRows - 1) * ROLE_LINE + 6

  /* ---- registration: the dates and the button, with a code beside them ---- */
  const dates = formatDates(f.dateFrom, f.dateTo), dateLabel = f.dateLabel.trim().toUpperCase(), cta = f.cta.trim().toUpperCase()
  const contact = f.contact.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
  const wantQr = f.qrOn && !checkLink(f.qrUrl)
  const capText = f.qrCaption.trim(), capFs = 24, capCap = Math.round(capFs * 0.72), capExtra = capText ? 30 + capCap : 0
  x.font = `italic 600 ${DATE_SIZE}px Bodoni`
  const dateCap = x.measureText('H').actualBoundingBoxAscent, ctCap = Math.round(CT_FS * 0.72)
  const showLabel = !!dateLabel && !!(dates || cta || contact.length)
  /* the writing column, top to bottom: [label] [dates] [button] [contact], with these gaps between the parts that exist */
  const parts: { h: number; gap: number }[] = []
  if (showLabel) parts.push({ h: LABEL_CAP, gap: 0 })
  if (dates) parts.push({ h: dateCap, gap: 26 })
  if (cta) parts.push({ h: PILL_H, gap: 30 })
  if (contact.length) parts.push({ h: ctCap + (contact.length - 1) * CT_LINE, gap: 30 })
  const textH = parts.reduce((a, q, i) => a + q.h + (i ? q.gap : 0), 0)

  /* ---- fit: the photos (above the writing on a portrait page) and the code give way before the gaps do ---- */
  let bandBoxH: number = B.portrait.photoPref
  let band = !land && n ? collage(asp, colW, bandBoxH) : null
  let qs = wantQr ? qsPref : 0
  const qrHof = (s: number) => (s ? s + 2 * Math.round(s * 0.1) + capExtra : 0)
  const applyHof = () => Math.max(textH, qrHof(qs))
  const bandHof = () => (band ? band.h : 0)
  const groupGaps = () => 2 + (bandHof() ? 1 : 0) + (rolesH ? 1 : 0) + (applyHof() ? 1 : 0)
  const spare = () => L.h - 2 * L.margin - L.logoH - head.height - FOOT_H - rolesH - bandHof() - applyHof() - groupGaps() * gapMin
  if (spare() < 0 && band) {
    bandBoxH = Math.max(B.portrait.photoPref * 0.45, bandBoxH + spare())
    band = collage(asp, colW, bandBoxH)
  }
  if (spare() < 0 && qs) qs = Math.max(110, qs + Math.floor(spare() / 1.2))
  if (qs && qs < 110) qs = 0
  const bodies = [bandHof(), rolesH, applyHof()].filter((h) => h > 0)
  const g = evenGap(p, head.height, bodies)
  const overflow = g < 18 || head.cut

  /* ---- draw ---- */
  await drawLogoAt(p, L.margin)
  const headTop = L.margin + L.logoH + g
  drawHead(p, head, headTop)
  let y = headTop + head.height + g

  /* the photos as a collage above the writing: rows of whole photos, centred */
  if (band) {
    const bx = CX - colW / 2
    drawCollage(x, photos, band, bx, y)
    y += bandHof() + g
  }

  if (rolesH) {
    let ry = y
    x.textAlign = 'left'
    if (rolesLabel) {
      x.font = `700 ${LABEL_FS}px ManropeA`
      spaced(x, rolesLabel, CX, ry + LABEL_CAP, 7, rg(dim(C2, 0.72)))
      ry += LABEL_CAP + 26
    }
    x.font = `600 ${ROLE_FS}px ManropeA`
    x.textAlign = 'center'
    x.fillStyle = rg(INK, 0.85)
    const cw2 = colW / roleCols
    roles.forEach((r, i) => {
      const col = roleCols === 2 ? i % 2 : 0, row = roleCols === 2 ? Math.floor(i / 2) : i
      const cx = roleCols === 2 ? CX + (col ? 1 : -1) * cw2 / 2 : CX
      x.fillText(r, cx, ry + roleCap + row * ROLE_LINE, cw2 - 20)
    })
    y += rolesH + g
  }

  const applyH = applyHof()
  if (applyH) {
    const hasQr = qs > 0, m = Math.round(qs * 0.1), qrCol = hasQr ? qs + 2 * m : 0
    const maxTextW = colW - (hasQr ? rowGapText + qrCol : 0)
    /* the writing shrinks to its column rather than spill out of it */
    let dateSize = DATE_SIZE, ctFs = CT_FS, textW = 0
    if (dates) {
      dateSize = fit(x, (s) => `italic 600 ${s}px Bodoni`, dates, maxTextW, DATE_SIZE, -1)
      x.font = `italic 600 ${dateSize}px Bodoni`
      textW = Math.max(textW, measure(x, dates, -1))
    }
    if (showLabel) {
      x.font = `700 ${LABEL_FS}px ManropeA`
      textW = Math.max(textW, Math.min(maxTextW, measure(x, dateLabel, 7)))
    }
    for (const c of contact) ctFs = Math.min(ctFs, fit(x, (s) => `500 ${s}px ManropeA`, c, maxTextW, CT_FS, 0))
    if (contact.length) {
      x.font = `500 ${ctFs}px ManropeA`
      for (const c of contact) textW = Math.max(textW, x.measureText(c).width)
    }
    x.font = '700 24px ManropeA'
    const pillW = cta ? Math.min(maxTextW, measure(x, cta, 3) + 90) : 0
    textW = Math.max(textW, pillW)
    const total = textW + (hasQr && textW ? rowGapText : 0) + qrCol
    const left = CX - total / 2
    const tcx = left + textW / 2, qcx = left + total - qrCol / 2
    let ty = y + (applyH - textH) / 2
    let k = 0
    const next = (h: number) => {
      /* top of the next part of the writing column */
      const part = parts[k++]
      if (part.gap) ty += part.gap
      const top = ty
      ty += h
      return top
    }
    x.textAlign = 'left'
    if (showLabel) {
      const t = next(LABEL_CAP)
      x.font = `700 ${LABEL_FS}px ManropeA`
      spaced(x, dateLabel, tcx, t + LABEL_CAP, 7, rg(dim(C2, 0.72)))
    }
    if (dates) {
      const t = next(dateCap)
      x.font = `italic 600 ${dateSize}px Bodoni`
      gradTitle(x, dates, tcx, t + dateCap, dateSize, -1, 600, C1, C2)
    }
    if (cta) {
      const t = next(PILL_H)
      x.fillStyle = grad(x, tcx - pillW / 2, tcx + pillW / 2, C1, C2)
      x.beginPath()
      x.roundRect(tcx - pillW / 2, t, pillW, PILL_H, PILL_H / 2)
      x.fill()
      x.font = '700 24px ManropeA'
      spaced(x, cta, tcx, t + PILL_H / 2 + Math.round(24 * 0.36), 3, '#ffffff')
    }
    if (contact.length) {
      const t = next(ctCap + (contact.length - 1) * CT_LINE)
      x.font = `500 ${ctFs}px ManropeA`
      x.textAlign = 'center'
      x.fillStyle = rg(INK, 0.8)
      contact.forEach((c, i) => x.fillText(c, tcx, t + ctCap + i * CT_LINE))
    }
    if (hasQr) {
      const qy = y + (applyH - qrHof(qs)) / 2
      drawQR(x, f.qrUrl, qcx, qy + m + qs / 2, qs, C1, C2, C1, C2)
      if (capText) {
        x.font = `500 ${capFs}px ManropeA`
        x.textAlign = 'center'
        x.fillStyle = rg(INK, 0.62)
        x.fillText(capText, qcx, qy + qs + 2 * m + 30 + capCap, qrCol + 40)
      }
    }
    y += applyH + g
  }

  drawFoot(p, f.footer, y, colW)

  /* on a landscape page the photos stand on the right as a collage, centred between the margins */
  if (land && panelW && n) {
    const boxH = L.h - 2 * L.margin
    const cg = collage(asp, panelW, boxH)
    const bx = L.w - B.landscape.side - panelW, by = L.margin + (boxH - cg.h) / 2
    drawCollage(x, photos, cg, bx, by)
  }

  const c = finishPage(p)
  c.dataset.overflow = overflow ? '1' : ''
  return c
}
