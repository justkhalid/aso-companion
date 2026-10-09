/* ================= Editors: week / level / WhatsApp ================= */

const APP_VERSION = '2.8.0';

function weekSheet(lv, wi){
  const w = lv.weeks[wi];
  openSheet({
    title: 'Edit Week ' + (wi + 1) + ' · ' + lv.label,
    body: fText('theme', 'Theme', w.theme, 'What is the week about?') +
      fArea('obj', 'Objectives — by the end, students can…', w.obj, 'say hello…; follow instructions…', 3) +
      fArea('lang', 'Key language', w.lang, 'Phrases, vocab, structures', 2) +
      '<div class="flabel" style="margin:6px 0 0">Four skills this week</div>' +
      fArea('skillL', 'Listening focus', (w.skills && w.skills.L) || '', 'e.g. Listening folder: cafe dialogues - order and confirm', 2) +
      fArea('skillS', 'Speaking focus', (w.skills && w.skills.S) || '', 'e.g. cafe roleplay: order, ask and pay politely', 2) +
      fArea('skillR', 'Reading focus', (w.skills && w.skills.R) || '', 'e.g. read a menu; match dishes to sections', 2) +
      fArea('skillW', 'Writing focus', (w.skills && w.skills.W) || '', 'e.g. write my own cafe dialogue (6 lines)', 2) +
      fArea('res', 'Resources (text)', w.res, 'e.g. Lesson Plans/Food; Flashcards/Food', 2) +
      linksEditor(w.urls) +
      fArea('act', 'Activities', w.act, 'What happens in class?', 3) +
      fArea('hw', 'Homework', w.hw, 'e.g. teach the song to someone at home', 2) +
      '<div class="divider"></div>' +
      '<button class="btn danger-soft" data-delwk style="width:100%">' + icon('trash', 14) + ' Delete this week</button>',
    onMount(sh){ mountLinksEditor(sh); },
    onSave(sh, close){
      const v = collectForm(sh);
      w.theme = v.theme; w.obj = v.obj; w.lang = v.lang; w.res = v.res; w.act = v.act; w.hw = v.hw;
      w.skills = {L: v.skillL || '', S: v.skillS || '', R: v.skillR || '', W: v.skillW || ''};
      w.urls = collectLinks(sh);
      save(); close(); render(); toast('Week ' + (wi + 1) + ' saved');
    }
  });
  const entry = sheetStack[sheetStack.length - 1];
  const delBtn = $('[data-delwk]', entry.ov);
  if(delBtn) delBtn.addEventListener('click', () => {
    openConfirm({title:'Delete Week ' + (wi + 1) + '?', msg:'Its content will be removed and later weeks shift up by one.', okLabel:'Delete week', danger:true,
      onOk(){
        lv.weeks.splice(wi, 1); lvOpen.clear(); save(); entry.close(); render(); toast('Week deleted');
      }});
  });
}

function levelSheet(lv){
  openSheet({
    title: 'Edit level',
    body: fText('label', 'Name', lv.label) +
      fText('cefr', 'CEFR level', lv.cefr, 'Pre-A1') +
      '<div class="divider"></div>' +
      '<div class="small muted mb-s">Deleting a level removes its ' + lv.weeks.length + ' weeks. Classes pointing to it keep their level label as plain text.</div>' +
      '<button class="btn danger-soft" data-dellv style="width:100%">' + icon('trash', 14) + ' Delete this level</button>',
    onSave(sh, close){
      const v = collectForm(sh);
      if(!v.label){ toast('Name is required', false); return; }
      lv.label = v.label; lv.cefr = v.cefr;
      save(); close(); navHTML(); render(); toast('Level saved');
    }
  });
  const entry = sheetStack[sheetStack.length - 1];
  const delBtn = $('[data-dellv]', entry.ov);
  if(delBtn) delBtn.addEventListener('click', () => {
    openConfirm({title:'Delete ' + lv.label + '?', msg:'All ' + lv.weeks.length + ' weeks of plans in this level will be removed. This cannot be undone.', okLabel:'Delete level', danger:true,
      onOk(){
        state.levels = state.levels.filter(l => l.key !== lv.key);
        Object.keys(state.prep).forEach(k => { if(k.indexOf(lv.key + ':') === 0) delete state.prep[k]; });
        lvSeg = 0; lvOpen.clear(); save(); entry.close();
        navHTML(); go('#/home'); toast('Level deleted');
      }});
  });
}

