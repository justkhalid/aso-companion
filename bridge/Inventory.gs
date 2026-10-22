/* ASO Companion: inventory bridge for Google Sheets.
   Paste this into the Sheet's own Apps Script project (Extensions > Apps Script), run setup() once, deploy as a web app.
   It adds ONE tab, "Inventory", and a private Drive folder "ASO Inventory photos". It never touches any other tab. */

const TAB = 'Inventory';
const FIELDS = ['code', 'barcode', 'type', 'name', 'by', 'model', 'serial', 'category', 'room', 'shelf', 'copies', 'condition', 'status', 'lentTo', 'lentAt', 'year', 'notes', 'hasPhoto', 'addedAt', 'updatedAt'];
const HEAD = ['Number', 'Barcode', 'Type', 'Name', 'Author or brand', 'Model', 'Serial number', 'Category', 'Room', 'Shelf', 'Copies', 'Condition', 'Status', 'Lent to (member)', 'Lent on', 'Year', 'Notes', 'Photo', 'Added', 'Changed'];

function setup() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    props.setProperty('KEY', key);
  }
  tab_();
  folder_();
  Logger.log('Setup done. Your app key is:  ' + key);
}

function book_() { return SpreadsheetApp.getActive(); }

function tab_() {
  const b = book_();
  let s = b.getSheetByName(TAB);
  if (!s) {
    s = b.insertSheet(TAB);
    s.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
    s.setFrozenRows(1);
    // codes, barcodes and member numbers are text, so a leading zero or a long number is never changed
    s.getRange(2, 1, s.getMaxRows() - 1, 2).setNumberFormat('@');
    s.getRange(2, 14, s.getMaxRows() - 1, 1).setNumberFormat('@');
  }
  return s;
}

function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PHOTOS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* made again below */ } }
  const f = DriveApp.createFolder('ASO Inventory photos');
  props.setProperty('PHOTOS', f.getId());
  return f;
}

function doGet(e) { return reply_(e.parameter || {}); }
function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return out_({ error: 'Bad request.' }); }
  return reply_(p);
}

function reply_(p) {
  const key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || p.key !== key) return out_({ error: 'Wrong app key.' });
  try {
    switch (p.action) {
      case 'list': return out_(list_());
      case 'upsert': return out_(locked_(function () { return upsert_(p.item); }));
      case 'delete': return out_(locked_(function () { return delete_(String(p.code)); }));
      case 'photo': return out_(p.dataUrl ? locked_(function () { return savePhoto_(String(p.code), String(p.dataUrl)); }) : getPhoto_(String(p.code)));
      default: return out_({ error: 'Unknown action.' });
    }
  } catch (err) {
    return out_({ error: String(err && err.message || err) });
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function locked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function iso_(v) { return v instanceof Date ? v.toISOString() : String(v == null ? '' : v); }

function list_() {
  const s = tab_();
  const n = s.getLastRow() - 1;
  if (n < 1) return { fields: FIELDS, rows: [] };
  const vals = s.getRange(2, 1, n, FIELDS.length).getValues();
  const rows = vals.filter(function (r) { return String(r[0]).trim() !== ''; }).map(function (r) {
    return r.map(function (v, i) {
      if (FIELDS[i] === 'hasPhoto') return v === true || v === 'yes' || v === 'Yes';
      if (FIELDS[i] === 'copies') return Number(v) || 1;
      return iso_(v);
    });
  });
  return { fields: FIELDS, rows: rows };
}

function rowOf_(s, code) {
  const n = s.getLastRow() - 1;
  if (n < 1) return -1;
  const codes = s.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < codes.length; i++) if (String(codes[i][0]).trim() === code) return i + 2;
  return -1;
}

function upsert_(item) {
  if (!item || !/^9\d{6}$/.test(String(item.code))) throw new Error('The item number is not valid.');
  const s = tab_();
  const row = FIELDS.map(function (f) {
    const v = item[f];
    if (f === 'hasPhoto') return v ? 'yes' : '';
    return v == null ? '' : v;
  });
  let r = rowOf_(s, String(item.code));
  if (r < 0) r = Math.max(2, s.getLastRow() + 1);
  s.getRange(r, 1, 1, FIELDS.length).setNumberFormat('@').setValues([row.map(function (v, i) { return FIELDS[i] === 'copies' ? v : String(v); })]);
  s.getRange(r, FIELDS.indexOf('copies') + 1).setNumberFormat('0').setValue(Number(item.copies) || 1);
  return { ok: true };
}

function delete_(code) {
  const s = tab_();
  const r = rowOf_(s, code);
  if (r > 0) s.deleteRow(r);
  const files = folder_().getFilesByName(code + '.jpg');
  while (files.hasNext()) files.next().setTrashed(true);
  return { ok: true };
}

function savePhoto_(code, dataUrl) {
  const m = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) throw new Error('The photo is not valid.');
  const f = folder_();
  const old = f.getFilesByName(code + '.jpg');
  while (old.hasNext()) old.next().setTrashed(true);
  f.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], code + '.jpg'));
  return { ok: true };
}

function getPhoto_(code) {
  const files = folder_().getFilesByName(code + '.jpg');
  if (!files.hasNext()) return { dataUrl: '' };
  const b = files.next().getBlob();
  return { dataUrl: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}
