/* Canvas engine of the club kit: the Instagram story (1080x1920) and the WhatsApp group picture (1080x1080).
   Ported from the generator; the layout numbers are unchanged. Browser only. */
import qrcode from "qrcode-generator";
import { KIT_ICONS } from './icons'
import { DECOR, rg, type RGB } from './decor'
import { makeDecorAnim } from './decor-anim'

export interface KitParams {
  wa?: string // the WhatsApp group link of a club: shown as a QR code on its story
  im: HTMLImageElement | null // the framed poster, or null for the empty slot
  framed?: boolean // false: a plain poster, which gets a light wavy corner effect (default true)
  kicker: string
  top: string
  word: string
  day: string
  time: string
  venue: string
  icon: string
  mode: 'club' | 'event'
}
export interface KitTheme { c1: RGB; c2: RGB; ink: RGB; decor: string; bg: number; glass?: number; motion?: number; ground?: string }

const FONT_FILES: [string, string, string, string][] = [
  ['Bodoni', 'bodoni500i', '500', 'italic'],
  ['Bodoni', 'bodoni600i', '600', 'italic'],
  ['ManropeA', 'manrope500', '500', 'normal'],
  ['ManropeA', 'manrope700', '700', 'normal'],
  ['Cairo', 'cairo700', '700', 'normal'],
]
export const KIT_LOGO = '/kit/logo.png'
export const KIT_BG_BASE = '/kit/bg/base.jpg'
/* story backgrounds with the glass wave effect in two corners; the pair of corners differs per variant */
export const KIT_BG_STORIES = Array.from({ length: 8 }, (_, i) => `/kit/bg/story${i}.jpg`)
/* the same glass waves as a transparent layer, for posters that came without the ASO frame */
export const KIT_WAVE = '/kit/bg/wave.webp'
export const KIT_BG_COVERS = Array.from({ length: 8 }, (_, i) => `/kit/bg/cover${i}.jpg`)

type Ctx = CanvasRenderingContext2D
const img = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
export const loadImage = img
export const cv = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const cache: Record<string, HTMLImageElement> = {}
export const get = async (src: string) => cache[src] || (cache[src] = await img(src))

const AR = /[\u0600-\u06FF]/
function kick(ctx: Ctx, text: string, cx: number, base: number, tr: number, fill: string | CanvasGradient) {
  if (AR.test(text)) { ctx.save(); ctx.font = '700 36px Cairo'; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = fill; ctx.fillText(text, cx, base + 8); ctx.restore() }
  else spaced(ctx, text, cx, base, tr, fill)
}
let fontsReady: Promise<void> | null = null
export function loadKitFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      for (const [fam, key, w, st] of FONT_FILES) {
        const f = new FontFace(fam, `url(/kit/fonts/${key}.ttf)`, { weight: w, style: st }); await f.load(); document.fonts.add(f)
      }
    })().catch((e) => { fontsReady = null; throw e })
  }
  return fontsReady
}

// ---------- drawing helpers ----------
export function measure(ctx: Ctx, t: string, tr: number) { let w = 0; for (const ch of t) w += ctx.measureText(ch).width + tr; return w - tr; }
export function fit(ctx: Ctx, tpl: (s: number) => string, t: string, maxW: number, maxS: number, tr: number) { let s = maxS; for (; s > 20; s--) { ctx.font = tpl(s); if (measure(ctx, t, tr) <= maxW) break; } return s; }
export function spaced(ctx: Ctx, t: string, cx: number, base: number, tr: number, fill: string | CanvasGradient) {
  let x = cx - measure(ctx, t, tr) / 2; ctx.fillStyle = fill; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  for (const ch of t) { ctx.fillText(ch, x, base); x += ctx.measureText(ch).width + tr; }
}
const capOf = (ctx: Ctx, size: number, weight: number) => { ctx.font = `italic ${weight} ${size}px Bodoni`; return ctx.measureText("H").actualBoundingBoxAscent; };
export const grad = (ctx: Ctx, x0: number, x1: number, c1: RGB, c2: RGB) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, rg(c1)); g.addColorStop(1, rg(c2)); return g; };
export function gradTitle(ctx: Ctx, t: string, cx: number, base: number, size: number, tr: number, weight: number, c1: RGB, c2: RGB) {
  ctx.font = `italic ${weight} ${size}px Bodoni`;
  const w = measure(ctx, t, tr);
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.28)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
  spaced(ctx, t, cx, base, tr, grad(ctx, cx - w / 2, cx + w / 2, c1, c2)); ctx.restore();
}
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export async function svgLayer(body: string) { return get("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${body}</svg>`)); }
export function glow(ctx: Ctx, cx: number, cy: number, c2: RGB) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(720, 620);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (let i = 0; i <= 10; i++) { const t = i / 10; g.addColorStop(t, rg(c2, Math.pow(1 - t, 1.6) * 0.15)); }
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
let grainCanvas: HTMLCanvasElement | null = null;
export function grain(ctx: Ctx, w: number, h: number) {
  if (!grainCanvas) { grainCanvas = cv(512, 512); const x = grainCanvas.getContext("2d")!, d = x.createImageData(512, 512); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; } x.putImageData(d, 0, 0); }
  ctx.fillStyle = ctx.createPattern(grainCanvas, "repeat")!; ctx.fillRect(0, 0, w, h);
}
export async function drawLogo(ctx: Ctx, cx: number, cy: number, h: number) {
  const l = await get(KIT_LOGO), w = h * l.width / l.height;
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.18)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.drawImage(l, cx - w / 2, cy - h / 2, w, h); ctx.restore();
}
/* Every icon is drawn at this stroke weight on the 24 grid. It used to be 0.9 for the
   hand-drawn kit icons and 1.15 for the ones that come from the club picker, which made
   the two sets look like two different families next to the lucide icons in the same panel
   (those are 2). One number now, and the picker looks like the rest of the app. */
