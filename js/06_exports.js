/* ================= Exports: Excel (.xlsx) + Word (.doc) + app update ================= */

/* ---------- tiny ZIP (store, no compression) ---------- */
const CRC_T = (function(){ const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c; } return t; })();
function crc32(u8){ let c = 0xFFFFFFFF; for(let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipBuild(files){
  const enc = new TextEncoder(), chunks = [], central = []; let off = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  files.forEach(f => {
    const name = enc.encode(f.name), d = (f.data instanceof Uint8Array) ? f.data : enc.encode(f.data), crc = crc32(d);
    const lh = new Uint8Array([80,75,3,4].concat(u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(d.length), u32(d.length), u16(name.length), u16(0)));
    chunks.push(lh, name, d);
    central.push({name, crc, size: d.length, off});
    off += lh.length + name.length + d.length;
  });
  const cdStart = off; let cdSize = 0;
  central.forEach(c => {
    const ch = new Uint8Array([80,75,1,2].concat(u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.off)));
    chunks.push(ch, c.name); cdSize += ch.length + c.name.length;
  });
  chunks.push(new Uint8Array([80,75,5,6].concat(u16(0), u16(0), u16(central.length), u16(central.length), u32(cdSize), u32(cdStart), u16(0))));
  return new Blob(chunks, {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function iOSLike(){ /* v2.8: iPhone / iPad - the only place blob downloads silently fail */
  try{
    const ua = navigator.userAgent || '';
    if(/iPad|iPhone|iPod/.test(ua)) return true;
    if(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true; /* iPadOS 13+ */
  }catch(e){}
  return false;
}
function downloadBlob(blob, name){
  /* v2.9: returns a Promise that resolves to a status string so the caller can
     show accurate feedback. Possible statuses:
       'shared'     - iOS share sheet succeeded (file is saved / sent)
       'cancelled'  - iOS share sheet was dismissed without sharing
       'downloaded' - anchor click triggered a normal browser download
       'opened'     - last resort: blob opened in a new tab so the user can
                      long-press / Save Image manually (mobile fallback)
       'failed'     - none of the above worked
     The v2.8 fix only handled the iOS share path and silently swallowed the
     cancellation case, so on iPhone the export said "Rendering…" and then
     nothing happened if the user dismissed the share sheet. */
  return (async () => {
    try{
      if(iOSLike() && navigator.canShare){
        const f = new File([blob], name, {type: blob.type || 'application/octet-stream'});
        if(navigator.canShare({files: [f]})){
          try{ await navigator.share({files: [f]}); return 'shared'; }
          catch(e){ if(e && e.name === 'AbortError') return 'cancelled'; /* fall through */ }
        }
      }
    }catch(e){}
    try{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return 'downloaded';
    }catch(e){}
    /* v2.9: last-resort fallback - open in a new tab. On iOS the user can
       long-press the image and pick "Save to Photos" / "Save to Files". */
    try{
      const u = URL.createObjectURL(blob);
      window.open(u, '_blank');
      setTimeout(() => URL.revokeObjectURL(u), 60000);
      return 'opened';
    }catch(e){}
    return 'failed';
  })();
}
function safeName(s){ return String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Export'; }

/* v2.10: PNG preview sheet - the export button used to silently download the
   file. On desktop Chrome the file lands in Downloads with a small toast in
   the top-right corner, which most users missed - they said "Rendering… then
   nothing". Now the rendered PNG opens in a sheet so the user can actually
   SEE it, with a Download button (and an "Open in new tab" fallback) so the
   file is still saved. */
function pngPreviewSheet(blob, name){
  const url = URL.createObjectURL(blob);
  openSheet({
    title: 'Exported PNG',
    foot: false,
    body:
      '<div class="poster-view" style="max-height:68vh">' +
        '<img src="' + url + '" alt="Exported PNG" style="max-width:100%;border-radius:8px;box-shadow:var(--shadow)">' +
      '</div>' +
      '<div class="tiny faint" style="margin-top:8px;text-align:center">' + esc(name) + ' · ' + Math.round(blob.size / 1024) + ' KB</div>' +
      '<div class="row mt" style="gap:8px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn primary" data-dl>' + icon('down', 14) + ' Download</button>' +
        '<button class="btn ghost" data-tab>' + icon('ext', 14) + ' Open in new tab</button>' +
      '</div>',
    onMount(sh){
      $('[data-dl]', sh).addEventListener('click', () => {
        downloadBlob(blob, name).then(status => {
          if(status === 'shared' || status === 'downloaded') toast('PNG saved');
          else if(status === 'cancelled') toast('Share cancelled', false);
          else if(status === 'opened') toast('Opened in a new tab - long-press to save', false);
          else toast('Save failed - use Open in new tab', false);
        });
      });
      $('[data-tab]', sh).addEventListener('click', () => window.open(url, '_blank'));
      /* Browsers cache the image data after load, so revoking the blob URL
         after 60s is safe and frees memory. */
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  });
}

/* ---------- xlsx XML pieces ---------- */
const X_ESC = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
function colLetter(i){ let s = ''; while(i > 0){ s = String.fromCharCode(65 + (i - 1) % 26) + s; i = Math.floor((i - 1) / 26); } return s; }

const CT_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
'<Default Extension="xml" ContentType="application/xml"/>' +
'<Default Extension="png" ContentType="image/png"/>' +
'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
'{THEME}{SST}{SHEETS}{DRAWINGS}</Types>';
const RELS_ROOT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
/* STYLES_XML + THEME_XML are provided by p5_styles_xml.js (openpyxl-generated,
   proven to render identically in LibreOffice, Excel and Google Sheets). */

/* style ids: 1 title, 2 subtitle, 3 header, 4 body, 5 zebra, 6 wk, 7 wk-zebra,
   8 red, 9 red-zebra, 10 dates, 11 dates-zebra, 12 note, 13 note-zebra */
function buildSheetXml(sheet, pool){
  const cols = sheet.cols.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('');
  let rows = '';
  sheet.rows.forEach((r, ri) => {
    let cells = '';
    (r.cells || []).forEach(c => {
      if(c === null || c === undefined) return;
      const v = c.v;
      if(v === '' || v === null || v === undefined) return;   // skip empties
      const ref = colLetter(c.col) + (ri + 1);
      /* +1: the openpyxl-generated styles.xml has its own default xf at index 0,
         so our style k (0..13) lives at cellXfs index k+1 */
      const st = (c.s == null ? -1 : c.s) + 1;
      if(typeof v === 'number' && isFinite(v)){
        cells += '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>';
      } else {
        const key = String(v);
        if(!pool.has(key)) pool.set(key, pool.size);
        cells += '<c r="' + ref + '" t="s" s="' + st + '"><v>' + pool.get(key) + '</v></c>';
      }
    });
    rows += '<row r="' + (ri + 1) + '"' + (r.h ? ' ht="' + r.h + '" customHeight="1"' : '') + '>' + cells + '</row>';
  });
  let merges = '';
  if(sheet.merges && sheet.merges.length){
    merges = '<mergeCells count="' + sheet.merges.length + '">' + sheet.merges.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>';
  }
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="' + sheet.freeze + '" topLeftCell="A' + (sheet.freeze + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    '<cols>' + cols + '</cols>' +
    '<sheetData>' + rows + '</sheetData>' +
    merges +
    '<drawing r:id="rId1"/></worksheet>';
}
function buildDrawingXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<xdr:oneCellAnchor>' +
    '<xdr:from><xdr:col>0</xdr:col><xdr:colOff>38100</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:from>' +
    '<xdr:ext cx="1524000" cy="838200"/>' +
    '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1001" name="ASO logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
    '<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
    '<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>' +
    '<xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>';
}
function b64ToU8(b64){
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/* Build the workbook: sheets = [{name, rows, cols, merges, freeze}] */
function xlsxDownload(sheets, filename){
  const logoB64 = LOGO.split(',')[1];
  const pool = new Map();                        // shared strings (LibreOffice drops inlineStr styles)
  const sheetXmls = sheets.map(s => buildSheetXml(s, pool));
  const sst = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + pool.size + '" uniqueCount="' + pool.size + '">' +
    Array.from(pool.keys()).map(k => '<si><t xml:space="preserve">' + X_ESC(k) + '</t></si>').join('') + '</sst>';
  const files = [
    {name:'[Content_Types].xml', data: CT_XML
      .replace('{SHEETS}', sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join(''))
      .replace('{DRAWINGS}', sheets.map((s, i) => '<Override PartName="/xl/drawings/drawing' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>').join(''))
      .replace('{THEME}', '<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>')
      .replace('{SST}', '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>')},
    {name:'_rels/.rels', data: RELS_ROOT},
    {name:'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map((s, i) => '<sheet name="' + X_ESC(s.name.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') +
      '</sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
      '<Relationship Id="rId' + (sheets.length + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId' + (sheets.length + 3) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>'},
    {name:'xl/styles.xml', data: STYLES_XML},
    {name:'xl/theme/theme1.xml', data: THEME_XML},
    {name:'xl/sharedStrings.xml', data: sst},
    {name:'xl/media/image1.png', data: b64ToU8(logoB64)},
  ];
  sheets.forEach((s, i) => {
    files.push({name:'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXmls[i]});
    files.push({name:'xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing' + (i + 1) + '.xml"/></Relationships>'});
    files.push({name:'xl/drawings/drawing' + (i + 1) + '.xml', data: buildDrawingXml()});
    files.push({name:'xl/drawings/_rels/drawing' + (i + 1) + '.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>'});
  });
  downloadBlob(zipBuild(files), filename);
}

/* ---------- scheme sheet layout (matches the Schemes of Work template) ---------- */
function schemeSheetRows(lv){
  const n1 = s1Weeks();
  const HDR = ['Week', 'Dates', 'Theme', 'Objectives — by the end, students can…', 'Key language', 'Skills — L / S / R / W', 'Resources (Drive library)', 'Activities', 'Homework', 'Note'];
  const COLS = [2.5, 7, 12, 30, 40, 28, 26, 30, 32, 24, 22];
  const rows = [];
  const C = (col, v, s) => ({col, v, s});
  rows.push({cells: [C(1, ''), C(4, 'ELTASO — ' + lv.label + ' · Schemes of Work', 1)], h: 26});
  rows.push({cells: [C(1, ''), C(4, state.settings.institute + ' · ' + state.settings.year + ' · ' + lv.weeks.length + ' weeks · ' + (lv.cefr || '') + ' · exported from ELTASO Companion v' + APP_VERSION, 2)], h: 16});
  rows.push({cells: [], h: 6});
  rows.push({cells: [], h: 40});
  rows.push({cells: HDR.map((t, i) => C(i + 2, t, 3)), h: 30});
  lv.weeks.forEach((w, wi) => {
    const zebra = wi % 2 === 1;
    const assess = /assessment/i.test(w.theme || '') || /ASSESSMENT/i.test(noteFor(wi));
    const sBody = assess ? 8 : (zebra ? 5 : 4);
    const sWk = zebra ? 7 : 6;
    const sDate = zebra ? 11 : 10;
    const sNote = assess ? 12 : (zebra ? 13 : 12);
    const d = fmtD(weekMonday(wi), {day:'numeric', month:'short'});
    rows.push({cells: [
      C(1, ''),
      C(2, wi + 1, sWk),
      C(3, d, sDate),
      C(4, w.theme || '', assess ? 8 : (zebra ? 5 : 4)),
      C(5, w.obj || '', sBody),
      C(6, w.lang || '', sBody),
      C(7, skillsText(w), sBody),
      C(8, w.res || '', sBody),
      C(9, w.act || '', sBody),
      C(10, w.hw || '', sBody),
      C(11, noteFor(wi), sNote),
    ]});
  });
  return {name: lv.label, rows, cols: COLS, merges: ['D1:K1', 'D2:K2'], freeze: 5};
}

function exportLevelXlsx(lv){
  try{
    xlsxDownload([schemeSheetRows(lv)], 'ELTASO_' + safeName(lv.label) + '_Schemes_' + safeName(state.settings.year) + '.xlsx');
    toast('Excel exported');
  }catch(e){ console.error(e); toast('Export failed', false); }
}
function exportAllXlsx(){
  try{
    xlsxDownload(state.levels.map(lv => schemeSheetRows(lv)), 'ELTASO_All_Levels_Schemes_' + safeName(state.settings.year) + '.xlsx');
    toast('Excel exported — ' + state.levels.length + ' sheets');
  }catch(e){ console.error(e); toast('Export failed', false); }
}

/* ---------- Word (.doc) export — same brand template as the program documents ---------- */
function docTableRows(lv, off){
  let h = '';
  lv.weeks.forEach((w, i0) => {
    const wi = i0 + (off || 0);
    const assess = /assessment/i.test(w.theme || '') || /ASSESSMENT/i.test(noteFor(wi));
    const d = fmtD(weekMonday(wi), {day:'numeric', month:'short'});
    const note = noteFor(wi);
    h += '<tr>' +
      '<td class="wk">' + (wi + 1) + '</td>' +
      '<td style="text-align:center">' + d + '</td>' +
      '<td class="' + (assess ? 'red' : '') + '">' + X_ESC(w.theme || '') + '</td>' +
      '<td>' + X_ESC(w.obj || '') + '</td>' +
      '<td>' + X_ESC(w.lang || '') + '</td>' +
      '<td>' + X_ESC(skillsText(w)) + '</td>' +
      '<td>' + X_ESC(w.res || '') + '</td>' +
      '<td>' + X_ESC(w.act || '') + '</td>' +
      '<td>' + X_ESC(w.hw || '') + '</td>' +
      '<td class="note">' + X_ESC(note) + '</td></tr>';
  });
  return h;
}
function exportLevelDoc(lv){
  const n1 = s1Weeks();
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>ELTASO ' + X_ESC(lv.label) + ' Schemes of Work</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 {size:29.7cm 21.0cm; margin:1.4cm 1.4cm 1.4cm 1.4cm; mso-page-orientation:landscape;}' +
    'div.Section1 {page:Section1;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:9.5pt;color:#1C1C1E;}' +
    'h1{color:#1B2A55;font-size:19pt;margin:0 0 2pt 0;}' +
    'h2{color:#C1272D;font-size:13pt;margin:16pt 0 6pt 0;}' +
    '.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}' +
    'table.plan{border-collapse:collapse;width:100%;}' +
    'table.plan th{background:#1B2A55;color:white;font-size:9pt;padding:5px 6px;border:1px solid #1B2A55;text-align:left;}' +
    'table.plan td{border:1px solid #D9D9E0;padding:5px 6px;font-size:9pt;vertical-align:top;}' +
    'td.wk{font-weight:bold;color:#1B2A55;text-align:center;}' +
    'td.red{color:#C1272D;font-weight:bold;}' +
    'td.note{color:#8A6A00;font-weight:bold;}' +
    '</style></head><body><div class="Section1">' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr>' +
    '<td style="border:none;width:130px;padding:0;"><img src="' + LOGO + '" width="118" alt="American Space Oujda"></td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 10px;"><h1>ELTASO — ' + X_ESC(lv.label) + ' · Schemes of Work</h1>' +
    '<p class="sub">' + X_ESC(state.settings.institute) + ' · ' + X_ESC(state.settings.year) + ' · ' + lv.weeks.length + ' weeks · ' + X_ESC(lv.cefr || '') + ' · exported from ELTASO Companion v' + APP_VERSION + '</p></td>' +
    '</tr></table>' +
    '<h2>Semester 1 · Weeks 1–' + n1 + '</h2>' +
    '<table class="plan"><tr><th>Week</th><th>Dates</th><th>Theme</th><th>Objectives</th><th>Key language</th><th>Skills (L·S·R·W)</th><th>Resources (Drive)</th><th>Activities</th><th>Homework</th><th>Note</th></tr>' +
    docTableRows({weeks: lv.weeks.slice(0, n1)}, 0) + '</table>' +
    '<h2>Semester 2 · Weeks ' + (n1 + 1) + '–' + lv.weeks.length + '</h2>' +
    '<table class="plan"><tr><th>Week</th><th>Dates</th><th>Theme</th><th>Objectives</th><th>Key language</th><th>Skills (L·S·R·W)</th><th>Resources (Drive)</th><th>Activities</th><th>Homework</th><th>Note</th></tr>' +
    docTableRows({weeks: lv.weeks.slice(n1)}, n1) + '</table>' +
    '</div></body></html>';
  downloadBlob(new Blob(['\ufeff' + html], {type:'application/msword'}), 'ELTASO_' + safeName(lv.label) + '_Plan_' + safeName(state.settings.year) + '.doc');
  toast('Word exported');
}
function exportAllDoc(){
  const n1 = s1Weeks();
  let body = '';
  state.levels.forEach(lv => {
    body += '<h1 style="color:#1B2A55;font-size:17pt;margin:18pt 0 2pt 0;">ELTASO — ' + X_ESC(lv.label) + ' · Schemes of Work</h1>' +
      '<p class="sub">' + X_ESC(state.settings.institute) + ' · ' + X_ESC(state.settings.year) + ' · ' + X_ESC(lv.cefr || '') + '</p>' +
      '<table class="plan"><tr><th>Week</th><th>Dates</th><th>Theme</th><th>Objectives</th><th>Key language</th><th>Skills (L·S·R·W)</th><th>Resources (Drive)</th><th>Activities</th><th>Homework</th><th>Note</th></tr>' +
      docTableRows(lv, 0) + '</table>';
  });
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>ELTASO Schemes of Work</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 {size:29.7cm 21.0cm; margin:1.4cm 1.4cm 1.4cm 1.4cm; mso-page-orientation:landscape;}' +
    'div.Section1 {page:Section1;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:9.5pt;color:#1C1C1E;}' +
    'h1{color:#1B2A55;font-size:17pt;margin:18pt 0 2pt 0;}' +
    '.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}' +
    'table.plan{border-collapse:collapse;width:100%;}' +
    'table.plan th{background:#1B2A55;color:white;font-size:9pt;padding:5px 6px;border:1px solid #1B2A55;text-align:left;}' +
    'table.plan td{border:1px solid #D9D9E0;padding:5px 6px;font-size:9pt;vertical-align:top;}' +
    'td.wk{font-weight:bold;color:#1B2A55;text-align:center;}' +
    'td.red{color:#C1272D;font-weight:bold;}' +
    'td.note{color:#8A6A00;font-weight:bold;}' +
    '</style></head><body><div class="Section1">' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr>' +
    '<td style="border:none;width:130px;padding:0;"><img src="' + LOGO + '" width="118" alt="American Space Oujda"></td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 10px;"><h1 style="font-size:19pt;margin:0;">ELTASO · All Levels — Schemes of Work</h1>' +
    '<p class="sub">' + X_ESC(state.settings.institute) + ' · ' + X_ESC(state.settings.year) + ' · exported from ELTASO Companion v' + APP_VERSION + '</p></td>' +
    '</tr></table>' + body + '</div></body></html>';
  downloadBlob(new Blob(['\ufeff' + html], {type:'application/msword'}), 'ELTASO_All_Levels_Plan_' + safeName(state.settings.year) + '.doc');
  toast('Word exported — all levels');
}

/* ---------- Word (.doc) export: one detailed lesson plan for a single week.
   Written for a teacher who has never taught the class before: overview,
   staged plan with alternates, game bank, differentiation, homework, tips,
   checklist, and a "how to run this plan" survival guide. ---------- */
function exportWeekDoc(lv, wi){
  const w = lv.weeks[wi], p = w.lp;
  if(!p){ toast('No detailed lesson plan for this week yet', false); return; }
  const isKids = (lv.band === 'Kids' || lv.key.indexOf('kids') === 0);
  const dur = isKids ? '2 hours' : '90 minutes';
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
    '<tr><td class="stg">' + X_ESC(name) + '</td><td class="tm">' + X_ESC(tm) + '</td><td>' + X_ESC(main || '') +
    (alts && alts.length ? '<br><i class="alt">Also try: ' + alts.map(X_ESC).join(' · ') + '</i>' : '') + '</td></tr>';
  let stages =
    st('Hello & routine', T.hello, helloTxt) +
    st('Warm-up review', T.wu, p.wu, p.wuAlt) +
    st('Presentation', T.pres, p.pres, p.presAlt) +
    st('Practice (guided)', T.prac, p.prac, p.pracAlt) +
    st('Listening slot', T.ls, p.ls) +
    st('BREAK', T.brk, brkTxt) +
    st('Reactivation game', T.re, p.re) +
    st('Production task', T.prod, p.prod) +
    st('Reading & writing', T.rw, p.rw) +
    st('Story / song + goodbye', T.st, p.st);
  let extras = '';
  if(p.g && p.g.length){
    extras += '<h2>Game bank this week</h2><table class="plan">' +
      p.g.map(g => '<tr><td class="stg" style="width:26%">' + X_ESC(g[0]) + '</td><td>' + X_ESC(g[1]) + '</td></tr>').join('') + '</table>';
  }
  if(p.diff && p.diff.length){
    extras += '<h2>Differentiation — every child works</h2><ul class="li">' +
      p.diff.map(d => '<li>' + X_ESC(d) + '</li>').join('') + '</ul>';
  }
  if(p.hw && p.hw.length){
    extras += '<h2>Homework options (choose per class)</h2><ul class="li">' +
      p.hw.map(h => '<li>' + X_ESC(h) + '</li>').join('') + '</ul>';
  }
  if(p.tip){ extras += '<h2>Teacher tip</h2><p>' + X_ESC(p.tip) + '</p>'; }
  if(p.checklist && p.checklist.length){
    extras += '<h2>Assessment observation checklist (tick DURING play)</h2><table class="plan">' +
      '<tr><th>Can-do</th><th style="width:70px">Not yet</th><th style="width:70px">With help</th><th style="width:70px">Independently</th></tr>' +
      p.checklist.map(c => '<tr><td>' + X_ESC(c) + '</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td></tr>').join('') +
      '</table><p class="tiny">Tick during normal games, never as a table test. If a child freezes, observe again later.</p>';
  }
  /* New-teacher survival guide: generated for every week. */
  const guide =
    '<h2>New to teaching? How to run this plan</h2>' +
    '<table class="plan">' +
    '<tr><td class="stg" style="width:26%">Before class (10 min)</td><td>Read the whole plan once. Check the Materials line below and lay props out in order of use. Write the week theme + the target sentences where the class can see them.</td></tr>' +
    '<tr><td class="stg">Golden rules</td><td><b>Model before drill</b> (show it twice yourself), <b>pair before solo</b> (let them rehearse together), <b>name-swap</b> (call children by name, rotate who answers), and <b>end a game while they still want more</b>.</td></tr>' +
    '<tr><td class="stg">If an activity flops</td><td>Don\u2019t push a dying game past 2 minutes — switch to one of the <i>Also try</i> options inside that stage, or pull from the Game bank below.</td></tr>' +
    '<tr><td class="stg">If it finishes early</td><td>Play one more Game bank round, or re-run an earlier stage faster (speed round = instant extra 5 minutes).</td></tr>' +
    '<tr><td class="stg">If you run out of time</td><td>Cut from the middle (Practice / Reading &amp; writing), never from Production and the goodbye routine — the last 10 minutes are what children remember.</td></tr>' +
    '<tr><td class="stg">If the class is noisy</td><td>Use the agreed attention signal, wait for full silence before speaking, drop your voice instead of raising it.</td></tr>' +
    '<tr><td class="stg">Mixed levels</td><td>See the Differentiation section: pair stronger with quieter learners for support tasks, and keep stretch tasks ready for fast finishers.</td></tr>' +
    '</table>';
  const resLine = (w.res || '') + (w.urls && w.urls.length ? '<br>Drive: ' + w.urls.map(u => '<a href="' + X_ESC(u) + '">' + X_ESC(u) + '</a>').join('<br>') : '');
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8"><title>ELTASO ' + X_ESC(lv.label) + ' — Week ' + (wi + 1) + ' lesson plan</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page Section1 {size:21.0cm 29.7cm; margin:1.6cm 1.6cm 1.6cm 1.6cm;}' +
    'div.Section1 {page:Section1;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#1C1C1E;}' +
    'h1{color:#1B2A55;font-size:17pt;margin:0 0 2pt 0;}' +
    'h2{color:#C1272D;font-size:12.5pt;margin:14pt 0 5pt 0;}' +
    '.sub{color:#6E6E73;font-size:10pt;margin:0 0 8pt 0;}' +
    '.tiny{color:#6E6E73;font-size:8.5pt;}' +
    'table.plan{border-collapse:collapse;width:100%;margin-bottom:4pt;}' +
    'table.plan th{background:#1B2A55;color:white;font-size:9.5pt;padding:5px 7px;border:1px solid #1B2A55;text-align:left;}' +
    'table.plan td{border:1px solid #D9D9E0;padding:5px 7px;font-size:10pt;vertical-align:top;}' +
    'td.stg{font-weight:bold;color:#1B2A55;}' +
    'td.tm{color:#C1272D;white-space:nowrap;}' +
    '.alt{color:#6E6E73;font-size:9pt;}' +
    'ul.li{margin:4pt 0 8pt 18pt;padding:0;} ul.li li{margin-bottom:3pt;}' +
    '</style></head><body><div class="Section1">' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:6pt;"><tr>' +
    '<td style="border:none;width:130px;padding:0;"><img src="' + LOGO + '" width="118" alt="American Space Oujda"></td>' +
    '<td style="border:none;vertical-align:middle;padding:0 0 0 10px;"><h1>Week ' + (wi + 1) + ' · ' + X_ESC(w.theme || '') + '</h1>' +
    '<p class="sub">ELTASO · ' + X_ESC(lv.label) + ' (' + X_ESC(lv.cefr || '') + ') · ' + X_ESC(state.settings.institute) + ' · ' + X_ESC(state.settings.year) + ' · lesson of ' + X_ESC(fmtD(weekMonday(wi))) + ' · ' + dur + '</p></td>' +
    '</tr></table>' +
    '<table class="plan">' +
    '<tr><td class="stg" style="width:26%">By the end, students can</td><td>' + X_ESC(w.obj || '') + '</td></tr>' +
    '<tr><td class="stg">Target language</td><td>' + X_ESC(w.lang || '') + '</td></tr>' +
    '<tr><td class="stg">Skills focus (L·S·R·W)</td><td>' + X_ESC(skillsText(w)) + '</td></tr>' +
    '<tr><td class="stg">Materials &amp; resources</td><td>' + resLine + '</td></tr>' +
    ((noteFor(wi)) ? '<tr><td class="stg">Calendar note</td><td>' + X_ESC(noteFor(wi)) + '</td></tr>' : '') +
    '</table>' +
    '<h2>Lesson plan · ' + dur + '</h2>' +
    '<table class="plan"><tr><th style="width:20%">Stage</th><th style="width:11%">Time</th><th>What happens</th></tr>' + stages + '</table>' +
    extras + guide +
    '<p class="tiny" style="margin-top:14pt">ELTASO Companion v' + X_ESC(APP_VERSION) + ' · ' + X_ESC(state.settings.institute) + ' · ' + X_ESC(fmtD(new Date(), {day:'numeric', month:'long', year:'numeric'})) + '</p>' +
    '</div></body></html>';
  downloadBlob(new Blob(['\ufeff' + html], {type:'application/msword'}), 'ELTASO_' + safeName(lv.label) + '_W' + String(wi + 1).padStart(2, '0') + '_' + safeName(w.theme || '') + '.doc');
  toast('Word lesson plan exported');
}

/* ---------- app update ---------- */
function installDataUpdate(parsed){
  if(parsed && parsed.eltaso_update && parsed.v === 1){
    ['levels','classes','team','library','notes','clubs','volunteers'].forEach(k => { if(Array.isArray(parsed[k])) state[k] = parsed[k]; });
    if(parsed.settings && typeof parsed.settings === 'object') Object.assign(state.settings, parsed.settings);
  } else if(parsed && parsed.v === 1 && Array.isArray(parsed.levels) && parsed.settings){
    state = parsed;                       // full backup file = full restore
  } else {
    return false;
  }
  if(!state.settings.updUrl) state.settings.updUrl = state.rootUrl || '';
  migrateLevels(state, true);
  migrateSkills(state, true);
  migrateLpIntern(state, true);                /* four-skills plan + full Drive library (v1.4) */               /* expand old 4-level program to 9 band tiers */
  const keys = state.levels.map(l => l.key);
  Object.keys(state.prep).forEach(k => { if(keys.indexOf(k.split(':')[0]) === -1) delete state.prep[k]; });
  lvSeg = 0; lvOpen.clear();
  save(); applyTheme(); navHTML(); render();
  return true;
}

/* ================= PNG exports (v1.7 + v2.1 A4 edition) ================= */
const TONE_PNG = [
  ['rgba(11,92,230,.16)', '#0A54C4'],
  ['rgba(255,149,0,.20)', '#A85700'],
  ['rgba(52,199,89,.18)', '#1E7A3A'],
  ['rgba(175,82,222,.15)', '#8E44B3'],
  ['rgba(88,86,214,.15)', '#4A48B8'],
  ['rgba(255,45,85,.14)', '#C81E45'],
  ['rgba(48,176,199,.17)', '#0F7A8C'],
  ['rgba(255,204,0,.22)', '#8A6D00'],
  ['rgba(120,120,128,.18)', '#5A5A66']
];
function toneIdx(label){
  let i = state.levels.findIndex(l => l.label === label);
  if(i < 0){ const str = String(label || '?'); let h = 0; for(let k = 0; k < str.length; k++) h = (h * 31 + str.charCodeAt(k)) >>> 0; i = h; }
  return i % 9;
}
function clubToneIdx(id){
  let i = (state.clubs || []).findIndex(c => c.id === id);
  if(i < 0){ i = 0; const str = String(id || ''); for(let k = 0; k < str.length; k++) i += str.charCodeAt(k); }
  return i % 9;
}
function roomFloor(room){ /* v2.6: the four ASO spaces carry their real floor */
  return venueFloor(room);
}
function roomsLine(){ /* v2.6: the building itself, printed on every export */
  let line = 'ASO spaces \u2014 ' + ASO_VENUES.map(v => v.name + ': ' + v.short).join(' \u00b7 ');
  const extras = [];
  [].concat(state.classes || [], state.clubs || []).forEach(c => { if(c.room && !venueKnown(c.room) && extras.indexOf(c.room) < 0) extras.push(c.room); });
  (state.events || []).forEach(e => { if(e.place && !venueKnown(e.place) && extras.indexOf(e.place) < 0) extras.push(e.place); });
  if(extras.length) line += ' \u00b7 Also: ' + extras.join(' \u00b7 ');
  return line;
}
function loadLogo(){
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = LOGO;
  });
}
function gridDataFrom(list, isClubs){
  const slots = [], seen = {};
  list.forEach(c => { const s = parseSlot(c.time); if(!seen[s.k]){ seen[s.k] = 1; slots.push(s); } });
  slots.sort((a, b) => a.mins - b.mins || a.label.localeCompare(b.label));
  const cells = {};
  slots.forEach(sl => { cells[sl.k] = {}; DAY_KEYS.forEach(d => cells[sl.k][d] = []); });
  const counters = {};
  let maxChips = 1;
  list.forEach(c => {
    const s = parseSlot(c.time);
    (c.days || []).forEach(d => {
      let top, main, meta, tone, icon;
      if(c.isEvent){ /* v2.9: events get a fixed gold tone + a calendar icon,
                        so they read distinctly from the club chips in the grid. */
        top = '';
        main = c.name || '';
        meta = c.room || '';
        tone = 7; /* gold - same as the "Events" legend entry */
        icon = 'calendar';
      } else if(isClubs){
        top = '';
        main = c.name || '';
        meta = [c.lead ? c.lead : '\u26a0 needs a lead', c.room].filter(Boolean).join(' \u00b7 ');
        tone = clubToneIdx(c.id);
        icon = clubIconKind(c); /* v2.7: theme icon rides along, drawn when themed */
      } else {
        counters[c.level] = (counters[c.level] || 0) + 1;
        top = c.level + ' \u00b7 ' + counters[c.level];
        main = [c.teacher, c.room].filter(Boolean).join(' \u00b7 ');
        meta = '';
        tone = toneIdx(c.level);
      }
      cells[s.k][d].push({tone, top, main, meta, icon, isEvent: !!c.isEvent});
      maxChips = Math.max(maxChips, cells[s.k][d].length);
    });
  });
  return {slots, cells, maxChips};
}
function rrPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function clipTo(ctx, t, w){
  const s = String(t == null ? '' : t);
  if(ctx.measureText(s).width <= w) return s;
  while(s.length > 1 && ctx.measureText(s + '\u2026').width > w) s = s.slice(0, -1);
  return s + '\u2026';
}
const FONT_PNG = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
/* v2.7: club themes - every club gets a drawn icon matching its theme */
function clubIconKind(c){
  const s = ((c.name || '') + ' ' + (c.desc || '')).toLowerCase();
  const has = a => a.some(k => s.indexOf(k) > -1);
  if(has(['chess'])) return 'chess';
  if(has(['code', 'coding', 'robot', 'tech', 'stem', 'science', 'math'])) return 'science';
  if(has(['book', 'read', 'story', 'literat', 'poetry'])) return 'book';
  if(has(['movie', 'film', 'cinema'])) return 'film';
  if(has(['debate', 'talk', 'conversation', 'speech', 'toast'])) return 'mic';
  if(has(['art', 'draw', 'paint', 'design', 'craft'])) return 'art';
  if(has(['music', 'song', 'sing', 'guitar', 'choir'])) return 'music';
  if(has(['writ', 'journal'])) return 'pen';
  if(has(['game', 'gam', 'esport'])) return 'game';
  if(has(['homework', 'tutor', 'study', 'help'])) return 'study';
  return 'star';
}
function drawThemeIcon(ctx, kind, x, y, col){
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const L = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  const C = (a, b, r, fill) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); fill ? ctx.fill() : ctx.stroke(); };
  if(kind === 'star'){
    ctx.beginPath();
    for(let i = 0; i < 10; i++){
      const r = i % 2 ? 2.8 : 6.5, a = -Math.PI / 2 + i * Math.PI / 5;
      const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  } else if(kind === 'book'){
    L(x, y - 6, x - 7, y - 4); L(x - 7, y - 4, x - 7, y + 6); L(x - 7, y + 6, x, y + 4);
    L(x, y - 6, x + 7, y - 4); L(x + 7, y - 4, x + 7, y + 6); L(x + 7, y + 6, x, y + 4);
  } else if(kind === 'film'){
    ctx.strokeRect(x - 7, y - 5.5, 14, 11);
    C(x - 4, y - 2.5, 1, true); C(x - 4, y + 1.5, 1, true); C(x + 4, y - 2.5, 1, true); C(x + 4, y + 1.5, 1, true);
  } else if(kind === 'mic'){
    C(x, y - 3, 3);
    ctx.beginPath(); ctx.arc(x, y - 3, 5.5, 0.5, Math.PI - 0.5); ctx.stroke();
    L(x, y + 2, x, y + 6); L(x - 3.5, y + 6, x + 3.5, y + 6);
  } else if(kind === 'chess'){
    C(x, y - 3.5, 2.8);
    L(x - 1.6, y - 1.5, x - 3.5, y + 3); L(x + 1.6, y - 1.5, x + 3.5, y + 3);
    L(x - 5.5, y + 5.5, x + 5.5, y + 5.5);
  } else if(kind === 'science'){
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 7); ctx.lineTo(x - 2, y - 2); ctx.lineTo(x - 6, y + 5.5);
    ctx.lineTo(x + 6, y + 5.5); ctx.lineTo(x + 2, y - 2); ctx.lineTo(x + 2, y - 7);
    ctx.stroke(); L(x - 3.5, y - 7, x + 3.5, y - 7);
  } else if(kind === 'art'){
    L(x - 6, y + 6, x + 6, y - 6);
    ctx.beginPath(); ctx.moveTo(x - 7.5, y + 7.5); ctx.lineTo(x - 6.2, y + 4); ctx.lineTo(x - 4, y + 6.2); ctx.closePath(); ctx.stroke();
  } else if(kind === 'music'){
    C(x - 3, y + 4.5, 2.1, true);
    L(x - 1, y + 4.5, x - 1, y - 6);
    ctx.beginPath(); ctx.moveTo(x - 1, y - 6); ctx.quadraticCurveTo(x + 3, y - 5, x + 5, y - 2.5); ctx.stroke();
  } else if(kind === 'game'){
    ctx.strokeRect(x - 6, y - 6, 12, 12);
    C(x - 2.5, y - 2.5, 1, true); C(x, y, 1, true); C(x + 2.5, y + 2.5, 1, true);
  } else if(kind === 'pen'){
    L(x - 6, y + 6, x + 6, y - 6);
    C(x - 6, y + 6, 1.2, true);
    L(x + 3, y - 3, x + 6, y - 6);
  } else if(kind === 'study'){
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 7.5, y - 1.5); ctx.lineTo(x, y + 3); ctx.lineTo(x - 7.5, y - 1.5); ctx.closePath(); ctx.stroke();
    L(x, y + 3, x, y + 6.5); C(x, y + 7.3, 0.9, true);
  } else if(kind === 'calendar'){ /* v2.9: recurring events in the clubs & events grid */
    ctx.strokeRect(x - 7, y - 6, 14, 12);
    L(x - 7, y - 2.5, x + 7, y - 2.5);
    L(x - 4, y - 6, x - 4, y - 8); L(x + 4, y - 6, x + 4, y - 8);
    /* a small dot in the body, like a single marked day */
    C(x + 2.5, y + 1, 0.9, true);
  }
}
function drawChipRow(ctx, c, cx, cy, cw, chipH, compact, themed){
  const tone = TONE_PNG[c.tone] || TONE_PNG[0];
  ctx.fillStyle = tone[0];
  rrPath(ctx, cx, cy, cw, chipH, Math.min(10, chipH / 2));
  ctx.fill();
  if(themed && c.icon){ /* v2.7: theme icon in a coloured disc, text shifted right */
    ctx.fillStyle = tone[1];
    ctx.beginPath(); ctx.arc(cx + 15, cy + chipH / 2, 10.5, 0, 7); ctx.fill();
    drawThemeIcon(ctx, c.icon, cx + 15, cy + chipH / 2, '#FFFFFF');
    /* v2.12: drawThemeIcon sets ctx.fillStyle = '#FFFFFF' for the icon, so
       we MUST reset fillStyle to the dark accent tone[1] before drawing the
       text - otherwise the text comes out white on the light pastel chip
       background and is unreadable. */
    ctx.fillStyle = tone[1];
    if(c.main){
      ctx.font = (compact ? '800 11.5px ' : '800 13px ') + FONT_PNG;
      ctx.fillText(clipTo(ctx, c.main, cw - 46), cx + 31, compact ? cy + chipH / 2 + 4 : cy + 21);
    }
    if(c.meta && !compact){
      ctx.font = '600 10.5px ' + FONT_PNG;
      ctx.globalAlpha = .78;
      ctx.fillText(clipTo(ctx, c.meta, cw - 42), cx + 31, cy + 37);
      ctx.globalAlpha = 1;
    }
    return;
  }
  ctx.fillStyle = tone[1];
  ctx.beginPath(); ctx.arc(cx + 13, cy + 13, 3.5, 0, 7); ctx.fill();
  let used = 0;
  if(c.top && !compact){
    ctx.font = '600 10.5px ' + FONT_PNG;
    ctx.globalAlpha = .85;
    ctx.fillText(clipTo(ctx, c.top, cw - 36), cx + 22, cy + 16);
    ctx.globalAlpha = 1;
    used = 1;
  }
  if(c.main){
    ctx.font = (compact ? '800 11.5px ' : '800 13px ') + FONT_PNG;
    ctx.fillText(clipTo(ctx, c.main, cw - 20), cx + 10, compact ? cy + chipH / 2 + 4 : cy + (used ? 35 : 21));
  }
  if(c.meta && !compact){
    let m = c.meta;
    if(ctx.measureText(m).width > cw - 22){
      ctx.font = '600 10px ' + FONT_PNG;
    } else {
      ctx.font = '600 10.5px ' + FONT_PNG;
    }
    ctx.globalAlpha = .78;
    ctx.fillText(clipTo(ctx, m, cw - 22), cx + 10, cy + (used ? 51 : 37));
    ctx.globalAlpha = 1;
  }
}
function pngHeader(ctx, o, W, withDates){
  /* logo + title lockup, returns header bottom y */
  const logo = o.logo;
  let x = 56;
  if(logo){
    const h = 64, w = h * (logo.width / logo.height);
    ctx.drawImage(logo, x, 26, w, h);
    x += w + 22;
  } else x += 8;
  ctx.fillStyle = '#1C1C1E';
  ctx.font = '800 30px ' + FONT_PNG;
  ctx.fillText(o.title, x, 62);
  ctx.fillStyle = '#66666E';
  ctx.font = '500 15px ' + FONT_PNG;
  ctx.fillText(o.subtitle, x, 88);
  return 118;
}
function drawGrid(ctx, o, W, ty, TIMEW, TH, rowH, chipH, compact){
  const PAD = 56;
  const dw = (W - PAD * 2 - TIMEW) / 7;
  /* head row */
  ctx.fillStyle = '#1C1C1E';
  ctx.font = '700 16px ' + FONT_PNG;
  ctx.textAlign = 'center';
  DAY_KEYS.forEach((d, i) => {
    ctx.fillText(d, PAD + TIMEW + i * dw + dw / 2, ty + TH / 2 + 6);
  });
  ctx.strokeStyle = 'rgba(60,60,67,.18)';
  ctx.beginPath(); ctx.moveTo(PAD, ty + TH + .5); ctx.lineTo(W - PAD, ty + TH + .5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD, ty + .5); ctx.lineTo(W - PAD, ty + .5); ctx.stroke();
  ctx.textAlign = 'left';
  /* rows */
  o.slots.forEach((slot, r) => {
    const y = ty + TH + r * rowH;
    if(compact && r % 2 === 1){
      ctx.fillStyle = 'rgba(120,120,128,.055)';
      ctx.fillRect(PAD + 1, y, W - PAD * 2 - 2, rowH);
    }
    if(r > 0){
      ctx.strokeStyle = 'rgba(60,60,67,.07)';
      ctx.beginPath(); ctx.moveTo(PAD, y + .5); ctx.lineTo(W - PAD, y + .5); ctx.stroke();
    }
    /* time label - compact 24h, one line, inside its column */
    ctx.textAlign = 'center';
    ctx.fillStyle = '#66666E';
    ctx.font = (compact ? '700 10px ' : '700 12.5px ') + FONT_PNG;
    ctx.fillText(clipTo(ctx, slot.label || '', TIMEW - 8), PAD + TIMEW / 2, y + rowH / 2 + 4);
    ctx.textAlign = 'left';
    for(let d = 0; d < 7; d++){
      const x = PAD + TIMEW + d * dw;
      const chips = (o.cells[slot.k] && o.cells[slot.k][DAY_KEYS[d]]) || [];
      const n = compact ? Math.min(chips.length, o.maxChips) : chips.length;
      const stack = n * (chipH + 6) - 6;
      let cy = y + Math.max(6, Math.floor((rowH - stack) / 2));
      chips.slice(0, compact ? o.maxChips : chips.length).forEach(c => {
        drawChipRow(ctx, c, x + 8, cy, dw - 16, chipH, compact, o.themed);
        cy += chipH + 6;
      });
    }
  });
  return ty + TH + o.slots.length * rowH;
}
function drawLegend(ctx, o, W, y, center){
  const PAD = 56;
  ctx.font = '600 12px ' + FONT_PNG;
  const items = o.legend.map(l => ({w: 20 + ctx.measureText(l.label).width, l}));
  const total = items.reduce((m, i) => m + i.w + 24, -24);
  let x = center ? Math.max(PAD, (W - total) / 2) : PAD;
  ctx.textAlign = 'left';
  items.forEach(i => {
    ctx.fillStyle = TONE_PNG[i.l.tone][1];
    ctx.beginPath(); ctx.arc(x + 4, y - 4, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#66666E';
    ctx.fillText(i.l.label, x + 14, y);
    x += i.w + 24;
  });
  return y + 12;
}
/* v2.4: HD - every PNG renders at 2x (3508px wide), crisp on screens, projectors and print.
   The A4 print edition is retired: one format, one click. */
async function renderTimetablePNG(o){
  const logo = await loadLogo();
  const SCALE = 2;
  const W = 1754;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  o.logo = logo;
  {
    const TIMEW = 112, TH = 54, chipH = 48;
    const rowH = Math.max(104, o.maxChips * (chipH + 6) + 16);
    const HEADH = 118;
    const legendY = HEADH + TH + o.slots.length * rowH + 30;
    const roomsH = o.rooms ? 40 : 0;
    const H = legendY + 20 + roomsH + 10;
    cv.width = W * SCALE; cv.height = H * SCALE;
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    const headB = pngHeader(ctx, o, W);
    const endY = drawGrid(ctx, o, W, headB, TIMEW, TH, rowH, chipH, false);
    let y = Math.max(legendY, endY + 30);
    y = drawLegend(ctx, o, W, y, false);
    if(o.rooms){
      ctx.fillStyle = '#A6A6AD';
      ctx.font = '500 12px ' + FONT_PNG;
      ctx.fillText(o.rooms, 56, y + 10);
    }
  }
  return await new Promise(res => cv.toBlob(res, 'image/png'));
}
function pngExportName(kind){
  const year = safeName(state.settings.year || '');
  const p = kind === 'sched' ? 'ELTASO_Weekly_Program_'
    : kind === 'clubsIcons' ? 'ASO_Clubs_Events_Weekly_Icons_' : 'ASO_Clubs_Events_Weekly_';
  return p + year + '_HD.png';
}
/* v2.9: weekly recurring events belong in the weekly grid alongside clubs.
   One-time events (recur='none' with a date) are skipped - they don't fit a
   day-of-week grid. The fake "club" objects we emit are tagged with isEvent
   so gridDataFrom can colour them gold and give them a calendar icon. */
function eventsAsClubsLike(){
  return (state.events || [])
    .filter(e => e.recur === 'weekly' && e.day && e.time)
    .map(e => ({
      id: 'ev:' + e.id,
      name: e.title || 'Event',
      desc: e.desc || '',
      days: [e.day],
      time: e.time,
      room: e.place || '',
      lead: '',
      isEvent: true
    }));
}
async function runPngExport(kind, data){
  const isSched = kind === 'sched';
  const year = state.settings.year || '';
  const weeklyEvents = eventsAsClubsLike();
  const o = {
    title: isSched ? 'ELTASO \u2014 Weekly Program' : 'ASO \u2014 Clubs & Events',
    subtitle: isSched
      ? state.settings.institute + ' \u00b7 ' + year + ' \u00b7 ' + (state.classes || []).length + ' classes \u00b7 ' + data.slots.length + ' time slots'
      : state.settings.institute + ' \u00b7 ' + year + ' \u00b7 ' + (state.clubs || []).length + ' clubs \u00b7 ' +
        (state.clubs || []).reduce((n, c) => n + (c.days || []).length, 0) + ' sessions / week' +
        (weeklyEvents.length ? ' \u00b7 ' + weeklyEvents.length + ' weekly event' + (weeklyEvents.length === 1 ? '' : 's') : '') +
        (kind === 'clubsIcons' ? ' \u00b7 each club with its theme icon' : ''),
    slots: data.slots, cells: data.cells, maxChips: data.maxChips,
    legend: isSched
      ? (function(){ /* v2.2: PNG legend = levels actually used */ const used = []; state.classes.forEach(c => { if(c.level && used.indexOf(c.level) === -1) used.push(c.level); }); return used.map(l => ({tone: toneIdx(l), label: l})); })()
      : (state.clubs || []).map(c => ({tone: clubToneIdx(c.id), label: c.name}))
        .concat(weeklyEvents.length ? [{tone: 7, label: 'Events'}] : []), /* v2.9 */
    rooms: roomsLine(),
    themed: kind === 'clubsIcons' /* v2.7 */
  };
  toast('Rendering the PNG\u2026');
  const blob = await renderTimetablePNG(o);
  if(!blob){ toast('Export failed - try again', false); return; }
  /* v2.10: show the PNG in a preview sheet so the user can actually see it.
     The sheet has its own Download button (which goes through downloadBlob
     and shows accurate feedback). Old behaviour: silently download the
     file to the Downloads folder, which users missed. */
  pngPreviewSheet(blob, pngExportName(kind));
}
/* v2.4: one click, one HD PNG - no chooser sheet anymore */
function exportPng(kind){
  const isSched = kind === 'sched';
  let list;
  if(isSched){
    list = (state.classes || []);
  } else {
    /* v2.9: include weekly recurring events in the clubs & events grid */
    list = (state.clubs || []).filter(c => (c.days || []).length && c.time).concat(eventsAsClubsLike());
  }
  runPngExport(kind, gridDataFrom(list, !isSched));
}
