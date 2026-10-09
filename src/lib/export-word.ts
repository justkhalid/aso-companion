'use client'

import type { Level, State } from './types'

/**
 * Export a level's scheme of work as a Word-compatible .doc file.
 */
export async function exportLevelDoc(state: State, lv: Level) {
  let logoB64 = ''
  try {
    const res = await fetch('/aso-logo.png')
    const blob = await res.blob()
    logoB64 = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { /* logo optional */ }

  const s = state.settings
  const year = s.year || '2026-2027'
  const s1Weeks = lv.weeks.slice(0, s.s1Weeks || 15)
  const s2Weeks = lv.weeks.slice(s.s1Weeks || 15)

  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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

  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>ELTASO ' + esc(lv.label) + ' Schemes of Work</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 {size:29.7cm 21.0cm; margin:1.4cm 1.4cm 1.4cm 1.4cm; mso-page-orientation:landscape;}' +
    'div.Section1 {page:Section1;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:9.5pt;color:#1C1C1E;}' +
    'h1{color:#1B2A55;font-size:19pt;margin:0 0 2pt 0;}' +
    'h2{color:#C1272D;font-size:13pt;margin:16pt 0 6pt 0;}' +
    '.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}' +
    'table.plan{border-collapse:collapse;width:100%;}' +
    'table.plan td{border:1px solid #D9D9E0;padding:5px 6px;font-size:9pt;vertical-align:top;}' +
    '</style></head><body><div class="Section1">' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr>' +
    '<td style="border:none;width:130px;padding:0;">' + (logoB64 ? '<img src="' + logoB64 + '" width="118" alt="ASO logo">' : '') + '</td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 10px;"><h1>ELTASO - ' + esc(lv.label) + ' - Schemes of Work</h1>' +
    '<p class="sub">' + esc(s.institute || '') + ' - ' + year + ' - ' + lv.weeks.length + ' weeks - ' + esc(lv.cefr || '') + '</p></td>' +
    '</tr></table>' +
    '<h2>Semester 1 - Weeks 1 to ' + s1Weeks.length + '</h2>' +
    '<table class="plan">' + tableHead + s1Weeks.map((w, i) => weekRow(w, i)).join('') + '</table>' +
    '<h2>Semester 2 - Weeks ' + (s1Weeks.length + 1) + ' to ' + lv.weeks.length + '</h2>' +
    '<table class="plan">' + tableHead + s2Weeks.map((w, i) => weekRow(w, i + s1Weeks.length)).join('') + '</table>' +
    '</div></body></html>'

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = lv.label.replace(/[^A-Za-z0-9]+/g, '_')
  a.href = url
  a.download = 'ELTASO_' + safeName + '_Plan_' + year.replace(/\//g, '-') + '.doc'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Export one week's detailed lesson plan as a Word-compatible .doc file:
 * ASO logo header, landscape A4, Calibri, and every section of the plan
 * (stages, game bank, differentiation, homework, teacher tip, checklist).
 */
export async function exportLessonPlanDoc(level: Level, weekIndex: number) {
  let logoB64 = ''
  try {
    const res = await fetch('/aso-logo.png')
    const blob = await res.blob()
    logoB64 = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { /* logo optional */ }

  const w = level.weeks[weekIndex]
  const p = w?.lp
  if (!p) throw new Error('No lesson plan for this week')

  const isKids = level.band === 'Kids' || level.key.indexOf('kids') === 0
  const dur = isKids ? '2 hours' : '90 minutes'
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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

  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>ELTASO ' + esc(level.label) + ' - Lesson Plan W' + (weekIndex + 1) + '</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 {size:29.7cm 21.0cm; margin:1.4cm; mso-page-orientation:landscape;}' +
    'div.Section1 {page:Section1;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#1C1C1E;}' +
    'h1{color:#1B2A55;font-size:19pt;margin:0 0 2pt 0;}' +
    'h2{color:#C1272D;font-size:13pt;margin:14pt 0 6pt 0;}' +
    '.sub{color:#6E6E73;font-size:10.5pt;margin:0 0 8pt 0;}' +
    '.note{color:#8A6A00;font-size:9pt;margin:6pt 0 0 0;}' +
    'table.plan{border-collapse:collapse;width:100%;margin-bottom:6pt;}' +
    'table.plan td{border:1px solid #D9D9E0;padding:6px 8px;font-size:10pt;vertical-align:top;}' +
    'table.plan th{border:1px solid #1B2A55;padding:6px 8px;font-size:10pt;text-align:left;}' +
    '</style></head><body><div class="Section1">' +

    /* logo header */
    '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr>' +
    '<td style="border:none;width:130px;padding:0;">' + (logoB64 ? '<img src="' + logoB64 + '" width="118" alt="ASO logo">' : '') + '</td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 10px;"><h1>Lesson Plan - Week ' + (weekIndex + 1) + '</h1>' +
    '<p class="sub">' + esc(level.label) + ' · ' + esc(w.theme || '') + ' · ' + dur + ' · ' + esc(level.cefr || '') + '</p></td>' +
    '</tr></table>' +

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

    '</div></body></html>'

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = (level.label + '_W' + (weekIndex + 1)).replace(/[^A-Za-z0-9]+/g, '_')
  a.href = url
  a.download = 'ELTASO_LessonPlan_' + safeName + '.doc'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/* ==========================================================================
   Calendar exports (Word) - two extra editable versions of the timetable
   ========================================================================== */

import { TONE_RGB, toneIdx, parseExportItems, groupByDay, type ExportOptions } from './export-canvas'
import { DAY_KEYS, DAY_FULL } from './constants'

async function loadLogoB64(): Promise<string> {
  try {
    const res = await fetch('/aso-logo.png')
    const blob = await res.blob()
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

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

function docHeaderBlock(logoB64: string, title: string, sub: string): string {
  return '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr>' +
    '<td style="border:none;width:150px;padding:0;">' + (logoB64 ? '<img src="' + logoB64 + '" width="136" alt="ASO logo">' : '') + '</td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 10px;"><h1>' + title + '</h1>' +
    '<p class="sub">' + sub + '</p></td></tr></table>'
}

function docFooterBlock(logoB64: string): string {
  const when = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return '<table style="border-collapse:collapse;width:100%;margin-top:12pt;"><tr>' +
    '<td style="border:none;width:48px;padding:0;">' + (logoB64 ? '<img src="' + logoB64 + '" width="44" alt="ASO logo">' : '') + '</td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 8px;color:#6E6E73;font-size:8.5pt;">' +
    'Made with ASO Companion · American Space Oujda · generated ' + when + '</td></tr></table>'
}

/* At a glance: one paragraph with the weekly totals, then a color legend
   table with sessions / rooms / teachers per level or club. */
function docDetailBlocks(o: ExportOptions): string {
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

function triggerDocDownload(html: string, filename: string): void {
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

const GRID_START = 9 // 09:00
const GRID_END = 18 // 18:00 boundary
const GRID_COLS = GRID_END - GRID_START

/**
 * Word table version of the weekly timetable: landscape A4, one row per day,
 * hour columns; each session is a colored cell spanning its time slot.
 * Fully editable in Word / Google Docs.
 */
export async function exportCalendarGridDoc(o: ExportOptions, filename: string) {
  const logoB64 = await loadLogoB64()
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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
    /* build the row: cell HTML strings, gaps filled with empty <td>s */
    const cells: string[] = []
    let col = 0
    for (const e of evs) {
      const sCol = Math.max(col, Math.min(GRID_COLS - 1, Math.floor((e.startMin - GRID_START * 60) / 60)))
      const eCol = Math.max(sCol + 1, Math.min(GRID_COLS, Math.ceil((e.endMin - GRID_START * 60) / 60)))
      for (; col < sCol; col++) cells.push('<td ' + tdEmpty + '>&nbsp;</td>')
      const tone = TONE_RGB[toneIdx(e.item.tone)] || TONE_RGB[0]
      const fill = lightHex(tone.txt, 0.14)
      const border = lightHex(tone.txt, 0.4)
      const meta = [e.item.room, e.item.lead].filter(Boolean).map((x) => esc(x || '')).join(' · ')
      cells.push(
        '<td colspan="' + (eCol - sCol) + '" style="background:' + fill + ';border:1px solid ' + border + ';padding:4px 5px;font-size:8pt;vertical-align:top;">' +
        '<b style="color:' + tone.txt + ';">' + esc(e.item.code) + '</b><br>' +
        '<span style="color:#3C3C43;">' + e.label + '</span>' +
        (meta ? '<br><span style="color:#6E6E73;">' + meta + '</span>' : '') +
        '</td>',
      )
      col = eCol
    }
    for (; col < GRID_COLS; col++) cells.push('<td ' + tdEmpty + '>&nbsp;</td>')

    const dayLabel = '<tr><th ' + dayTh + '>' + (DAY_FULL[d] || d) + '</th>' + cells.join('') + '</tr>'
    return dayLabel
  }).join('')

  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>' + esc(o.title) + '</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 {size:29.7cm 21.0cm; margin:1.2cm; mso-page-orientation:landscape;}' +
    'div.Section1 {page:Section1;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:9.5pt;color:#1C1C1E;}' +
    'h1{color:#1B2A55;font-size:18pt;margin:0 0 2pt 0;}' +
    'h2{color:#C1272D;font-size:12pt;margin:12pt 0 4pt 0;}' +
    '.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}' +
    'table.plan{border-collapse:collapse;width:100%;}' +
    '</style></head><body><div class="Section1">' +
    docHeaderBlock(logoB64, esc(o.title), esc(o.subtitle)) +
    docDetailBlocks(o) +
    '<table class="plan"><tr>' + hourHead + '</tr>' + rows + '</table>' +
    (o.rooms ? '<p class="sub" style="margin-top:6pt;">' + esc(o.rooms) + '</p>' : '') +
    docFooterBlock(logoB64) +
    '</div></body></html>'

  triggerDocDownload(html, filename)
}

/**
 * Word handout version: portrait A4, one compact table per day
 * (time / session / room / led by). Calm and print-friendly.
 */
export async function exportCalendarListDoc(o: ExportOptions, filename: string) {
  const logoB64 = await loadLogoB64()
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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

  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>' + esc(o.title) + '</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 {size:21.0cm 29.7cm; margin:1.6cm;}' +
    'div.Section1 {page:Section1;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#1C1C1E;}' +
    'h1{color:#1B2A55;font-size:18pt;margin:0 0 2pt 0;}' +
    'h2{color:#C1272D;font-size:12pt;margin:12pt 0 4pt 0;}' +
    '.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}' +
    'table.plan{border-collapse:collapse;width:100%;margin-bottom:4pt;}' +
    '</style></head><body><div class="Section1">' +
    docHeaderBlock(logoB64, esc(o.title), esc(o.subtitle)) +
    docDetailBlocks(o) +
    (sections || '<p class="sub">No sessions scheduled yet.</p>') +
    (o.rooms ? '<p class="sub" style="margin-top:8pt;">' + esc(o.rooms) + '</p>' : '') +
    docFooterBlock(logoB64) +
    '</div></body></html>'

  triggerDocDownload(html, filename)
}
