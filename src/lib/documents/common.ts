import { KIT_BG_BASE, KIT_BG_STORIES, cv, dim, drawLogo, fit, get, glow, grad, gradTitle, grain, spaced, wash } from '@/lib/kit/engine'
import { kitTheme } from '@/lib/kit/derive'
import { rg, type RGB } from '@/lib/kit/decor'

/* What every document shares: the A4 sheet, the kit look behind it (pearl ground, glass corners, glow, grain), the logo,
   the title block and the foot. A template only decides what goes between the title block and the foot.
   Drawn on a sheet 1000 units on its short side (A4 is 1000 x 1414) and scaled to any pixel width. */

export const LONG = 1414.2
export const a4Ratio = (landscape: boolean) => (landscape ? 1000 / LONG : LONG / 1000)

/** the choices every document offers: colours (a key of LOOKS), paper (a key of GROUNDS), glass, page direction, lighter background */
export interface LookFields {
  look: string
  ground: string
  glass: number
  bg: number
  landscape: boolean
  /* 0 standard, 1 light, 2 lighter */
  light: 0 | 1 | 2
}

export const defaultLook = (): LookFields => ({ look: 'aso', ground: 'pearl', glass: 100, bg: 0, landscape: false, light: 2 })

/** the title block of a document */
export interface HeadFields {
  kicker: string
  headline: string
  subtitle: string
  footer: string
}

/* where the shared parts sit on each way round. margin: sheet edge to the logo and to the foot; gapMin: the least gap between
   the groups of a page (the body shrinks before the gaps do) */
export const LAYOUT = {
  portrait: { w: 1000, h: LONG, margin: 90, logoH: 100, titleGap: 36, ruleGap: 46, subGap: 62, titleMax: 120, titleW: 840, ruleW: 520, subW: 680, subSize: 30, subLine: 44, subLines: 3, sideMargin: 64, gapMin: 70 },
  landscape: { w: LONG, h: 1000, margin: 62, logoH: 56, titleGap: 24, ruleGap: 38, subGap: 52, titleMax: 70, titleW: 1100, ruleW: 420, subW: 1000, subSize: 24, subLine: 34, subLines: 1, sideMargin: 120, gapMin: 36 },
} as const
export type Layout = (typeof LAYOUT)[keyof typeof LAYOUT]

/* the lighter versions of the paper: how much white is laid over the ground and the glass */
const LIGHT_VEIL = [0, 0.5, 0.8]

export const FOOT_H = 58 /* hairline, air, the name of the space */

export function wrap(x: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const w of text.trim().split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && x.measureText(next).width > maxW) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

export interface Page {
  c: HTMLCanvasElement
  x: CanvasRenderingContext2D
  L: Layout
  CX: number
  C1: RGB
  C2: RGB
  INK: RGB
}

/** A blank page with the look painted on it, ready to draw in sheet units. */
export async function paintPage(f: LookFields, width: number): Promise<Page> {
  const t = kitTheme({ look: f.look, palette: 'same', decor: 'none', bg: f.bg, glass: f.glass, ground: f.ground })
  /* the writing colour is judged on the paper that is really there: a lightened dark paper is light again */
  const INK = f.light > 0 ? kitTheme({ look: f.look, palette: 'same', decor: 'none', bg: f.bg, ground: 'pearl' }).ink : t.ink
  const [base, glassPic] = await Promise.all([get(KIT_BG_BASE), get(KIT_BG_STORIES[f.bg] || KIT_BG_STORIES[0])])
  const L = LAYOUT[f.landscape ? 'landscape' : 'portrait']
  const height = Math.round(width * a4Ratio(f.landscape))
  const c = cv(width, height), x = c.getContext('2d')!
  /* the pearl ground, the glass waves in the corners (the story picture stretched to the page), the wash of the chosen paper,
     then, for the lighter versions, a veil of white over all of it */
  x.drawImage(base, 0, 0, width, height)
  if (f.glass > 0) {
    x.save()
    x.globalAlpha = Math.max(0, Math.min(100, f.glass)) / 100
    x.drawImage(glassPic, 0, 0, width, height)
    x.restore()
  }
  wash(x, t, width, height)
  if (f.light > 0) {
    x.save()
    x.globalAlpha = LIGHT_VEIL[f.light] ?? 0
    x.fillStyle = '#ffffff'
    x.fillRect(0, 0, width, height)
    x.restore()
  }
  x.scale(width / L.w, width / L.w)
  glow(x, L.w / 2, L.h / 2, t.c2)
  return { c, x, L, CX: L.w / 2, C1: t.c1, C2: t.c2, INK }
}

