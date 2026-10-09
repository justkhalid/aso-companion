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
