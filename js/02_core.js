/* ================= ELTASO Companion core ================= */
"use strict";

/* ---------- utils ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function escNl(s){ return esc(s).replace(/\n/g,'<br>'); }
function uid(){ return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

const ICONS = {
  home: '<path d="M3 10.2 12 3l9 7.2"/><path d="M5 8.6V20a1 1 0 0 0 1 1h4.6v-6.2h2.8V21H18a1 1 0 0 0 1-1V8.6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  reset: '<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><path d="M6 1v3"/><path d="M10 1v3"/><path d="M14 1v3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  /* v2.10: extra icons for the club cards */
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  /* v2.22: graduation cap for ELTASO (education), sparkles for clubs & events */
  grad: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/>',
};
function icon(name, size, sw){
  return '<svg width="' + (size||18) + '" height="' + (size||18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw||1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name]||'') + '</svg>';
}

/* ---------- store ---------- */
const LS_KEY = 'eltaso_companion_v1';
let state;
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
/* v1.1.1 calendar correction: the real S1 start is 2026-10-05 ("this week is actually week 1").
   One-time fix for states saved by v1.1.0 or earlier. Never touches customized dates or edited notes. */
function notesSig(a){
  return JSON.stringify([].concat(a || []).map(x => ({w: +x.week, t: String(x.text == null ? '' : x.text)})).sort((p, q) => p.w - q.w));
}
const CAL_OLD_NOTES = [
  {week:7,  text:'Halloween week'},
  {week:14, text:'Christmas party - last class before winter break'},
  {week:15, text:'SEMESTER 1 ASSESSMENT'},
  {week:16, text:'First week after winter break'},
  {week:30, text:'FINAL ASSESSMENT + certificates'}
];
function migrateCal(s){
  const st = s.settings;
  if(!st || (+st.calRev || 0) >= 2) return false;
  if(st.s1Start === '2026-09-14'){
    st.s1Start = '2026-10-05';
    if(notesSig(s.notes) === notesSig(CAL_OLD_NOTES)){
      const h = s.notes.find(x => +x.week === 7);
      if(h) h.week = 4; /* Halloween Oct 31 now falls in W4 (Oct 26 - Nov 1) */
    }
  }
  st.calRev = 2;
  return true;
}
/* v3: 4 flat age bands -> 3 bands x 3 tiers (Kids/Teens/Adults · Beg/Int/Adv) */
const LV_MAP = {'kids':'kids-beg','teens':'teens-beg','adults-a':'adults-beg','adults-b':'adults-int'};
const LV_CLASS_MAP = {'Kids':'Kids \u00b7 Beginners','Teens':'Teens \u00b7 Beginners','Adults A':'Adults \u00b7 Beginners','Adults B':'Adults \u00b7 Intermediate'};
function migrateLevels(s, force){
  const st = s.settings; if(!force && (!st || (+st.lvRev || 0) >= 3)) return false;
  if(st) st.lvRev = 3;
  let dirty = false;
  (s.levels || []).forEach(lv => {
    const nk = LV_MAP[lv.key];
    if(nk && !lv.band){                       // old-shape base level: rename + tag
      const band = nk.split('-')[0] === 'kids' ? 'Kids' : nk.split('-')[0] === 'teens' ? 'Teens' : 'Adults';
      const tier = nk === 'adults-int' ? 'Intermediate' : 'Beginners';
      lv.key = nk; lv.band = band; lv.tier = tier;
      lv.label = band + ' \u00b7 ' + tier;
      dirty = true;
    }
  });
  if(dirty){                                  // remap prep checklist keys + class levels
    const remap = {'kids':'kids-beg','teens':'teens-beg','adults-a':'adults-beg','adults-b':'adults-int'};
    Object.keys(s.prep || {}).forEach(k => {
      const old = k.split(':')[0];
      if(remap[old]){ s.prep[remap[old] + k.slice(old.length)] = s.prep[k]; delete s.prep[k]; }
    });
    (s.classes || []).forEach(c => { if(LV_CLASS_MAP[c.level]) c.level = LV_CLASS_MAP[c.level]; });
  }
  // fill in missing tiers from the shipped program (order: Kids, Teens, Adults x Beg/Int/Adv)
  const WANT = ['kids-beg','kids-int','kids-adv','teens-beg','teens-int','teens-adv','adults-beg','adults-int','adults-adv'];
  const have = {};
  (s.levels || []).forEach(lv => { have[lv.key] = lv; });
  const merged = [];
  WANT.forEach(k => {
    if(have[k]) merged.push(have[k]);
    else {
      const seedLv = (typeof SEED !== 'undefined' ? SEED.levels : []).find(x => x.key === k);
      if(seedLv){ merged.push(JSON.parse(JSON.stringify(seedLv))); dirty = true; }
    }
  });
  (s.levels || []).forEach(lv => { if(!WANT.includes(lv.key)) merged.push(lv); });  // keep custom levels
  if(merged.length !== (s.levels || []).length || dirty){
    if(merged.length) s.levels = merged;
    return true;
  }
  return dirty;
}
/* v4 (app v1.4.0): four-skills weekly plan + full Drive library + {skills} template */
function migrateSkills(s, force){
  const st = s.settings; if(!st) return false;
  if(!force && (+st.skRev || 0) >= 1) return false;
  st.skRev = 1;
  (s.levels || []).forEach(lv => {
    const seedLv = (typeof SEED !== 'undefined' ? SEED.levels : []).find(x => x.key === lv.key);
    if(!seedLv) return;
    lv.weeks.forEach((w, i) => {
      const sw = seedLv.weeks[i];
      if(w && !w.skills && sw && sw.skills) w.skills = JSON.parse(JSON.stringify(sw.skills));
    });
  });
  if((+st.libRev || 0) < 1){          /* library: cover the whole Drive root, tagged by skill */
    st.libRev = 1;
    const cur = s.library || [];
    const shipped = (typeof SEED !== 'undefined' ? SEED.library : []);
    const ids = {};
    shipped.forEach(x => { ids[x.id] = 1; });
    s.library = shipped.map(x => JSON.parse(JSON.stringify(x))).concat(cur.filter(x => !ids[x.id]));
  }
  if(s.settings.tpl && s.settings.tpl.indexOf('{skills}') === -1){
    s.settings.tpl = s.settings.tpl.replace(
      'Objectives: by the end of the week, students can {obj}\n',
      'Objectives: by the end of the week, students can {obj}\nSkills this week:\n{skills}\n');
    if(s.settings.tpl.indexOf('{skills}') === -1) s.settings.tpl += '\n\nSkills this week:\n{skills}';
  }
  return true;
}
/* v5 (app v1.5.0): embedded lesson plans (Kids · Beginners) + Lead Intern dashboard */
function migrateLpIntern(s, force){
  const st = s.settings; if(!st) return false;
  let dirty = false;
  if(force || (+st.lpRev || 0) < 1){
    st.lpRev = 1;
    const seedKb = (typeof SEED !== 'undefined' ? SEED.levels : []).find(x => x.key === 'kids-beg');
    const kb = (s.levels || []).find(x => x.key === 'kids-beg');
    if(seedKb && kb){
      kb.weeks.forEach((w, i) => { const sw = seedKb.weeks[i]; if(w && !w.lp && sw && sw.lp){ w.lp = JSON.parse(JSON.stringify(sw.lp)); dirty = true; } });
    }
  }
  if(force || (+st.intRev || 0) < 1){
    st.intRev = 1;
    if(!Array.isArray(s.clubs) && typeof SEED !== 'undefined'){ s.clubs = deepClone(SEED.clubs); dirty = true; }
    if(!Array.isArray(s.volunteers) && typeof SEED !== 'undefined'){ s.volunteers = deepClone(SEED.volunteers); dirty = true; }
  }
  /* lpRev 2 (v2.14): ship the written-out Kids Intermediate + Advanced plans.
     Browsers that stored the old lp-less weeks pick them up from SEED here,
     without touching any lp the teacher has already edited. */
  if(force || (+st.lpRev || 0) < 2){
    st.lpRev = 2;
    ['kids-int', 'kids-adv'].forEach(key => {
      const seedL = (typeof SEED !== 'undefined' ? SEED.levels : []).find(x => x.key === key);
      const lvl = (s.levels || []).find(x => x.key === key);
      if(seedL && lvl) lvl.weeks.forEach((w, i) => { const sw = seedL.weeks[i]; if(w && !w.lp && sw && sw.lp){ w.lp = JSON.parse(JSON.stringify(sw.lp)); dirty = true; } });
    });
  }
  return dirty;
}

