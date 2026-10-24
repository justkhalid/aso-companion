import { dim, fit, gradTitle, grad, loadKitFonts, spaced } from '@/lib/kit/engine'
import { rg } from '@/lib/kit/decor'
import { defaultLook, drawFoot, drawHead, drawLogoAt, evenGap, finishPage, measureHead, paintPage, wrap, type HeadFields, type LookFields } from './common'
import { formatDay } from './dates'

/* The certificate: who it is for, why, the date and place, and up to two signatures. Same page as every document. */

export interface Signer {
  name: string
  role: string
}

export interface CertificateFields extends LookFields, HeadFields {
  name: string
  reason: string
  /* yyyy-mm-dd, or empty */
  date: string
  place: string
  signers: Signer[]
}

export const MAX_SIGNERS = 2

export function defaultCertificate(): CertificateFields {
  return {
    ...defaultLook(),
    landscape: true,
    kicker: 'CERTIFICATE OF APPRECIATION',
    headline: 'Certificate of Volunteering',
    subtitle: 'This certificate is proudly presented to',
    footer: 'American Space Oujda',
    name: '',
    reason: 'In recognition of your time, your energy and your commitment to our community.',
    date: '',
    place: 'Oujda',
    signers: [
      { name: '', role: 'Director' },
      { name: '', role: 'Coordinator' },
    ],
  }
}

export function certificateProblems(f: CertificateFields): string[] {
  const out: string[] = []
  if (!f.name.trim()) out.push('Add the name of the person')
  return out
}

const B = {
  portrait: { nameMax: 120, reasonW: 700, reasonFs: 30, reasonLine: 44, colW: 240, colGap: 50 },
  landscape: { nameMax: 96, reasonW: 880, reasonFs: 28, reasonLine: 40, colW: 280, colGap: 90 },
} as const

const SIGN_SPACE = 70 /* room above a line for the signature itself */
const NAME_FS = 26, ROLE_FS = 22

/** The certificate as a canvas `width` pixels wide, A4 shaped. `dataset.overflow` is "1" when the page is too full to keep the gaps. */
export async function renderCertificate(f: CertificateFields, width: number): Promise<HTMLCanvasElement> {
  await loadKitFonts()
  const p = await paintPage(f, width)
  const { x, L, CX, C1, C2, INK } = p
  const Bd = B[f.landscape ? 'landscape' : 'portrait']
  const head = measureHead(p, f)

  /* ---- who and why ---- */
  const name = f.name.trim(), reason = f.reason.trim()
  const nameFs = name ? fit(x, (s) => `italic 600 ${s}px Bodoni`, name, L.w - 2 * L.sideMargin, Bd.nameMax, -3) : 0
  x.font = `italic 600 ${nameFs || 40}px Bodoni`
  const nameCap = x.measureText('H').actualBoundingBoxAscent
  x.font = `500 ${Bd.reasonFs}px ManropeA`
  const reasonLines = reason ? wrap(x, reason, Bd.reasonW).slice(0, 4) : []
  const reasonCap = Math.round(Bd.reasonFs * 0.72)
  const cutReason = !!reason && wrap(x, reason, Bd.reasonW).length > 4
  let whoH = 0
  if (name) whoH = nameCap + 36 + 3
  if (reasonLines.length) whoH += (whoH ? 46 : 0) + reasonCap + (reasonLines.length - 1) * Bd.reasonLine + 6

  /* ---- the signatures: [signer] [date and place] [signer] on one line ---- */
  const signers = f.signers.filter((s) => s.name.trim() || s.role.trim()).slice(0, MAX_SIGNERS)
  const day = formatDay(f.date), place = f.place.trim()
  const cols: ({ kind: 'sign'; s: Signer } | { kind: 'date' })[] = []
  if (signers[0]) cols.push({ kind: 'sign', s: signers[0] })
  if (day || place) cols.push({ kind: 'date' })
  if (signers[1]) cols.push({ kind: 'sign', s: signers[1] })
  const nameCap2 = Math.round(NAME_FS * 0.72), roleCap = Math.round(ROLE_FS * 0.72)
  const signH = cols.length ? SIGN_SPACE + 2 + 22 + nameCap2 + 12 + roleCap : 0

  const g = evenGap(p, head.height, [whoH, signH].filter((h) => h > 0))
  const overflow = g < 18 || head.cut || cutReason

  /* ---- draw ---- */
  await drawLogoAt(p, L.margin)
  const headTop = L.margin + L.logoH + g
  drawHead(p, head, headTop)
  let y = headTop + head.height + g

  if (whoH > 0) {
    let wy = y
    x.textAlign = 'left'
    if (name) {
      x.font = `italic 600 ${nameFs}px Bodoni`
      gradTitle(x, name, CX, wy + nameCap, nameFs, -3, 600, C1, C2)
      x.fillStyle = grad(x, CX - 180, CX + 180, C1, C2)
      x.fillRect(CX - 180, wy + nameCap + 36, 360, 3)
      wy += nameCap + 36 + 3 + 46
    }
    if (reasonLines.length) {
      x.font = `500 ${Bd.reasonFs}px ManropeA`
      x.textAlign = 'center'
      x.fillStyle = rg(INK, 0.78)
      reasonLines.forEach((ln, i) => x.fillText(ln, CX, wy + reasonCap + i * Bd.reasonLine))
    }
    y += whoH + g
  }

  if (signH > 0) {
    const total = cols.length * Bd.colW + (cols.length - 1) * Bd.colGap
    const left = CX - total / 2
    const lineY = y + SIGN_SPACE
    cols.forEach((c, i) => {
      const cx = left + Bd.colW / 2 + i * (Bd.colW + Bd.colGap)
      x.fillStyle = grad(x, cx - Bd.colW / 2, cx + Bd.colW / 2, C1, C2)
      x.fillRect(cx - Bd.colW / 2, lineY, Bd.colW, 2)
      x.textAlign = 'left'
      if (c.kind === 'sign') {
        x.font = `700 ${NAME_FS}px ManropeA`
        x.textAlign = 'center'
        x.fillStyle = rg(INK, 0.92)
        x.fillText(c.s.name.trim(), cx, lineY + 2 + 22 + nameCap2, Bd.colW)
        x.font = `500 ${ROLE_FS}px ManropeA`
        x.fillStyle = rg(INK, 0.62)
        x.fillText(c.s.role.trim(), cx, lineY + 2 + 22 + nameCap2 + 12 + roleCap, Bd.colW)
      } else {
        /* the date is written on its line, the place stands under it */
        if (day) {
          const fs = fit(x, (s) => `italic 600 ${s}px Bodoni`, day, Bd.colW, 36, -1)
          x.font = `italic 600 ${fs}px Bodoni`
          gradTitle(x, day, cx, lineY - 18, fs, -1, 600, C1, C2)
        }
        if (place) {
          x.font = `700 ${NAME_FS}px ManropeA`
          x.textAlign = 'center'
          x.fillStyle = rg(INK, 0.92)
          x.fillText(place, cx, lineY + 2 + 22 + nameCap2, Bd.colW)
        }
        x.font = `700 ${ROLE_FS - 4}px ManropeA`
        spaced(x, [day && 'DATE', place && 'PLACE'].filter(Boolean).join(' AND '), cx, lineY + 2 + 22 + nameCap2 + 12 + roleCap, 4, rg(dim(C2, 0.72)))
      }
    })
    y += signH + g
  }

  drawFoot(p, f.footer, y)
  const c = finishPage(p)
  c.dataset.overflow = overflow ? '1' : ''
  return c
}
