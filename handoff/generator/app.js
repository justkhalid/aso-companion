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

// ================= data: ASO Companion + local library =================
const WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const D3 = { Mon: "MONDAY", Tue: "TUESDAY", Wed: "WEDNESDAY", Thu: "THURSDAY", Fri: "FRIDAY", Sat: "SATURDAY", Sun: "SUNDAY" };
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const KICKERS = ["WEEKLY CLUB", "BIWEEKLY CLUB", "MONTHLY CLUB", "WORKSHOP", "CLASS", "SPECIAL EVENT", "OPEN MIC", "COMPETITION"];
const TIMES = ["9:00 - 11:00 AM", "10:00 AM - 12:00 PM", "11:00 AM - 1:00 PM", "2:00 - 4:00 PM", "3:00 - 5:00 PM", "4:00 - 6:00 PM", "5:00 - 6:00 PM"];
const VENUES = ["MAIN HALL", "LALA AISHA PARK", "LIBRARY", "COMPUTER ROOM", "TERRACE", "ONLINE"];
const FREQ = ["EVERY", "EVERY OTHER", "ONE DAY"];
const COMP_URL = "https://raw.githubusercontent.com/justkhalid/aso-companion/main/data/state.json";
const LOOK_BY_ICON = { physics: "philo", globe: "africa", brain: "psychology", community: "speaking", literature: "reading", cinema: "movie", art: "sunset", bike: "sports", study: "gold", environment: "eco", expo: "ocean", tech: "teal" };
const GEN_ICON = { art: "kids", study: "language", environment: "environment", expo: "geography", tech: "cybersecurity" };
const OV_NAMES = {
  xmv0z3cpq5k7qw: { kicker: "دورة مجانية الديداكتيك والتشريع التربوي", top: "FREE", word: "COURSE" },
  xmv597893u5a1j: { kicker: "AWARENESS MONTH", top: "CYBERSECURITY", word: "AWARENESS" },
  xmv57zyq13i1zk: { kicker: "LEARN. PRACTICE. SERVE. PROTECT.", top: "BEGOAS", word: "ECO IMPACT" }
};
const FRAMED_BY_ID = A.framed || {};
const kv = {
  db: null,
  async open() { if (this.db) return this.db; return this.db = await new Promise((res, rej) => { const r = indexedDB.open("aso-generator", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async get(k) { try { const db = await this.open(); return await new Promise(res => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); } catch (e) { try { return JSON.parse(localStorage.getItem("kv-" + k)); } catch (e2) { return undefined; } } },
  async set(k, v) { try { const db = await this.open(); await new Promise(res => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = res; }); } catch (e) { try { localStorage.setItem("kv-" + k, JSON.stringify(v)); } catch (e2) {} } }
};
let COMP = { clubs: A.snapshot.clubs, events: A.snapshot.events, live: false, at: "" }, OVR = {}, LOCAL = [];

function fmtTime(r) {
  if (!r || !r.includes("-")) return "";
  const f = s => { const [h, m] = s.split(":").map(Number); return { s: `${h % 12 || 12}:${String(m || 0).padStart(2, "0")}`, ap: h >= 12 ? "PM" : "AM" }; };
  const [a, b] = r.split("-").map(f); return a.ap === b.ap ? `${a.s} - ${b.s} ${b.ap}` : `${a.s} ${a.ap} - ${b.s} ${b.ap}`;
}
const dparts = iso => { const [y, m, d] = iso.split("-").map(Number); return { d, m: MONTHS[m - 1], wd: WEEK[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7] }; };
function splitName(name) {
  let n = name.replace(/\s+(Club|Activity)$/i, "").trim(), top = "", word = n;
  if (n.includes(":")) { [top, word] = n.split(":").map(s => s.trim()); }
  else { const w = n.split(/\s+/); if (w.length > 1) { top = w.slice(0, -1).join(" "); word = w[w.length - 1]; } }
  return [top.toUpperCase(), word.toUpperCase()];
}
function derive(kind, c) {
  const R = { id: c.id, type: kind, src: "companion", sched: true, lead: c.lead || "", desc: (c.desc || "").replace(/[‎‏​*]/g, "").trim() };
  const nm = c.name || c.title || ""; R.name = nm;
  [R.top, R.word] = splitName(nm);
  if (/[؀-ۿ]/.test(nm)) { R.top = ""; R.word = ""; }
  Object.assign(R, OV_NAMES[c.id] || {});
  R.venue = (c.room || c.place || "AMERICAN SPACE OUJDA").toUpperCase();
  R.time = fmtTime(c.time);
  if (kind === "club") {
    R.kicker = c.freq === "biweekly" ? "BIWEEKLY CLUB" : c.freq === "monthly" ? "MONTHLY CLUB" : "WEEKLY CLUB";
    const ds = (c.days || []).map(d => D3[d]);
    R.freq = c.freq === "biweekly" ? "EVERY OTHER" : "EVERY";
    if (ds.length === 1) { R.wd = ds[0]; R.dayCustom = ""; } else { R.freq = "ONE DAY"; R.wd = "SATURDAY"; R.dayCustom = ds.length ? ds.map(d => d + "S").join(" AND ") : "DAY TO BE ANNOUNCED"; }
    R.start = c.from || "";
  } else {
    R.kicker = R.kicker || "SPECIAL EVENT";
    R.freq = "ONE DAY"; R.wd = "SATURDAY";
    if (c.recur === "weekly") { const u = dparts(c.until); R.dayCustom = `EVERY ${D3[c.day]} UNTIL ${u.d} ${u.m.slice(0, 3)}`; }
    else { const d = dparts(c.date); R.dayCustom = `${d.wd} ${d.d} ${d.m}`; }
  }
  const look = LOOK_BY_ICON[c.icon] || "aso"; R.look = look; R.palette = "same"; R.decor = "same"; R.bg = 0;
  R.icon = GEN_ICON[c.icon] || LOOKS[look][5]; R.cap = R.desc; R.wa = c.url || "";
  R.poster = FRAMED_BY_ID[c.id] || null;
  return R;
}
const dayOf = R => R.freq === "ONE DAY" ? R.dayCustom : `${R.freq} ${R.wd}`;
function allRecs(kind) {
  const base = COMP[kind === "club" ? "clubs" : "events"].map(c => { const R = derive(kind, c); Object.assign(R, OVR[R.id] || {}); return R; });
  return base.concat(LOCAL.filter(r => r.type === kind));
}
const theme = R => { const L = LOOKS[R.look] || LOOKS.aso, pal = LOOKS[R.palette && R.palette !== "same" ? R.palette : R.look] || L; return { c1: pal[1], c2: pal[2], ink: pal[3], decor: R.decor && R.decor !== "same" ? R.decor : L[4], bg: +R.bg || 0 }; };
const params = async R => ({ im: R.poster ? await img(R.poster) : null, kicker: R.kicker, top: R.top, word: R.word || "CLUB NAME", day: dayOf(R), time: R.time, venue: R.venue, icon: R.icon, mode: R.type });
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ================= navigation =================
function show(v) {
  document.querySelectorAll(".view").forEach(e => e.style.display = e.id === "v-" + v ? "block" : "none");
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
  if (v === "clubs" || v === "events") renderList(v === "clubs" ? "club" : "event");
  window.scrollTo(0, 0);
}
// ================= manage lists =================
const thumbCache = new Map();
async function thumb(R) {
  const key = R.id + "|" + [R.kicker, R.top, R.word, R.look, R.palette, R.decor, R.icon, R.bg, R.time, R.venue, dayOf(R), (R.poster || "").length].join("|");
  if (thumbCache.has(key)) return thumbCache.get(key);
  const c = await makeStory(await params(R), theme(R)), t = cv(270, 480); t.getContext("2d").drawImage(c, 0, 0, 270, 480);
  const u = t.toDataURL("image/jpeg", .8); thumbCache.set(key, u); return u;
}
async function renderList(kind) {
  const box = $(kind === "club" ? "clubgrid" : "eventgrid"), recs = allRecs(kind); box.innerHTML = "";
  $(kind === "club" ? "clubcount" : "eventcount").textContent = recs.length;
  $(kind === "club" ? "clubsrc" : "eventsrc").textContent = COMP.live ? `Synced from ASO Companion ${COMP.at}` : "Showing the saved copy of the ASO Companion data";
  const my = ++listToken;
  for (const R of recs) {
    const d = document.createElement("div"); d.className = "mcard";
    d.innerHTML = `<div class="th"><div class="ph"></div></div><div class="mi"><b>${[R.top, R.word].filter(Boolean).join(" ") || R.name}</b><span>${dayOf(R)}</span><span>${R.time}${R.venue ? " | " + R.venue : ""}</span>
      <span class="badge ${R.poster ? "ok" : "need"}">${R.poster ? "Poster ready" : "Poster needed"}</span></div>
      <div class="ma"><button class="big" data-a="open">Open</button><button class="big" data-a="dl">Download</button><button class="big" data-a="post">Post</button>${R.src === "local" ? '<button class="big" data-a="del">Delete</button>' : ""}</div>`;
    d.querySelector("[data-a=open]").onclick = () => openRec(R);
    d.querySelector("[data-a=post]").onclick = async () => { await openRec(R); document.getElementById("step-post").scrollIntoView({ behavior: "smooth" }); };
    d.querySelector("[data-a=dl]").onclick = async () => { const p = await params(R), t = theme(R); const st = await makeStory(p, t), co = await makeCover(p, t); const sl = slug([R.top, R.word].join(" ")); st.toBlob(b => dl(b, `${sl}-story.png`)); setTimeout(() => co.toBlob(b => dl(b, `${sl}-whatsapp.png`)), 600); };
    const del = d.querySelector("[data-a=del]"); if (del) del.onclick = async () => { if (!confirm("Delete this from the library?")) return; LOCAL = LOCAL.filter(x => x.id !== R.id); await kv.set("local", LOCAL); renderList(kind); };
    box.append(d);
  }
  if (!recs.length) box.innerHTML = '<div class="empty">Nothing here yet.</div>';
  for (let i = 0; i < recs.length; i++) { if (my !== listToken) return; const u = await thumb(recs[i]); const ph = box.children[i] && box.children[i].querySelector(".ph"); if (ph) ph.outerHTML = `<img src="${u}" alt="">`; }
}
let listToken = 0;
async function syncCompanion(manual) {
  try {
    const r = await fetch(COMP_URL + "?t=" + Date.now(), { cache: "no-store" }); if (!r.ok) throw new Error(r.status);
    const j = await r.json(); COMP = { clubs: j.clubs || [], events: j.events || [], live: true, at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    $("syncmsg").textContent = `Synced ${COMP.clubs.length} clubs and ${COMP.events.length} events at ${COMP.at}.`;
  } catch (e) { COMP.live = false; $("syncmsg").textContent = "Could not reach the ASO Companion data. Using the saved copy."; }
  const cur = document.querySelector(".view[style*='block']"); if (cur && (cur.id === "v-clubs" || cur.id === "v-events")) renderList(cur.id === "v-clubs" ? "club" : "event");
}

// ================= create / edit =================
const S = {}; let cur = null, poster = null, token = 0, results = null, timer = null, persistTimer = null;
function chips(id, items, { custom = false, placeholder = "Type here", def, onPick } = {}) {
  const box = $(id); box.innerHTML = ""; box.classList.add("chips"); box.parentElement.querySelectorAll(".cust").forEach(e => e.remove());
  const add = (val, label) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.dataset.v = val; b.textContent = label || val; b.onclick = () => pick(val); box.append(b); };
  items.forEach(v => add(v)); let inp = null;
  if (custom) { add("__other", "Other..."); inp = document.createElement("input"); inp.type = "text"; inp.placeholder = placeholder; inp.className = "cust"; inp.oninput = () => { S[id] = inp.value.trim().toUpperCase(); queue(); }; box.parentElement.append(inp); }
  function pick(val, silent) {
    [...box.children].forEach(b => b.classList.toggle("on", b.dataset.v === val));
    if (val === "__other") { S[id] = inp.value.trim().toUpperCase(); inp.classList.add("on"); if (!silent) inp.focus(); } else { S[id] = val; if (inp) inp.classList.remove("on"); }
    if (!silent) { if (onPick) onPick(val); queue(); } else if (onPick) onPick(val);
  }
  box.set = val => { if (items.includes(val)) pick(val, true); else if (custom && val) { pick("__other", true); inp.value = val; S[id] = val; } else [...box.children].forEach(b => b.classList.remove("on")); };
  if (def) pick(def, true);
}
function formR() {
  return { ...cur, kicker: S.kicker || "", top: $("top").value.trim().toUpperCase(), word: $("word").value.trim().toUpperCase(), freq: S.freq, wd: S.wd, dayCustom: $("dayCustom").value.trim().toUpperCase(),
    time: S.time || "", venue: S.venue || "", look: S.look, palette: S.palette || "same", decor: S.decor || "same", icon: S.icon, bg: S.bg || 0, cap: $("cap").value, wa: $("wa").value.trim(), poster: cur.poster };
}
function setForm(R) {
  S.look = R.look; S.palette = R.palette || "same"; S.decor = R.decor || "same"; S.icon = R.icon; S.bg = R.bg || 0;
  $("kicker").set(R.kicker); $("top").value = R.top || ""; $("word").value = R.word || ""; $("freq").set(R.freq); $("wd").set(R.wd); $("dayCustom").value = R.dayCustom || "";
  $("wdwrap").style.display = R.freq === "ONE DAY" ? "none" : "block"; $("datewrap").style.display = R.freq === "ONE DAY" ? "block" : "none";
  $("time").set(R.time); $("venue").set(R.venue); $("cap").value = R.cap || ""; $("wa").value = R.wa || "";
  markLook(); buildDecor(); buildPalettes(); buildBgs(); buildIcons();
  $("schedbox").classList.toggle("locked", !!R.sched); $("schednote").style.display = R.sched ? "block" : "none";
}
async function openRec(R) {
  cur = { ...R }; poster = R.poster ? await img(R.poster) : null; setForm(cur);
  $("crumb").textContent = R.id && !String(R.id).startsWith("new") ? `Editing: ${[R.top, R.word].filter(Boolean).join(" ") || R.name}` : (R.type === "event" ? "New event" : "New club");
  $("savebtn").style.display = R.src === "local" && R.id.startsWith("new") ? "inline-block" : "none";
  $("pname").textContent = poster ? "Poster loaded" : "No poster yet"; results = null; $("out").innerHTML = '<div class="empty">Rendering...</div>';
  show("create"); await render(true);
}
function newRec(type) {
  openRec({ id: "new-" + Date.now(), type, src: "local", sched: false, name: "", kicker: type === "event" ? "SPECIAL EVENT" : "WEEKLY CLUB", top: "", word: "", freq: type === "event" ? "ONE DAY" : "EVERY", wd: "SATURDAY", dayCustom: "", time: "4:00 - 6:00 PM", venue: "MAIN HALL", look: "aso", palette: "same", decor: "same", icon: "ai", bg: 0, cap: "", wa: "", poster: null });
}
function queue() { clearTimeout(timer); timer = setTimeout(() => render().catch(e => { $("status").textContent = e.message; }), 300); clearTimeout(persistTimer); persistTimer = setTimeout(persist, 900); }
async function persist() {
  if (!cur) return; const R = formR();
  if (cur.src === "companion") { OVR[cur.id] = { kicker: R.kicker, top: R.top, word: R.word, look: R.look, palette: R.palette, decor: R.decor, icon: R.icon, bg: R.bg, cap: R.cap, wa: R.wa, poster: R.poster }; await kv.set("ovr", OVR); }
  else if (!String(cur.id).startsWith("new")) { const i = LOCAL.findIndex(x => x.id === cur.id); if (i >= 0) LOCAL[i] = R; await kv.set("local", LOCAL); }
}
async function saveNew() {
  const R = formR(); if (!R.word) return alert("Enter the club name first.");
  R.id = "local-" + Date.now(); cur = R; LOCAL.push(R); await kv.set("local", LOCAL); $("savebtn").style.display = "none"; $("crumb").textContent = `Editing: ${[R.top, R.word].join(" ")}`;
  alert("Saved. It now appears in the " + (R.type === "event" ? "Events" : "Clubs") + " list.");
}
async function render(first) {
  if (!cur) return; const my = ++token; $("status").textContent = "Updating...";
  const R = formR(); cur.poster = R.poster; const p = await params(R), t = theme(R), sl = slug([R.top, R.word].join(" ")) || "club";
  const st = await makeStory(p, t), co = await makeCover(p, t); if (my !== token) return;
  results = { sl, st, co, R }; poster = p.im;
  const out = $("out"); out.innerHTML = "";
  out.append(card("INSTAGRAM STORY", st, `${sl}-story.png`));
  const right = document.createElement("div"); right.className = "stack";
  right.append(card("WHATSAPP GROUP PICTURE (shown round)", co, `${sl}-whatsapp.png`, "circ"));
  const cd = document.createElement("div"); cd.className = "card"; cd.innerHTML = `<h3>CAPTION FOR THE POST</h3><textarea></textarea>`;
  const ta = cd.querySelector("textarea"); ta.value = $("cap").value; ta.oninput = () => { $("cap").value = ta.value; clearTimeout(persistTimer); persistTimer = setTimeout(persist, 900); };
  const cb = document.createElement("button"); cb.textContent = "Copy caption"; cb.onclick = () => { navigator.clipboard.writeText(ta.value); cb.textContent = "Copied"; setTimeout(() => cb.textContent = "Copy caption", 1500); };
  cd.append(cb); right.append(cd); out.append(right); $("status").textContent = "";
}
function card(title, canvas, fname, cls) {
  const d = document.createElement("div"); d.className = "card " + (cls || ""); d.innerHTML = `<h3>${title}</h3>`; d.appendChild(canvas);
  const b = document.createElement("button"); b.textContent = "Download"; b.onclick = () => canvas.toBlob(bl => dl(bl, fname)); d.appendChild(b); return d;
}
function dl(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

// ---- visual pickers ----
function markLook() { [...$("looks").children].forEach(b => b.classList.toggle("on", b.dataset.v === S.look)); }
function buildLooks() {
  const box = $("looks"); box.innerHTML = "";
  for (const [k, v] of Object.entries(LOOKS)) {
    const b = document.createElement("button"); b.type = "button"; b.className = "look"; b.dataset.v = k;
    b.innerHTML = `<span class="sw" style="background:linear-gradient(90deg,${rg(v[1])},${rg(v[2])})"></span><span>${v[0].split(":")[0]}</span><small>${DECOR_NAMES[v[4]]}</small>`;
    b.onclick = () => { S.look = k; S.icon = GEN_ICON_FOR(k); markLook(); buildIcons(); queue(); }; box.append(b);
  }
}
const GEN_ICON_FOR = k => LOOKS[k][5];
async function buildIcons() {
  const t = theme({ look: S.look, palette: S.palette, decor: S.decor, bg: 0 }), box = $("icons"); box.innerHTML = "";
  for (const [k, v] of Object.entries(A.icons)) {
    const b = document.createElement("button"); b.type = "button"; b.className = "ic" + (S.icon === k ? " on" : ""); b.dataset.v = k;
    const c = await iconCanvas(k, 96, t.c1, t.c2); c.className = "icc"; b.append(c); const l = document.createElement("small"); l.textContent = v.label; b.append(l);
    b.onclick = () => { S.icon = k; [...box.children].forEach(e => e.classList.toggle("on", e.dataset.v === k)); queue(); }; box.append(b);
  }
}
function pickRow(boxId, list, key, after) {
  const box = $(boxId); box.innerHTML = "";
  list.forEach(([k, n]) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip" + ((S[key] || "same") === k ? " on" : ""); b.dataset.v = k; b.textContent = n; b.onclick = () => { S[key] = k; [...box.children].forEach(e => e.classList.toggle("on", e.dataset.v === k)); if (after) after(); queue(); }; box.append(b); });
}
const buildDecor = () => pickRow("decorbox", [["same", "Same as look"], ...Object.entries(DECOR_NAMES)], "decor", buildIcons);
const buildPalettes = () => pickRow("palbox", [["same", "Same as look"], ...Object.entries(LOOKS).map(([k, v]) => [k, v[0].split(":")[0]])], "palette", buildIcons);
function buildBgs() {
  const box = $("bgs"); box.innerHTML = "";
  A.bg.cover.forEach((src, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "bgt" + (i === (+S.bg || 0) ? " on" : ""); b.innerHTML = `<img src="${src}" alt="">`; b.onclick = () => { S.bg = i; [...box.children].forEach((e, j) => e.classList.toggle("on", j === i)); queue(); }; box.append(b); });
}
async function setPosterFile(f) {
  const im = await img(URL.createObjectURL(f)), c = cv(1080, 1440); fitCover(c.getContext("2d"), im, 0, 0, 1080, 1440);
  cur.poster = c.toDataURL("image/jpeg", .88); poster = await img(cur.poster); $("pname").textContent = "Poster loaded"; queue();
}

// ================= settings =================
async function exportLib() { dl(new Blob([JSON.stringify({ ovr: OVR, local: LOCAL })], { type: "application/json" }), "aso-generator-library.json"); }
async function importLib(f) { const j = JSON.parse(await f.text()); OVR = j.ovr || {}; LOCAL = j.local || []; await kv.set("ovr", OVR); await kv.set("local", LOCAL); alert("Library restored."); }

async function init() {
  await loadFonts();
  OVR = (await kv.get("ovr")) || {}; LOCAL = (await kv.get("local")) || [];
  chips("kicker", KICKERS, { custom: true, placeholder: "Type your own" });
  chips("freq", FREQ, { onPick: v => { $("wdwrap").style.display = v === "ONE DAY" ? "none" : "block"; $("datewrap").style.display = v === "ONE DAY" ? "block" : "none"; } });
  chips("wd", WEEK); chips("time", TIMES, { custom: true, placeholder: "e.g. 5:00 - 7:00 PM" }); chips("venue", VENUES, { custom: true, placeholder: "Place" });
  buildLooks();
  document.querySelectorAll("#v-create input[type=text],#v-create textarea").forEach(e => { if (!e.classList.contains("cust")) e.addEventListener("input", queue); });
  $("poster").addEventListener("change", e => { const f = e.target.files[0]; if (f && cur) setPosterFile(f); });
  document.querySelectorAll("#nav a").forEach(a => a.onclick = e => { e.preventDefault(); show(a.dataset.v); });
  document.querySelectorAll("[data-new]").forEach(b => b.onclick = () => newRec(b.dataset.new));
  $("savebtn").onclick = saveNew; $("backbtn").onclick = () => show(cur && cur.type === "event" ? "events" : "clubs");
  $("all").onclick = () => { if (!results) return alert("Open a club first."); [["st", "story"], ["co", "whatsapp"]].forEach(([k, n], i) => setTimeout(() => results[k].toBlob(bl => dl(bl, `${results.sl}-${n}.png`)), i * 600)); };
  $("syncnow").onclick = () => syncCompanion(true); $("exportlib").onclick = exportLib; $("importlib").onchange = e => e.target.files[0] && importLib(e.target.files[0]);
  $("resetlib").onclick = async () => { if (!confirm("Remove all changes made in this generator (looks, icons, captions, posters, new clubs)?")) return; OVR = {}; LOCAL = []; await kv.set("ovr", OVR); await kv.set("local", LOCAL); thumbCache.clear(); alert("Done."); };
  initPublish(); show("clubs"); syncCompanion();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
}
// ---------- publishing to Instagram and Facebook (Meta Graph API) ----------
const CFG_KEY = "aso-meta-config";
const cfg = () => { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } };
const log = m => document.querySelectorAll(".plog").forEach(l => { l.textContent += m + "\n"; l.scrollTop = l.scrollHeight; });
const clearLog = () => document.querySelectorAll(".plog").forEach(l => l.textContent = "");
async function gp(path, { method = "POST", data = {}, blob = null, field = "source" } = {}) {
  const c = cfg(), url = `https://graph.facebook.com/${c.ver || "v23.0"}/${path}`;
  let r;
  if (method === "GET") r = await fetch(`${url}${url.includes("?") ? "&" : "?"}${new URLSearchParams({ ...data, access_token: c.token })}`);
  else { const f = new FormData(); Object.entries(data).forEach(([k, v]) => f.append(k, v)); if (blob) f.append(field, blob, "image.jpg"); f.append("access_token", c.token); r = await fetch(url, { method: "POST", body: f }); }
  const j = await r.json(); if (j.error) throw new Error(j.error.message + (j.error.error_user_msg ? " - " + j.error.error_user_msg : "")); return j;
}
const jpeg = (canvas, q = .92) => new Promise(res => canvas.toBlob(res, "image/jpeg", q));
function posterCanvas() { if (!poster) throw new Error("This item has no poster yet"); const c = cv(1080, 1440); fitCover(c.getContext("2d"), poster, 0, 0, 1080, 1440); return c; }
async function hostedUrl(blob) {
  const c = cfg(), up = await gp(`${c.page}/photos`, { data: { published: "false" }, blob });
  const info = await gp(up.id, { method: "GET", data: { fields: "images" } });
  return { id: up.id, url: info.images[0].source };
}
async function igPublish(imageUrl, extra) {
  const c = cfg(), cont = await gp(`${c.ig}/media`, { data: { image_url: imageUrl, ...extra } });
  for (let i = 0; i < 20; i++) { const s = await gp(cont.id, { method: "GET", data: { fields: "status_code" } }); if (s.status_code === "FINISHED") break; if (s.status_code === "ERROR") throw new Error("Instagram could not process the image"); await new Promise(r => setTimeout(r, 1500)); }
  return gp(`${c.ig}/media_publish`, { data: { creation_id: cont.id } });
}
async function publishNow() {
  const c = cfg(); if (!c.token || !c.page) return alert("Open Settings and add the Page ID and access token first.");
  if (!results) return alert("Add a poster first.");
  const want = { igFeed: $("pIgFeed").checked, igStory: $("pIgStory").checked, fbFeed: $("pFbFeed").checked, fbStory: $("pFbStory").checked };
  if (!Object.values(want).some(Boolean)) return alert("Tick at least one place to post.");
  if ((want.igFeed || want.igStory) && !c.ig) return alert("Instagram account ID is missing in Settings.");
  const cap = $("cap").value;
  if (!confirm("Post now to the selected places?")) return;
  clearLog(); $("pgo").disabled = true;
  try {
    const pBlob = await jpeg(posterCanvas()), sBlob = await jpeg(results.st);
    let sHost = null, pHost = null;
    if (want.igFeed) { log("Instagram post: uploading poster..."); pHost = await hostedUrl(pBlob); await igPublish(pHost.url, { caption: cap }); log("Instagram post: done"); }
    if (want.igStory) { log("Instagram story: uploading..."); sHost = await hostedUrl(sBlob); await igPublish(sHost.url, { media_type: "STORIES" }); log("Instagram story: done"); }
    if (want.fbFeed) { log("Facebook post: uploading..."); await gp(`${c.page}/photos`, { data: { caption: cap, published: "true" }, blob: pBlob }); log("Facebook post: done"); }
    if (want.fbStory) { log("Facebook story: uploading..."); const up = await gp(`${c.page}/photos`, { data: { published: "false" }, blob: sBlob }); await gp(`${c.page}/photo_stories`, { data: { photo_id: up.id } }); log("Facebook story: done"); }
    log("Finished.");
  } catch (e) { log("Stopped: " + e.message); }
  $("pgo").disabled = false;
}
async function testConn() {
  saveCfg(); clearLog();
  try { const c = cfg(); const pg = await gp(c.page, { method: "GET", data: { fields: "name" } }); log("Facebook Page: " + pg.name);
    if (c.ig) { const ig = await gp(c.ig, { method: "GET", data: { fields: "username" } }); log("Instagram: @" + ig.username); } log("Connection works."); } catch (e) { log("Failed: " + e.message); }
}
function saveCfg() { localStorage.setItem(CFG_KEY, JSON.stringify({ page: $("cPage").value.trim(), ig: $("cIg").value.trim(), token: $("cTok").value.trim(), ver: $("cVer").value.trim() || "v23.0" })); }
function initPublish() {
  const c = cfg(); $("cPage").value = c.page || ""; $("cIg").value = c.ig || ""; $("cTok").value = c.token || ""; $("cVer").value = c.ver || "v23.0";
  ["cPage", "cIg", "cTok", "cVer"].forEach(i => $(i).addEventListener("change", saveCfg));
  $("pgo").onclick = publishNow; $("ptest").onclick = testConn;
}
init();
