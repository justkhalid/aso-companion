/* Standalone Word lesson-plan folder generator. Reads data/state.json,
   writes one Drive-ready folder per level: overview + 30 week .doc files +
   game bank. No app code, no dependencies.   node tools/export_word_docs.mjs [levelKey...] */
import fs from 'fs';
import path from 'path';
import url from 'url';

const REPO = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT = path.join(REPO, '..', 'word_exports');
const state = JSON.parse(fs.readFileSync(path.join(REPO, 'data/state.json'), 'utf8'));
const LOGO = eval(fs.readFileSync(path.join(REPO, 'js/01_seed.js'), 'utf8') + '; LOGO');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safe = s => String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Export';
const CSS = 'body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#1C1C1E;}h1{color:#1B2A55;font-size:17pt;margin:0 0 2pt 0;}h2{color:#C1272D;font-size:12.5pt;margin:14pt 0 5pt 0;}.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}.tiny{color:#6E6E73;font-size:8.5pt;}table.plan{border-collapse:collapse;width:100%;margin-bottom:4pt;}table.plan th{background:#1B2A55;color:white;font-size:9.5pt;padding:5px 7px;border:1px solid #1B2A55;text-align:left;}table.plan td{border:1px solid #D9D9E0;padding:5px 7px;font-size:10pt;vertical-align:top;}td.stg{font-weight:bold;color:#1B2A55;}td.tm{color:#C1272D;white-space:nowrap;}.alt{color:#6E6E73;font-size:9pt;}ul.li{margin:4pt 0 8pt 18pt;padding:0;}ul.li li{margin-bottom:3pt;}';
const HEAD = t => '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + t + '</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--><style>@page Section1 {size:21.0cm 29.7cm; margin:1.6cm 1.6cm 1.6cm 1.6cm;}div.Section1{page:Section1;}' + CSS + '</style></head><body><div class="Section1">';
const BANNER = h1 => '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr><td style="border:none;width:130px;padding:0;"><img src="' + LOGO + '" width="118" alt="American Space Oujda"></td><td style="border:none;vertical-align:middle;padding:0 0 0 10px;">' + h1 + '</td></tr></table>';

/* calendar helpers (mirror of 02_core.js) */
const st = state.settings;
const s1Start = new Date(st.s1Start + 'T00:00:00');
const s2Start = new Date(st.s2Start + 'T00:00:00');
function weekMonday(wi){
  const n1 = Math.min(Math.max(1, +st.s1Weeks || 15), 30);
  const base = wi < n1 ? s1Start : s2Start;
  const off = wi < n1 ? wi : wi - n1;
  const d = new Date(base); d.setDate(d.getDate() + off * 7);
  return d;
}
const fmtD = (d, o) => d.toLocaleDateString('en-GB', o || { day: 'numeric', month: 'short' });
const noteFor = wi => { const n = (state.notes || []).find(x => x.week === wi + 1); return n ? n.text : ''; };
const skillsText = w => { const s = w.skills || {}; return ['L','S','R','W'].filter(k => s[k]).map(k => k + ': ' + s[k]).join(' · '); };

