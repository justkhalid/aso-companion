"use strict";
const A = window.ASSETS;
const $ = id => document.getElementById(id);
const img = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const cache = {};
const get = async src => cache[src] || (cache[src] = await img(src));

const AR = /[\u0600-\u06FF]/;
function kick(ctx, text, cx, base, tr, fill) {
  if (AR.test(text)) { ctx.save(); ctx.font = "700 36px Cairo"; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillStyle = fill; ctx.fillText(text, cx, base + 8); ctx.restore(); }
  else spaced(ctx, text, cx, base, tr, fill);
}
async function loadFonts() {
  for (const [fam, key, w, st] of [["Bodoni", "bodoni500i", "500", "italic"], ["Bodoni", "bodoni600i", "600", "italic"], ["ManropeA", "manrope500", "500", "normal"], ["ManropeA", "manrope700", "700", "normal"], ["Cairo", "cairo700", "700", "normal"]]) {
    const f = new FontFace(fam, `url(${A.fonts[key]})`, { weight: w, style: st }); await f.load(); document.fonts.add(f);
  }
}

// ---------- drawing helpers ----------
function measure(ctx, t, tr) { let w = 0; for (const ch of t) w += ctx.measureText(ch).width + tr; return w - tr; }
function fit(ctx, tpl, t, maxW, maxS, tr) { let s = maxS; for (; s > 20; s--) { ctx.font = tpl(s); if (measure(ctx, t, tr) <= maxW) break; } return s; }
function spaced(ctx, t, cx, base, tr, fill) {
  let x = cx - measure(ctx, t, tr) / 2; ctx.fillStyle = fill; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  for (const ch of t) { ctx.fillText(ch, x, base); x += ctx.measureText(ch).width + tr; }
}
const capOf = (ctx, size, weight) => { ctx.font = `italic ${weight} ${size}px Bodoni`; return ctx.measureText("H").actualBoundingBoxAscent; };
const grad = (ctx, x0, x1, c1, c2) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, rg(c1)); g.addColorStop(1, rg(c2)); return g; };
function gradTitle(ctx, t, cx, base, size, tr, weight, c1, c2) {
  ctx.font = `italic ${weight} ${size}px Bodoni`;
  const w = measure(ctx, t, tr);
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.28)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
  spaced(ctx, t, cx, base, tr, grad(ctx, cx - w / 2, cx + w / 2, c1, c2)); ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