/* ================= Settings ================= */
routes.settings = function(root){
  const s = state.settings;
  const themeIdx = s.theme === 'light' ? 0 : (s.theme === 'dark' ? 1 : 2);

  let h = '<div class="page-head"><div class="page-title">Settings</div>' +
    '<div class="page-sub">Everything here stays on this PC until you export a backup.</div></div>';

  // Appearance
  h += '<div class="sect-head"><span class="sect-title">Appearance</span></div><div class="card">' +
    '<div class="set-row"><div><div class="lab">Theme</div><div class="hint">Auto follows Windows day/night</div></div>' +
    '<div class="ctl">' + segHTML(['Light', 'Dark', 'Auto'], themeIdx) + '</div></div></div>';

  // Profile
  h += '<div class="sect-head"><span class="sect-title">Profile &amp; institute</span></div><div class="card">' +
    setRow('coordinator', 'Your name', 'Shown on the Home greeting', 'text', s.coordinator) +
    setRow('institute', 'Institute name', 'Shown in the sidebar', 'text', s.institute) +
    setRow('year', 'Year label', 'Shown in the sidebar next to the name', 'text', s.year) +
    '</div>';

  // Academic year
  h += '<div class="sect-head"><span class="sect-title">Academic year</span></div><div class="card">' +
    setRow('s1Start', 'Semester 1 starts (Monday)', 'Week 1 Monday', 'date', s.s1Start) +
    setRow('s2Start', 'Semester 2 starts (Monday)', 'First Monday after the break', 'date', s.s2Start) +
    setRow('s1Weeks', 'Semester 1 length', 'How many weeks before the break', 'number', s.s1Weeks) +
    '</div>';

  // Special weeks
  h += '<div class="sect-head"><span class="sect-title">Special weeks</span><span class="right"><button class="link-btn" data-addnote>' + icon('plus', 12) + ' Add</button></span></div><div class="card">';
  if(state.notes.length){
    state.notes.forEach((n, i) => {
      h += '<div class="set-row"><div class="lab" style="min-width:64px">W' + n.week + '</div>' +
        '<div class="grow small muted">' + esc(n.text) + '</div>' +
        '<button class="icon-btn" data-editnote="' + i + '">' + icon('pencil', 14) + '</button>' +
        '<button class="icon-btn danger" data-delnote="' + i + '">' + icon('trash', 14) + '</button></div>';
    });
  } else {
    h += '<div class="set-row"><div class="grow small faint">No special weeks marked.</div></div>';
  }
  h += '</div>';

  // Access codes
  h += '<div class="sect-head"><span class="sect-title">Access</span></div><div class="card">' +
    setRow('adminCode', 'Admin code', 'The one sign-in - unlocks the ELT side and the lead intern side', 'text', s.adminCode || '1234') +
    '<div class="set-row"><div class="grow small faint">One code: /login is yours, then you pick the ELT or the lead intern side. Everyone else browses the public view without a code - read-only, no requests.</div></div>' +
    '</div>';

  // Levels
  h += '<div class="sect-head"><span class="sect-title">Levels</span><span class="right"><button class="link-btn" data-addlv>' + icon('plus', 12) + ' Add level</button></span></div><div class="card">';
  let lastBand = '';
  state.levels.forEach(lv => {
    if(lv.band && lv.band !== lastBand){
      lastBand = lv.band;
      h += '<div class="band-head" style="padding:10px 14px 0;margin:0">' + esc(lv.band) + '</div>';
    }
    h += '<div class="set-row"><div class="lab grow">' + esc(lv.label) + '</div><span class="chip blue">' + esc(lv.cefr || '') + '</span>' +
      '<span class="tiny faint" style="margin:0 8px">' + lv.weeks.length + ' weeks</span>' +
      '<button class="icon-btn" data-editlv="' + esc(lv.key) + '">' + icon('pencil', 14) + '</button></div>';
  });
  h += '</div>';

  // Programs visibility (v2.2 - toggle levels that have no classes this year off the menu)
  h += '<div class="sect-head"><span class="sect-title">Programs visibility</span><span class="right"><span class="tiny faint">hidden = no class this year</span></span></div><div class="card">';
  let lastBandV = '';
  state.levels.forEach(lv => {
    if(lv.band && lv.band !== lastBandV){
      lastBandV = lv.band;
      h += '<div class="band-head" style="padding:10px 14px 0;margin:0">' + esc(lv.band) + '</div>';
    }
    const inUse = state.classes.some(c => c.level === lv.label);
    h += '<div class="set-row"><div><div class="lab">' + esc(lv.label) + '</div>' +
      '<div class="hint">' + lv.weeks.length + ' weeks \u00b7 ' + (inUse ? 'in use by classes' : 'no classes this year') + '</div></div>' +
      '<div class="ctl"><button class="switch' + (isHidden(lv) ? '' : ' on') + '" data-vislv="' + esc(lv.key) + '" aria-label="Show or hide"></button></div></div>';
  });
  h += '</div>';

  // Plans export
  h += '<div class="sect-head"><span class="sect-title">Plans export</span></div><div class="card">' +
    '<div class="set-row"><div><div class="lab">Excel — all levels</div><div class="hint">One workbook, one sheet per level, ASO logo, brand template</div></div>' +
    '<div class="ctl"><button class="btn ghost sm" data-xall>' + icon('grid', 14) + ' Export .xlsx</button></div></div>' +
    '<div class="set-row"><div><div class="lab">Word — all levels</div><div class="hint">One document with every level\u2019s 30-week plan</div></div>' +
    '<div class="ctl"><button class="btn ghost sm" data-dall>' + icon('file', 14) + ' Export .doc</button></div></div>' +
    '<div class="set-row"><div><div class="lab">Single level</div><div class="hint">Use the two export buttons at the top of every level page</div></div></div>' +
    '</div>';

  // Updates
  h += '<div class="sect-head"><span class="sect-title">Updates</span></div><div class="card">' +
    '<div class="set-row"><div><div class="lab">Current version</div><div class="hint">ELTASO Companion \u00b7 Oct 2026 build</div></div>' +
    '<div class="ctl"><span class="chip blue">v' + APP_VERSION + '</span></div></div>' +
    '<div class="set-row"><div><div class="lab">Check for updates</div><div class="hint">Opens the update page \u2014 compare it with your version above</div></div>' +
    '<div class="ctl"><a class="btn ghost sm" href="' + esc(state.settings.updUrl || state.rootUrl) + '" target="_blank" rel="noopener">' + icon('ext', 14) + ' Open page</a></div></div>' +
    '<div class="set-row"><div><div class="lab">Install program update</div><div class="hint">Pick an update .json \u2014 replaces levels, classes, team, library and notes; keeps your checklists and settings</div></div>' +
    '<div class="ctl"><button class="btn ghost sm" data-installupd>' + icon('up', 14) + ' Install\u2026</button></div></div>' +
    '<div class="set-row"><div><div class="lab">Update page link</div><div class="hint">Change it if updates move somewhere else</div></div>' +
    '<div class="ctl"><input class="input" style="width:260px" type="url" data-set="updUrl" value="' + esc(state.settings.updUrl || '') + '"></div></div>' +
    '</div>';

  // Cloud sync (v2.10) - commit state to a GitHub repo file so edits survive
  // across devices. The PAT lives in this browser's localStorage only.
  const gh = s.ghToken ? 'on' : 'off';
  const ghLast = s.ghLastSync ? new Date(s.ghLastSync).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : 'never';
  h += '<div class="sect-head"><span class="sect-title">Cloud sync (GitHub)</span><span class="right tiny faint">token: ' + gh + '</span></div><div class="card">' +
    '<div class="set-row"><div><div class="lab">GitHub repository</div><div class="hint">owner/name - the repo that hosts this site</div></div>' +
    '<div class="ctl"><input class="input" style="width:240px" type="text" data-set="ghRepo" value="' + esc(s.ghRepo || 'justkhalid/aso-companion') + '" placeholder="justkhalid/aso-companion"></div></div>' +
    '<div class="set-row"><div><div class="lab">Branch</div><div class="hint">commits go to this branch</div></div>' +
    '<div class="ctl"><input class="input" style="width:140px" type="text" data-set="ghBranch" value="' + esc(s.ghBranch || 'main') + '"></div></div>' +
    '<div class="set-row"><div><div class="lab">File path</div><div class="hint">where the state JSON lives in the repo</div></div>' +
    '<div class="ctl"><input class="input" style="width:240px" type="text" data-set="ghPath" value="' + esc(s.ghPath || 'data/state.json') + '"></div></div>' +
    '<div class="set-row"><div><div class="lab">Personal Access Token</div><div class="hint">needs "repo" scope on this repo. Stored only in this browser.</div></div>' +
    '<div class="ctl"><input class="input" style="width:260px" type="password" data-set-gh-token placeholder="github_pat_..." value="' + esc(s.ghToken || '') + '"></div></div>' +
    '<div class="set-row"><div><div class="lab">Auto-save on every edit</div><div class="hint">commits to GitHub ~3s after each change</div></div>' +
    '<div class="ctl"><button class="switch' + (s.ghAutoSave ? ' on' : '') + '" data-set-gh-auto="ghAutoSave" aria-label="Auto-save"></button></div></div>' +
    '<div class="set-row"><div><div class="lab">Auto-load on page open</div><div class="hint">replaces local state with the GitHub file on boot</div></div>' +
    '<div class="ctl"><button class="switch' + (s.ghAutoLoad ? ' on' : '') + '" data-set-gh-auto="ghAutoLoad" aria-label="Auto-load"></button></div></div>' +
    '<div class="set-row"><div><div class="lab">Last sync</div><div class="hint">' + esc(ghLast) + '</div></div>' +
    '<div class="ctl" style="gap:6px;display:flex;flex-wrap:wrap">' +
      '<button class="btn primary sm" data-ghsave>' + icon('up', 14) + ' Save now</button>' +
      '<button class="btn ghost sm" data-ghload>' + icon('down', 14) + ' Load now</button>' +
    '</div></div>' +
    '<div class="set-row"><div class="grow small faint">Token warning: anyone with browser access to this device can read the PAT from localStorage. Use a fine-grained PAT scoped to only this repo, and sign out (top of the sidebar) when you are done on a shared computer.</div></div>' +
    '</div>';

  // Data
  h += '<div class="sect-head"><span class="sect-title">Data &amp; backup</span></div><div class="card">' +
    '<div class="set-row"><div><div class="lab">Export backup</div><div class="hint">Download everything as a JSON file</div></div>' +
    '<div class="ctl"><button class="btn ghost sm" data-export>' + icon('down', 14) + ' Export</button></div></div>' +
    '<div class="set-row"><div><div class="lab">Import backup</div><div class="hint">Restore from a JSON file</div></div>' +
    '<div class="ctl"><button class="btn ghost sm" data-import>' + icon('up', 14) + ' Import</button></div></div>' +
    '<div class="set-row"><div><div class="lab">Reset to original</div><div class="hint">Back to the shipped 2026-2027 program</div></div>' +
    '<div class="ctl"><button class="btn danger-soft sm" data-reset>' + icon('reset', 14) + ' Reset</button></div></div>' +
    '</div>';

  // About
  h += '<div class="sect-head"><span class="sect-title">About</span></div><div class="card">' +
    '<div class="set-row"><div class="grow small muted">ASO Companion v' + APP_VERSION + ' · made for ' + esc(s.institute) + '<br>Installable app - works offline - data saved in this browser.</div></div>' +
    '<div class="set-row"><div class="grow small"><a href="' + esc(state.rootUrl) + '" target="_blank" rel="noopener">Open the resource Drive root ' + icon('ext', 11) + '</a></div></div>' +
    '</div>';

  root.innerHTML = h;

  mountSeg(root, i => {
    s.theme = ['light', 'dark', 'auto'][i];
    save(); applyTheme();
  });

  // generic rows
  $$('[data-set]', root).forEach(inp => inp.addEventListener('change', () => {
    const k = inp.dataset.set;
    let v = inp.value.trim();
    if(k === 's1Weeks'){ v = clamp(parseInt(v, 10) || 15, 1, Math.max(1, totalWeeks())); inp.value = v; }
    if(k === 's1Start' || k === 's2Start'){ if(!v) return; }
    s[k] = v;
    save(); applyTheme(); navHTML(); applyNav(); render();
    toast('Saved');
  }));

  // notes
  const addNote = $('[data-addnote]', root);
  if(addNote) addNote.addEventListener('click', () => noteSheet(null));
  $$('[data-editnote]', root).forEach(b => b.addEventListener('click', () => noteSheet(state.notes[+b.dataset.editnote])));
  $$('[data-delnote]', root).forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.delnote;
    openConfirm({title:'Remove note?', msg:'W' + state.notes[i].week + ': ' + state.notes[i].text, okLabel:'Remove', danger:true,
      onOk(){ state.notes.splice(i, 1); save(); render(); toast('Note removed'); }});
  }));

  // levels
  const addLv = $('[data-addlv]', root);
  if(addLv) addLv.addEventListener('click', addLevelSheet);
  $$('[data-editlv]', root).forEach(b => b.addEventListener('click', () => {
    levelSheet(state.levels.find(l => l.key === b.dataset.editlv));
  }));

  // programs visibility switches (v2.2)
  $$('[data-vislv]', root).forEach(sw => sw.addEventListener('click', () => {
    const lv = state.levels.find(l => l.key === sw.dataset.vislv);
    const hm = hiddenMap();
    if(isHidden(lv)) delete hm[lv.key]; else hm[lv.key] = true;
    save(); navHTML(); applyNav(); render();
    toast(isHidden(lv) ? lv.label + ' hidden from the menu' : lv.label + ' is visible again');
  }));

  // exports (all levels)
  $('[data-xall]', root).addEventListener('click', exportAllXlsx);
  $('[data-dall]', root).addEventListener('click', exportAllDoc);

  // install program update
  $('[data-installupd]', root).addEventListener('click', () => {
    const fi = document.createElement('input');
    fi.type = 'file'; fi.accept = '.json,application/json';
    fi.addEventListener('change', () => {
      const f = fi.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = () => {
        try{
          const d = JSON.parse(r.result);
          if(!installDataUpdate(d)) throw new Error('bad');
          toast('Update installed \u2014 v' + APP_VERSION);
        }catch(e){ toast('That file is not a valid update', false); }
      };
      r.readAsText(f);
    });
    fi.click();
  });

  // data
  $('[data-export]', root).addEventListener('click', () => { /* v2.8: one download path for every export */
    downloadBlob(new Blob([JSON.stringify(state, null, 2)], {type:'application/json'}), 'ASO_Companion_backup_' + toISO(new Date()) + '.json');
    toast('Backup exported');
  });
  const fileInp = document.createElement('input');
  fileInp.type = 'file'; fileInp.accept = '.json,application/json'; fileInp.style.display = 'none';
  root.appendChild(fileInp);
  $('[data-import]', root).addEventListener('click', () => fileInp.click());
  fileInp.addEventListener('change', () => {
    const f = fileInp.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try{
        const parsed = JSON.parse(r.result);
        if(!parsed || parsed.v !== 1 || !Array.isArray(parsed.levels) || !parsed.settings) throw new Error('bad file');
        migrateCal(parsed); /* fix calendar if the backup predates v1.1.1 */
        migrateLevels(parsed, true); /* expand old 4-level program to 9 band tiers */
        state = parsed;
        save(); applyTheme(); navHTML(); render();
        toast('Backup imported');
      }catch(e){ toast('That file is not a valid backup', false); }
    };
    r.readAsText(f);
  });
  $('[data-reset]', root).addEventListener('click', () => {
    openConfirm({title:'Reset everything?', msg:'All your edits go back to the original 2026-2027 program. Export a backup first if unsure.', okLabel:'Reset', danger:true,
      onOk(){
        localStorage.removeItem(LS_KEY);
        state = deepClone(SEED); persist(state);
        lvSeg = 0; lvOpen.clear();
        applyTheme(); navHTML(); render();
        toast('Reset to original');
      }});
  });

  // v2.10: cloud sync (GitHub) handlers
  const ghTokenInp = $('[data-set-gh-token]', root);
  if(ghTokenInp) ghTokenInp.addEventListener('change', () => {
    s.ghToken = ghTokenInp.value.trim();
    save(); render();
    toast(s.ghToken ? 'GitHub token saved' : 'GitHub token cleared');
  });
  $$('[data-set-gh-auto]', root).forEach(sw => sw.addEventListener('click', () => {
    const k = sw.dataset.setGhAuto;
    s[k] = !s[k];
    save(); render();
    toast(k + ': ' + (s[k] ? 'on' : 'off'));
  }));
  const ghSaveBtn = $('[data-ghsave]', root);
  if(ghSaveBtn) ghSaveBtn.addEventListener('click', () => ghSaveNow().catch(() => {}));
  const ghLoadBtn = $('[data-ghload]', root);
  if(ghLoadBtn) ghLoadBtn.addEventListener('click', () => {
    openConfirm({title:'Load from GitHub?', msg:'Your local edits will be replaced with the state from the GitHub repo. Continue?', okLabel:'Load', danger:true,
      onOk(){ ghLoadNow().catch(() => {}); }});
  });
}

