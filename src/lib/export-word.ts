'use client'

import type { Level, State } from './types'
import {
  TONE_RGB,
  toneIdx,
  parseExportItems,
  groupByDay,
  type ExportOptions,
  type DocLink,
} from './export-canvas'
import { DAY_KEYS, DAY_FULL, ROOM_LEGEND, REPORT_SYSTEM_URL } from './constants'

/* ==========================================================================
   Word exports, packaged as MHTML.
   Word ignores base64 "data:" URI images inside plain HTML .doc files (that
   is why the ASO logo never showed). Every document is therefore written as
   a multipart/related MIME file with the logo embedded as a real part and
   referenced by relative Content-Location, which Word renders natively.
   All page setups are explicit A4 (landscape for tables and plans, portrait
   for the handout).
   ========================================================================== */

const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)) as unknown as number[])
  }
  return btoa(bin)
}

const utf8B64 = (s: string) => bytesToB64(new TextEncoder().encode(s))

const wrap76 = (b64: string) => (b64.match(/.{1,76}/g) || []).join('\r\n')

type LogoPart = { name: string; mime: string; b64: string }

async function loadLogoPart(): Promise<LogoPart | null> {
  try {
    const res = await fetch('/aso-logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    const buf = new Uint8Array(await blob.arrayBuffer())
    return { name: 'aso-logo.png', mime: blob.type || 'image/png', b64: bytesToB64(buf) }
  } catch {
    return null
  }
}

function mimeDocBlob(html: string, logo: LogoPart | null): Blob {
  const B = '----=_ASO_DOC_PART'
  let out = ''
  out += 'MIME-Version: 1.0\r\n'
  out += 'Content-Type: multipart/related; type="text/html"; boundary="' + B + '"\r\n'
  out += '\r\n'
  out += '--' + B + '\r\n'
  out += 'Content-Location: file:///C:/ASO/document.html\r\n'
  out += 'Content-Transfer-Encoding: base64\r\n'
  out += 'Content-Type: text/html; charset="utf-8"\r\n'
  out += '\r\n'
  out += wrap76(utf8B64(html)) + '\r\n'
  if (logo) {
    out += '--' + B + '\r\n'
    out += 'Content-Location: file:///C:/ASO/' + logo.name + '\r\n'
    out += 'Content-Transfer-Encoding: base64\r\n'
    out += 'Content-Type: ' + logo.mime + '\r\n'
    out += '\r\n'
    out += wrap76(logo.b64) + '\r\n'
  }
  out += '--' + B + '--\r\n'
  return new Blob([out], { type: 'application/msword' })
}

function saveDoc(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/* the relative logo src resolves against Content-Location file:///C:/ASO/ */
const logoImg = (logo: LogoPart | null, width: number) =>
  logo ? '<img src="' + logo.name + '" width="' + width + '" alt="ASO logo">' : ''

/* ---------- page setups: explicit A4 ---------- */

const A4_LANDSCAPE = '@page Section1 {size:29.7cm 21.0cm; margin:1.3cm 1.3cm 1.3cm 1.3cm; mso-page-orientation:landscape;}'
const A4_PORTRAIT = '@page Section1 {size:21.0cm 29.7cm; margin:1.5cm 1.5cm 1.5cm 1.5cm;}'

const DOC_STYLES =
  'body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#1C1C1E;}' +
  'h1{color:#1B2A55;font-size:19pt;margin:0 0 2pt 0;}' +
  'h2{color:#C1272D;font-size:13pt;margin:14pt 0 6pt 0;}' +
  '.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}' +
  '.note{color:#8A6A00;font-size:9pt;margin:6pt 0 0 0;}' +
  'table.plan{border-collapse:collapse;width:100%;margin-bottom:6pt;}' +
  'table.plan td{border:1px solid #D9D9E0;padding:5px 7px;font-size:9.5pt;vertical-align:top;}' +
  'table.plan th{border:1px solid #1B2A55;padding:5px 7px;font-size:9.5pt;text-align:left;}'

function docHead(title: string, a4: string): string {
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>' + esc(title) + '</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->' +
    '<style>' + a4 + 'div.Section1 {page:Section1;}' + DOC_STYLES + '</style></head>'
}

function docHeaderBlock(logo: LogoPart | null, title: string, sub: string): string {
  return '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr>' +
    '<td style="border:none;width:150px;padding:0;">' + logoImg(logo, 132) + '</td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 10px;"><h1>' + title + '</h1>' +
    '<p class="sub">' + sub + '</p></td></tr></table>'
}

function docFooterBlock(logo: LogoPart | null): string {
  const when = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return '<table style="border-collapse:collapse;width:100%;margin-top:12pt;"><tr>' +
    '<td style="border:none;width:48px;padding:0;">' + logoImg(logo, 40) + '</td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 8px;color:#6E6E73;font-size:8.5pt;">' +
    'American Space Oujda · generated ' + when + '</td></tr></table>'
}

/* a quiet tinted box that explains the document to a teacher seeing it for
   the first time: what each part means and how to work with it */
function docGuideBox(title: string, bullets: string[]): string {
  if (!bullets.length) return ''
  const items = bullets
    .map((b) => '<li style="margin-bottom:3pt;">' + b + '</li>')
    .join('')
  return '<table class="plan" style="margin-bottom:8pt;"><tr><td style="border:1px solid #C9D6F0;background:#EEF2FB;padding:8px 12px;">' +
    '<div style="color:#1B2A55;font-weight:bold;font-size:10.5pt;margin-bottom:4pt;">' + esc(title) + '</div>' +
    '<ul style="margin:0 0 0 14pt;padding:0;font-size:9.5pt;color:#2C3A5C;">' + items + '</ul>' +
    '</td></tr></table>'
}

/* ---------- library, drives & resources ---------- */

function docLinksBlock(links: DocLink[] | undefined, appUrl?: string): string {
  if ((!links || !links.length) && !appUrl) return ''
  const rows: string[] = []
  if (appUrl) {
    rows.push(
      '<tr><td ' + tdBase + ' style="font-weight:bold;">ASO Companion (this app)</td>' +
      '<td ' + tdBase + '>The live calendar, clubs and library, always up to date</td>' +
      '<td ' + tdBase + '><a href="' + esc(appUrl) + '">' + esc(appUrl) + '</a></td></tr>',
    )
  }
  for (const l of links || []) {
    rows.push(
      '<tr><td ' + tdBase + ' style="font-weight:bold;">' + esc(l.name) + '</td>' +
      '<td ' + tdBase + '>' + esc(l.desc || '') + '</td>' +
      '<td ' + tdBase + '><a href="' + esc(l.url) + '">' + esc(l.url) + '</a></td></tr>',
    )
  }
  return '<h2>Library, drives &amp; resources</h2>' +
    '<table class="plan"><tr>' +
    '<th ' + thBase + ' style="width:26%;">Name</th><th ' + thBase + '>What you will find</th><th ' + thBase + ' style="width:40%;">Link</th>' +
    '</tr>' + rows.join('') + '</table>' +
    '<p class="note">Everything above also lives inside ASO Companion under Library. Links open in your browser.</p>'
}

/* data-driven link set shared by every Word export: the main drive, every
   library folder (deduped by URL) and the reports platform */
export function buildDocLinks(state: State): DocLink[] {
  const seen = new Set<string>()
  const out: DocLink[] = []
  const push = (name: string, desc: string, url?: string) => {
    const u = String(url || '').trim()
    if (!u || !/^https?:\/\//i.test(u) || seen.has(u)) return
    seen.add(u)
    out.push({ name, desc, url: u })
  }
  push('Main drive (all folders)', 'The root of the ASO Google Drive: every folder below lives here', state.rootUrl)
  for (const f of state.library || []) push(f.name, f.desc, f.url)
  push('Reports platform', 'Where session reports and attendance summaries are submitted', REPORT_SYSTEM_URL)
  return out
}

const appOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '')

/* ---------- table style shorthands (recomputed strings, Word-safe) ---------- */

const thBase = 'style="background:#1B2A55;color:white;font-size:9.5pt;padding:5px 7px;border:1px solid #1B2A55;text-align:left;"'
const tdBase = 'style="border:1px solid #D9D9E0;padding:5px 7px;font-size:9.5pt;vertical-align:top;"'

/* blend a #RRGGBB tone onto white at the given strength (Word-safe solid fill) */
function lightHex(hex: string, strength: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const r = Math.round(255 + (((n >> 16) & 255) - 255) * strength)
  const g = Math.round(255 + (((n >> 8) & 255) - 255) * strength)
  const b = Math.round(255 + ((n & 255) - 255) * strength)
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

/* At a glance: one paragraph with the weekly totals, then a color legend
   table with sessions / rooms / teachers per level or club. */
function docDetailBlocks(o: ExportOptions): string {
  const parsed = parseExportItems(o.items)
  const days = new Set<string>()
  const rooms = new Set<string>()
  let sessions = 0
  let minStart = 24 * 60
  let maxEnd = 0
  for (const p of parsed) {
    for (const d of p.item.days) days.add(d)
    sessions += p.item.days.length
    if (p.item.room) rooms.add(p.item.room)
    if (p.startMin < minStart) minStart = p.startMin
    if (p.endMin > maxEnd) maxEnd = p.endMin
  }
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const bits: string[] = [sessions + (sessions === 1 ? ' session' : ' sessions') + ' a week across ' + days.size + (days.size === 1 ? ' day' : ' days')]
  if (parsed.length) bits.push(pad2(Math.floor(minStart / 60)) + ':' + pad2(minStart % 60) + ' to ' + pad2(Math.floor(maxEnd / 60)) + ':' + pad2(maxEnd % 60))
  if (rooms.size) bits.push('rooms: ' + Array.from(rooms).sort().join(', '))

  /* legend rows grouped by tone, with per-group stats */
  type Row = { label: string; sessions: number; rooms: Set<string>; leads: Set<string> }
  const byTone = new Map<number, Row>()
  for (const l of o.legend) {
    const t = toneIdx(l.tone)
    if (!byTone.has(t)) byTone.set(t, { label: l.label, sessions: 0, rooms: new Set(), leads: new Set() })
    else if (!byTone.get(t)!.label.includes(l.label)) byTone.get(t)!.label += ' · ' + l.label
  }
  for (const it of o.items) {
    const row = byTone.get(toneIdx(it.tone))
    if (!row) continue
    row.sessions += (it.days || []).length
    if (it.room) row.rooms.add(it.room)
    if (it.lead) row.leads.add(it.lead)
  }

  const th = 'style="background:#1B2A55;color:white;font-size:9pt;padding:4px 6px;border:1px solid #1B2A55;text-align:left;"'
  const td = 'style="border:1px solid #D9D9E0;padding:4px 6px;font-size:9pt;vertical-align:top;"'
  const rows = Array.from(byTone.entries()).map(([t, r]) => {
    const tone = TONE_RGB[t] || TONE_RGB[0]
    return '<tr>' +
      '<td ' + td + ' style="border:1px solid #D9D9E0;padding:4px 6px;width:34px;"><span style="display:inline-block;width:16px;height:16px;background:' + tone.txt + ';border-radius:8px;">&#160;</span></td>' +
      '<td ' + td + ' style="font-weight:bold;color:' + tone.txt + ';">' + esc(r.label) + '</td>' +
      '<td ' + td + '>' + r.sessions + '</td>' +
      '<td ' + td + '>' + esc(Array.from(r.rooms).sort().join(', ') || '-') + '</td>' +
      '<td ' + td + '>' + esc(Array.from(r.leads).join(', ') || '-') + '</td>' +
      '</tr>'
  }).join('')

  return '<p class="sub" style="margin-top:2pt;">At a glance: ' + bits.join(' · ') + '.</p>' +
    (rows
      ? '<table class="plan" style="margin-bottom:8pt;"><tr>' +
        '<th ' + th + ' style="width:34px;">&#160;</th><th ' + th + '>Level / club</th>' +
        '<th ' + th + ' style="width:70px;">Sessions / week</th><th ' + th + ' style="width:22%;">Rooms</th>' +
        '<th ' + th + ' style="width:30%;">Led by</th></tr>' + rows + '</table>'
      : '')
}

/* ==========================================================================
   1. Schemes of Work, one .doc per level: the full year, week by week
   ========================================================================== */

export async function exportLevelDoc(state: State, lv: Level) {
  const logo = await loadLogoPart()
  const s = state.settings
  const year = s.year || '2026-2027'
  const s1Weeks = lv.weeks.slice(0, s.s1Weeks || 15)
  const s2Weeks = lv.weeks.slice(s.s1Weeks || 15)

  const th = 'style="background:#1B2A55;color:white;font-size:9pt;padding:5px 6px;border:1px solid #1B2A55;text-align:left;"'
  const td = 'style="border:1px solid #D9D9E0;padding:5px 6px;font-size:9pt;vertical-align:top;"'

  function weekRow(w: typeof lv.weeks[0], idx: number) {
    const skills = w.skills ? `L: ${esc(w.skills.L || '-')}\nS: ${esc(w.skills.S || '-')}\nR: ${esc(w.skills.R || '-')}\nW: ${esc(w.skills.W || '-')}` : '-'
    return '<tr>' +
      '<td ' + td + ' style="font-weight:bold;text-align:center;">' + (idx + 1) + '</td>' +
      '<td ' + td + '>' + esc(w.theme || '') + '</td>' +
      '<td ' + td + '>' + esc(w.obj || '') + '</td>' +
      '<td ' + td + '>' + esc(w.lang || '') + '</td>' +
      '<td ' + td + ' style="white-space:pre-wrap;">' + skills + '</td>' +
      '<td ' + td + '>' + esc(w.res || '') + '</td>' +
      '<td ' + td + '>' + esc(w.act || '') + '</td>' +
      '<td ' + td + '>' + esc(w.hw || '') + '</td>' +
      '<td ' + td + ' style="color:#8A6A00;font-weight:bold;">' + esc('') + '</td>' +
      '</tr>'
  }

  const tableHead = '<tr>' +
    '<th ' + th + '>Week</th><th ' + th + '>Theme</th><th ' + th + '>Objectives</th><th ' + th + '>Key language</th>' +
    '<th ' + th + '>Skills (L/S/R/W)</th><th ' + th + '>Resources</th><th ' + th + '>Activities</th>' +
    '<th ' + th + '>Homework</th><th ' + th + '>Note</th></tr>'

  const guide = docGuideBox('How to read this plan (for new teachers)', [
    '<b>Objectives</b> say what students can DO by the end of the week, not which topics were covered.',
    '<b>Skills</b> use L / S / R / W for Listening, Speaking, Reading and Writing.',
    '<b>Resources</b> listed each week are found in the drives linked at the end of this document.',
    'Sessions last <b>2 hours for Kids</b> (with a short break) and <b>90 minutes</b> for Teens and Adults.',
    '<b>Rooms:</b> ' + esc(ROOM_LEGEND) + '. All times are 24h.',
    'Write your own remarks in the empty <b>Note</b> column and share them with the lead coordinator.',
  ])

  const html = docHead('ELTASO ' + lv.label + ' Schemes of Work', A4_LANDSCAPE) + '<body><div class="Section1">' +
    docHeaderBlock(logo, 'ELTASO - ' + esc(lv.label) + ' - Schemes of Work',
      esc(s.institute || '') + ' - ' + year + ' - ' + lv.weeks.length + ' weeks - ' + esc(lv.cefr || '')) +
    guide +
    '<h2>Semester 1 - Weeks 1 to ' + s1Weeks.length + '</h2>' +
    '<table class="plan">' + tableHead + s1Weeks.map((w, i) => weekRow(w, i)).join('') + '</table>' +
    '<h2>Semester 2 - Weeks ' + (s1Weeks.length + 1) + ' to ' + lv.weeks.length + '</h2>' +
    '<table class="plan">' + tableHead + s2Weeks.map((w, i) => weekRow(w, i + s1Weeks.length)).join('') + '</table>' +
    docLinksBlock(buildDocLinks(state), appOrigin()) +
    docFooterBlock(logo) +
    '</div></body></html>'

  const safeName = lv.label.replace(/[^A-Za-z0-9]+/g, '_')
  saveDoc(mimeDocBlob(html, logo), 'ELTASO_' + safeName + '_Plan_' + year.replace(/\//g, '-') + '.doc')
}

/* ==========================================================================
   2. Lesson plan, one .doc per week: the full session arc plus support banks
   ========================================================================== */

export async function exportLessonPlanDoc(
  level: Level,
  weekIndex: number,
  extras?: { libraryLinks?: DocLink[]; appUrl?: string },
) {
  const logo = await loadLogoPart()

  const w = level.weeks[weekIndex]
  const p = w?.lp
  if (!p) throw new Error('No lesson plan for this week')

  const isKids = level.band === 'Kids' || level.key.indexOf('kids') === 0
  const dur = isKids ? '2 hours' : '90 minutes'

  const th = 'style="background:#1B2A55;color:white;font-size:10pt;padding:6px 8px;border:1px solid #1B2A55;text-align:left;"'
  const td = 'style="border:1px solid #D9D9E0;padding:6px 8px;font-size:10pt;vertical-align:top;"'

  /* stage rows for the 2-hour / 90-minute arc */
  const helloTxt =
    weekIndex === 0
      ? isKids
        ? 'Hello Song + name ball toss; establish the attention signal ("1, 2, 3, eyes on me!").'
        : 'Welcome and icebreaker; establish class routines and the "English only" signal.'
      : isKids
        ? `Hello Song + register; feelings chart check-in${weekIndex >= 20 ? '; weather report' : ''}.`
        : "Warm hello; quick recap of last week + today's goal."
  const brkTxt = isKids ? 'Toilet + water; soft music; sitting signal on return.' : 'Short break; quick stretch / water; regroup.'

  const T = isKids
    ? { hello: '0:00-0:10', wu: '0:10-0:20', pres: '0:20-0:35', prac: '0:35-0:50', ls: '0:50-1:00', brk: '1:00-1:10', re: '1:10-1:20', prod: '1:20-1:45', rw: '1:45-1:55', st: '1:55-2:00' }
    : { hello: '0:00-0:05', wu: '0:05-0:15', pres: '0:15-0:30', prac: '0:30-0:45', ls: '0:45-0:55', brk: '0:55-1:00', re: '1:00-1:08', prod: '1:08-1:22', rw: '1:22-1:28', st: '1:28-1:30' }

  const stages: [string, string, string, boolean][] = [
    ['Hello & routine', T.hello, helloTxt, false],
    ['Warm-up review', T.wu, p.wu, false],
    ['Presentation', T.pres, p.pres, false],
    ['Practice (guided)', T.prac, p.prac, false],
    ['Listening slot', T.ls, p.ls, false],
    ['BREAK', T.brk, brkTxt, true],
    ['Reactivation game', T.re, p.re, false],
    ['Production task', T.prod, p.prod, false],
    ['Reading & writing', T.rw, p.rw, false],
    ['Story / song + goodbye', T.st, p.st, false],
  ]

  const stageRows = stages
    .map(([name, tm, main, brk]) =>
      '<tr' + (brk ? ' style="background:#FBF3DC;"' : '') + '>' +
      '<td ' + td + ' style="font-weight:bold;width:22%;">' + esc(name) + '</td>' +
      '<td ' + td + ' style="font-weight:bold;width:13%;color:#8A6A00;white-space:nowrap;">' + esc(tm) + '</td>' +
      '<td ' + td + '>' + esc(main) + '</td></tr>',
    )
    .join('')

  const bulletList = (items: string[]) =>
    items && items.length
      ? '<ul style="margin:4pt 0 0 14pt;padding:0;">' + items.map((x) => '<li style="margin-bottom:3pt;">' + esc(x) + '</li>').join('') + '</ul>'
      : ''

  const gameTable =
    p.g && p.g.length
      ? '<table class="plan"><tr><th ' + th + ' style="width:26%;">Game / activity</th><th ' + th + '>How it works</th></tr>' +
        p.g.map((g) => '<tr><td ' + td + ' style="font-weight:bold;">' + esc(g[0]) + '</td><td ' + td + '>' + esc(g[1]) + '</td></tr>').join('') +
        '</table>'
      : ''

  const checklistTable =
    p.checklist && p.checklist.length
      ? '<table class="plan"><tr>' +
        '<th ' + th + '>Can-do statement</th><th ' + th + ' style="width:14%;">Not yet</th>' +
        '<th ' + th + ' style="width:14%;">With help</th><th ' + th + ' style="width:16%;">Independently</th></tr>' +
        p.checklist.map((c) => '<tr><td ' + td + '>' + esc(c) + '</td><td ' + td + '>&#9744;</td><td ' + td + '>&#9744;</td><td ' + td + '>&#9744;</td></tr>').join('') +
        '</table><p class="note">Tick DURING play, never as a table test. If a child freezes, observe again later. The record should show their best normal self.</p>'
      : ''

  const guide = docGuideBox('How to use this lesson plan', [
    'The times in the arc are a <b>guide, not a script</b>. If you run late, trim practice first and protect the production task.',
    'Before class: print the worksheets, queue the audio, and write the key language on the board before students arrive.',
    isKids
      ? 'Keep the break short and calm; it is a fixed part of the Kids rhythm.'
      : 'The short break keeps energy up; announce the restart clearly.',
    '<b>Differentiation</b> gives one easier and one harder variant of the same task so every student works on the same topic.',
    'Tick the <b>assessment checklist</b> during activities, never as a separate test.',
    'Pick <b>ONE</b> homework option; the menu exists so you can rotate across terms.',
    'Print more worksheets, flashcards or songs any time from the drives linked at the end of this document.',
  ])

  const html = docHead('ELTASO ' + level.label + ' - Lesson Plan W' + (weekIndex + 1), A4_LANDSCAPE) + '<body><div class="Section1">' +

    /* logo header */
    docHeaderBlock(logo, 'Lesson Plan - Week ' + (weekIndex + 1),
      esc(level.label) + ' · ' + esc(w.theme || '') + ' · ' + dur + ' · ' + esc(level.cefr || '')) +

    guide +

    /* objectives banner */
    '<table class="plan"><tr><th ' + th + ' style="width:22%;">Objectives</th><td ' + td + '>students can ' + esc(w.obj || '-') + '</td>' +
    '<th ' + th + ' style="width:18%;">Key language</th><td ' + td + '>' + esc(w.lang || '-') + '</td></tr></table>' +

    /* stages */
    '<h2>The ' + esc(dur) + ' arc</h2>' +
    '<table class="plan"><tr><th ' + th + ' style="width:22%;">Stage</th><th ' + th + ' style="width:13%;">Time</th><th ' + th + '>What happens</th></tr>' +
    stageRows + '</table>' +

    /* game bank */
    (gameTable ? '<h2>Game bank / activity bank this week</h2>' + gameTable : '') +

    /* differentiation */
    (p.diff && p.diff.length ? '<h2>Differentiation</h2>' + bulletList(p.diff) : '') +

    /* homework */
    (p.hw && p.hw.length ? '<h2>Homework options</h2>' + bulletList(p.hw) : '') +

    /* teacher tip */
    (p.tip ? '<h2>Teacher tip</h2><p style="margin:0 0 6pt 0;">' + esc(p.tip) + '</p>' : '') +

    /* assessment checklist */
    (checklistTable ? '<h2>Assessment observation checklist</h2>' + checklistTable : '') +

    docLinksBlock(extras?.libraryLinks, extras?.appUrl || appOrigin()) +
    docFooterBlock(logo) +
    '</div></body></html>'

  const safeName = (level.label + '_W' + (weekIndex + 1)).replace(/[^A-Za-z0-9]+/g, '_')
  saveDoc(mimeDocBlob(html, logo), 'ELTASO_LessonPlan_' + safeName + '.doc')
}

/* ==========================================================================
   3 & 4. Calendar exports (Word) - two editable versions of the timetable
   ========================================================================== */

const GRID_START = 9 // 09:00
const GRID_END = 18 // 18:00 boundary
const GRID_COLS = GRID_END - GRID_START

/**
 * Word table version of the weekly timetable: landscape A4, one row per day,
 * hour columns; each session is a colored cell spanning its time slot.
 * Fully editable in Word / Google Docs.
 */
export async function exportCalendarGridDoc(o: ExportOptions, filename: string) {
  const logo = await loadLogoPart()

  const th = 'style="background:#1B2A55;color:white;font-size:9pt;padding:4px 5px;border:1px solid #1B2A55;text-align:center;"'
  const dayTh = 'style="background:#1B2A55;color:white;font-size:9pt;padding:4px 6px;border:1px solid #1B2A55;text-align:left;width:78px;"'
  const tdEmpty = 'style="border:1px solid #E3E3EA;padding:4px;font-size:8pt;"'
  const pad2 = (n: number) => String(n).padStart(2, '0')

  const parsed = parseExportItems(o.items)
  const byDay = groupByDay(parsed)

  const hourHead = '<th ' + dayTh + '>Day</th>' +
    Array.from({ length: GRID_COLS }, (_, i) => '<th ' + th + '>' + pad2(GRID_START + i) + ':00</th>').join('')

  const rows = DAY_KEYS.map((d) => {
    const evs = (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin)
    /* build the row: cell HTML strings, gaps filled with empty <td>s.
       Sessions that occupy the exact same hour span share ONE cell so the
       times line up and nothing shifts to the right. */
    const cells: string[] = []
    let col = 0
    let i = 0
    while (i < evs.length) {
      const e = evs[i]
      const sCol = Math.max(col, Math.min(GRID_COLS - 1, Math.floor((e.startMin - GRID_START * 60) / 60)))
      const eCol = Math.max(sCol + 1, Math.min(GRID_COLS, Math.ceil((e.endMin - GRID_START * 60) / 60)))
      // gather every session with the same span
      const group: typeof evs = [e]
      let j = i + 1
      while (j < evs.length) {
        const g = evs[j]
        const gsCol = Math.max(col, Math.min(GRID_COLS - 1, Math.floor((g.startMin - GRID_START * 60) / 60)))
        const geCol = Math.max(gsCol + 1, Math.min(GRID_COLS, Math.ceil((g.endMin - GRID_START * 60) / 60)))
        if (gsCol === sCol && geCol === eCol) {
          group.push(g)
          j++
        } else break
      }
      for (; col < sCol; col++) cells.push('<td ' + tdEmpty + '>&nbsp;</td>')
      const tone0 = TONE_RGB[toneIdx(group[0].item.tone)] || TONE_RGB[0]
      const fill = lightHex(tone0.txt, 0.14)
      const border = lightHex(tone0.txt, 0.4)
      const inner = group
        .map((g) => {
          const tone = TONE_RGB[toneIdx(g.item.tone)] || TONE_RGB[0]
          const meta = [g.item.room, g.item.lead].filter(Boolean).map((x) => esc(x || '')).join(' · ')
          return (
            '<b style="color:' + tone.txt + ';">' + esc(g.item.code) + '</b><br>' +
            '<span style="color:#3C3C43;">' + g.label + '</span>' +
            (meta ? '<br><span style="color:#6E6E73;">' + meta + '</span>' : '')
          )
        })
        .join('<hr style="border:none;border-top:1px solid ' + border + ';margin:3px 0;">')
      cells.push(
        '<td colspan="' + (eCol - sCol) + '" style="background:' + fill + ';border:1px solid ' + border + ';padding:4px 5px;font-size:8pt;vertical-align:top;">' +
        inner +
        '</td>',
      )
      col = eCol
      i = j
    }
    for (; col < GRID_COLS; col++) cells.push('<td ' + tdEmpty + '>&nbsp;</td>')

    const dayLabel = '<tr><th ' + dayTh + '>' + (DAY_FULL[d] || d) + '</th>' + cells.join('') + '</tr>'
    return dayLabel
  }).join('')

  const guide = docGuideBox('How to read this timetable', [
    'Times are <b>24h</b>. One color per level, club or event type, matching the legend above.',
    '<b>Rooms:</b> ' + esc(ROOM_LEGEND) + '.',
    'This Word table is fully editable: move, rename or recolor sessions freely; the hour grid stays aligned.',
    'New teachers: what to teach each week lives in ELTASO (Schemes of Work); clubs and events are described on the Clubs &amp; events page.',
  ])

  const html = docHead(o.title, A4_LANDSCAPE) + '<body><div class="Section1">' +
    docHeaderBlock(logo, esc(o.title), esc(o.subtitle)) +
    docDetailBlocks(o) +
    guide +
    '<table class="plan"><tr>' + hourHead + '</tr>' + rows + '</table>' +
    (o.rooms ? '<p class="sub" style="margin-top:6pt;">' + esc(o.rooms) + '</p>' : '') +
    docLinksBlock(o.libraryLinks, o.appUrl || appOrigin()) +
    docFooterBlock(logo) +
    '</div></body></html>'

  saveDoc(mimeDocBlob(html, logo), filename)
}

/**
 * Word handout version: portrait A4, one compact table per day
 * (time / session / room / led by). Calm and print-friendly.
 */
export async function exportCalendarListDoc(o: ExportOptions, filename: string) {
  const logo = await loadLogoPart()

  const th = 'style="background:#1B2A55;color:white;font-size:9.5pt;padding:4px 6px;border:1px solid #1B2A55;text-align:left;"'
  const td = 'style="border:1px solid #D9D9E0;padding:4px 6px;font-size:9.5pt;vertical-align:top;"'
  const tdTime = (color: string) =>
    'style="border:1px solid #D9D9E0;padding:4px 6px;font-size:9.5pt;vertical-align:top;white-space:nowrap;font-weight:bold;color:' + color + ';"'

  const parsed = parseExportItems(o.items)
  const byDay = groupByDay(parsed)

  const sections = DAY_KEYS.map((d) => {
    const evs = (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin)
    if (!evs.length) return ''
    const rows = evs.map((e) => {
      const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
      return '<tr>' +
        '<td ' + tdTime(tone.txt) + '>' + e.label + '</td>' +
        '<td ' + td + ' style="border:1px solid #D9D9E0;padding:4px 6px;font-size:9.5pt;vertical-align:top;font-weight:bold;color:' + tone.txt + ';">' + esc(e.item.code) + '</td>' +
        '<td ' + td + '>' + esc(e.item.room || '-') + '</td>' +
        '<td ' + td + '>' + esc(e.item.lead || '-') + '</td>' +
        '</tr>'
    }).join('')
    return '<h2>' + (DAY_FULL[d] || d) + ' · ' + evs.length + (evs.length === 1 ? ' session' : ' sessions') + '</h2>' +
      '<table class="plan"><tr>' +
      '<th ' + th + ' style="width:19%;">Time</th><th ' + th + ' style="width:37%;">Session</th>' +
      '<th ' + th + ' style="width:18%;">Room</th><th ' + th + ' style="width:26%;">Led by</th>' +
      '</tr>' + rows + '</table>'
  }).filter(Boolean).join('')

  const guide = docGuideBox('How to read this handout', [
    'Times are <b>24h</b>. One color per level, club or event type, matching the legend above.',
    '<b>Rooms:</b> ' + esc(ROOM_LEGEND) + '.',
    'Print it as is for the notice board, or edit any table for your own weekly plan.',
  ])

  const html = docHead(o.title, A4_PORTRAIT) + '<body><div class="Section1">' +
    docHeaderBlock(logo, esc(o.title), esc(o.subtitle)) +
    docDetailBlocks(o) +
    guide +
    (sections || '<p class="sub">No sessions scheduled yet.</p>') +
    (o.rooms ? '<p class="sub" style="margin-top:8pt;">' + esc(o.rooms) + '</p>' : '') +
    docLinksBlock(o.libraryLinks, o.appUrl || appOrigin()) +
    docFooterBlock(logo) +
    '</div></body></html>'

  saveDoc(mimeDocBlob(html, logo), filename)
}