export const ICON_STROKE = 1
export async function iconCanvas(key: string, size: number, c1: RGB, c2: RGB, boost = 1) {
  const ic = KIT_ICONS[key];
  /* a club saved with an icon that no longer exists draws nothing instead of throwing */
  if (!ic) return cv(size, size);
  const layer = (inner: string) => get("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><g stroke="#000" stroke-width="${(ic.sw ?? ICON_STROKE) * boost}" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`));
  const c = cv(size, size), x = c.getContext("2d", { willReadFrequently: true })!, a = cv(size, size), ax = a.getContext("2d")!;
  x.drawImage(await layer(ic.stroke), 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = grad(x, 0, size, c1, c2); x.fillRect(0, 0, size, size);
  ax.drawImage(await layer(ic.accent), 0, 0); ax.globalCompositeOperation = "source-in"; ax.fillStyle = rg(c2); ax.fillRect(0, 0, size, size);
  x.globalCompositeOperation = "source-over"; x.drawImage(a, 0, 0); return c;
}
async function drawIcon(ctx: Ctx, key: string, cx: number, cy: number, size: number, c1: RGB, c2: RGB) {
  const c = await iconCanvas(key, size, c1, c2), d = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, size, size).data;
  let x0 = size, x1 = 0, y0 = size, y1 = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (d[(y * size + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < x0) return; /* nothing was drawn (unknown icon) */
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.26)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.drawImage(c, cx - (x0 + x1) / 2, cy - (y0 + y1) / 2); ctx.restore();
}
/* draws an icon scaled so its drawn shape fills a box (maxW x maxH), whatever the icon's own padding or proportions */
async function drawIconFit(ctx: Ctx, key: string, cx: number, cy: number, maxW: number, maxH: number, c1: RGB, c2: RGB, boost = 1, shadow = "rgba(40,30,60,.26)") {
  const N = 1000, c = await iconCanvas(key, N, c1, c2, boost), d = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, N, N).data;
  let x0 = N, x1 = 0, y0 = N, y1 = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < x0 || y1 < y0) return; /* nothing was drawn (unknown icon) */
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.min(maxW / bw, maxH / bh);
  ctx.save(); ctx.shadowColor = shadow; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  ctx.drawImage(c, x0, y0, bw, bh, cx - bw * k / 2, cy - bh * k / 2, bw * k, bh * k); ctx.restore();
}
export function fitCover(ctx: Ctx, im: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) { const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s; ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
export const dim = (c: RGB, k: number): RGB => c.map(v => Math.round(v * k)) as RGB;

// ---------- the three outputs ----------
/* story background: stripes and corner circles sit in some corners, so those looks use a variant whose waves are in the other corners */
function storyBg(t: KitTheme): string {
  if (t.bg) return KIT_BG_STORIES[t.bg] || KIT_BG_STORIES[0]
  if (t.decor === "stripes") return KIT_BG_STORIES[1]
  if (t.decor === "rings" || t.decor === "atoms") return KIT_BG_STORIES[6]
  return KIT_BG_STORIES[0]
}

const glassOf = (t: KitTheme) => Math.max(0, Math.min(100, t.glass === undefined ? 100 : t.glass)) / 100
/* the glass waves are a picture laid over the plain pearl ground; the strength is how much of it shows */
/* the ground under the waves: the pearl picture, or the same picture washed with a color */
export const GROUNDS: Record<string, [label: string, tint: RGB | null, strength: number]> = {
  pearl: ["Pearl", null, 0],
  cream: ["Warm cream", [250, 226, 176], .55],
  silver: ["Cool silver", [190, 204, 226], .6],
  blush: ["Blush", [246, 196, 208], .55],
  mint: ["Mint mist", [186, 232, 212], .55],
  sky: ["Sky", [184, 214, 246], .6],
  lilac: ["Lilac", [208, 196, 242], .55],
  sand: ["Sand", [232, 208, 172], .6],
  peach: ["Peach", [250, 208, 180], .6],
  butter: ["Butter", [250, 240, 170], .6],
  sage: ["Sage", [200, 220, 188], .6],
  rose: ["Rose", [238, 182, 200], .65],
  ice: ["Ice", [200, 232, 244], .6],
  steel: ["Steel grey", [150, 160, 176], .75],
  dusk: ["Dusk", [96, 92, 140], .85],
  night: ["Night", [28, 34, 70], .95],
  look: ["Colors of the look", null, 0],

  /* ---- added: ten more papers ---- */
  ivory: ["Ivory", [250, 246, 232], .5],
  fog: ["Fog", [214, 218, 224], .55],
  clay: ["Clay", [214, 176, 148], .6],
  emerald: ["Emerald", [120, 200, 165], .7],
  ocean: ["Deep ocean", [110, 165, 205], .85],
  plum: ["Plum", [170, 130, 190], .7],
  coral: ["Coral paper", [246, 176, 158], .65],
  gold: ["Antique gold", [222, 196, 140], .6],
  rosewood: ["Rosewood", [190, 120, 130], .75],
  charcoal: ["Charcoal", [70, 74, 82], .9],
}
export async function groundCanvas(_t: KitTheme, w: number, h: number) {
  const c = cv(w, h), x = c.getContext("2d")!
  x.drawImage(await get(KIT_BG_BASE), 0, 0, w, h)
  return c
}
/* the wash of color over the ground and the waves together (multiply keeps the light glints) */
function washOf(t: KitTheme): [RGB, number] | null {
  const g = GROUNDS[t.ground || "pearl"] || GROUNDS.pearl
  if (t.ground === "look") return [[0, 1, 2].map(i => Math.round(t.c1[i] * .35 + t.c2[i] * .15 + 255 * .5)) as RGB, .9]
  return g[1] ? [g[1], Math.min(1, g[2] + .1)] : null
}
export function wash(x: Ctx, t: KitTheme, w: number, h: number) {
  const k = washOf(t); if (!k) return
  x.save(); x.globalCompositeOperation = "multiply"; x.globalAlpha = k[1]; x.fillStyle = rg(k[0]); x.fillRect(0, 0, w, h); x.restore()
}
async function paintGlass(x: Ctx, src: string, a: number, t: KitTheme) {
  x.drawImage(await groundCanvas(t, x.canvas.width, x.canvas.height), 0, 0)
  if (a > 0) { x.save(); x.globalAlpha = a; x.drawImage(await get(src), 0, 0); x.restore() }
  wash(x, t, x.canvas.width, x.canvas.height)
}

export async function makeStory(p: KitParams, t: KitTheme) { return storyBody(p, t, true) }

/* the story as a moving picture: the glass waves drift and a soft light sweeps across, the writing and the poster stay still */
export async function makeStoryAnim(p: KitParams, t: KitTheme, loop = 10) {
  const fg = await storyBody(p, t, false, false), base = await groundCanvas(t, 1080, 1920), glassImg = await get(storyBg(t)), deco = await makeDecorAnim(t.decor, t.c1, t.c2)
  const a = glassOf(t), k = t.motion === undefined ? 1 : t.motion
  return {
    loop,
    draw(x: Ctx, time: number) {
      const ph = (2 * Math.PI * time) / loop
      x.drawImage(base, 0, 0, 1080, 1920)
      if (a <= 0) wash(x, t, 1080, 1920)
      if (a > 0) {
        x.save(); x.globalAlpha = a
        x.translate(540, 960); x.scale(1.07 + 0.015 * k * Math.sin(ph), 1.07 + 0.015 * k * Math.sin(ph))
        x.translate(Math.sin(ph) * 16 * k, Math.cos(ph) * 24 * k)
        x.drawImage(glassImg, -540, -960); x.restore()
        wash(x, t, 1080, 1920)
        if (k > 0) {
          const u = (time / loop) % 1, pos = -700 + u * (1080 + 1920 + 1400) / 1
          const g = x.createLinearGradient(pos - 350, pos - 350, pos + 350, pos + 350)
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, `rgba(255,255,255,${(0.16 * k * a).toFixed(3)})`); g.addColorStop(1, "rgba(255,255,255,0)")
          x.save(); x.globalCompositeOperation = "screen"; x.fillStyle = g; x.fillRect(0, 0, 1080, 1920); x.restore()
        }
      }
      deco?.draw(x, time, loop, k)
      x.drawImage(fg, 0, 0)
      grain(x, 1080, 1920)
    },
  }
}