function weekDoc(lv, wi){
  const w = lv.weeks[wi], p = w.lp; if(!p) return null;
  const isKids = (lv.band === 'Kids' || lv.key.startsWith('kids'));
  const dur = isKids ? '2 hours' : '90 minutes';
  const T = isKids
    ? { hello:'0:00–0:10', wu:'0:10–0:20', pres:'0:20–0:35', prac:'0:35–0:50', ls:'0:50–1:00', brk:'1:00–1:10', re:'1:10–1:20', prod:'1:20–1:45', rw:'1:45–1:55', st:'1:55–2:00' }
    : { hello:'0:00–0:05', wu:'0:05–0:15', pres:'0:15–0:30', prac:'0:30–0:45', ls:'0:45–0:55', brk:'0:55–1:00', re:'1:00–1:08', prod:'1:08–1:22', rw:'1:22–1:28', st:'1:28–1:30' };
  const helloTxt = wi === 0
    ? (isKids ? 'Hello Song + name ball toss; establish the attention signal ("1, 2, 3, eyes on me!").' : 'Welcome and icebreaker; establish class routines and the "English only" signal.')
    : (isKids ? 'Hello Song + register; feelings chart check-in' + (wi >= 20 ? '; weather report' : '') + '.' : 'Warm hello; quick recap of last week + today\u2019s goal.');
  const brkTxt = isKids ? 'Toilet + water; soft music; sitting signal on return.' : 'Short break; quick stretch / water; regroup.';
  const row = (name, tm, main, alts) => '<tr><td class="stg">' + esc(name) + '</td><td class="tm">' + esc(tm) + '</td><td>' + esc(main || '') + (alts?.length ? '<br><i class="alt">Also try: ' + alts.map(esc).join(' · ') + '</i>' : '') + '</td></tr>';
  const stages = row('Hello & routine', T.hello, helloTxt) + row('Warm-up review', T.wu, p.wu, p.wuAlt) + row('Presentation', T.pres, p.pres, p.presAlt) + row('Practice (guided)', T.prac, p.prac, p.pracAlt) + row('Listening slot', T.ls, p.ls) + row('BREAK', T.brk, brkTxt) + row('Reactivation game', T.re, p.re) + row('Production task', T.prod, p.prod) + row('Reading & writing', T.rw, p.rw) + row('Story / song + goodbye', T.st, p.st);
  let x = '';
  if(p.g?.length) x += '<h2>Game bank this week</h2><table class="plan">' + p.g.map(g => '<tr><td class="stg" style="width:26%">' + esc(g[0]) + '</td><td>' + esc(g[1]) + '</td></tr>').join('') + '</table>';
  if(p.diff?.length) x += '<h2>Differentiation — every child works</h2><ul class="li">' + p.diff.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul>';
  if(p.hw?.length) x += '<h2>Homework options (choose per class)</h2><ul class="li">' + p.hw.map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>';
  if(p.tip) x += '<h2>Teacher tip</h2><p>' + esc(p.tip) + '</p>';
  if(p.checklist?.length) x += '<h2>Assessment observation checklist (tick DURING play)</h2><table class="plan"><tr><th>Can-do</th><th style="width:70px">Not yet</th><th style="width:70px">With help</th><th style="width:70px">Independently</th></tr>' + p.checklist.map(c => '<tr><td>' + esc(c) + '</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td></tr>').join('') + '</table><p class="tiny">Tick during normal games, never as a table test. If a child freezes, observe again later.</p>';
  const guide = '<h2>New to teaching? How to run this plan</h2><table class="plan">' +
    '<tr><td class="stg" style="width:26%">Before class (10 min)</td><td>Read the whole plan once. Lay props out in order of use. Write the week theme + target sentences where the class can see them.</td></tr>' +
    '<tr><td class="stg">Golden rules</td><td><b>Model before drill</b> (show it twice yourself), <b>pair before solo</b> (rehearse together first), <b>name-swap</b> (rotate who answers), <b>end a game while they still want more</b>.</td></tr>' +
    '<tr><td class="stg">If an activity flops</td><td>Don\u2019t push a dying game past 2 minutes — switch to an <i>Also try</i> option or a Game bank round.</td></tr>' +
    '<tr><td class="stg">If it finishes early</td><td>Re-run an earlier stage as a speed round — instant extra 5 minutes.</td></tr>' +
    '<tr><td class="stg">If you run out of time</td><td>Cut from the middle (Practice / Reading &amp; writing), never from Production and the goodbye — the last 10 minutes are what learners remember.</td></tr>' +
    '<tr><td class="stg">If the class is noisy</td><td>Use the attention signal, wait for full silence before speaking, drop your voice instead of raising it.</td></tr>' +
    '<tr><td class="stg">Mixed levels</td><td>Pair stronger with quieter learners; keep the Differentiation stretch tasks ready for fast finishers.</td></tr></table>';
  const res = (w.res || '') + (w.urls?.length ? '<br>Drive: ' + w.urls.map(u => '<a href="' + esc(u) + '">' + esc(u) + '</a>').join('<br>') : '');
  return HEAD('Week ' + (wi + 1)) + BANNER('<h1>Week ' + (wi + 1) + ' · ' + esc(w.theme || '') + '</h1><p class="sub">ELTASO · ' + esc(lv.label) + ' (' + esc(lv.cefr || '') + ') · ' + esc(st.institute) + ' · ' + esc(st.year) + ' · lesson of ' + fmtD(weekMonday(wi)) + ' · ' + dur + '</p>') +
    '<table class="plan"><tr><td class="stg" style="width:26%">By the end, students can</td><td>' + esc(w.obj || '') + '</td></tr><tr><td class="stg">Target language</td><td>' + esc(w.lang || '') + '</td></tr><tr><td class="stg">Skills focus (L·S·R·W)</td><td>' + esc(skillsText(w)) + '</td></tr><tr><td class="stg">Materials &amp; resources</td><td>' + res + '</td></tr>' + (noteFor(wi) ? '<tr><td class="stg">Calendar note</td><td>' + esc(noteFor(wi)) + '</td></tr>' : '') + '</table>' +
    '<h2>Lesson plan · ' + dur + '</h2><table class="plan"><tr><th style="width:20%">Stage</th><th style="width:11%">Time</th><th>What happens</th></tr>' + stages + '</table>' + x + guide +
    '<p class="tiny" style="margin-top:14pt">' + esc(st.institute) + ' · generated ' + new Date().toISOString().slice(0, 10) + '</p></div></body></html>';
}

