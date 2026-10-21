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