/* v6 (app v2.0): ASO Companion era - roles, events, reports, pins, codes, v1.9 internship package */
function migrateV6(s, force){
  const st = s.settings; if(!st) return false;
  let dirty = false;
  if(force || (+st.roleRev || 0) < 1){
    st.roleRev = 1;
    if(!st.adminCode){ st.adminCode = '1234'; dirty = true; }
    if(!st.teacherCode){ st.teacherCode = 'eltaso'; dirty = true; }
    if(!Array.isArray(s.events)){ s.events = deepClone((typeof SEED !== 'undefined' && SEED.events) || []); dirty = true; }
    if(!Array.isArray(s.reports)){ s.reports = []; dirty = true; }
    if(!Array.isArray(s.libraryPins)){ s.libraryPins = []; dirty = true; }
    if(!Array.isArray(s.clubs)){ s.clubs = deepClone((typeof SEED !== 'undefined' && SEED.clubs) || []); dirty = true; }
    if(!Array.isArray(s.volunteers)){ s.volunteers = deepClone((typeof SEED !== 'undefined' && SEED.volunteers) || []); dirty = true; }
    /* top up the internship package without touching the user's own entries */
    ((typeof SEED !== 'undefined' && SEED.clubs) || []).forEach(c => {
      if(c.placeholder && !s.clubs.some(x => x.name === c.name)){ s.clubs.push(deepClone(c)); dirty = true; }
    });
    ((typeof SEED !== 'undefined' && SEED.events) || []).forEach(e => {
      if(!s.events.some(x => x.title === e.title)){ s.events.push(deepClone(e)); dirty = true; }
    });
    /* holiday anchors on the visible week notes (dates confirmed for 2026-27) */
    ((typeof SEED !== 'undefined' && SEED.notes) || []).forEach(n => {
      if(!s.notes.some(x => x.week === n.week)){ s.notes.push(deepClone(n)); dirty = true; }
      else if(!s.notes.find(x => x.week === n.week).text){ s.notes.find(x => x.week === n.week).text = n.text; dirty = true; }
    });
    s.notes.sort((a, b) => a.week - b.week);
  }
  return dirty;
}

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const s = JSON.parse(raw);
      if(s && s.v === 1 && s.levels){
        let dirty = migrateCal(s);
        if(migrateLevels(s)) dirty = true;
        if(migrateSkills(s)) dirty = true;
        if(migrateLpIntern(s)) dirty = true;
        if(migrateV6(s)) dirty = true;
        if(dirty) persist(s);
        return s;
      }
    }
  }catch(e){}
  const s = deepClone(SEED);
  persist(s);
  return s;
}
function persist(s){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }catch(e){ console.warn('storage full', e); } }
/* v2.11: _rev is a timestamp set on every save. It lets the boot loader
   compare the local state with the cloud state and use the newer one, so
   edits made on one device become visible on every other device. */
function save(){ state._rev = Date.now(); persist(state); ghQueueSave(); }

/* ================= v2.11: boot loader - fetch data/state.json on boot =================
   The site is a static page. Without this, every visitor loads the hardcoded
   SEED (js/01_seed.js) and never sees the admin's edits - even though the
   admin's edits ARE committed to data/state.json in the repo. The fix: on
   every page load, fetch data/state.json from the same origin. If it exists
   and is newer than the local state, use it. This is what makes cloud sync
   actually visible to other people. */
async function bootLoadState(){
  /* 1. Try localStorage (the user's own edits from this browser). */
  let local = null;
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const s = JSON.parse(raw);
      if(s && s.v === 1 && s.levels) local = s;
    }
  }catch(e){}

  /* 2. Fetch the cloud-synced state. Two URLs are tried in order:
        a) raw.githubusercontent.com - updated INSTANTLY after a commit
           (GitHub Pages takes 1-2 minutes to redeploy, so the same-origin
           data/state.json would be stale right after the admin saves).
           CORS is open (access-control-allow-origin: *).
        b) data/state.json (same origin) - works on any static host, but
           may be stale for 1-2 minutes after a commit on GitHub Pages.
        Both get a cache-busting query param so CDN caches don't serve
        an old version. */
  let cloud = null;
  const g = ghSettings();
  const rawUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(g.repo.split('/')[0]) + '/' + encodeURIComponent(g.repo.split('/')[1]) + '/' + encodeURIComponent(g.branch) + '/' + ghEncodePath(g.path) + '?v=' + Date.now();
  try{
    const r = await fetch(rawUrl, {cache: 'no-cache'});
    if(r.ok){
      const s = await r.json();
      if(s && s.v === 1 && Array.isArray(s.levels) && s.settings) cloud = s;
    }
  }catch(e){ /* network error or CORS - fall through to same-origin */ }
  if(!cloud){
    try{
      const r = await fetch('data/state.json?v=' + Date.now(), {cache: 'no-cache'});
      if(r.ok){
        const s = await r.json();
        if(s && s.v === 1 && Array.isArray(s.levels) && s.settings) cloud = s;
      }
    }catch(e){ /* not a static host or file doesn't exist - fall through */ }
  }

  /* 3. Decide which state to use. Prefer the newer _rev. If equal or
        cloud is older, keep local (the user's unsaved edits win). */
  let chosen, fromCloud = false;
  if(local && cloud){
    const localRev = +local._rev || 0;
    const cloudRev = +cloud._rev || 0;
    if(cloudRev > localRev){
      chosen = cloud; fromCloud = true;
      /* Preserve the local GitHub token + lastSync (these never come from
         the repo because ghSaveNow strips them before committing). */
      if(chosen.settings){
        chosen.settings.ghToken = local.settings.ghToken || '';
        chosen.settings.ghLastSync = local.settings.ghLastSync || '';
      }
    } else {
      chosen = local;
    }
  } else if(local){
    chosen = local;
  } else if(cloud){
    chosen = cloud; fromCloud = true;
  } else {
    chosen = deepClone(SEED);
  }

  /* 4. Migrate (calendar, levels, skills, etc.) and persist. */
  let dirty = migrateCal(chosen);
  if(migrateLevels(chosen)) dirty = true;
  if(migrateSkills(chosen)) dirty = true;
  if(migrateLpIntern(chosen)) dirty = true;
  if(migrateV6(chosen)) dirty = true;
  persist(chosen);
  return {state: chosen, fromCloud: fromCloud};
}

/* ================= v2.10: GitHub cloud sync =================
   The app is a static site (no backend), so the only way to share edits
   between devices is to commit the state to a file in the GitHub repo.
   The admin enters a Personal Access Token (Settings -> Cloud sync); the
   token is stored in this browser's localStorage and never leaves the
   browser except in API calls to api.github.com. Auto-save (debounced 3s)
   pushes every edit to the repo; auto-load pulls on page load. */
let ghSaveTimer = null;
function ghSettings(){
  const s = (typeof state !== 'undefined' && state && state.settings) ? state.settings : {};
  return {
    token: s.ghToken || '',
    repo: (s.ghRepo || 'justkhalid/aso-companion').trim(),
    branch: (s.ghBranch || 'main').trim(),
    path: (s.ghPath || 'data/state.json').trim()
  };
}
/* v2.10: encode each path segment separately so "owner/name" stays as
   "owner/name" (not "owner%2Fname") and "data/state.json" stays as
   "data/state.json" (not "data%2Fstate.json"). encodeURIComponent on the
   whole string breaks the URL. */