function setRow(key, lab, hint, type, val){
  return '<div class="set-row"><div><div class="lab">' + esc(lab) + '</div>' + (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>' +
    '<div class="ctl"><input class="input' + (type === 'date' ? ' date' : type === 'number' ? ' num' : '') + '" type="' + type + '" data-set="' + key + '" value="' + esc(val == null ? '' : val) + '"></div></div>';
}

function noteSheet(n){
  const isNew = !n;
  n = n || {week: 1, text: ''};
  openSheet({
    title: isNew ? 'Add special week' : 'Edit special week',
    small: true,
    body: fText('week', 'Week number (1–' + Math.max(totalWeeks(), 30) + ')', n.week, '7', 'number') +
      fText('text', 'Note', n.text, 'Halloween week'),
    onSave(sh, close){
      const v = collectForm(sh);
      const wk = parseInt(v.week, 10);
      if(!wk || wk < 1 || wk > 60){ toast('Week must be 1–60', false); return; }
      if(!v.text){ toast('Write the note', false); return; }
      n.week = wk; n.text = v.text;
      if(isNew){ state.notes.push(n); state.notes.sort((a, b) => a.week - b.week); }
      save(); close(); navHTML(); render(); toast('Note saved');
    }
  });
}

function addLevelSheet(){
  openSheet({
    title: 'Add a level',
    body: fText('name', 'Level name', '', 'e.g. Adults C') +
      fText('cefr', 'CEFR level', '', 'e.g. B1') +
      fSelect('tpl', 'Start the weeks from', state.levels[0] ? state.levels[0].label : '', ['Blank'].concat(state.levels.map(l => l.label + ' (copy)'))),
    onSave(sh, close){
      const v = collectForm(sh);
      if(!v.name){ toast('Name is required', false); return; }
      let base = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'level';
      let key = base, i = 2;
      while(state.levels.some(l => l.key === key)){ key = base + '-' + i; i++; }
      let weeks;
      if(v.tpl === 'Blank') weeks = Array.from({length: 30}, () => ({theme:'', obj:'', lang:'', res:'', urls:[], act:'', hw:''}));
      else{
        const srcName = v.tpl.replace(/ \(copy\)$/, '');
        const src = state.levels.find(l => l.label === srcName);
        weeks = src ? deepClone(src.weeks) : Array.from({length: 30}, () => ({theme:'', obj:'', lang:'', res:'', urls:[], act:'', hw:''}));
      }
      state.levels.push({key, label: v.name, cefr: v.cefr, weeks});
      save(); close(); navHTML(); render(); toast('Level added');
    }
  });
}

/* ================= init (v2.11/v2.15: async boot with branded loading) =================
   The boot is async so we can fetch data/state.json (the cloud-synced state)
   before rendering. Without this, every visitor would see the hardcoded
   SEED and never the admin's edits. See bootLoadState() in 02_core.js.
   v2.15: the branded boot splash now lives directly in index.html (inside
   #viewRoot) so it shows the moment the page loads, BEFORE the JS runs. The
   boot loader replaces it once the state is fetched. No need to inject it
   from JS anymore — just call bootLoadState(). */
bootLoadState().then(result => {
  state = result.state;
  if(state.settings.updUrl == null){ state.settings.updUrl = state.rootUrl; persist(state); }
  applyTheme();
  bindChrome();
  navHTML();
  if(!location.hash) location.hash = (isIntern() ? '#/intern' : '#/home');
  else render();
  if(result.fromCloud) toast('Loaded latest from GitHub');
  ghAutoLoadOnBoot();
});