/* a QR code of a link in the theme colours: square modules in a gradient, four corner brackets round it, no card behind it.
   The colours are darkened enough for the code to stay easy to scan. */
export function drawQR(x: Ctx, url: string, cx: number, cy: number, size: number, c1: RGB, c2: RGB, b1: RGB = c1, b2: RGB = c2) {
  const q = qrcode(0, "M"); q.addData(url); q.make();
  const n = q.getModuleCount(), cell = size / n, left = cx - size / 2, top = cy - size / 2;
  const lum = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], safe = (c: RGB): RGB => { const k = lum(c) > 105 ? 105 / lum(c) : 1; return c.map((v) => Math.round(v * k)) as RGB; };
  const g = grad(x, left, left + size, safe(c1), safe(c2));
  x.save(); x.fillStyle = g;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect(Math.floor(left + c * cell), Math.floor(top + r * cell), Math.ceil(cell), Math.ceil(cell));
  const m = Math.round(size * 0.1), L = Math.round(size * 0.16), lw = Math.max(4, Math.round(size * 0.022));
  x.strokeStyle = grad(x, left - m, left + size + m, b1, b2); x.lineWidth = lw; x.lineCap = "butt";
  const l = left - m, t = top - m, rr_ = left + size + m, bb = top + size + m;
  x.beginPath();
  x.moveTo(l, t + L); x.lineTo(l, t); x.lineTo(l + L, t);
  x.moveTo(rr_ - L, t); x.lineTo(rr_, t); x.lineTo(rr_, t + L);
  x.moveTo(rr_, bb - L); x.lineTo(rr_, bb); x.lineTo(rr_ - L, bb);
  x.moveTo(l + L, bb); x.lineTo(l, bb); x.lineTo(l, bb - L);
  x.stroke(); x.restore();
}
/* writing set from a left edge (spaced() centres its text) */
function spacedLeft(x: Ctx, t: string, left: number, base: number, tr: number, fill: string | CanvasGradient) { spaced(x, t, left + measure(x, t, tr) / 2, base, tr, fill); }