function ghEncodePath(s){ return String(s || '').split('/').map(encodeURIComponent).join('/'); }
function ghRequest(path, method, body){
  const g = ghSettings();
  if(!g.token) return Promise.reject(new Error('No GitHub token - add one in Settings -> Cloud sync'));
  const headers = {
    'Authorization': 'Bearer ' + g.token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if(body !== undefined){ headers['Content-Type'] = 'application/json'; }
  return fetch('https://api.github.com/repos/' + ghEncodePath(g.repo) + path, {
    method: method || 'GET',
    headers: headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }).then(r => r.json().then(j => ({ok: r.ok, status: r.status, json: j})));
}
function ghB64Encode(s){ /* UTF-8 safe base64 */
  return btoa(unescape(encodeURIComponent(s)));
}
function ghB64Decode(b64){
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}
function ghQueueSave(){
  if(!state.settings.ghAutoSave || !state.settings.ghToken) return;
  if(ghSaveTimer) clearTimeout(ghSaveTimer);
  ghSaveTimer = setTimeout(() => { ghSaveNow().catch(() => {}); }, 3000);
}
async function ghSaveNow(attempt){
  const g = ghSettings();
  if(!g.token){ return Promise.reject(new Error('No GitHub token - add one in Settings -> Cloud sync')); }
  attempt = attempt || 0;
  toast('Saving to GitHub\u2026');
  /* v2.10: GitHub's secret scanner rejects commits that contain a PAT, so we
     strip the ghToken (and the local-only lastSync timestamp) from the JSON
     that goes to the repo. The token stays in this browser's localStorage. */
  const saveState = JSON.parse(JSON.stringify(state));
  if(saveState.settings){
    saveState.settings.ghToken = '';
    saveState.settings.ghLastSync = '';
  }
  const content = JSON.stringify(saveState, null, 2);
  try{
    /* Step 1: get the current file's SHA (if it exists) so PUT can update it. */
    const r = await ghRequest('/contents/' + ghEncodePath(g.path) + '?ref=' + encodeURIComponent(g.branch), 'GET');
    const sha = (r.json && r.json.sha) ? r.json.sha : null;
    /* Step 2: PUT the new content. A 409/422 means our SHA went stale because
       another save (another device, or a second tab) landed first - refetch
       the SHA and retry so the edit is never silently lost. */
    const put = await ghRequest('/contents/' + ghEncodePath(g.path), 'PUT', {
      message: 'ASO Companion save ' + new Date().toISOString().slice(0, 19).replace('T', ' '),
      content: ghB64Encode(content),
      branch: g.branch,
      sha: sha
    });
    if(!put.ok){
      if((put.status === 409 || put.status === 422) && attempt < 3) return ghSaveNow(attempt + 1);
      throw new Error((put.json && put.json.message) ? put.json.message : ('HTTP ' + put.status));
    }
    state.settings.ghLastSync = new Date().toISOString();
    persist(state); /* direct persist - do NOT re-queue a GitHub save */
    toast('Saved to GitHub');
    return true;
  }catch(e){
    console.error('GitHub save failed', e);
    toast('GitHub save failed: ' + e.message, false);
    throw e;
  }
}
async function ghLoadNow(){
  const g = ghSettings();
  if(!g.token){ return Promise.reject(new Error('No GitHub token - add one in Settings -> Cloud sync')); }
  toast('Loading from GitHub\u2026');
  /* Remember the local token + lastSync so we can restore them after the
     replace (we don't want loading from GitHub to wipe the local token). */
  const localToken = state.settings.ghToken;
  const localLastSync = state.settings.ghLastSync;
  try{
    let json = null;
    /* Fetch the file from raw.githubusercontent first: it works for files of
       any size, while the Contents API returns empty content for files over
       1 MB (the state file grows past that as lesson plans are added). For
       private repos the raw URL 404s and we fall back to the API. */
    const rawUrl = 'https://raw.githubusercontent.com/' + ghEncodePath(g.repo) + '/' + encodeURIComponent(g.branch) + '/' + ghEncodePath(g.path) + '?v=' + Date.now();
    try{
      const r = await fetch(rawUrl, {cache: 'no-cache'});
      if(r.ok) json = await r.text();
    }catch(e){ /* network/CORS - fall through to the API */ }
    if(json == null){
      const r = await ghRequest('/contents/' + ghEncodePath(g.path) + '?ref=' + encodeURIComponent(g.branch), 'GET');
      if(!r.ok){ throw new Error((r.json && r.json.message) ? r.json.message : ('HTTP ' + r.status)); }
      if(!r.json.content) throw new Error('File is empty');
      json = ghB64Decode(r.json.content);
    }
    const parsed = JSON.parse(json);
    if(!parsed || parsed.v !== 1 || !Array.isArray(parsed.levels) || !parsed.settings){
      throw new Error('Not a valid ASO Companion state file');
    }
    state = parsed;
    /* Restore the local token + lastSync (these never come from the repo). */
    state.settings.ghToken = localToken;
    state.settings.ghLastSync = localLastSync;
    migrateCal(state); migrateLevels(state, true); migrateSkills(state, true); migrateLpIntern(state, true); migrateV6(state, true);
    persist(state);
    lvSeg = 0; lvOpen.clear();
    applyTheme(); navHTML(); render();
    toast('Loaded from GitHub');
    return true;
  }catch(e){
    console.error('GitHub load failed', e);
    toast('GitHub load failed: ' + e.message, false);
    throw e;
  }
}
function ghAutoLoadOnBoot(){
  if(!state.settings.ghAutoLoad || !state.settings.ghToken) return;
  /* Only pull when the cloud copy is actually NEWER than this device's state.
     Without this check auto-load would silently wipe edits made offline. */
  const g = ghSettings();
  const rawUrl = 'https://raw.githubusercontent.com/' + ghEncodePath(g.repo) + '/' + encodeURIComponent(g.branch) + '/' + ghEncodePath(g.path) + '?v=' + Date.now();
  fetch(rawUrl, {cache: 'no-cache'})
    .then(r => r.ok ? r.json() : null)
    .then(cloud => { if(cloud && (+cloud._rev || 0) > (+state._rev || 0)) return ghLoadNow(); })
    .catch(() => {});
}

/* ---------- theme ---------- */
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function resolvedTheme(){ return state.settings.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : state.settings.theme; }
function applyTheme(){
  document.documentElement.setAttribute('data-theme', resolvedTheme());
  const b = $('#themeBtn');
  if(b) b.innerHTML = icon(resolvedTheme() === 'dark' ? 'sun' : 'moon', 17);
}
function cycleTheme(){
  const cur = state.settings.theme;
  const nowDark = resolvedTheme() === 'dark';
  if(cur === 'auto'){ state.settings.theme = nowDark ? 'light' : 'dark'; }
  else { state.settings.theme = (cur === 'dark' ? 'light' : 'dark'); }
  save(); applyTheme();
  toast('Theme: ' + state.settings.theme);
}
mq.addEventListener && mq.addEventListener('change', () => { if(state.settings.theme === 'auto') applyTheme(); });

/* ---------- dates & term math ---------- */
function parseISO(iso){ const p = String(iso).split('-'); return new Date(+p[0], (+p[1]) - 1, +p[2]); }
function toISO(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtD(d, o){ return d.toLocaleDateString('en-GB', o || {day:'numeric', month:'short'}); }
function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
const DAY_KEYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_FULL = {Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'};

function totalWeeks(){ return state.levels.reduce((m,l) => Math.max(m, l.weeks.length), 0); }
function s1Weeks(){ return clamp(+state.settings.s1Weeks || 15, 1, Math.max(1, totalWeeks())); }

function termStatus(ref){
  const today = startOfDay(ref || new Date());
  const s1 = startOfDay(parseISO(state.settings.s1Start));
  const s2 = startOfDay(parseISO(state.settings.s2Start));
  const n1 = s1Weeks(), tot = totalWeeks();
  const s1End = addDays(s1, n1 * 7 - 1);
  const s2End = addDays(s2, (tot - n1) * 7 - 1);
  if(today < s1) return {mode:'before', daysTo: Math.round((s1 - today) / 864e5), s1, s2, n1};
  if(today <= s1End) return {mode:'s1', week: Math.min(n1, Math.floor((today - s1) / 6048e5) + 1), s1, s2, n1};
  if(today < s2) return {mode:'break', daysTo: Math.round((s2 - today) / 864e5), nextWeek: n1 + 1, s1, s2, n1};
  if(today <= s2End) return {mode:'s2', week: Math.min(tot, n1 + Math.floor((today - s2) / 6048e5) + 1), s1, s2, n1};
  return {mode:'after', s1, s2, n1};
}
function weekMonday(wi){
  const n1 = s1Weeks();
  if(wi < n1) return addDays(startOfDay(parseISO(state.settings.s1Start)), wi * 7);
  return addDays(startOfDay(parseISO(state.settings.s2Start)), (wi - n1) * 7);
}
function semOf(wi){ return wi < s1Weeks() ? 'S1' : 'S2'; }
function noteFor(wi){ const n = state.notes.find(x => x.week === wi + 1); return n ? n.text : ''; }

/* greeting */
function greeting(){
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
}

/* ---------- four-skills plan (v1.4) ---------- */
const SKILLS = [
  {k:'L', name:'Listening'},
  {k:'S', name:'Speaking'},
  {k:'R', name:'Reading'},
  {k:'W', name:'Writing'}
];
/* v2.17: library categories — group the 35 folders into 10 clear sections so
   users can find what they need at a glance. The category order is fixed; the
   folders inside each category keep their alphabetical sort. */
const LIB_CATEGORIES = [
  {k:'teacher',   label:'Teacher resources',      match:['teacher', "teacher's guide"]},
  {k:'planning',  label:'Planning',              match:['lesson plan', 'writing guide']},
  {k:'course',    label:'Coursebooks',           match:['coursebook', 'cambridge global', 'english books', 'ready for']},
  {k:'learner',   label:'Learner materials',     match:['kids english', 'flashcard', 'worksheet', 'maths', 'autism', 'seasonal']},
  {k:'media',     label:'Listening & media',     match:['listening', 'podcast', 'audiobook', 'video', 'music', 'song']},
  {k:'reading',   label:'Reading',               match:['reading', 'comprehension', 'book']},
  {k:'writing',   label:'Writing',               match:['writing', 'creative']},
  {k:'speaking',  label:'Speaking & activities', match:['speaking', 'game', 'powerpoint', 'critical']},
  {k:'exams',     label:'Tests & exams',         match:['test', 'quiz', 'ket', 'pet', 'ielts']},
  {k:'other',     label:'Other',                 match:['business', 'app', 'misc', 'contribution']}
];
function libCategory(name){
  const n = String(name || '').toLowerCase();
  for(const c of LIB_CATEGORIES){
    if(c.match.some(kw => n.indexOf(kw) > -1)) return c;
  }
  return LIB_CATEGORIES[LIB_CATEGORIES.length - 1]; /* Other */
}
/* v2.17: sort the library by category then name — used by libSorted() so the
   library always renders in the right grouped order regardless of how the
   folders were added. */
function libSortedCategorized(list){
  return list.slice().sort((a, b) => {
    const ca = LIB_CATEGORIES.indexOf(libCategory(a.name));
    const cb = LIB_CATEGORIES.indexOf(libCategory(b.name));
    if(ca !== cb) return ca - cb;
    return String(a.name).localeCompare(String(b.name));
  });
}
function skillsOf(w){ return (w && w.skills) ? w.skills : null; }
function spotlightOf(wi){ return ['L','S','R','W'][((wi % 4) + 4) % 4]; }
function spotlightName(wi){ const s = SKILLS.find(x => x.k === spotlightOf(wi)); return s ? s.name : ''; }
function skillsText(w){
  const s = skillsOf(w); if(!s) return '';
  return 'L: ' + (s.L || '-') + ' | S: ' + (s.S || '-') + ' | R: ' + (s.R || '-') + ' | W: ' + (s.W || '-');
}
function skillChips(w, wi, withSpot){
  const s = skillsOf(w); if(!s) return '';
  const sp = spotlightOf(wi);
  return '<span class="sk-chips">' + SKILLS.map(x =>
    '<span class="sk-dot ' + x.k + (withSpot && x.k === sp ? ' lead' : '') + '">' + x.k + '</span>').join('') + '</span>';
}
function skillsBlockHTML(w, wi){
  const s = skillsOf(w); if(!s) return '';
  const sp = spotlightOf(wi);
  return '<div class="sk-grid">' + SKILLS.map(x =>
    '<div class="sk-cell' + (x.k === sp ? ' lead' : '') + '">' +
    '<div class="sk-top"><span class="sk-dot ' + x.k + '">' + x.k + '</span>' +
    '<span class="sk-name">' + x.name + '</span>' +
    (x.k === sp ? '<span class="chip blue" style="margin-left:auto">spotlight</span>' : '') + '</div>' +
    '<div class="sk-txt">' + esc(s[x.k] || '\u2014') + '</div></div>').join('') + '</div>';
}

/* ---------- detailed lesson plans (v1.5, Kids · Beginners pack; v2.13: all levels) ---------- */
function buildLpText(lv, wi){
  const w = lv.weeks[wi], p = w.lp;
  if(!p) return '';
  const isKids = (lv.band === 'Kids' || lv.key.indexOf('kids') === 0);
  const dur = isKids ? '2 hours' : '90 minutes';
  let t = 'WEEK ' + (wi + 1) + ' · ' + (w.theme || '') + ' (' + lv.label + ')\n';
  t += 'Objectives: students can ' + (w.obj || '') + '\n\nLESSON PLAN (' + dur + ')\n';
  const stages = isKids
    ? [['0:00-0:10 Hello & routine',''],['0:10-0:20 Warm-up review',p.wu],['0:20-0:35 Presentation',p.pres],
       ['0:35-0:50 Practice (guided)',p.prac],['0:50-1:00 Listening slot',p.ls],['BREAK',''],['1:10-1:20 Reactivation game',p.re],
       ['1:20-1:45 Production task',p.prod],['1:45-1:55 Reading & writing',p.rw],['1:55-2:00 Story/song + goodbye',p.st]]
    : [['0:00-0:05 Hello & routine',''],['0:05-0:15 Warm-up review',p.wu],['0:15-0:30 Presentation',p.pres],
       ['0:30-0:45 Practice (guided)',p.prac],['0:45-0:55 Listening slot',p.ls],['BREAK',''],['1:00-1:08 Reactivation game',p.re],
       ['1:08-1:22 Production task',p.prod],['1:22-1:28 Reading & writing',p.rw],['1:28-1:30 Story/song + goodbye',p.st]];
  stages.forEach(r => { t += r[0] + (r[1] ? ': ' + r[1] : '') + '\n'; });
  if(p.g && p.g.length){ t += '\nGAMES / ACTIVITIES\n'; p.g.forEach(g => t += '- ' + g[0] + ': ' + g[1] + '\n'); }
  if(p.diff && p.diff.length){ t += '\nDIFFERENTIATION\n- ' + p.diff.join('\n- ') + '\n'; }
  if(p.hw && p.hw.length){ t += '\nHOMEWORK OPTIONS\n- ' + p.hw.join('\n- ') + '\n'; }
  if(p.tip){ t += '\nTIP: ' + p.tip + '\n'; }
  if(p.checklist && p.checklist.length){
    t += '\nASSESSMENT OBSERVATION CHECKLIST (tick during play)\n';
    p.checklist.forEach(c => { t += '  [ ] ' + c + '   (Not yet / With help / Independently)\n'; });
  }
  return t;
}
/* v2.13: lesson plan sheet now works for ALL levels, not just Kids · Beginners.
   - Kids levels use the 2-hour arc (0:00-2:00 with a break).
   - Teens and Adults use a 90-minute arc (0:00-1:30 with a short break).
   - Renders the assessment checklist table if the week has one (W15, W30). */
function lessonPlanSheet(lv, wi){
  const w = lv.weeks[wi], p = w.lp;
  if(!p){ openSheet({title: 'Lesson plan · Week ' + (wi + 1), foot: false, body: '<div class="card empty">No detailed lesson plan for this week yet.</div>'}); return; }
  const isKids = (lv.band === 'Kids' || lv.key.indexOf('kids') === 0);
  /* v2.13: stage times per band. Kids = 2h, Teens/Adults = 90 min. */
  const T = isKids
    ? { hello:'0:00–0:10', wu:'0:10–0:20', pres:'0:20–0:35', prac:'0:35–0:50', ls:'0:50–1:00', brk:'1:00–1:10', re:'1:10–1:20', prod:'1:20–1:45', rw:'1:45–1:55', st:'1:55–2:00' }
    : { hello:'0:00–0:05', wu:'0:05–0:15', pres:'0:15–0:30', prac:'0:30–0:45', ls:'0:45–0:55', brk:'0:55–1:00', re:'1:00–1:08', prod:'1:08–1:22', rw:'1:22–1:28', st:'1:28–1:30' };
  const helloTxt = wi === 0
    ? (isKids ? 'Hello Song + name ball toss; establish the attention signal ("1, 2, 3, eyes on me!").'
              : 'Welcome and icebreaker; establish class routines and the "English only" signal.')
    : (isKids ? 'Hello Song + register; feelings chart check-in' + (wi >= 20 ? '; weather report' : '') + '.'
              : 'Warm hello; quick recap of last week + today\'s goal.');
  const brkTxt = isKids ? 'Toilet + water; soft music; sitting signal on return.' : 'Short break; quick stretch / water; regroup.';
  const st = (name, tm, main, alts) =>
    '<tr><td class="s1">' + esc(name) + '</td><td class="s2">' + esc(tm) + '</td><td>' + esc(main) +
    (alts && alts.length ? '<div class="lp-alt"><b>Also try:</b> ' + alts.map(esc).join(' &nbsp;•&nbsp; ') + '</div>' : '') + '</td></tr>';
  let body =
    '<table class="lp-st"><tr><th style="width:15%">Stage</th><th style="width:9%">Time</th><th>What happens</th></tr>' +
    st('Hello & routine', T.hello, helloTxt) +
    st('Warm-up review', T.wu, p.wu, p.wuAlt) +
    st('Presentation', T.pres, p.pres, p.presAlt) +
    st('Practice (guided)', T.prac, p.prac, p.pracAlt) +
    st('Listening slot', T.ls, p.ls) +
    st('BREAK', T.brk, brkTxt) +
    st('Reactivation game', T.re, p.re) +
    st('Production task', T.prod, p.prod) +
    st('Reading & writing', T.rw, p.rw) +
    st('Story / song + goodbye', T.st, p.st) + '</table>';
  if(p.g && p.g.length){
    body += '<div class="flabel">Game bank / activity bank this week</div>' +
      '<table class="lp-st">' + p.g.map(g => '<tr><td class="s1" style="width:26%">' + esc(g[0]) + '</td><td>' + esc(g[1]) + '</td></tr>').join('') + '</table>';
  }
  if(p.diff && p.diff.length){
    body += '<div class="flabel">Differentiation</div><div class="small" style="line-height:1.6">' + p.diff.map(esc).join('<br>') + '</div>';
  }
  if(p.hw && p.hw.length){
    body += '<div class="flabel" style="margin-top:10px">Homework options</div><div class="small" style="line-height:1.6">• ' + p.hw.map(esc).join('<br>• ') + '</div>';
  }
  if(p.tip){
    body += '<div class="flabel" style="margin-top:10px">Teacher tip</div><div class="small" style="line-height:1.6">' + esc(p.tip) + '</div>';
  }
  /* v2.13: assessment observation checklist (W15, W30 in Kids · Beginners;
     also available for any other week that has one). Renders as a table with
     three tick columns (Not yet / With help / Independently). */
  if(p.checklist && p.checklist.length){
    body += '<div class="flabel" style="margin-top:14px">Assessment observation checklist</div>' +
      '<table class="lp-st"><tr><th>Can-do</th><th style="width:80px">Not yet</th><th style="width:80px">With help</th><th style="width:80px">Independently</th></tr>' +
      p.checklist.map(c => '<tr><td>' + esc(c) + '</td><td style="text-align:center">\u2610</td><td style="text-align:center">\u2610</td><td style="text-align:center">\u2610</td></tr>').join('') + '</table>' +
      '<div class="tiny faint" style="margin-top:6px">Tick DURING play, never as a table test. If a child freezes, observe again later. The record should show their best normal self.</div>';
  }
  body += '<div class="row mt" style="gap:8px"><button class="btn plain grow" data-copylp>' + icon('copy', 14) + ' Copy as text</button>' +
    '<button class="btn primary grow" data-wordlp>' + icon('down', 14) + ' Word document</button></div>';
  openSheet({title: 'Lesson plan · Week ' + (wi + 1) + ' · ' + esc(w.theme || ''), small: false, foot: false, body,
    onMount(sh){
      $('[data-copylp]', sh).addEventListener('click', () => copyText(buildLpText(lv, wi), 'Lesson plan copied'));
      $('[data-wordlp]', sh).addEventListener('click', () => exportWeekDoc(lv, wi));
    }});
  document.querySelector('.sheet').classList.add('lg');
}
function copyText(t, okMsg){
  const done = () => toast(okMsg || 'Copied');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(done).catch(() => copyFallback(t, done));
  } else copyFallback(t, done);
}
function copyFallback(t, done){
  const ta = document.createElement('textarea');
  ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); done(); }catch(e){ toast('Copy not allowed here', false); }
  ta.remove();
}
const LP_GAMES = [
  ['Flashcard Slap', 'Cards on the floor; two teams; call a word; flat-hand slap wins the point.'],
  ['What\u2019s Missing?', 'Cards on the board; eyes closed; remove one; guess in a full sentence.'],
  ['Memory / Pairs', 'Two copies face down; flip two per turn; say both; keep matches.'],
  ['Bingo', '3–5 cards each; call words in sentences; full house reads back.'],
  ['Pass the Parcel', 'Pass to music; stop = say the word / do the task.'],
  ['Simon Says', 'Do commands only with the prefix; children become callers.'],
  ['Charades', 'Mime it; class guesses in English.'],
  ['Musical Statues', 'Move to music; freeze or pose at the called card.'],
  ['Letter Jump', 'Letters on the floor; hear the sound; jump to it.'],
  ['Slow Reveal', 'Slide the card up slowly; earliest correct guess keeps it.'],
  ['Lucky Dip', 'Bag of cards/objects; pull, name, keep till the end.'],
  ['Board Race', 'Two lines; run and match the called word.'],
  ['Listen & Count', 'Claps behind a screen; count; hold up the numeral.'],
  ['Picture Dictation', 'Listen; draw the scene; compare. Real listening evidence.'],
  ['Guess My ___', 'Three simple clues; class guesses in sentences.'],
  ['Kaboom!', 'Word sticks in a jar + 2 Kaboom sticks; pull and read; Kaboom = all back.'],
  ['Whisper Chain', 'Whisper down the line; last says it / slaps the card.'],
  ['Sound Sort', 'Sort picture cards under letter headings; say each one.']
];
const LP_ROUTINES = [
  ['Hello routine', 'Hello Song → register ("I am here!") → feelings chart (W2+) → weather report (W21+). Same order every class.'],
  ['Attention signal', '"1, 2, 3, eyes on me!" / "1, 2, eyes on you!" + hands on head. Rehearse as a game when it slips.'],
  ['Transitions', 'Clean-up song for tidy time; line-up chant for moving; whisper fingers for calm.'],
  ['Goodbye routine', 'Goodbye Song → sticker chart → high-five line at the door.'],
  ['Break rules', 'Toilet + water; when the song plays, freeze and walk back.'],
  ['Fast finishers', 'Box of picture/letter cards + mini tasks, never "sit and wait".'],
  ['English scaffolds', 'Short chunks + gesture + face + model-first. Arabic for safety only.'],
  ['Assessment', 'W15 / W30 station days with observation checklists, tick during play, never table tests.']
];
function packGuideSheet(){
  openSheet({title: 'Lesson plan pack · guide', small: false, foot: true, saveLabel: 'Close',
    onSave(sh, close){ close(); },
    body:
    '<div class="small muted" style="line-height:1.6;margin-bottom:10px">Ready-to-teach 2-hour plans for all 30 weeks: staged arc, alternatives, game bank, differentiation and homework options. Full documents: Downloads \u2192 ELTASO_Kids_Beginners_Lesson_Plans.</div>' +
    '<div class="flabel">The 2-hour arc</div>' +
    '<table class="lp-st">' + [
      ['0:00–0:10', 'Hello & routine', 'same opening every week lowers anxiety'],
      ['0:10–0:20', 'Warm-up review', 'always recycles earlier weeks (spiral)'],
      ['0:20–0:35', 'Presentation', 'new language via flashcards, story, song, realia'],
      ['0:35–0:50', 'Practice (guided)', 'games, TPR, drills with support'],
      ['0:50–1:00', 'Listening slot', 'calm doing-task that checks comprehension'],
      ['1:00–1:10', 'BREAK', 'non-negotiable'],
      ['1:10–1:20', 'Reactivation game', 'physical game brings the language back'],
      ['1:20–1:45', 'Production task', 'roleplays, posters, shows, surveys'],
      ['1:45–1:55', 'Reading & writing', 'tracing → copying → word building'],
      ['1:55–2:00', 'Story / song + goodbye', 'calm close on success']
    ].map(r => '<tr><td class="s2">' + r[0] + '</td><td class="s1">' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</table>' +
    '<div class="flabel">Core games</div>' +
    '<table class="lp-st">' + LP_GAMES.map(g => '<tr><td class="s1" style="width:26%">' + g[0] + '</td><td>' + g[1] + '</td></tr>').join('') + '</table>' +
    '<div class="flabel">Classroom routines</div>' +
    '<table class="lp-st">' + LP_ROUTINES.map(r => '<tr><td class="s1" style="width:26%">' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table>' +
    '<div class="flabel">Principles</div><div class="small" style="line-height:1.6">• Spiral review • Concrete → pictorial → abstract • Four skills every week • 10-minute activity cycles • Play-based assessment • End on identity: "You are English speakers now."</div>'
  });
  document.querySelector('.sheet').classList.add('lg');
}

/* ---------- toast / confirm / sheets ---------- */
function toast(msg, ok){
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = (ok === false ? icon('info', 15) : icon('check', 15)) + '<span>' + esc(msg) + '</span>';
  $('#toastRoot').appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s ease, transform .3s ease'; t.style.opacity = '0'; t.style.transform = 'translate(-50%,10px)'; }, 2100);
  setTimeout(() => t.remove(), 2500);
}

let sheetStack = [];
function openSheet(opts){
  const ov = document.createElement('div');
  ov.className = 'backdrop';
  const sh = document.createElement('div');
  sh.className = 'sheet' + (opts.small ? ' sm' : '');
  sh.setAttribute('role', 'dialog');
  sh.innerHTML =
    '<div class="sheet-head">' +
      '<div class="sheet-title grow">' + esc(opts.title) + '</div>' +
      (opts.headExtra || '') +
      '<button class="icon-btn" data-close aria-label="Close">' + icon('x', 17) + '</button>' +
    '</div>' +
    '<div class="sheet-body">' + (opts.body || '') + '</div>' +
    (opts.foot === false ? '' :
      '<div class="sheet-foot">' +
        '<button class="btn plain" data-close>Cancel</button>' +
        '<button class="btn primary" data-save>' + esc(opts.saveLabel || 'Save') + '</button>' +
      '</div>') +
    '';
  ov.appendChild(sh);
  $('#overlayRoot').appendChild(ov);
  const entry = {ov, onClose: opts.onClose};
  sheetStack.push(entry);
  const close = () => {
    const i = sheetStack.indexOf(entry);
    if(i > -1) sheetStack.splice(i, 1);
    ov.style.transition = 'opacity .22s ease';
    sh.style.transition = 'opacity .2s ease, transform .2s ease';
    ov.style.opacity = '0';
    sh.style.opacity = '0';
    sh.style.transform = 'translate(-50%,-47%) scale(.96)';
    setTimeout(() => ov.remove(), 210);
  };
  entry.close = close;
  ov.addEventListener('mousedown', e => { if(e.target === ov) close(); });
  $$('[data-close]', sh).forEach(b => b.addEventListener('click', close));
  if(opts.onSave) $('[data-save]', sh).addEventListener('click', () => opts.onSave(sh, close));
  if(opts.onMount) opts.onMount(sh);
  setTimeout(() => { const f = $('.input', sh); if(f && window.innerWidth > 920) f.focus(); }, 240);
  return entry;
}
function openConfirm(opts){
  const ov = document.createElement('div');
  ov.className = 'backdrop';
  ov.style.zIndex = 96;
  const box = document.createElement('div');
  box.className = 'alert-box';
  box.innerHTML =
    '<div class="alert-body"><div class="alert-title">' + esc(opts.title || 'Are you sure?') + '</div>' +
    (opts.msg ? '<div class="alert-msg">' + esc(opts.msg) + '</div>' : '') + '</div>' +
    '<div class="alert-btns"><button data-c>Cancel</button><button class="' + (opts.danger ? 'danger' : '') + '" data-ok>' + esc(opts.okLabel || 'OK') + '</button></div>';
  ov.appendChild(box);
  $('#overlayRoot').appendChild(ov);
  const close = () => ov.remove();
  ov.addEventListener('mousedown', e => { if(e.target === ov) close(); });
  $('[data-c]', box).addEventListener('click', close);
  $('[data-ok]', box).addEventListener('click', () => { close(); opts.onOk && opts.onOk(); });
}
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    if(sheetStack.length){ sheetStack[sheetStack.length - 1].close(); }
    else closeSidebar();
  }
});