async function svgLayer(body) { return get("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${body}</svg>`)); }
function glow(ctx, cx, cy, c2) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(720, 620);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (let i = 0; i <= 10; i++) { const t = i / 10; g.addColorStop(t, rg(c2, Math.pow(1 - t, 1.6) * 0.15)); }
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
let grainCanvas = null;
function grain(ctx, w, h) {
  if (!grainCanvas) { grainCanvas = cv(512, 512); const x = grainCanvas.getContext("2d"), d = x.createImageData(512, 512); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; } x.putImageData(d, 0, 0); }
  ctx.fillStyle = ctx.createPattern(grainCanvas, "repeat"); ctx.fillRect(0, 0, w, h);
}
async function drawLogo(ctx, cx, cy, h) {
  const l = await get(A.logo), w = h * l.width / l.height;
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.18)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.drawImage(l, cx - w / 2, cy - h / 2, w, h); ctx.restore();
}
async function iconCanvas(key, size, c1, c2) {
  const ic = A.icons[key];
  const layer = inner => get("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><g stroke="#000" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`));
  const c = cv(size, size), x = c.getContext("2d", { willReadFrequently: true }), a = cv(size, size), ax = a.getContext("2d");
  x.drawImage(await layer(ic.stroke), 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = grad(x, 0, size, c1, c2); x.fillRect(0, 0, size, size);
  ax.drawImage(await layer(ic.accent), 0, 0); ax.globalCompositeOperation = "source-in"; ax.fillStyle = rg(c2); ax.fillRect(0, 0, size, size);
  x.globalCompositeOperation = "source-over"; x.drawImage(a, 0, 0); return c;
}
async function drawIcon(ctx, key, cx, cy, size, c1, c2) {
  const c = await iconCanvas(key, size, c1, c2), d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, size, size).data;
  let x0 = size, x1 = 0, y0 = size, y1 = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (d[(y * size + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  ctx.save(); ctx.shadowColor = "rgba(40,30,60,.26)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.drawImage(c, cx - (x0 + x1) / 2, cy - (y0 + y1) / 2); ctx.restore();
}
function fitCover(ctx, im, x, y, w, h) { const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s; ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
const dim = (c, k) => c.map(v => Math.round(v * k));

// ---------- the three outputs ----------
async function makeStory(p, t) {
  const c = cv(1080, 1920), x = c.getContext("2d"), CX = 540;
  x.drawImage(await get(A.bgbase), 0, 0);
  glow(x, 540, 1300, t.c2);
  if (t.decor !== "none") x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0);
  await drawLogo(x, CX, 165, 78);
  const ev = p.mode === "event", single = !p.top, [g1, g2, g3, g4] = ev ? [40, 46, 46, 26] : single ? [62, 64, 66, 34] : [40, 46, 46, 26];
  const cap = (px, k = .72) => Math.floor(px * k);
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
  // poster slot: soft shadow, poster, ring hugging the same rounded corners
  const R = 44;
  x.save(); x.shadowColor = "rgba(40,30,60,.28)"; x.shadowBlur = 40; x.shadowOffsetY = 14; rr(x, 199, 857, 681, 906, R); x.fillStyle = "#f6f3ee"; x.fill(); x.restore();
  x.save(); rr(x, 199, 857, 681, 906, R); x.clip();
  if (p.im) fitCover(x, p.im, 199, 857, 681, 906); else { x.fillStyle = "#f6f3ee"; x.fillRect(199, 857, 681, 906); x.font = "700 23px ManropeA"; spaced(x, "POSTER 3:4", CX, 1318, 6, rg(t.ink, .45)); }
  x.restore();
  x.strokeStyle = grad(x, 199, 880, t.c1, t.c2); x.lineWidth = 4; rr(x, 197, 855, 685, 910, R + 2); x.stroke();
  // link pill
  if (ev) { await drawIcon(x, p.icon, CX, 1838, 64, t.c1, t.c2); grain(x, 1080, 1920); return c; }
  const py = 1792; rr(x, CX - 300, py, 600, 84, 42); x.fillStyle = "rgba(250,247,241,.95)"; x.fill();
  x.strokeStyle = grad(x, CX - 300, CX + 300, t.c1, t.c2); x.lineWidth = 3; rr(x, CX - 300, py, 600, 84, 42); x.stroke();
  x.font = "700 22px ManropeA"; spaced(x, "WHATSAPP GROUP LINK HERE", CX, py + 50, 5, rg(t.ink, .67));
  grain(x, 1080, 1920); return c;
}
async function makeCover(p, t) {
  const c = cv(1080, 1080), x = c.getContext("2d"), CX = 540;
  x.drawImage(await get(A.bg.cover[t.bg]), 0, 0);
  glow(x, 540, 580, t.c2);
  if (t.decor !== "none" && t.decor !== "brain") { x.save(); x.translate(0, -420); x.drawImage(await svgLayer(DECOR[t.decor](t.c1, t.c2)), 0, 0); x.restore(); }
  await drawLogo(x, CX, 95, 62);
  await drawIcon(x, p.icon, CX, 455, 570, t.c1, t.c2);
  const cap = (px, k = .72) => Math.floor(px * k), single = !p.top;
  const fw = fit(x, s => `italic 600 ${s}px Bodoni`, p.word, 800, 86, -6), cw = capOf(x, fw, 600), gap = cw + 46;
  let ft = 0, inkH = cw; if (!single) { ft = fit(x, s => `italic 500 ${s}px Bodoni`, p.top, 740, 44, -2); inkH = gap + capOf(x, ft, 500); }
  x.font = "700 27px ManropeA"; spaced(x, p.kicker, CX, 765 + cap(22), 8, rg(dim(t.c2, .72)));
  const ty = 765 + cap(22) + 56, base = ty + inkH;
  if (!single) gradTitle(x, p.top, CX, base - gap, ft, -2, 500, t.c1, t.c2);
  gradTitle(x, p.word, CX, base, fw, -6, 600, t.c1, t.c2);
  x.fillStyle = grad(x, CX - 230, CX + 230, t.c1, t.c2); x.fillRect(CX - 230, base + 26, 460, 3);
  grain(x, 1080, 1080); return c;
}