async function storyBody(p: KitParams, t: KitTheme, withBg: boolean, withDecor = true) {
  const c = cv(1080, 1920), x = c.getContext("2d")!, CX = 540;
  if (withBg) await paintGlass(x, storyBg(t), glassOf(t), t);
  glow(x, 540, 1300, t.c2);
  if (withDecor && t.decor !== "none") x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0);
  await drawLogo(x, CX, 165, 78);
  const ev = p.mode === "event", single = !p.top, [g1, g2, g3, g4] = ev ? [40, 46, 46, 26] : single ? [62, 64, 66, 34] : [40, 46, 46, 26];
  const cap = (px: number, k = .72) => Math.floor(px * k);
  const fw = fit(x, s => `italic 600 ${s}px Bodoni`, p.word, 800, 175, -6), cw = capOf(x, fw, 600), gap = cw + 46;
  let ft = 0, ct = 0, inkH = cw;
  if (!single) { ft = fit(x, s => `italic 500 ${s}px Bodoni`, p.top, 740, 92, -2); ct = capOf(x, ft, 500); inkH = gap + ct; }
  const dsz = ev ? 40 : 42, dtr = ev ? 7 : 8;
  const B = cap(25) + g1 + inkH + g2 + g3 + cap(dsz) + g4 + cap(30);
  /* even spacing: logo to writing, writing to poster, poster to the bottom button (or the small icon) are the same distance */
  const withQR = !ev && !!p.wa
  const PWmax = withQR ? 480 : 680, PHmax = withQR ? 720 : 1120
  let PW = PWmax, PH: number
  if (p.im) {
    /* respect the uploaded poster's actual aspect ratio: the slot adapts to
       whatever dimensions the image has, the surrounding layout (kicker, day,
       time, QR/icon) shifts to keep even spacing. */
    const ar = p.im.width / p.im.height
    PH = Math.round(PW / ar)
    if (PH > PHmax) { PH = PHmax; PW = Math.round(PH * ar) }
    if (PW > PWmax) { PW = PWmax; PH = Math.round(PW / ar) }
  } else {
    PH = withQR ? 640 : 906; PW = Math.round(PH * 0.75)
  }
  const PX = Math.round((1080 - PW) / 2), bottom = withQR ? 1490 : 1800, space = Math.floor((bottom - 204 - B - PH) / 3)
  const y = 204 + space, PY = bottom - space - PH;
  x.font = "700 25px ManropeA"; kick(x, p.kicker, CX, y + cap(25), 7, rg(dim(t.c2, .72)));
  const ty = y + cap(25) + g1, base = ty + inkH;
  if (!single) gradTitle(x, p.top, CX, base - gap, ft, -2, 500, t.c1, t.c2);
  gradTitle(x, p.word, CX, base, fw, -6, 600, t.c1, t.c2);
  const hl = base + g2; x.fillStyle = grad(x, CX - 260, CX + 260, t.c1, t.c2); x.fillRect(CX - 260, hl, 520, 3);
  const yb = hl + g3 + cap(dsz);
  x.font = `700 ${dsz}px ManropeA`; spaced(x, p.day, CX, yb, dtr, rg(t.ink));
  const yb2 = yb + g4 + cap(30);
  x.font = "500 30px ManropeA"; spaced(x, [p.time, p.venue].filter(Boolean).join("   |   "), CX, yb2, 3, rg(t.ink, .92));
  // poster slot: soft shadow and the poster with rounded corners (no border around it)
  const R = 0;
  x.save(); x.shadowColor = "rgba(40,30,60,.28)"; x.shadowBlur = 40; x.shadowOffsetY = 14; rr(x, PX, PY, PW, PH, R); x.fillStyle = "#f6f3ee"; x.fill(); x.restore();
  x.save(); rr(x, PX, PY, PW, PH, R); x.clip();
  if (p.im) { x.drawImage(p.im, PX, PY, PW, PH) } else { x.fillStyle = "#f6f3ee"; x.fillRect(PX, PY, PW, PH); x.font = "700 23px ManropeA"; spaced(x, "POSTER 3:4", CX, PY + PH / 2 + 8, 6, rg(t.ink, .45)); }
  x.restore();
  // bottom: a QR code of the WhatsApp group (a story cannot carry a tappable link from the app), or the small club icon
  if (withQR) {
    const QS = 204, qcy = 1628;
    /* a soft glassy glow under the words only (fades out evenly, no edges), so decoration lines do not run through the text */
    const lightInk = (t.ink[0] * .299 + t.ink[1] * .587 + t.ink[2] * .114) > 140, gw: RGB = lightInk ? t.ink : [255, 255, 255];
    x.save(); x.translate(CX, 1815); x.scale(1, .32); const gl = x.createRadialGradient(0, 0, 0, 0, 0, 330); gl.addColorStop(0, rg(gw, lightInk ? .14 : .8)); gl.addColorStop(.6, rg(gw, lightInk ? .1 : .6)); gl.addColorStop(1, rg(gw, 0)); x.fillStyle = gl; x.fillRect(-330, -330, 660, 660); x.restore();
    drawQR(x, p.wa!, CX, qcy, QS, t.c1, t.c2);
    x.font = "700 27px ManropeA"; spaced(x, "SCAN TO JOIN THE", CX, 1800, 5, rg(t.ink, .92));
    x.font = "700 27px ManropeA"; spaced(x, "WHATSAPP GROUP", CX, 1840, 5, grad(x, CX - 300, CX + 300, t.c1, t.c2));
  } else await drawIcon(x, p.icon, CX, 1838, 64, t.c1, t.c2);
  if (withBg) grain(x, 1080, 1920); return c;
}