/* ---------- form helpers ---------- */
function fText(key, label, val, ph, type){
  return '<div class="fgroup"><label class="flabel">' + esc(label) + '</label>' +
    '<input class="input" data-f="' + esc(key) + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '"></div>';
}
function fArea(key, label, val, ph, rows){
  return '<div class="fgroup"><label class="flabel">' + esc(label) + '</label>' +
    '<textarea class="input" data-f="' + esc(key) + '" rows="' + (rows || 3) + '" placeholder="' + esc(ph || '') + '">' + esc(val == null ? '' : val) + '</textarea></div>';
}
function fSelect(key, label, val, options){
  const opts = options.map(o => '<option value="' + esc(o) + '"' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>').join('');
  return '<div class="fgroup"><label class="flabel">' + esc(label) + '</label><select class="input" data-f="' + esc(key) + '">' + opts + '</select></div>';
}
function fDays(key, sel){
  const pills = DAY_KEYS.map(d => '<button type="button" class="daypill' + (sel && sel.indexOf(d) > -1 ? ' on' : '') + '" data-day="' + d + '">' + d + '</button>').join('');
  return '<div class="fgroup"><label class="flabel">' + esc(key) + '</label><div class="daypills" data-days>' + pills + '</div></div>';
}
function collectForm(root){
  const out = {};
  $$('[data-f]', root).forEach(i => { out[i.dataset.f] = i.value.trim(); });
  const days = $('[data-days] .daypill.on', root);
  if($('[data-days]', root)){
    out.__days = $$('.daypill.on', $('[data-days]', root)).map(b => b.dataset.day);
  }
  return out;
}
function bindDayPills(root){
  $$('[data-days] .daypill', root).forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));
}