/** the grain goes over everything, in pixels */
export function finishPage(p: Page): HTMLCanvasElement {
  p.x.setTransform(1, 0, 0, 1, 0, 0)
  grain(p.x, p.c.width, p.c.height)
  return p.c
}

export interface HeadMeasure {
  height: number
  kick: string
  head: string
  sub: string
  subLines: string[]
  kickBase: number
  titleBase: number
  ruleY: number
  subBase: number
  titleSize: number
  ruleW: number
  /* the text under the title did not fit in its lines */
  cut: boolean
}

/** Heights and baselines of the title block, relative to its top. `w` narrows the block (a page with photos beside the writing). */
export function measureHead(p: Page, f: HeadFields, w = Infinity, maxLines?: number): HeadMeasure {
  const { x } = p
  const L = { ...p.L, titleW: Math.min(p.L.titleW, w), subW: Math.min(p.L.subW, w) }
  x.textAlign = 'left'
  const kick = f.kicker.trim().toUpperCase(), head = f.headline.trim(), sub = f.subtitle.trim()
  let hy = 0, kickBase = -1, titleBase = -1, ruleY = -1, titleSize = 0, subBase = -1
  if (kick) { kickBase = Math.round(22 * 0.72); hy = kickBase }
  if (head) {
    titleSize = fit(x, (n) => `italic 600 ${n}px Bodoni`, head, L.titleW, L.titleMax, -3)
    x.font = `italic 600 ${titleSize}px Bodoni`
    const cap = x.measureText('H').actualBoundingBoxAscent
    titleBase = (kick ? hy + L.titleGap : 0) + cap
    ruleY = titleBase + L.ruleGap
    hy = ruleY + 3
  }
  let subLines: string[] = []
  let cut = false
  if (sub) {
    x.font = `500 ${L.subSize}px ManropeA`
    const all = wrap(x, sub, L.subW), lim = maxLines ?? L.subLines
    cut = all.length > lim
    subLines = all.slice(0, lim)
    subBase = hy > 0 ? hy + L.subGap : Math.round(L.subSize * 0.72)
    hy = subBase + (subLines.length - 1) * L.subLine + 6
  }
  return { height: hy, kick, head, sub, subLines, kickBase, titleBase, ruleY, subBase, titleSize, ruleW: Math.min(L.ruleW, w), cut }
}

export function drawHead(p: Page, m: HeadMeasure, top: number) {
  const { x, L, CX, C1, C2, INK } = p
  x.textAlign = 'left'
  if (m.kick) { x.font = '700 22px ManropeA'; spaced(x, m.kick, CX, top + m.kickBase, 7, rg(dim(C2, 0.72))) }
  if (m.head) {
    x.font = `italic 600 ${m.titleSize}px Bodoni`
    gradTitle(x, m.head, CX, top + m.titleBase, m.titleSize, -3, 600, C1, C2)
    x.fillStyle = grad(x, CX - m.ruleW / 2, CX + m.ruleW / 2, C1, C2)
    x.fillRect(CX - m.ruleW / 2, top + m.ruleY, m.ruleW, 3)
  }
  if (m.subLines.length) {
    x.font = `500 ${L.subSize}px ManropeA`
    x.fillStyle = rg(INK, 0.72)
    x.textAlign = 'center'
    m.subLines.forEach((ln, i) => x.fillText(ln, CX, top + m.subBase + i * L.subLine))
  }
}

export const drawLogoAt = (p: Page, top: number) => drawLogo(p.x, p.CX, top + p.L.logoH / 2, p.L.logoH)

/** the foot of the page: a gradient hairline and the name of the space, no bar */
export function drawFoot(p: Page, text: string, top: number, w = 700) {
  const { x, CX, C1, C2, INK } = p
  const hw = Math.min(700, w) / 2
  x.textAlign = 'left'
  x.fillStyle = grad(x, CX - hw, CX + hw, C1, C2)
  x.fillRect(CX - hw, top, hw * 2, 2)
  if (text.trim()) {
    x.font = '700 24px ManropeA'
    spaced(x, text.trim().toUpperCase(), CX, top + 52, 8, rg(INK, 0.85))
  }
}

/** the gap between the groups of a page: logo, title block, body (one or more) and foot are all separated by it, and the
 *  space above the logo equals the space under the foot */
export function evenGap(p: Page, headH: number, bodyH: number[]) {
  const { L } = p
  return (L.h - 2 * L.margin - L.logoH - headH - bodyH.reduce((a, b) => a + b, 0) - FOOT_H) / (2 + bodyH.length)
}