/* "this session is canceled": the same look as the kit but always in reds, with the poster, as a story (1080x1920) or a post (1080x1440, 3:4) */
export interface CancelInfo { reason: string; next?: string }
export async function makeCancel(p: KitParams, t0: KitTheme, shape: "story" | "post", info: CancelInfo) {
  const t: KitTheme = { ...t0, c1: [128, 12, 32], c2: [236, 68, 52], ink: [74, 14, 22] };
  const full = cv(1080, 1920), x = full.getContext("2d")!, CX = 540;
  await paintGlass(x, storyBg(t), glassOf(t), t);
  glow(x, 540, 960, t.c2);
  if (t.decor !== "none") x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0);
  const story = shape === "story";
  const out = story ? full : cv(1080, 1440);
  const g = story ? x : out.getContext("2d")!;
  if (!story) g.drawImage(full, 0, 240, 1080, 1440, 0, 0, 1080, 1440);
  const redGrad = (a: number, b: number) => grad(g, a, b, t.c1, t.c2);
  const wrap = (txt: string, maxW: number, font: string, maxLines: number) => {
    g.font = font;
    const lines: string[] = []; let cur = "";
    for (const w of txt.trim().split(/\s+/).filter(Boolean)) { const tl = cur ? cur + " " + w : w; if (g.measureText(tl).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tl; }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "..."; }
    return lines;
  };
  /* the poster, grey-toned, with a red CANCELED ribbon across it */
  const poster = (px: number, py: number, pw: number, ph: number) => {
    g.save(); g.shadowColor = "rgba(60,10,20,.30)"; g.shadowBlur = 36; g.shadowOffsetY = 14; rr(g, px, py, pw, ph, 0); g.fillStyle = "#f6f3ee"; g.fill(); g.restore();
    g.save(); rr(g, px, py, pw, ph, 0); g.clip();
    if (p.im) { const k = Math.min(pw / p.im.width, ph / p.im.height), dw = p.im.width * k, dh = p.im.height * k; g.filter = "grayscale(.65) brightness(.96)"; g.drawImage(p.im, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh); g.filter = "none"; } else { g.fillStyle = "#f6f3ee"; g.fillRect(px, py, pw, ph); }
    g.fillStyle = "rgba(128,12,32,.16)"; g.fillRect(px, py, pw, ph);
    g.translate(px + pw / 2, py + ph / 2); g.rotate(-Math.PI / 9);
    const bw = pw * 1.5, bh = Math.max(64, pw * .15);
    g.fillStyle = grad(g, -bw / 2, bw / 2, t.c1, t.c2); g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 16; g.fillRect(-bw / 2, -bh / 2, bw, bh); g.shadowBlur = 0;
    g.font = `700 ${Math.round(bh * .42)}px ManropeA`; spaced(g, "CANCELED", 0, Math.round(bh * .15), 9, "#ffffff");
    g.restore();
  };
  const name = [p.top, p.word].filter(Boolean).join(" ");
  const was = [p.day, p.time].filter(Boolean).join("   |   ");
  await drawLogo(g, CX, story ? 165 : 110, story ? 78 : 60);
  g.font = "700 25px ManropeA"; kick(g, "SESSION UPDATE", CX, story ? 300 : 195, 8, rg(dim(t.c2, .72)));
  const fs = fit(g, sz => `italic 600 ${sz}px Bodoni`, "CANCELED", 860, story ? 180 : 160, -6), cap = capOf(g, fs, 600);
  let y = (story ? 300 : 195) + 50 + cap;
  gradTitle(g, "CANCELED", CX, y, fs, -6, 600, t.c1, t.c2);
  y += 46;
  const nfs = fit(g, sz => `700 ${sz}px ManropeA`, name, 880, story ? 44 : 40, 6);
  g.font = `700 ${nfs}px ManropeA`; spaced(g, name, CX, y + Math.floor(nfs * .72), 6, rg(t.ink));
  y += Math.floor(nfs * .72) + 34;
  g.fillStyle = redGrad(CX - 260, CX + 260); g.fillRect(CX - 260, y, 520, 3);
  y += 50;
  const reasonCard = (cx: number, top: number, cw: number, maxLines: number, fsz: number) => {
    const lines = wrap(info.reason || "", cw - 70, `500 ${fsz}px ManropeA`, maxLines);
    if (!lines.length) return 0;
    const lh = Math.round(fsz * 1.45), ch = lines.length * lh + 52, x0 = cx - cw / 2;
    g.save(); g.shadowColor = "rgba(80,10,20,.16)"; g.shadowBlur = 28; g.shadowOffsetY = 8; rr(g, x0, top, cw, ch, 32); g.fillStyle = "rgba(255,255,255,.74)"; g.fill(); g.restore();
    g.save(); rr(g, x0, top, cw, ch, 32); g.lineWidth = 3; g.strokeStyle = redGrad(x0, x0 + cw); g.stroke(); g.restore();
    g.textAlign = "center"; g.fillStyle = rg(t.ink); g.font = `500 ${fsz}px ManropeA`;
    lines.forEach((l, i) => g.fillText(l, cx, top + 26 + fsz + i * lh - 8));
    g.textAlign = "left";
    return ch;
  };
  const nextText = info.next ? "SEE YOU " + info.next : "SEE YOU AT THE NEXT ONE";
  if (story) {
    const PH = 640, PW = Math.round(PH * .75);
    poster(CX - PW / 2, y, PW, PH);
    y += PH + 60;
    g.font = "700 24px ManropeA"; spaced(g, "WAS PLANNED FOR", CX, y, 6, rg(t.ink, .6));
    y += 50; g.font = "700 36px ManropeA"; spaced(g, was, CX, y, 5, rg(t.ink, .85));
    const ww = measure(g, was, 5); g.fillStyle = rg(t.c2, .95); g.fillRect(CX - ww / 2 - 10, y - 12, ww + 20, 4);
    y += 52;
    const ch = reasonCard(CX, y, 860, 3, 32);
    y += ch + (ch ? 56 : 0) + 24;
    g.font = "700 30px ManropeA"; const nw = fit(g, sz => `700 ${sz}px ManropeA`, nextText, 900, 30, 5); g.font = `700 ${nw}px ManropeA`; spaced(g, nextText, CX, y, 5, redGrad(CX - 300, CX + 300));
    await drawIcon(g, p.icon, CX, 1856, 56, t.c1, t.c2);
  } else {
    const PH = 600, PW = Math.round(PH * .75), px = 70;
    poster(px, y, PW, PH);
    const rcx = px + PW + (1080 - px - (px + PW)) / 2, colW = 1080 - 70 - (px + PW) - 50;
    let ry = y + 26;
    g.font = "700 22px ManropeA"; spaced(g, "WAS PLANNED FOR", rcx, ry, 5, rg(t.ink, .6));
    ry += 48;
    for (const part of [p.day, p.time].filter(Boolean)) {
      g.font = "700 32px ManropeA"; spaced(g, part, rcx, ry, 4, rg(t.ink, .85));
      const w = measure(g, part, 4); g.fillStyle = rg(t.c2, .95); g.fillRect(rcx - w / 2 - 8, ry - 11, w + 16, 4);
      ry += 48;
    }
    ry += 14;
    const ch = reasonCard(rcx, ry, colW, 5, 28);
    ry += ch;
    y += PH + 56;
    g.font = "700 30px ManropeA"; const nw = fit(g, sz => `700 ${sz}px ManropeA`, nextText, 900, 30, 5); g.font = `700 ${nw}px ManropeA`; spaced(g, nextText, CX, y, 5, redGrad(CX - 300, CX + 300));
    await drawIcon(g, p.icon, CX, Math.min(1380, y + 70), 52, t.c1, t.c2);
  }
  grain(g, 1080, story ? 1920 : 1440);
  return out;
}
/* a rounded square with smooth corners (a superellipse), the outline WhatsApp gives a community icon */
function squirclePath(x: Ctx, cx: number, cy: number, a: number, n = 5) {
  x.beginPath();
  const steps = 360;
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const px = cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), py = cy + a * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.closePath();
}
/* the outer ring of a WhatsApp picture: a bright ring and a thin one inside it, in the club colours. A group is shown as a circle, a community as a rounded square, so the ring has both shapes. */
function ringFrame(x: Ctx, t: KitTheme, cx: number, cy: number, r: number, shape: "circle" | "squircle" = "circle") {
  const path = (a: number) => { if (shape === "circle") { x.beginPath(); x.arc(cx, cy, a, 0, Math.PI * 2); } else squirclePath(x, cx, cy, a); };
  x.save();
  x.lineWidth = 16; x.strokeStyle = grad(x, cx - r, cx + r, t.c1, t.c2);
  path(r); x.stroke();
  x.lineWidth = 4; x.globalAlpha = 0.45;
  path(r - 26); x.stroke();
  x.restore();
}
/* WhatsApp group picture: no text, only the glass picture, the ring and the club icon. WhatsApp crops it to a circle or rounded square, so everything sits in the middle. */
/* WhatsApp club picture: no logo and no writing. The pearl glass ground of the other pictures, the club icon exactly in the middle, and a round ring in the club colours round it. */
export async function makeCover(p: KitParams, t: KitTheme) {
  const c = cv(1080, 1080), x = c.getContext("2d")!, CX = 540;
  x.drawImage(await get(KIT_BG_COVERS[t.bg] || KIT_BG_COVERS[0]), 0, 0);
  glow(x, CX, CX, t.c2);
  if (t.decor !== "none" && t.decor !== "brain") { x.save(); x.translate(0, -420); x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0); x.restore(); }
  ringFrame(x, t, CX, CX, 470, "circle");
  await drawIconFit(x, p.icon, CX, CX, 520, 470, t.c1, t.c2);
  grain(x, 1080, 1080); return c;
}