/* ---------- links editor ---------- */
function linksEditor(urls){
  let html = '<div class="fgroup"><label class="flabel">Drive links</label><div data-links>';
  (urls || []).forEach(u => { html += linkRowHtml(u); });
  html += '</div><button type="button" class="btn ghost sm" data-addlink>' + icon('plus', 14) + ' Add link</button></div>';
  return html;
}
function linkRowHtml(u){
  return '<div class="link-row"><input class="input" data-link type="url" value="' + esc(u || '') + '" placeholder="https://drive.google.com/...">' +
    '<button type="button" class="icon-btn danger" data-rmlink aria-label="Remove">' + icon('trash', 15) + '</button></div>';
}
function mountLinksEditor(root){
  const box = $('[data-links]', root);
  if(!box) return;
  $('[data-addlink]', root).addEventListener('click', () => {
    box.insertAdjacentHTML('beforeend', linkRowHtml(''));
    bindRm(root);
    const rows = $$('[data-link]', box);
    rows[rows.length - 1].focus();
  });
  bindRm(root);
}
function bindRm(root){
  $$('[data-rmlink]', root).forEach(b => {
    if(b._bound) return; b._bound = true;
    b.addEventListener('click', () => { const r = b.closest('.link-row'); if(r){ r.style.opacity = '0'; setTimeout(() => r.remove(), 130); } });
  });
}
function collectLinks(root){
  const box = $('[data-links]', root);
  if(!box) return [];
  return $$('[data-link]', box).map(i => i.value.trim()).filter(Boolean);
}

