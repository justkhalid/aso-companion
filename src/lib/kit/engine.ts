/* Canvas engine of the club kit: the Instagram story (1080x1920) and the WhatsApp group picture (1080x1080).
   Ported from the generator; the layout numbers are unchanged. Browser only. */
import { KIT_ICONS } from './icons'
import { DECOR, rg, type RGB } from './decor'

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
export interface KitTheme { c1: RGB; c2: RGB; ink: RGB; decor: string; bg: number }

const FONT_FILES: [string, string, string, string][] = [
  ['Bodoni', 'bodoni500i', '500', 'italic'],
  ['Bodoni', 'bodoni600i', '600', 'italic'],
  ['ManropeA', 'manrope500', '500', 'normal'],
  ['ManropeA', 'manrope700', '700', 'normal'],
  ['Cairo', 'cairo700', '700', 'normal'],
]
export const KIT_LOGO = '/kit/logo.png'
export const KIT_BG_BASE = '/kit/bg/base.jpg'
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
  const layer = (inner: string) => get("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><g stroke="#000" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`));
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
/* a light wavy glass effect in two corners, for posters that came without the ASO frame */
let waveCache: HTMLCanvasElement | null = null
function waveLayer(w: number, h: number): HTMLCanvasElement {
  if (waveCache) return waveCache
  const o = cv(w, h), g = o.getContext("2d")!
  const cols = ["255,255,255", "140,180,255", "255,190,120", "255,255,255"]
  const draw = () => {
    for (let k = 0; k < 16; k++) {
      g.strokeStyle = `rgba(${cols[k % cols.length]},${0.4 + (k % 4) * 0.1})`
      g.lineWidth = 2 + (k % 4) * 2.5
      g.beginPath()
      const sx = k * 15 - 10, L = 260 + (k % 5) * 40
      for (let i = 0; i <= 24; i++) {
        const t = i / 24
        const px = sx - t * L * 0.62 + Math.sin(t * 7 + k) * 9, py = t * L * 0.78 + Math.cos(t * 5 + k * 0.7) * 5
        if (i) g.lineTo(px, py); else g.moveTo(px, py)
      }
      g.stroke()
    }
  }
  g.save(); draw(); g.restore()
  g.save(); g.translate(w, h); g.rotate(Math.PI); draw(); g.restore()
  const m = cv(w, h), mg = m.getContext("2d")!
  for (const [cx, cy] of [[0, 0], [w, h]]) {
    const gr = mg.createRadialGradient(cx, cy, 0, cx, cy, 380)
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)")
    mg.fillStyle = gr; mg.fillRect(0, 0, w, h)
  }
  g.globalCompositeOperation = "destination-in"
  g.drawImage(m, 0, 0)
  return (waveCache = o)
}

export async function makeStory(p: KitParams, t: KitTheme) {
  const c = cv(1080, 1920), x = c.getContext("2d")!, CX = 540;
  x.drawImage(await get(KIT_BG_BASE), 0, 0);
  glow(x, 540, 1300, t.c2);
  if (t.decor !== "none") x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0);
  await drawLogo(x, CX, 165, 78);
  const ev = p.mode === "event", single = !p.top, [g1, g2, g3, g4] = ev ? [40, 46, 46, 26] : single ? [62, 64, 66, 34] : [40, 46, 46, 26];
  const cap = (px: number, k = .72) => Math.floor(px * k);
  const fw = fit(x, s => `italic 600 ${s}px Bodoni`, p.word, 800, 175, -6), cw = capOf(x, fw, 600), gap = cw + 46;
  let ft = 0, ct = 0, inkH = cw;
  if (!single) { ft = fit(x, s => `italic 500 ${s}px Bodoni`, p.top, 740, 92, -2); ct = capOf(x, ft, 500); inkH = gap + ct; }
  const dsz = ev ? 40 : 42, dtr = ev ? 7 : 8;
  const B = cap(25) + g1 + inkH + g2 + g3 + cap(dsz) + g4 + cap(30);
  const y = ev ? 318 : Math.floor(204 + (860 - 204 - B) / 2) - 8;
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
  x.save(); x.shadowColor = "rgba(40,30,60,.28)"; x.shadowBlur = 40; x.shadowOffsetY = 14; rr(x, 199, 857, 681, 906, R); x.fillStyle = "#f6f3ee"; x.fill(); x.restore();
  x.save(); rr(x, 199, 857, 681, 906, R); x.clip();
  if (p.im) { fitCover(x, p.im, 199, 857, 681, 906); if (p.framed === false) { x.save(); x.filter = "blur(1px)"; x.globalAlpha = 0.95; x.drawImage(waveLayer(681, 906), 199, 857); x.restore() } } else { x.fillStyle = "#f6f3ee"; x.fillRect(199, 857, 681, 906); x.font = "700 23px ManropeA"; spaced(x, "POSTER 3:4", CX, 1318, 6, rg(t.ink, .45)); }
  x.restore();
  // link pill
  if (ev) { await drawIcon(x, p.icon, CX, 1838, 64, t.c1, t.c2); grain(x, 1080, 1920); return c; }
  const py = 1792; rr(x, CX - 300, py, 600, 84, 42); x.fillStyle = "rgba(250,247,241,.95)"; x.fill();
  x.strokeStyle = grad(x, CX - 300, CX + 300, t.c1, t.c2); x.lineWidth = 3; rr(x, CX - 300, py, 600, 84, 42); x.stroke();
  x.font = "700 22px ManropeA"; spaced(x, "WHATSAPP GROUP LINK HERE", CX, py + 50, 5, rg(t.ink, .67));
  grain(x, 1080, 1920); return c;
}
export async function makeCover(p: KitParams, t: KitTheme) {
  const c = cv(1080, 1080), x = c.getContext("2d")!, CX = 540;
  x.drawImage(await get(KIT_BG_COVERS[t.bg] || KIT_BG_COVERS[0]), 0, 0);
  glow(x, 540, 580, t.c2);
  if (t.decor !== "none" && t.decor !== "brain") { x.save(); x.translate(0, -420); x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0); x.restore(); }
  await drawLogo(x, CX, 95, 62);
  await drawIcon(x, p.icon, CX, 455, 570, t.c1, t.c2);
  const cap = (px: number, k = .72) => Math.floor(px * k), single = !p.top;
  const fw = fit(x, s => `italic 600 ${s}px Bodoni`, p.word, 800, 86, -6), cw = capOf(x, fw, 600), gap = cw + 46;
  let ft = 0, inkH = cw; if (!single) { ft = fit(x, s => `italic 500 ${s}px Bodoni`, p.top, 740, 44, -2); inkH = gap + capOf(x, ft, 500); }
  x.font = "700 27px ManropeA"; spaced(x, p.kicker, CX, 765 + cap(22), 8, rg(dim(t.c2, .72)));
  const ty = 765 + cap(22) + 56, base = ty + inkH;
  if (!single) gradTitle(x, p.top, CX, base - gap, ft, -2, 500, t.c1, t.c2);
  gradTitle(x, p.word, CX, base, fw, -6, 600, t.c1, t.c2);
  x.fillStyle = grad(x, CX - 230, CX + 230, t.c1, t.c2); x.fillRect(CX - 230, base + 26, 460, 3);
  grain(x, 1080, 1080); return c;
}