/* the ASO logo in the same format as the club pictures (glass picture and ring), for the profile picture and the community icon (rounded-square ring) */

export async function makeProfilePicture(t: KitTheme, shape: "circle" | "squircle" = "squircle") {
  const c = cv(1080, 1080), x = c.getContext("2d")!, CX = 540;
  await paintGlass(x, KIT_BG_COVERS[t.bg] || KIT_BG_COVERS[0], glassOf(t), t);
  glow(x, CX, CX, t.c2);
  ringFrame(x, t, CX, CX, shape === "circle" ? 470 : 480, shape);
  await drawLogo(x, CX, CX, 560);
  grain(x, 1080, 1080); return c;
}
/* Instagram highlight cover: shown as a circle cut from the middle of a 9:16 picture, so the icon sits in the center */
export async function makeHighlight(p: KitParams, t: KitTheme) {
  const c = cv(1080, 1920), x = c.getContext("2d")!
  x.drawImage(await groundCanvas(t, 1080, 1920), 0, 0); wash(x, t, 1080, 1920);
  glow(x, 540, 960, t.c2);
  if (t.decor !== "none") x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0);
  await drawIcon(x, p.icon, 540, 960, 640, t.c1, t.c2);
  grain(x, 1080, 1920); return c;
}

export const WA_GREEN: [RGB, RGB] = [[37, 211, 102], [14, 140, 110]]
/* the "Links" highlight story: the ASO community with the WhatsApp icon and a big QR code, all on the centre line */
export async function makeLinksStory(url: string, t: KitTheme) {
  const c = cv(1080, 1920), x = c.getContext("2d")!, CX = 540;
  await paintGlass(x, storyBg(t), glassOf(t), t);
  glow(x, 540, 1100, t.c2);
  x.save(); x.translate(0, 100) /* the block sits in the middle of the story: the same space above the logo as below the last line */;
  await drawLogo(x, CX, 165, 78);
  x.font = "700 25px ManropeA"; kick(x, "JOIN THE", CX, 340, 7, rg(dim(t.c2, .72)));
  const fw = fit(x, s => `italic 600 ${s}px Bodoni`, "ASO Community", 820, 170, -5), cw = capOf(x, fw, 600);
  gradTitle(x, "ASO Community", CX, 372 + cw, fw, -5, 600, WA_GREEN[0], WA_GREEN[1]);
  const hl = 372 + cw + 52; x.fillStyle = grad(x, CX - 260, CX + 260, WA_GREEN[0], WA_GREEN[1]); x.fillRect(CX - 260, hl, 520, 3);
  await drawIconFit(x, "i-whatsapp", CX, hl + 165, 190, 190, WA_GREEN[0], WA_GREEN[1]);
  const QS = 480, qcy = hl + 165 + 95 + 70 + QS / 2 + 30;
  drawQR(x, url, CX, qcy, QS, WA_GREEN[0], WA_GREEN[1], t.c1, t.c2);
  const ty = qcy + QS / 2 + 30 + 80;
  x.font = "700 30px ManropeA"; spaced(x, "SCAN TO JOIN THE", CX, ty, 6, rg(t.ink, .92));
  x.font = "700 30px ManropeA"; spaced(x, "WHATSAPP COMMUNITY", CX, ty + 46, 6, grad(x, CX - 300, CX + 300, WA_GREEN[0], WA_GREEN[1]));
  x.font = "500 24px ManropeA"; spaced(x, "or tap the link below", CX, ty + 102, 1, rg(t.ink, .6));
  x.restore(); grain(x, 1080, 1920); return c;
}
/* the round cover of the "Links" highlight: the WhatsApp icon on the same ground as the club covers */
export async function makeLinksCover(t: KitTheme) {
  const c = cv(1080, 1920), x = c.getContext("2d")!;
  x.drawImage(await groundCanvas(t, 1080, 1920), 0, 0); wash(x, t, 1080, 1920);
  glow(x, 540, 960, t.c2);
  await drawIconFit(x, "i-whatsapp", 540, 960, 640, 640, WA_GREEN[0], WA_GREEN[1]);
  grain(x, 1080, 1920); return c;
}
/* the club icon alone, on a transparent background */
export async function makeIconPng(p: KitParams, t: KitTheme) {
  const c = cv(1024, 1024), x = c.getContext("2d")!
  const ic = await iconCanvas(p.icon, 900, t.c1, t.c2)
  x.drawImage(ic, (1024 - 900) / 2, (1024 - 900) / 2)
  return c;
}