/* ---------- roles & access gate (v2.0) ---------- */
const ROLE_KEY = 'eltaso_role';
const WHO_KEY = 'eltaso_who';
/* v2.4: "remember me" - the role can live in localStorage, so the browser
   keeps you signed in between visits. Lock clears both storages. */
function role(){ try{ return sessionStorage.getItem(ROLE_KEY) || localStorage.getItem(ROLE_KEY) || ''; }catch(e){ return ''; } }
function whoAmI(){ try{ return sessionStorage.getItem(WHO_KEY) || localStorage.getItem(WHO_KEY) || ''; }catch(e){ return ''; } }
function isAdmin(){ return role() === 'admin'; }
function isTeacher(){ return role() === 'teacher'; }
/* v2.2: programs visibility - hide levels that have no classes this year from the menu */
function hiddenMap(){ return state.settings.hidden || (state.settings.hidden = {}); }
function isHidden(lv){ return !!(state.settings.hidden || {})[lv.key]; }
function visLevels(){ return state.levels.filter(l => !isHidden(l)); }
function isIntern(){ return role() === 'intern'; }
function activeSide(){ /* v2.6: which workspace the admin is browsing */
  try{ return sessionStorage.getItem('eltaso_side') || localStorage.getItem('eltaso_side') || ''; }catch(e){ return ''; }
}
function setSide(s){ /* v2.6: remember the side in the same place the role lives */
  try{
    const mem = localStorage.getItem(ROLE_KEY) ? localStorage : sessionStorage;
    if(s) mem.setItem('eltaso_side', s); else mem.removeItem('eltaso_side');
  }catch(e){}
}
let PUBVIEW = false; /* v2.7: admin previews the public view without losing the session */
function pubView(){ return PUBVIEW; }
function setPubView(v){ PUBVIEW = !!v; }
function canEdit(){ return isAdmin() && !pubView(); } /* v2.7: public preview = read-only */
function canEditClub(){ return !pubView() && (isAdmin() || isIntern()); } /* v2.7 */
function showGate(){ const g = $('#gate'); if(g) g.classList.remove('hidden'); }
function hideGate(){ const g = $('#gate'); if(g) g.classList.add('hidden'); }
function lockApp(){ /* v2.5: sign out back to the public teacher view */
  setPubView(false); /* v2.7 */
  try{ sessionStorage.removeItem(ROLE_KEY); sessionStorage.removeItem(WHO_KEY); sessionStorage.removeItem('eltaso_side'); }catch(e){}
  try{ localStorage.removeItem(ROLE_KEY); localStorage.removeItem(WHO_KEY); localStorage.removeItem('eltaso_side'); }catch(e){}
  navHTML();
  if(location.hash === '#/home') render(); else go('#/home');
  toast('Signed out');
}
function roleAllowed(hash){ /* v2.5: no role = the public teacher view */
  const r = role();
  const h = hash || '';
  if(r === 'admin') return true;
  if(!r) return !h.match(/^#\/(settings|team|intern|classes)/); /* v2.8: no Classes tab for the public */
  if(r === 'teacher') return !h.match(/^#\/(settings|team|intern|classes|login)/);
  if(r === 'intern') return /^#\/(intern|library|reports)/.test(h); /* v2.2: library back for interns */
  return true;
}
function openAccessSheet(kind){ /* v2.5: 'admin' | 'intern' - teachers browse without signing in */
  const isAdminMode = kind !== 'intern';
  const goBtn = '<button class="btn primary" style="width:100%;margin-top:4px" data-goapp>Sign in</button>';
  openSheet({
    title: isAdminMode ? 'Admin sign in' : 'Lead intern sign in',
    small: true, foot: false,
    body:
      '<div data-mode="' + kind + '">' + fText('code', 'Access code', '', isAdminMode ? '4 digits' : 'ask the coordinator') + goBtn + '</div>' +
      '<label class="check-row" style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;font-weight:600;cursor:pointer;user-select:none">' +
        '<input type="checkbox" data-remember checked style="width:16px;height:16px;accent-color:var(--accent)"> Remember me on this device</label>' +
      '<div class="tiny faint" style="margin-top:10px">Codes are set in Settings \u2192 Access (admin).</div>',
    onMount(sh){
      const attempt = () => {
        const ok = String(state.settings.adminCode || '1234');
        if($('[data-f="code"]', sh).value.trim() !== ok){ toast(isAdminMode ? 'Wrong admin code' : 'Wrong code', false); return; }
        const r = isAdminMode ? 'admin' : 'intern';
        try{
          if($('[data-remember]', sh) && $('[data-remember]', sh).checked) localStorage.setItem(ROLE_KEY, r);
          else sessionStorage.setItem(ROLE_KEY, r);
        }catch(e){}
        setPubView(false); /* v2.7 */
        entry.close(); navHTML();
        const h = location.hash || '';
        if(h === '#/login') render(); /* v2.6: /login shows the side chooser once signed in */
        else if(!roleAllowed(h)) go(r === 'intern' ? '#/intern' : '#/home');
        else render(); /* keep a deep link that is already allowed */
        toast('Welcome');
      };
      $$('[data-goapp]', sh).forEach(b => b.addEventListener('click', attempt));
      sh.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); attempt(); } });
    }
  });
  const entry = sheetStack[sheetStack.length - 1];
}