function overviewDoc(lv){
  const n1 = Math.min(Math.max(1, +st.s1Weeks || 15), 30);
  const rows = w => lv.weeks.map((x, i) => '<tr><td style="text-align:center;font-weight:bold;color:#1B2A55">' + (i + 1) + '</td><td>' + esc(fmtD(weekMonday(i))) + '</td><td>' + esc(x.theme || '') + '</td><td>' + esc(x.obj || '') + '</td><td>' + esc(noteFor(i)) + '</td></tr>').join('');
  const th = '<tr><th>Wk</th><th>Date</th><th>Theme</th><th>Objectives</th><th>Note</th></tr>';
  return HEAD('Year overview') + BANNER('<h1>' + esc(lv.label) + ' — Year Overview</h1><p class="sub">' + esc(st.institute) + ' · ' + esc(st.year) + ' · 30 weeks · CEFR ' + esc(lv.cefr || '') + ' · one .doc per week in this folder</p>') +
    '<h2>Semester 1 · Weeks 1–' + n1 + '</h2><table class="plan">' + th + rows(lv.weeks.slice(0, n1)) + '</table>' +
    '<h2>Semester 2 · Weeks ' + (n1 + 1) + '–30</h2><table class="plan">' + th + rows(lv.weeks.slice(n1)) + '</table></div></body></html>';
}

function gameBankDoc(lv){
  const isKids = (lv.band === 'Kids' || lv.key.startsWith('kids'));
  const arc = isKids
    ? [['0:00–0:10','Hello & routine'],['0:10–0:20','Warm-up review'],['0:20–0:35','Presentation'],['0:35–0:50','Practice (guided)'],['0:50–1:00','Listening slot'],['1:00–1:10','BREAK'],['1:10–1:20','Reactivation game'],['1:20–1:45','Production task'],['1:45–1:55','Reading & writing'],['1:55–2:00','Story / song + goodbye']]
    : [['0:00–0:05','Hello & routine'],['0:05–0:15','Warm-up review'],['0:15–0:30','Presentation'],['0:30–0:45','Practice (guided)'],['0:45–0:55','Listening slot'],['0:55–1:00','BREAK'],['1:00–1:08','Reactivation game'],['1:08–1:22','Production task'],['1:22–1:28','Reading & writing'],['1:28–1:30','Story / song + goodbye']];
  return HEAD('Game bank') + BANNER('<h1>Game Bank &amp; Classroom Routines</h1><p class="sub">ELTASO · ' + esc(lv.label) + ' · ' + esc(st.institute) + ' · ' + esc(st.year) + '</p>') +
    '<h2>The weekly lesson arc (' + (isKids ? '2 hours' : '90 minutes') + ')</h2><table class="plan"><tr><th style="width:110px">Time</th><th>Stage</th></tr>' + arc.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table>' +
    '<h2>Every-lesson routines</h2><ul class="li"><li><b>Hello routine:</b> same greeting sequence every week — routine is what makes learners safe enough to speak.</li><li><b>Attention signal:</b> taught in week 1, used forever. Never talk over noise; wait for silence.</li><li><b>Sticker chart:</b> reward participation and effort, not correctness alone.</li><li><b>Goodbye routine:</b> song + chart + high-five line. End every lesson with success.</li><li><b>English-only signal:</b> a gesture, not an argument; praise the first learner who switches back.</li></ul></div></body></html>';
}

const keys = process.argv.slice(2);
const levels = state.levels.filter(l => (!keys.length || keys.includes(l.key)) && l.weeks.some(w => w.lp));
if(!levels.length){ console.error('No levels with lesson plans matched.'); process.exit(1); }
for(const lv of levels){
  const dir = path.join(OUT, 'ELTASO_' + safe(lv.label) + '_Lesson_Plans');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '00_READ_ME_Year_Overview.doc'), '\ufeff' + overviewDoc(lv));
  let n = 0;
  lv.weeks.forEach((w, i) => { const h = weekDoc(lv, i); if(h){ fs.writeFileSync(path.join(dir, 'Week_' + String(i + 1).padStart(2, '0') + '_' + String(w.theme || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 42) + '.doc'), '\ufeff' + h); n++; } });
  fs.writeFileSync(path.join(dir, 'Game_Bank_and_Routines.doc'), '\ufeff' + gameBankDoc(lv));
  console.log(lv.label + ': ' + n + ' week plans + overview + game bank -> ' + dir);
}
