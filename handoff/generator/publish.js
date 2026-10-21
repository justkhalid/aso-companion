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