/* ---------- time selection (v2.1/v2.23) ----------
   The whole day is available in 30-minute steps, shown in 24h format ("15:00").
   Values are stored as 24h "HH:MM-HH:MM" exactly like before, so nothing migrates.
   v2.23: removed AM/PM — everything is 24h now for consistency. */
function dayTimes(){
  const out = [];
  for(let m = 0; m < 1440; m += 30) out.push(ttPad(Math.floor(m / 60)) + ':' + ttPad(m % 60));
  return out;
}
/* v2.23: format a time as 24h "HH:MM" — no more AM/PM */
function fmt12Time(t){
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
  if(!m) return t || '';
  return ttPad(+m[1]) + ':' + m[2];
}
function timeSel(key, val){
  const times = dayTimes(), v = String(val || '');
  const opt = t => '<option value="' + t + '"' + (t === v ? ' selected' : '') + '>' + t + '</option>';
  return '<select class="input" data-f="' + key + '">' +
    '<optgroup label="Morning">' + times.filter(t => +t.slice(0, 2) < 12).map(opt).join('') + '</optgroup>' +
    '<optgroup label="Afternoon">' + times.filter(t => +t.slice(0, 2) >= 12).map(opt).join('') + '</optgroup>' +
    '</select>';
}
function fSlot(key, label, val){
  const m = String(val || '').replace(/\s/g, '').match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  const s0 = m ? m[1] : '09:00', e0 = m ? m[2] : '11:00';
  return '<div class="fgroup"><label class="flabel">' + esc(label) + '</label>' +
    '<div class="frow2" data-timerange>' +
      '<span class="tiny faint" style="align-self:center">from</span>' + timeSel('tstart', s0) +
      '<span class="tiny faint" style="align-self:center">to</span>' + timeSel('tend', e0) +
    '</div></div>';
}
function combineSlot(v){
  const stt = v.tstart || '', en = v.tend || '';
  delete v.tstart; delete v.tend;
  if(!stt || !en || stt >= en) return '';
  return stt + '-' + en;
}

/* ---------- v2.6: the ASO building - four real spaces, used everywhere ---------- */
const ASO_VENUES = [
  { name: 'Main Library', floor: 'Ground floor',           short: 'ground floor \u00b7 public \u00b7 weekend events' },
  { name: 'Main Hall',    floor: 'First floor (upstairs)', short: 'first floor, upstairs' },
  { name: 'Room 1',       floor: 'Ground floor',           short: 'ground floor' },
  { name: 'Room 2',       floor: 'First floor (upstairs)', short: 'first floor, upstairs' }
];
function venueKnown(room){
  const r = String(room || '').trim().toLowerCase();
  return ASO_VENUES.some(v => v.name.toLowerCase() === r);
}
function venueFloor(room){
  const r = String(room || '').trim().toLowerCase();
  const hit = ASO_VENUES.find(v => v.name.toLowerCase() === r);
  return hit ? hit.floor : (/2|first|up/i.test(r) ? 'First floor (upstairs)' : 'Ground floor');
}
function venueSelect(key, label, val, hint){
  /* the four ASO spaces first, then any custom rooms already saved */
  const names = ASO_VENUES.map(v => v.name);
  [].concat(state.classes || [], state.clubs || []).forEach(c => { if(c.room && names.indexOf(c.room) < 0) names.push(c.room); });
  (state.events || []).forEach(e => { if(e.place && names.indexOf(e.place) < 0) names.push(e.place); });
  const cur = String(val || '');
  if(cur && names.indexOf(cur) < 0) names.push(cur);
  const opt = n => '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + esc(n || '- pick a space -') + '</option>';
  return '<div class="fgroup"><label class="flabel">' + esc(label) + '</label>' +
    '<select class="input" data-f="' + key + '">' + [''].concat(names).map(opt).join('') + '</select>' +
    (hint ? '<div class="tiny faint" style="margin-top:4px">' + esc(hint) + '</div>' : '') + '</div>';
}

/* ---------- events helpers (v1.7) ---------- */
function nextOccurrence(e){
  if(e.recur === 'none'){
    return e.date ? parseISO(e.date) : null;
  }
  const di = DAY_KEYS.indexOf(e.day);
  if(di < 0) return null;
  const today = startOfDay(new Date());
  const cur = today.getDay() === 0 ? 6 : today.getDay() - 1;  /* Mon = 0 */
  return addDays(today, (di - cur + 7) % 7);
}
function fmtEventWhen(e){
  return e.recur === 'none'
    ? fmtD(parseISO(e.date), {weekday:'short', day:'numeric', month:'short'})
    : 'Every ' + (DAY_FULL[e.day] || e.day || 'week');
}

/* ---------- library: alphabetical with pins (v1.9) ---------- */
function libSorted(base){
  const pins = state.libraryPins || [];
  return (base || state.library).slice().sort((a, b) => {
    const pa = pins.indexOf(a.id), pb = pins.indexOf(b.id);
    if(pa > -1 && pb < 0) return -1;
    if(pb > -1 && pa < 0) return 1;
    if(pa > -1 && pb > -1) return pa - pb;
    /* v2.17: group by category, then alphabetical within the category */
    const ca = LIB_CATEGORIES.indexOf(libCategory(a.name));
    const cb = LIB_CATEGORIES.indexOf(libCategory(b.name));
    if(ca !== cb) return ca - cb;
    return String(a.name).localeCompare(String(b.name));
  });
}
function togglePin(id){
  const pins = state.libraryPins || (state.libraryPins = []);
  const i = pins.indexOf(id);
  if(i > -1) pins.splice(i, 1); else pins.push(id);
  save();
}

