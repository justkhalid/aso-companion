/* Canvas engine of the club kit: the Instagram story (1080x1920) and the WhatsApp group picture (1080x1080).
   Ported from the generator; the layout numbers are unchanged. Browser only. */
import { KIT_ICONS } from './icons'
import { DECOR, rg, type RGB } from './decor'
import { makeDecorAnim } from './decor-anim'

export interface KitParams {
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
const grad = (ctx: Ctx, x0: number, x1: number, c1: RGB, c2: RGB) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, rg(c1)); g.addColorStop(1, rg(c2)); return g; };
function gradTitle(ctx: Ctx, t: string, cx: number, base: number, size: number, tr: number, weight: number, c1: RGB, c2: RGB) {
  ctx.font = `italic ${weight} ${size}px Bodoni`;
  const w = measure(ctx, t, tr);
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.28)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
  spaced(ctx, t, cx, base, tr, grad(ctx, cx - w / 2, cx + w / 2, c1, c2)); ctx.restore();
}
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export async function svgLayer(body: string) { return get("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${body}</svg>`)); }
function glow(ctx: Ctx, cx: number, cy: number, c2: RGB) {
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
export async function iconCanvas(key: string, size: number, c1: RGB, c2: RGB) {
  const ic = KIT_ICONS[key];
  const layer = (inner: string) => get("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><g stroke="#000" stroke-width="${ic.sw ?? 0.9}" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`));
  const c = cv(size, size), x = c.getContext("2d", { willReadFrequently: true })!, a = cv(size, size), ax = a.getContext("2d")!;
  x.drawImage(await layer(ic.stroke), 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = grad(x, 0, size, c1, c2); x.fillRect(0, 0, size, size);
  ax.drawImage(await layer(ic.accent), 0, 0); ax.globalCompositeOperation = "source-in"; ax.fillStyle = rg(c2); ax.fillRect(0, 0, size, size);
  x.globalCompositeOperation = "source-over"; x.drawImage(a, 0, 0); return c;
}
async function drawIcon(ctx: Ctx, key: string, cx: number, cy: number, size: number, c1: RGB, c2: RGB) {
  const c = await iconCanvas(key, size, c1, c2), d = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, size, size).data;
  let x0 = size, x1 = 0, y0 = size, y1 = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (d[(y * size + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.26)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.drawImage(c, cx - (x0 + x1) / 2, cy - (y0 + y1) / 2); ctx.restore();
}
export function fitCover(ctx: Ctx, im: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) { const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s; ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
const dim = (c: RGB, k: number): RGB => c.map(v => Math.round(v * k)) as RGB;

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
  look: ["Colors of the look", null, 0],
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
function wash(x: Ctx, t: KitTheme, w: number, h: number) {
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
  const PH = 906, bottom = ev ? 1800 : 1792, space = Math.floor((bottom - 204 - B - PH) / 3)
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
  const R = 44;
  x.save(); x.shadowColor = "rgba(40,30,60,.28)"; x.shadowBlur = 40; x.shadowOffsetY = 14; rr(x, 199, PY, 681, PH, R); x.fillStyle = "#f6f3ee"; x.fill(); x.restore();
  x.save(); rr(x, 199, PY, 681, PH, R); x.clip();
  if (p.im) { fitCover(x, p.im, 199, PY, 681, PH) } else { x.fillStyle = "#f6f3ee"; x.fillRect(199, PY, 681, PH); x.font = "700 23px ManropeA"; spaced(x, "POSTER 3:4", CX, PY + PH / 2 + 8, 6, rg(t.ink, .45)); }
  x.restore();
  // link pill
  if (ev) { await drawIcon(x, p.icon, CX, 1838, 64, t.c1, t.c2); if (withBg) grain(x, 1080, 1920); return c; }
  const py = 1792; rr(x, CX - 300, py, 600, 84, 42); x.fillStyle = "rgba(250,247,241,.95)"; x.fill();
  x.strokeStyle = grad(x, CX - 300, CX + 300, t.c1, t.c2); x.lineWidth = 3; rr(x, CX - 300, py, 600, 84, 42); x.stroke();
  x.font = "700 22px ManropeA"; spaced(x, "WHATSAPP GROUP LINK HERE", CX, py + 50, 5, rg(t.ink, .67));
  if (withBg) grain(x, 1080, 1920); return c;
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
export async function makeCover(p: KitParams, t: KitTheme) {
  const c = cv(1080, 1080), x = c.getContext("2d")!, CX = 540;
  x.drawImage(await get(KIT_BG_COVERS[t.bg] || KIT_BG_COVERS[0]), 0, 0);
  glow(x, 540, 580, t.c2);
  if (t.decor !== "none" && t.decor !== "brain") { x.save(); x.translate(0, -420); x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0); x.restore(); }
  await drawLogo(x, CX, 95, 62);
  await drawIcon(x, p.icon, CX, 570, 740, t.c1, t.c2);
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
/* the club icon alone, on a transparent background */
export async function makeIconPng(p: KitParams, t: KitTheme) {
  const c = cv(1024, 1024), x = c.getContext("2d")!
  const ic = await iconCanvas(p.icon, 900, t.c1, t.c2)
  x.drawImage(ic, (1024 - 900) / 2, (1024 - 900) / 2)
  return c;
}