/* ---------- router ---------- */
const routes = {};
let currentRoute = '';
function go(h){ if(location.hash === h){ render(); } else { location.hash = h; } }
function render(){
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\//, '').split('/');
  let name = parts[0] || 'home';
  let arg = parts.slice(1).join('/') || '';
  if(!routes[name]) name = 'home';
  const rh = location.hash || '#/home';
  if(!roleAllowed(rh)){ /* v2.5: guests are guarded too */
    if(isIntern() && /^#\/reports/.test(rh)){ /* reports stay open for interns */ }
    else {
      const nh = isIntern() ? '#/intern' : '#/home';
      if(location.hash !== nh){ location.hash = nh; return; }
      name = isIntern() ? 'intern' : 'home';
      arg = '';
    }
  }
  currentRoute = name;
  document.body.classList.toggle('loginmode', name === 'login'); /* v2.7: login page = no nav, centered */
  const root = $('#viewRoot');
  root.innerHTML = '';
  routes[name](root, decodeURIComponent(arg));
  applyNav();
  $('#content').scrollTop = 0;
  closeSidebar();
}
window.addEventListener('hashchange', render);

function navItem(go, ic, label, badge){
  return '<button class="nav-item" data-go="' + go + '">' + icon(ic, 17) + '<span>' + esc(label) + '</span>' +
    (badge != null && badge !== '' && badge !== 0 ? '<span class="n-badge">' + badge + '</span>' : '') + '</button>';
}
function navHTML(){
  const st = termStatus();
  const inSession = st.mode === 's1' || st.mode === 's2';
  let h = '';
  const onInternSide = isIntern() || (isAdmin() && activeSide() === 'intern'); /* v2.6 */
  if(onInternSide){
    h += '<div class="nav-sec">Internship</div>';
    h += navItem('#/intern', 'grid', 'Club calendar'); /* v2.2 */
    h += navItem('#/intern/clubs', 'star', 'Clubs', (state.clubs || []).length);
    h += navItem('#/intern/events', 'cal', 'Events', (state.events || []).length);
    h += navItem('#/intern/vols', 'users', 'Volunteers', (state.volunteers || []).length);
    h += navItem('#/reports', 'file', 'Reports'); /* v2.4: back in the intern menu like v1.9 */
    h += '<div class="nav-sec">American Space</div>';
    h += navItem('#/library', 'folder', 'Library', state.library.length);
  } else if(isAdmin() && !pubView()){ /* v2.8: the full ELT-side menu */
    h += '<div class="nav-sec">ELT side</div>';
    h += navItem('#/home', 'cal', 'Home');
    let lastBand = '';
    visLevels().forEach(lv => {
      if(lv.band && lv.band !== lastBand){ /* v2.2: menu = visible levels */
        lastBand = lv.band;
        h += '<div class="nav-band">' + esc(lv.band) + '</div>';
      }
      h += '<button class="nav-item" data-go="#/lv/' + esc(lv.key) + '">' + icon('book', 17) + '<span>' + esc(lv.tier ? lv.tier : lv.label) + '</span>' +
        (inSession && lv.weeks.length >= st.week ? '<span class="n-badge">W' + st.week + '</span>' : '') + '</button>';
    });
    visLevels().forEach(lv => { if(!lv.band){ /* v2.2 */ h += navItem('#/lv/' + esc(lv.key), 'book', lv.label); } });
    h += '<div class="nav-sec">Institute</div>';
    h += navItem('#/classes', 'grid', 'Classes', state.classes.length);
    h += navItem('#/calendar', 'star', 'Clubs & events', (state.events || []).length); /* v2.5: public calendar */
    h += navItem('#/team', 'users', 'Team', state.team.length);
    h += '<div class="nav-sec">Shared</div>';
    h += navItem('#/library', 'folder', 'Library', state.library.length);
    h += navItem('#/reports', 'file', 'Reports');
  } else {
    /* v2.10/v2.14: the public nav - four links, the same whether you are signed in or not.
       The old "Teacher view" section header was removed; "Menu" was renamed "ELTASO"
       to make it clear what the menu contains (the ELTASO classes side).
       v2.14 added "Resources" combining the Library and Reports into one public page. */
    h += '<div class="nav-sec">American Space</div>';
    h += navItem('#/home', 'home', 'Home');
    h += navItem('#/menu', 'grad', 'ELTASO');
    h += navItem('#/calendar', 'cal', 'Clubs & events', (state.events || []).length);
    h += navItem('#/resources', 'folder', 'Resources');
  }
  $('#snav').innerHTML = h;
  /* v2.19: in the public view (no role, or admin in public-preview mode), add
     a body class so the CSS switches from the left sidebar to a top nav bar.
     Admins in their normal view keep the left sidebar. */
  const isPublic = !role() || pubView();
  document.body.classList.toggle('public-nav', isPublic);
  const foot = $('.s-foot');
  /* v2.22: hide the "Admin sign in" button from the public top nav. The admin
     can still reach the login page by typing #/login in the address bar. The
     sign-out button stays for signed-in admins. */
  if(role()){
    foot.innerHTML = '<button class="nav-item" id="navLock">' + icon('lock', 17) + '<span>Sign out</span></button>' +
      (isAdmin() && !pubView() ? '<button class="nav-item" id="navPub">' + icon('eye', 17) + '<span>Public view</span></button>' +
        '<button class="nav-item" id="navSettings">' + icon('gear', 17) + '<span>Settings</span></button>' : '') +
      (isPublic ? '<button class="icon-btn" id="navTheme" aria-label="Toggle theme" style="margin-left:4px">' + icon(resolvedTheme() === 'dark' ? 'sun' : 'moon', 17) + '</button>' : '');
  } else {
    foot.innerHTML = isPublic
      ? '<button class="icon-btn" id="navTheme" aria-label="Toggle theme">' + icon(resolvedTheme() === 'dark' ? 'sun' : 'moon', 17) + '</button>'
      : '<button class="nav-item" id="navSignin">' + icon('lock', 17) + '<span>Admin sign in</span></button>';
  }
  if(role()) $('#navLock').addEventListener('click', lockApp);
  else if(!isPublic) $('#navSignin').addEventListener('click', () => go('#/login')); /* v2.5 */
  if(isAdmin() && !pubView()){
    $('#navSettings').addEventListener('click', () => go('#/settings'));
    $('#navPub').addEventListener('click', () => { /* v2.7: browse the public view without losing the session */
      setPubView(true); navHTML();
      if(location.hash === '#/home') render(); else go('#/home');
      toast('Public preview - tap "Back to admin" to return');
    });
  }
  const pill = $('#sidePill'); /* v2.7: ELT / intern switch, always at hand for the admin */
  if(pill){
    pill.classList.toggle('hidden', !isAdmin());
    $$('.sp-btn', pill).forEach(b => {
      b.classList.toggle('on', isAdmin() && activeSide() === b.dataset.pill);
      b.onclick = () => {
        if(!isAdmin()) return;
        setSide(b.dataset.pill === 'intern' ? 'intern' : 'elt');
        navHTML();
        const t = b.dataset.pill === 'intern' ? '#/intern' : '#/home';
        if(location.hash === t) render(); else go(t);
      };
    });
  }
  const pp = $('#pubPill'); /* v2.7: leave the public preview */
  if(pp){
    pp.classList.toggle('hidden', !pubView());
    pp.onclick = () => { setPubView(false); navHTML(); render(); toast('Back to admin'); };
  }
  /* v2.20: wire the public-view theme toggle (lives in the top nav foot) */
  const navTheme = $('#navTheme');
  if(navTheme) navTheme.addEventListener('click', cycleTheme);
}
function applyNav(){
  const hash = location.hash || '#/home';
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.go === hash ||
    (b.id === 'navSettings' && hash === '#/settings') ||
    (hash.indexOf('#/intern') === 0 && b.dataset.go === '#/intern' + (hash.replace('#/intern', '') || '') )));
  const st = termStatus();
  const chip = $('#tbWeek');
  if(st.mode === 's1' || st.mode === 's2'){
    chip.className = 'tb-chip';
    chip.innerHTML = icon('cal', 13) + '<span>' + semOf(st.week - 1) + ' &middot; Week ' + st.week + '</span>';
  } else if(st.mode === 'break'){
    chip.className = 'tb-chip red';
    chip.innerHTML = icon('coffee', 13) + '<span>Winter break</span>';
  } else if(st.mode === 'before'){
    chip.className = 'tb-chip red';
    chip.innerHTML = icon('cal', 13) + '<span>Starts ' + fmtD(st.s1) + '</span>';
  } else {
    chip.className = 'tb-chip red';
    chip.innerHTML = icon('star', 13) + '<span>Year complete</span>';
  }
  const titles = {home:'Home', menu:'ELTASO', classes:'Classes', team:'Team', library:'Library', reports:'Reports', settings:'Settings', intern:'Internship', calendar:'Clubs & events', resources:'Resources', login:'Sign in', lv:''}; /* v2.14: Resources added */
  if(name2lv()) titles.lv = name2lv().label;
  let t = currentRoute === 'lv' ? (name2lv() ? name2lv().label : '') : (titles[currentRoute] || '');
  if(currentRoute === 'intern'){
    const arg = (hash.replace('#/intern', '') || '').replace(/^\//, '');
    t = {'' : 'Internship', 'clubs' : 'Clubs', 'events' : 'Events', 'vols' : 'Volunteers'}[arg] || 'Internship';
  }
  $('#tbTitle').textContent = t;
  const sy = $('#sideYear'); /* v2.8: Profile & institute edits show up at once */
  if(sy) sy.textContent = state.settings.institute + ' · ' + state.settings.year;
}
function name2lv(){
  const hash = location.hash || '';
  const m = hash.match(/^#\/lv\/(.+)$/);
  if(!m) return null;
  return state.levels.find(l => l.key === decodeURIComponent(m[1])) || null;
}
function closeSidebar(){ $('#sidebar').classList.remove('show'); }

/* ---------- global bindings ---------- */
function bindChrome(){
  $('#logoImg').src = LOGO;
  $('#sideYear').textContent = state.settings.institute + ' · ' + state.settings.year;
  $('#burger').innerHTML = icon('menu', 19);
  $('#burger').addEventListener('click', () => $('#sidebar').classList.toggle('show'));
  /* v2.24: public burger button — toggles the nav dropdown on mobile */
  const pubBurger = $('#pubBurger');
  if(pubBurger){
    pubBurger.innerHTML = icon('menu', 19);
    pubBurger.addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  }
  $('#themeBtn').addEventListener('click', cycleTheme);
  $('#tbWeek').addEventListener('click', () => go('#/home'));
  $('#navSettings').addEventListener('click', () => go('#/settings'));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if(b){
      go(b.dataset.go);
      /* v2.24: close the public burger menu after navigating */
      $('#sidebar').classList.remove('open');
    }
  });
}
