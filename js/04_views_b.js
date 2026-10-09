/* ================= Views: Classes / Team / Library ================= */

function initials(name){
  return String(name || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

/* ---------- CLASSES ---------- */
routes.classes = function(root){
  if(!canEdit()){ go('#/home'); return; } /* v2.8: the public view has no Classes tab */
  let h = '<div class="page-head row"><div class="grow"><div class="page-title">Classes</div>' +
    '<div class="page-sub">' + state.classes.length + ' groups · ' + esc(state.settings.year) + '</div></div>' +
    '<button class="btn primary" data-addc>' + icon('plus', 15) + ' Add class</button></div>';

  if(!state.classes.length){
    h += '<div class="card empty">' + icon('grid', 26) + '<div class="t">No classes yet</div><div class="s">Add your first group.</div></div>';
  } else {
    h += '<div class="grid2">';
    state.classes.forEach(c => {
      h += '<div class="card card-pad">' +
        '<div class="row mb-s"><div class="li-title grow" style="font-size:15px">' + esc(c.code) + '</div><span class="chip blue">' + esc(c.level) + '</span></div>' +
        '<div class="row small muted mb-s">' + icon('clock', 13) + ' ' + esc(c.time || '—') + '</div>' +
        '<div class="row small muted mb-s">' + icon('cal', 13) + ' ' + esc((c.days || []).join(' · ') || '—') + '</div>' +
        '<div class="row small muted mb-s">' + icon('home', 13) + ' ' + esc(c.room || '—') + '</div>' +
        '<div class="row">' + icon('users', 13) + '<span class="small" style="color:var(--text)">' + esc(c.teacher || '—') + '</span><span class="grow"></span>' +
          '<button class="icon-btn" data-editc="' + esc(c.id) + '" title="Edit">' + icon('pencil', 14) + '</button>' +
          '<button class="icon-btn danger" data-delc="' + esc(c.id) + '" title="Delete">' + icon('trash', 14) + '</button></div>' +
        '</div>';
    });
    h += '</div>';
  }
  root.innerHTML = h;

  const add = $('[data-addc]', root);
  if(add) add.addEventListener('click', () => classSheet(null));
  $$('[data-editc]', root).forEach(b => b.addEventListener('click', () => {
    classSheet(state.classes.find(c => c.id === b.dataset.editc));
  }));
  $$('[data-delc]', root).forEach(b => b.addEventListener('click', () => {
    const c = state.classes.find(x => x.id === b.dataset.delc);
    openConfirm({title:'Delete ' + c.code + '?', msg:'The class card will be removed. Weeks and team are not affected.', okLabel:'Delete', danger:true,
      onOk(){ state.classes = state.classes.filter(x => x.id !== c.id); save(); navHTML(); render(); toast('Class deleted'); }});
  }));
}

function classSheet(c){
  const isNew = !c;
  c = c || {id: uid(), code:'', level: state.levels[0] ? state.levels[0].label : '', days:[], time:'', room:'', teacher:''};
  const lvOpts = state.levels.map(l => l.label);
  openSheet({
    title: isNew ? 'New class' : 'Edit class',
    body: fText('code', 'Class code', c.code, 'ASO-K1') +
      fSelect('level', 'Level', c.level, lvOpts) +
      fDays('Days', c.days) +
      '<div class="frow2">' + fSlot('time', 'Time slot', c.time) + venueSelect('room', 'Room / space', c.room) + '</div>' +
      fText('teacher', 'Teacher', c.teacher, 'Name', 'text') +
      '<datalist id="teamNames">' + state.team.map(t => '<option value="' + esc(t.name) + '">').join('') + '</datalist>',
    onMount(sh){
      const t = $('[data-f="teacher"]', sh);
      t.setAttribute('list', 'teamNames');
      bindDayPills(sh);
    },
    onSave(sh, close){
      const v = collectForm(sh);
      if(!v.code){ toast('Give the class a code', false); return; }
      const t = combineSlot(v);
      if(!t){ toast('The end must be after the start', false); return; }
      c.code = v.code; c.level = v.level; c.days = v.__days || []; c.time = t; c.room = v.room; c.teacher = v.teacher;
      if(isNew) state.classes.push(c);
      save(); close(); navHTML(); render(); toast(isNew ? 'Class added' : 'Class saved');
    }
  });
}

/* ---------- TEAM ---------- */
routes.team = function(root){
  let h = '<div class="page-head row"><div class="grow"><div class="page-title">Team</div>' +
    '<div class="page-sub">' + state.team.length + ' people · add phone numbers to enable WhatsApp</div></div>' +
    '<button class="btn primary" data-addt>' + icon('plus', 15) + ' Add person</button></div>';

  if(!state.team.length){
    h += '<div class="card empty">' + icon('users', 26) + '<div class="t">No team members yet</div></div>';
  } else {
    h += '<div class="grid2">';
    state.team.forEach(t => {
      h += '<div class="card card-pad">' +
        '<div class="row mb-s"><div style="width:40px;height:40px;border-radius:50%;background:var(--tint);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13.5px;flex:none">' + esc(initials(t.name)) + '</div>' +
        '<div class="grow"><div class="li-title" style="font-size:15px">' + esc(t.name) + '</div><div class="li-sub">' + esc(t.role) + '</div></div></div>' +
        (t.duty ? '<div class="small muted mb-s" style="line-height:1.5">' + esc(t.duty) + '</div>' : '') +
        '<div class="small' + (t.phone ? '' : ' faint') + ' mb-s">' + icon('phone', 13) + ' ' + esc(t.phone || 'No phone yet') + '</div>' +
        '<div class="small' + (t.aso ? '' : ' faint') + ' mb-s">' + icon('file', 13) + ' ASO ' + esc(t.aso || 'No ASO number yet') + '</div>' +
        '<div class="row" style="gap:6px">' +
          (t.phone ? '<a class="btn plain sm" href="tel:' + esc(t.phone) + '">' + icon('phone', 13) + ' Call</a>' : '') +
          (t.email ? '<a class="btn plain sm" href="mailto:' + esc(t.email) + '">' + icon('mail', 13) + ' Mail</a>' : '') +
          '<span class="grow"></span>' +
          '<button class="icon-btn" data-editt="' + esc(t.id) + '" title="Edit">' + icon('pencil', 14) + '</button>' +
          '<button class="icon-btn danger" data-delt="' + esc(t.id) + '" title="Delete">' + icon('trash', 14) + '</button>' +
        '</div></div>';
    });
    h += '</div>';
  }
  root.innerHTML = h;

  const add = $('[data-addt]', root);
  if(add) add.addEventListener('click', () => teamSheet(null));
  $$('[data-editt]', root).forEach(b => b.addEventListener('click', () => {
    teamSheet(state.team.find(t => t.id === b.dataset.editt));
  }));
  $$('[data-delt]', root).forEach(b => b.addEventListener('click', () => {
    const t = state.team.find(x => x.id === b.dataset.delt);
    openConfirm({title:'Remove ' + t.name + '?', msg:'They will be taken off the team list.', okLabel:'Remove', danger:true,
      onOk(){ state.team = state.team.filter(x => x.id !== t.id); save(); navHTML(); render(); toast('Removed'); }});
  }));
}

function teamSheet(t){
  const isNew = !t;
  t = t || {id: uid(), name:'', role:'Volunteer Teacher', duty:'', phone:'', aso:'', email:''};
  openSheet({
    title: isNew ? 'New team member' : 'Edit team member',
    body: fText('name', 'Full name', t.name, 'Aya Boutarfas') +
      fText('role', 'Role', t.role, 'Volunteer Teacher') +
      fArea('duty', 'Responsibility', t.duty, 'e.g. ASO-K1 Kids', 2) +
      '<div class="frow2">' + fText('phone', 'WhatsApp phone', t.phone, '06 xx xx xx xx') + fText('aso', 'ASO number', t.aso, 'e.g. 10234') + '</div>' +
      '<div class="small faint">The ASO number is the one from the reporting site - it shows on the team card.</div>',
    onSave(sh, close){
      const v = collectForm(sh);
      if(!v.name){ toast('Name is required', false); return; }
      Object.assign(t, v);
      if(isNew) state.team.push(t);
      save(); close(); navHTML(); render(); toast(isNew ? 'Team member added' : 'Saved');
    }
  });
}

/* ---------- LIBRARY ---------- */
let libFilter = '';
const LIB_SKILLS = ['', 'L', 'S', 'R', 'W'];
function filteredLib(){
  const base = libFilter ? state.library.filter(l => (l.sk || []).indexOf(libFilter) > -1) : state.library;
  return libSorted(base);
}
routes.library = function(root){
  let h = '<div class="page-head row"><div class="grow"><div class="page-title">Library</div>' +
    '<div class="page-sub">Every folder on the Drive, grouped by category and tagged by skill \u2014 one tap opens it</div></div>' +
    '<a class="btn plain" href="' + esc(state.rootUrl) + '" target="_blank" rel="noopener">' + icon('folder', 15) + ' Drive root</a>' +
    '<button class="btn primary" data-addl>' + icon('plus', 15) + ' Add folder</button></div>';
  h += '<div class="row mb" style="flex-wrap:wrap">' +
    LIB_SKILLS.map(k => '<button class="daypill' + (libFilter === k ? ' on' : '') + '" data-libf="' + k + '">' +
      (k ? k + ' \u00b7 ' + (SKILLS.find(s => s.k === k) || {}).name : 'All skills') + '</button>').join('') +
    '<span class="grow"></span><span class="tiny faint">' + filteredLib().length + ' of ' + state.library.length + ' folders</span></div>';
  const lib = filteredLib();
  /* v2.17: group folders by category, with a section header before each group */
  let lastCat = '';
  lib.forEach(l => {
    const cat = libCategory(l.name);
    if(cat.k !== lastCat){
      h += '<div class="sect-head"><span class="sect-title">' + esc(cat.label) + '</span></div>';
      lastCat = cat.k;
    }
    const pinned = (state.libraryPins || []).indexOf(l.id) > -1;
    h += '<div class="li-row tap" data-open="' + esc(l.id) + '">' +
      '<button class="icon-btn pin-btn' + (pinned ? ' on' : '') + '" data-pinl="' + esc(l.id) + '" title="Pin to top">' + icon('star', 15) + '</button>' +
      '<div class="grow"><div class="li-title">' + esc(l.name) + '</div><div class="li-sub">' + esc(l.desc) + '</div>' +
      (l.sk && l.sk.length ? '<div class="row mt-s" style="gap:5px;flex-wrap:wrap">' +
        l.sk.map(k => '<span class="chip sk' + k + '">' + k + ' \u00b7 ' + (SKILLS.find(s => s.k === k) || {}).name + '</span>').join('') + '</div>' : '') + '</div>' +
      (isAdmin() && !pubView() ? '<button class="icon-btn" data-editl="' + esc(l.id) + '" title="Edit">' + icon('pencil', 14) + '</button>' : '') +
      (isAdmin() && !pubView() ? '<button class="icon-btn danger" data-dell="' + esc(l.id) + '" title="Delete">' + icon('trash', 14) + '</button>' : '') +
      '<span class="li-ic" style="background:transparent;color:var(--text3)">' + icon('ext', 15) + '</span></div>';
  });
  if(!lib.length) h += '<div class="card empty">' + icon('folder', 26) + '<div class="t">Nothing for this skill yet</div><div class="s">Pick another skill or add a folder.</div></div>';
  root.innerHTML = h;

  $$('[data-libf]', root).forEach(b => b.addEventListener('click', () => { libFilter = b.dataset.libf; render(); }));
  $$('[data-pinl]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    togglePin(b.dataset.pinl);
    render();
  }));
  $$('[data-open]', root).forEach(r => r.addEventListener('click', e => {
    if(e.target.closest('[data-editl],[data-dell],[data-pinl]')) return;
    const l = state.library.find(x => x.id === r.dataset.open);
    window.open(l.url, '_blank');
  }));
  $$('[data-editl]', root).forEach(b => b.addEventListener('click', () => {
    librarySheet(state.library.find(x => x.id === b.dataset.editl));
  }));
  $$('[data-dell]', root).forEach(b => b.addEventListener('click', () => {
    const l = state.library.find(x => x.id === b.dataset.dell);
    openConfirm({title:'Remove ' + l.name + '?', okLabel:'Remove', danger:true,
      onOk(){ state.library = state.library.filter(x => x.id !== l.id); save(); navHTML(); render(); toast('Removed'); }});
  }));
  const add = $('[data-addl]', root);
  if(add) add.addEventListener('click', () => librarySheet(null));
}
function librarySheet(l){
  const isNew = !l;
  l = l || {id: uid(), name:'', desc:'', url:'', sk:[]};
  openSheet({
    title: isNew ? 'Add library folder' : 'Edit library folder',
    body: fText('name', 'Name', l.name, 'Lesson Plans') +
      fText('desc', 'Short description', l.desc, 'What is inside?') +
      fText('url', 'Drive link', l.url, 'https://drive.google.com/...', 'url') +
      '<div class="fgroup"><label class="flabel">Skills it supports</label><div class="daypills" data-sks>' +
      SKILLS.map(s => '<button type="button" class="daypill' + ((l.sk || []).indexOf(s.k) > -1 ? ' on' : '') + '" data-sk="' + s.k + '">' + s.k + ' \u00b7 ' + s.name + '</button>').join('') +
      '</div></div>',
    onMount(sh){
      $$('[data-sks] .daypill', sh).forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));
    },
    onSave(sh, close){
      const v = collectForm(sh);
      if(!v.name){ toast('Name is required', false); return; }
      v.sk = $$('[data-sks] .daypill.on', sh).map(b => b.dataset.sk);
      Object.assign(l, v);
      if(isNew) state.library.push(l);
      save(); close(); navHTML(); render(); toast(isNew ? 'Folder added' : 'Saved');
    }
  });
}
/* ================= Internship side + shared Reports (v1.7 - v2.1) ================= */
function clubTone(id){
  let i = (state.clubs || []).findIndex(c => c.id === id);
  if(i < 0){ i = 0; const s = String(id || ''); for(let k = 0; k < s.length; k++) i += s.charCodeAt(k); }
  return 'tone-' + (i % 9);
}
function volNames(){ return (state.volunteers || []).map(v => v.name); }
function rosterText(){
  const st = termStatus();
  const inS = st.mode === 's1' || st.mode === 's2';
  const mon = inS ? weekMonday(st.week - 1) : new Date();
  let t = 'ASO clubs and events - week of ' + fmtD(mon, {day:'numeric', month:'long'}) + '\n';
  let unstaffed = 0;
  DAY_KEYS.forEach((d, di) => {
    const cs = (state.clubs || []).filter(c => (c.days || []).indexOf(d) > -1)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    if(!cs.length) return;
    t += '\n' + DAY_FULL[d] + ':\n';
    cs.forEach(c => {
      if(!c.lead) unstaffed++;
      t += '  \u2022 ' + c.time + ' ' + c.name + ' (' + c.room + ')' +
        (c.lead ? ' - lead: ' + c.lead : ' - NO LEAD YET') +
        ((c.vol || []).length ? ' \u00b7 with ' + c.vol.join(', ') : '') + '\n';
    });
  });
  const evs = (state.events || []).filter(e => { const d = nextOccurrence(e); return d && d <= addDays(startOfDay(mon || new Date()), 6); });
  if(evs.length){
    t += '\nUpcoming events:\n';
    evs.forEach(e => { t += '  \u2022 ' + fmtD(nextOccurrence(e), {weekday:'long', day:'numeric', month:'long'}) + ' - ' + e.title + (e.time ? ' (' + e.time + ')' : '') + (e.place ? ' @ ' + e.place : '') + '\n'; });
  }
  if(unstaffed) t += '\n\u26a0 ' + unstaffed + ' session(s) still need a lead.\n';
  t += '\n' + (state.settings.coordinator || '');
  return t;
}
/* ---------- v2.4: club calendar as a real timetable grid (v1.9 port) ---------- */
function clubGridHTML(){
  const clubs = (state.clubs || []).filter(c => (c.days || []).length && c.time);
  if(!clubs.length){
    return '<div class="card empty">' + icon('cal', 26) + '<div class="t">No club sessions yet</div><div class="s">Club sessions appear here as soon as they are scheduled.</div></div>';
  }
  const slots = [], seen = {};
  clubs.forEach(c => { const s = parseSlot(c.time); if(!seen[s.k]){ seen[s.k] = 1; slots.push(s); } });
  slots.sort((a, b) => a.mins - b.mins || a.label.localeCompare(b.label));
  const todayKey = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
  const parsed = clubs.map(c => ({c, s: parseSlot(c.time)}));
  let head = '<div class="tt-corner"></div>';
  DAY_KEYS.forEach(d => {
    head += '<div class="tt-h' + (d === todayKey ? ' tt-today' : '') + '"><span class="tt-dname">' + d + '</span></div>';
  });
  let body = '';
  slots.forEach(s => {
    body += '<div class="tt-time">' + esc(s.label) + '</div>';
    DAY_KEYS.forEach(d => {
      const here = parsed.filter(p => (p.c.days || []).indexOf(d) > -1 && p.s.k === s.k);
      body += '<div class="tt-cell' + (d === todayKey ? ' tt-today' : '') + '">' +
        here.map(p => (canEditClub() ? '<button type="button" class="tt-chip ' + clubTone(p.c.id) + '" data-editclub="' + esc(p.c.id) + '">' : '<div class="tt-chip ' + clubTone(p.c.id) + '">') +
          '<span class="tt-code"><i class="tt-dot"></i>' + esc(p.c.name) + '</span>' +
          '<span class="tt-meta">' + esc([p.c.lead || 'no lead yet', p.c.room].filter(Boolean).join(' · ')) + '</span>' + (canEditClub() ? '</button>' : '</div>')).join('') +
        '</div>';
    });
  });
  const legend = '<div class="tt-legend">' +
    (state.clubs || []).map(c => '<span class="lg"><i class="' + clubTone(c.id) + '"></i>' + esc(c.name) + '</span>').join('') + '</div>';
  return '<div class="card tt-card"><div class="tt-wrap"><div class="tt">' + head + body + '</div></div>' + legend + '</div>';
}

/* ---------- v2.10/v2.12: club card - A4 poster on LEFT, content on RIGHT ----------
   Shared between the Clubs list (/intern/clubs) and the public Clubs & events
   page (/calendar). canEdit toggles the action buttons. Click "Learn more"
   to expand full details (description, volunteers, link). */
function clubCardHTML(c, canEdit){
  const days = (c.days || []).length ? (c.days || []).join(' / ') : 'no day set';
  const time = c.time || 'no time set';
  const room = c.room || '';
  const hasLead = !!c.lead;
  const vol = (c.vol || []).length ? (c.vol || []).join(', ') : '';
  let h = '<div class="club-card' + (canEdit ? '' : (c.url ? ' has-link' : '')) + '" data-cc="' + esc(c.id) + '">';
  /* A4 poster on the LEFT (170px wide, full card height) */
  h += '<div class="cc-poster"' + (canEdit ? ' data-poster="' + esc(c.id) + '" title="Tap to upload a poster"' : '') + '>';
  if(c.poster){
    h += '<img src="' + esc(c.poster) + '" alt="' + esc(c.name) + ' poster">';
  } else {
    h += '<div class="cc-noimg">' + icon('star', 28) + '</div>';
  }
  h += '</div>';
  /* Content on the RIGHT */
  h += '<div class="cc-body">';
  h += '<div class="cc-name">' + esc(c.name) +
    (c.placeholder ? ' <span class="chip gold">placeholder</span>' : '') + '</div>';
  h += '<div class="cc-meta">' +
    '<span>' + icon('cal', 12) + esc(days) + '</span>' +
    '<span>' + icon('clock', 12) + esc(time) + '</span>' +
    (room ? '<span>' + icon('pin', 12) + esc(room) + '</span>' : '') +
    '</div>';
  h += '<div class="cc-meta">' +
    (hasLead
      ? '<span class="cc-lead">' + icon('user', 12) + 'Lead: ' + esc(c.lead) + '</span>'
      : '<span class="cc-no-lead">' + icon('warn', 12) + 'Needs a lead</span>') +
    '</div>';
  /* v2.12: "Learn more" expandable section with full details */
  h += '<div class="cc-expand">';
  h += '<button class="cc-expand-btn" data-expand="' + esc(c.id) + '">' + icon('chevD', 12) + ' Learn more</button>';
  h += '<div class="cc-expand-body" data-expand-body="' + esc(c.id) + '">';
  if(c.desc){ h += '<div class="cc-e-row"><span class="cc-e-label">About:</span>' + esc(c.desc) + '</div>'; }
  if(vol){ h += '<div class="cc-e-row"><span class="cc-e-label">Volunteers:</span>' + esc(vol) + '</div>'; }
  if(c.url){ h += '<div class="cc-e-row"><span class="cc-e-label">Link:</span> <a href="' + esc(c.url) + '" target="_blank" rel="noopener" data-stop>' + esc(c.url) + '</a></div>'; }
  if(!c.desc && !vol && !c.url){ h += '<div class="cc-e-row" style="color:var(--text2)">No extra details yet.</div>'; }
  h += '</div>';
  h += '</div>';
  if(canEdit){
    h += '<div class="cc-actions">';
    h += '<button class="btn ghost sm" data-poster2="' + esc(c.id) + '">' + icon('file', 13) + (c.poster ? ' Poster' : ' Add poster') + '</button>';
    h += '<span class="grow"></span>';
    h += '<button class="icon-btn" data-editclub2="' + esc(c.id) + '" title="Edit">' + icon('pencil', 14) + '</button>';
    h += '<button class="icon-btn danger" data-delclub="' + esc(c.id) + '" title="Delete">' + icon('trash', 14) + '</button>';
    h += '</div>';
  } else if(c.url){
    h += '<div class="cc-actions"><a class="btn ghost sm" href="' + esc(c.url) + '" target="_blank" rel="noopener" data-stop>' + icon('ext', 13) + ' Open link</a></div>';
  }
  h += '</div>';
  h += '</div>';
  return h;
}
/* v2.10/v2.12: render a list of clubs as cards + wire up the action buttons
   and the "Learn more" expand toggle. */
function bindClubCards(root, canEdit){
  if(canEdit){
    $$('[data-poster], [data-poster2]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      posterSheet((state.clubs || []).find(c => c.id === (b.dataset.poster || b.dataset.poster2)));
    }));
    $$('[data-editclub2]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      clubSheet((state.clubs || []).find(c => c.id === b.dataset.editclub2));
    }));
    $$('[data-delclub]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const c = (state.clubs || []).find(x => x.id === b.dataset.delclub);
      openConfirm({title:'Remove ' + c.name + '?', okLabel:'Remove', danger:true,
        onOk(){ state.clubs = state.clubs.filter(x => x.id !== c.id); save(); navHTML(); render(); toast('Removed'); }});
    }));
  } else {
    /* public view: tap the card to open the link, if any; ignore if no link */
    $$('[data-cc].has-link', root).forEach(card => card.addEventListener('click', e => {
      /* don't fire if the user clicked the expand toggle or a link */
      if(e.target.closest('[data-expand], .cc-expand-body, a, button')) return;
      const c = (state.clubs || []).find(x => x.id === card.dataset.cc);
      if(c && c.url) window.open(c.url, '_blank', 'noopener');
    }));
  }
  /* v2.12: "Learn more" expand toggle (both admin and public) */
  $$('[data-expand]', root).forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const id = btn.dataset.expand;
    const body = root.querySelector('[data-expand-body="' + CSS.escape(id) + '"]');
    if(body){
      const open = body.classList.toggle('open');
      btn.innerHTML = (open ? icon('chevD', 12) + ' Hide' : icon('chevD', 12) + ' Learn more');
      /* rotate the chevron when open */
      const chev = btn.querySelector('svg');
      if(chev) chev.style.transform = open ? 'rotate(180deg)' : '';
      chev.style.transition = 'transform .2s ease';
    }
  }));
  $$('[data-stop]', root).forEach(a => a.addEventListener('click', e => e.stopPropagation()));
}

/* ---------- v2.12: event card - same design as the club card ----------
   A4-style poster/icon on the LEFT (gold gradient for events), content on
   the RIGHT (title, when/where, "Learn more" to expand description). */
function eventCardHTML(e, canEdit){
  const when = fmtEventWhen(e);
  const isWeekly = e.recur === 'weekly';
  const nextD = nextOccurrence(e);
  const nextStr = nextD ? fmtD(nextD, {weekday:'long', day:'numeric', month:'long'}) : '';
  const time = e.time || '';
  const place = e.place || '';
  let h = '<div class="club-card cc-card-event" data-ec="' + esc(e.id) + '">';
  /* Gold-gradient poster area with a calendar icon (events don't have posters) */
  h += '<div class="cc-poster">';
  h += '<div class="cc-noimg">' + icon('cal', 28) + '</div>';
  h += '</div>';
  h += '<div class="cc-body">';
  h += '<div class="cc-name">' + esc(e.title) +
    ' <span class="chip ' + (isWeekly ? 'gold' : 'blue') + '">' + esc(when) + '</span></div>';
  h += '<div class="cc-meta">' +
    (nextStr ? '<span>' + icon('cal', 12) + esc(nextStr) + '</span>' : '') +
    (time ? '<span>' + icon('clock', 12) + esc(time) + '</span>' : '') +
    '</div>';
  if(place){ h += '<div class="cc-meta"><span>' + icon('pin', 12) + esc(place) + '</span></div>'; }
  /* "Learn more" expandable section */
  h += '<div class="cc-expand">';
  h += '<button class="cc-expand-btn" data-expand-ev="' + esc(e.id) + '">' + icon('chevD', 12) + ' Learn more</button>';
  h += '<div class="cc-expand-body" data-expand-body-ev="' + esc(e.id) + '">';
  if(e.desc){ h += '<div class="cc-e-row"><span class="cc-e-label">About:</span>' + esc(e.desc) + '</div>'; }
  if(isWeekly && e.day){ h += '<div class="cc-e-row"><span class="cc-e-label">Repeats:</span>Every ' + esc(e.day) + '</div>'; }
  if(!isWeekly && e.date){ h += '<div class="cc-e-row"><span class="cc-e-label">Date:</span>' + esc(e.date) + '</div>'; }
  if(!e.desc && !((isWeekly && e.day) || (!isWeekly && e.date))){ h += '<div class="cc-e-row" style="color:var(--text2)">No extra details.</div>'; }
  h += '</div>';
  h += '</div>';
  if(canEdit){
    h += '<div class="cc-actions">';
    h += '<span class="grow"></span>';
    h += '<button class="icon-btn" data-editev2="' + esc(e.id) + '" title="Edit">' + icon('pencil', 14) + '</button>';
    h += '<button class="icon-btn danger" data-delev="' + esc(e.id) + '" title="Delete">' + icon('trash', 14) + '</button>';
    h += '</div>';
  }
  h += '</div>';
  h += '</div>';
  return h;
}
function bindEventCards(root, canEdit){
  if(canEdit){
    $$('[data-editev2]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      eventSheet((state.events || []).find(x => x.id === b.dataset.editev2));
    }));
    $$('[data-delev]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const ev = (state.events || []).find(x => x.id === b.dataset.delev);
      openConfirm({title:'Remove ' + ev.title + '?', okLabel:'Remove', danger:true,
        onOk(){ state.events = state.events.filter(x => x.id !== ev.id); save(); navHTML(); render(); toast('Removed'); }});
    }));
  }
  /* "Learn more" expand toggle */
  $$('[data-expand-ev]', root).forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const id = btn.dataset.expandEv;
    const body = root.querySelector('[data-expand-body-ev="' + CSS.escape(id) + '"]');
    if(body){
      const open = body.classList.toggle('open');
      btn.innerHTML = (open ? icon('chevD', 12) + ' Hide' : icon('chevD', 12) + ' Learn more');
      const chev = btn.querySelector('svg');
      if(chev){ chev.style.transform = open ? 'rotate(180deg)' : ''; chev.style.transition = 'transform .2s ease'; }
    }
  }));
}
/* ---------- v2.4: club poster upload (v1.9 port) ---------- */
function compressPoster(file, cb){
  const img = new Image();
  img.onload = () => {
    const MAXW = 1240, MAXH = 1754;                     /* A4 portrait @ 150 dpi */
    const scale = Math.min(1, MAXW / img.width, MAXH / img.height);
    const w = Math.max(1, Math.round(img.width * scale)), hgt = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt;
    cv.getContext('2d').drawImage(img, 0, 0, w, hgt);
    cb(cv.toDataURL('image/jpeg', 0.82));
  };
  img.onerror = () => toast('That file is not an image', false);
  const r = new FileReader();
  r.onload = () => { img.src = r.result; };
  r.readAsDataURL(file);
}
function posterSheet(c){
  const draw = () => (state.clubs || []).find(x => x.id === c.id) || c;
  const paint = sh => {
    const cur = draw();
    const pv = $('[data-pv]', sh);
    pv.innerHTML = cur.poster
      ? '<img src="' + cur.poster + '" alt="Club poster">'
      : '<div class="card empty">' + icon('file', 26) + '<div class="t">No poster yet</div><div class="s">Upload an image (JPG/PNG) for this club.</div></div>';
    $('[data-pup]', sh).innerHTML = icon('up', 14) + (cur.poster ? ' Update poster' : ' Upload poster');
    const zb = $('[data-zoom]', sh); /* v2.7: big is the default, zoom out on demand */
    zb.style.display = cur.poster ? '' : 'none';
    if(cur.poster) zb.innerHTML = pv.classList.contains('fit') ? icon('up', 14) + ' Full size' : icon('down', 14) + ' Zoom out';
    $('[data-pdel]', sh).style.display = cur.poster ? '' : 'none';
  };
  openSheet({title: 'Poster · ' + c.name, foot: false,
    body:
      '<div class="poster-view" data-pv></div>' +
      '<div class="row mt" style="gap:8px">' +
        '<button class="btn primary grow" data-pup></button>' +
        '<button class="btn ghost" data-zoom style="display:none"></button>' +
        '<button class="btn danger-soft" data-pdel style="display:none">' + icon('trash', 14) + ' Remove</button>' +
      '</div>' +
      '<div class="tiny faint mt-s">Large photos are compressed automatically and stored in this browser.</div>',
    onMount(sh){
      paint(sh);
      $('[data-zoom]', sh).addEventListener('click', () => { /* v2.7 */
        $('[data-pv]', sh).classList.toggle('fit');
        paint(sh);
      });
      const fi = document.createElement('input');
      fi.type = 'file'; fi.accept = 'image/*'; fi.style.display = 'none';
      sh.appendChild(fi);
      $('[data-pup]', sh).addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => {
        const f = fi.files[0];
        if(!f) return;
        compressPoster(f, dataUrl => {
          c.poster = dataUrl; save();
          paint(sh); navHTML();
          if(currentRoute === 'intern') render();
          toast('Poster saved');
        });
      });
      $('[data-pdel]', sh).addEventListener('click', () => {
        c.poster = ''; save(); paint(sh);
        if(currentRoute === 'intern') render();
        toast('Poster removed');
      });
    }});
}
function internHead(title, sub, actions){
  return '<div class="page-head row"><div class="grow"><div class="page-title">' + esc(title) + '</div>' +
    '<div class="page-sub">' + esc(sub) + '</div></div>' + (actions || '') + '</div>';
}
function internStats(){
  const clubs = state.clubs || [], vols = state.volunteers || [];
  const sessions = clubs.reduce((n, c) => n + (c.days || []).length, 0);
  const noLead = clubs.filter(c => !c.lead).length;
  return '<div class="stat-grid">' +
    '<div class="stat-box"><div class="n">' + clubs.length + '</div><div class="l">Clubs</div></div>' +
    '<div class="stat-box"><div class="n">' + sessions + '</div><div class="l">Sessions / week</div></div>' +
    '<div class="stat-box"><div class="n">' + vols.length + '</div><div class="l">Volunteers</div></div>' +
    '<div class="stat-box"><div class="n">' + (state.events || []).length + '</div><div class="l">Events</div></div>' +
    (noLead ? '<div class="stat-box warn"><div class="n">' + noLead + '</div><div class="l">Need a lead</div></div>' : '') +
    '</div>';
}
/* ---------- dispatcher: #/intern, #/intern/clubs, #/intern/events, #/intern/vols ---------- */
routes.intern = function(root, sub){
  if(sub === 'clubs') return internClubsView(root);
  if(sub === 'events') return internEventsView(root);
  if(sub === 'vols') return internVolsView(root);
  return internHomeView(root);
};
function internHomeView(root){
  const clubs = state.clubs || [], vols = state.volunteers || [];
  const st = termStatus();
  const inS = st.mode === 's1' || st.mode === 's2';
  const mon = inS ? weekMonday(st.week - 1) : null;

  let h = internHead('Internship - Clubs & Events',
    'The Lead Intern space · clubs, events, volunteers and the week at a glance · ' + state.settings.year,
    '<button class="btn plain" data-copyroster>' + icon('copy', 15) + ' Roster</button>' +
    '<button class="btn primary" data-pngclubs>' + icon('down', 15) + ' Export PNG</button>');

  h += internStats();

  h += '<div class="sect-head"><span class="sect-title">Club calendar' + (mon ? ' · week of ' + fmtD(mon) : '') + '</span></div>'; /* v2.4: real timetable grid like v1.9 */
  h += clubGridHTML();

  h += '<div class="sect-head"><span class="sect-title">Upcoming events</span><span class="right"><button class="link-btn" data-go="#/intern/events">All events</button></span></div>';
  const evs = (state.events || []).map(e => ({e, d: nextOccurrence(e)})).filter(x => x.d).sort((a, b) => a.d - b.d).slice(0, 4);
  if(evs.length){
    h += '<div class="list">';
    evs.forEach(x => {
      h += '<div class="li-row tap" data-editev="' + esc(x.e.id) + '">' +
        '<div class="li-ic">' + icon('star', 15) + '</div>' +
        '<div class="grow"><div class="li-title">' + esc(x.e.title) + '</div>' +
        '<div class="li-sub">' + esc([fmtD(x.d, {weekday:'long', day:'numeric', month:'long'}), x.e.time, x.e.place].filter(Boolean).join(' · ')) + '</div></div>' +
        '<span class="chip gold">' + esc(fmtEventWhen(x.e)) + '</span></div>';
    });
    h += '</div>';
  } else {
    h += '<div class="card empty">' + icon('cal', 26) + '<div class="t">Nothing scheduled</div><div class="s">Events land here as soon as they exist.</div></div>';
  }

  h += '<div class="sect-head"><span class="sect-title">Quick links</span></div><div class="qk-grid">' +
    '<button class="qk" data-go="#/intern/clubs">' + icon('star', 16) + '<span class="qk-label grow">Clubs</span>' + icon('chevR', 13) + '</button>' +
    '<button class="qk" data-go="#/intern/events">' + icon('cal', 16) + '<span class="qk-label grow">Events</span>' + icon('chevR', 13) + '</button>' +
    '<button class="qk" data-go="#/intern/vols">' + icon('users', 16) + '<span class="qk-label grow">Volunteers</span>' + icon('chevR', 13) + '</button>' +
    '<button class="qk" data-go="#/reports">' + icon('file', 16) + '<span class="qk-label grow">Reports</span>' + icon('chevR', 13) + '</button>' +
    '</div>';

  root.innerHTML = h;
  $('[data-copyroster]', root).addEventListener('click', () => copyText(rosterText(), 'Week roster copied'));
  $('[data-pngclubs]', root).addEventListener('click', () => exportPng('clubs'));
  bindInternRows(root);
}
function internClubsView(root){
  const clubs = state.clubs || [];
  let h = internHead('Clubs', clubs.length + ' clubs · tap a card to edit its roster, poster and schedule',
    '<button class="btn plain" data-copyroster>' + icon('copy', 15) + ' Roster</button>' +
    '<button class="btn plain" data-pngclubs>' + icon('down', 15) + ' Export PNG</button>' +
    '<button class="btn primary" data-addclub>' + icon('plus', 15) + ' Add club</button>');
  /* v2.10: club cards instead of a small-row list - full poster, name,
     description, days/time/room, lead, volunteers, action buttons. */
  h += '<div class="sect-head"><span class="sect-title">All clubs</span><span class="right tiny faint">' +
    clubs.reduce((n, c) => n + (c.days || []).length, 0) + ' sessions / week</span></div>';
  if(clubs.length){
    h += '<div class="club-grid">';
    clubs.forEach(c => { h += clubCardHTML(c, true); });
    h += '</div>';
  } else {
    h += '<div class="card empty">' + icon('star', 26) + '<div class="t">No clubs yet</div><div class="s">Add the first club.</div></div>';
  }
  root.innerHTML = h;
  $('[data-copyroster]', root).addEventListener('click', () => copyText(rosterText(), 'Week roster copied'));
  $('[data-pngclubs]', root).addEventListener('click', () => exportPng('clubs'));
  /* v2.22: 'PNG with icons' option removed. */
  /* v2.12: bindClubCards wires [data-poster], [data-poster2], [data-editclub2],
     [data-delclub]. We must NOT also call bindInternRows(root) here - it would
     double-bind the same buttons and open two sheets on every click. Only the
     Add-club button still needs binding from bindInternRows, so wire it
     directly instead. */
  bindClubCards(root, true);
  const addBtn = $('[data-addclub]', root);
  if(addBtn) addBtn.addEventListener('click', () => clubSheet(null));
}
function internEventsView(root){
  const evs = (state.events || []).slice().sort((a, b) => {
    const da = nextOccurrence(a), db = nextOccurrence(b);
    return (da ? da.getTime() : 9e15) - (db ? db.getTime() : 9e15);
  });
  let h = internHead('Events', 'Recurring weekly events and one-time specials',
    '<button class="btn plain" data-pngc>' + icon('down', 15) + ' Export PNG</button>' +
    '<button class="btn primary" data-addev>' + icon('plus', 15) + ' Add event</button>');
  if(evs.length){
    /* v2.12: events use the same card design as clubs - poster/icon on the
       left, content on the right, "Learn more" to expand details. */
    h += '<div class="club-grid">';
    evs.forEach(e => { h += eventCardHTML(e, true); });
    h += '</div>';
  } else {
    h += '<div class="card empty">' + icon('cal', 26) + '<div class="t">No events yet</div><div class="s">Add the first event.</div></div>';
  }
  root.innerHTML = h;
  $$('[data-pngc]', root).forEach(b => b.addEventListener('click', () => exportPng('clubs')));
  /* v2.22: 'PNG with icons' option removed. */
  bindEventCards(root, true);
  const addBtn = $('[data-addev]', root);
  if(addBtn) addBtn.addEventListener('click', () => eventSheet(null));
}
function internVolsView(root){
  const clubs = state.clubs || [], vols = state.volunteers || [];
  let h = internHead('Volunteers', vols.length + ' people · assign them as leads or helpers on each club',
    '<button class="btn primary" data-addvol>' + icon('plus', 15) + ' Add volunteer</button>');
  if(vols.length){
    h += '<div class="list">';
    vols.forEach(v => {
      const mine = clubs.filter(c => c.lead === v.name || (c.vol || []).indexOf(v.name) > -1);
      h += '<div class="li-row tap" data-editvol="' + esc(v.id) + '">' +
        '<div class="li-ic">' + icon('users', 15) + '</div>' +
        '<div class="grow"><div class="li-title">' + esc(v.name) + ' <span class="chip">' + esc(v.role || 'Volunteer') + '</span></div>' +
        '<div class="li-sub">' + esc([v.phone, v.aso ? 'ASO ' + v.aso : ''].filter(Boolean).join(' · ') || '—') + '</div>' +
        (mine.length ? '<div class="li-sub">' + esc(mine.map(c => c.name).join(', ')) + '</div>' : '') + '</div>' +
        '<button class="icon-btn" data-editvol2="' + esc(v.id) + '" title="Edit">' + icon('pencil', 14) + '</button>' +
        '<button class="icon-btn danger" data-delvol="' + esc(v.id) + '" title="Delete">' + icon('trash', 14) + '</button></div>';
    });
    h += '</div>';
  } else {
    h += '<div class="card empty">' + icon('users', 26) + '<div class="t">No volunteers yet</div></div>';
  }
  root.innerHTML = h;
  bindInternRows(root);
}
function bindInternRows(root){
  const addClub = $('[data-addclub]', root);
  if(addClub) addClub.addEventListener('click', () => clubSheet(null));
  const addEv = $('[data-addev]', root);
  if(addEv) addEv.addEventListener('click', () => eventSheet(null));
  const addVol = $('[data-addvol]', root);
  if(addVol) addVol.addEventListener('click', () => volSheet(null));
  const cr = $('[data-copyroster]', root);
  if(cr) cr.addEventListener('click', () => copyText(rosterText(), 'Week roster copied'));
  $$('[data-editclub],[data-editclub2]', root).forEach(b => b.addEventListener('click', e => {
    if(e.target.closest('[data-delclub],[data-poster]')) return;
    e.stopPropagation();
    clubSheet((state.clubs || []).find(c => c.id === (b.dataset.editclub || b.dataset.editclub2)));
  }));
  $$('[data-poster]', root).forEach(b => b.addEventListener('click', e => { /* v2.4: poster upload like v1.9 */
    e.stopPropagation();
    posterSheet((state.clubs || []).find(c => c.id === b.dataset.poster));
  }));
  $$('[data-delclub]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const c = (state.clubs || []).find(x => x.id === b.dataset.delclub);
    openConfirm({title:'Remove ' + c.name + '?', okLabel:'Remove', danger:true,
      onOk(){ state.clubs = state.clubs.filter(x => x.id !== c.id); save(); navHTML(); render(); toast('Removed'); }});
  }));
  $$('[data-editev],[data-editev2]', root).forEach(b => b.addEventListener('click', e => {
    if(e.target.closest('[data-delev]')) return;
    e.stopPropagation();
    eventSheet((state.events || []).find(x => x.id === (b.dataset.editev || b.dataset.editev2)));
  }));
  $$('[data-delev]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const ev = (state.events || []).find(x => x.id === b.dataset.delev);
    openConfirm({title:'Remove ' + ev.title + '?', okLabel:'Remove', danger:true,
      onOk(){ state.events = state.events.filter(x => x.id !== ev.id); save(); navHTML(); render(); toast('Removed'); }});
  }));
  $$('[data-editvol],[data-editvol2]', root).forEach(b => b.addEventListener('click', e => {
    if(e.target.closest('[data-delvol]')) return;
    e.stopPropagation();
    volSheet((state.volunteers || []).find(v => v.id === (b.dataset.editvol || b.dataset.editvol2)));
  }));
  $$('[data-delvol]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const v = (state.volunteers || []).find(x => x.id === b.dataset.delvol);
    openConfirm({title:'Remove ' + v.name + '?', msg:'They will be removed from club rosters too.', okLabel:'Remove', danger:true,
      onOk(){
        state.volunteers = state.volunteers.filter(x => x.id !== v.id);
        (state.clubs || []).forEach(c => {
          if(c.lead === v.name) c.lead = '';
          c.vol = (c.vol || []).filter(n => n !== v.name);
        });
        save(); navHTML(); render(); toast('Removed');
      }});
  }));
}
function clubSheet(c){
  const isNew = !c;
  c = c || {id: uid(), name:'', desc:'', days:[], time:'', room:'', lead:'', vol:[], url:'', poster:'', placeholder:false};
  const names = volNames();
  openSheet({
    title: isNew ? 'Add club' : 'Edit club',
    body: fText('name', 'Club name', c.name, 'Conversation Club') +
      fArea('desc', 'What happens', c.desc, 'Short description', 2) +
      fDays('Days', c.days) +
      '<div class="frow2">' + fSlot('time', 'Time slot', c.time) + venueSelect('room', 'Room / space', c.room) + '</div>' +
      fSelect('lead', 'Lead volunteer', c.lead || '—', ['—'].concat(names)) +
      (names.length ? '<div class="fgroup"><label class="flabel">Volunteers on this club</label><div class="daypills" data-volp>' +
        names.map(n => '<button type="button" class="daypill' + ((c.vol || []).indexOf(n) > -1 ? ' on' : '') + '" data-v="' + esc(n) + '">' + esc(n) + '</button>').join('') +
        '</div></div>' : '<div class="tiny faint mb-s">Add volunteers first to assign them here.</div>') +
      fText('url', 'Link (Drive, signup…)', c.url, 'https://...', 'url') +
      '<div class="tiny faint mt-s">Posters are uploaded from the club row ("Add poster"), like in v1.9.</div>',
    onMount(sh){
      bindDayPills(sh); /* v2.6: day pills were dead in the club sheet - only classSheet bound them */
      $$('[data-volp] .daypill', sh).forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));
    },
    onSave(sh, close){
      const v = collectForm(sh);
      if(!v.name){ toast('Name is required', false); return; }
      v.days = out_days(sh);
      v.lead = v.lead === '—' ? '' : v.lead;
      v.vol = $$('[data-volp] .daypill.on', sh).map(b => b.dataset.v);
      const t = combineSlot(v);
      if(!t){ toast('The end must be after the start', false); return; }
      v.time = t;
      Object.assign(c, v);
      if(isNew) (state.clubs = state.clubs || []).push(c);
      save(); close(); navHTML(); render(); toast(isNew ? 'Club added' : 'Saved');
    }
  });
}
function volSheet(v){
  const isNew = !v;
  v = v || {id: uid(), name:'', role:'Volunteer', phone:'', aso:'', email:''};
  openSheet({
    title: isNew ? 'Add volunteer' : 'Edit volunteer',
    body: fText('name', 'Name', v.name, 'Salma Bennis') +
      fSelect('role', 'Role', v.role || 'Volunteer', ['Lead Intern', 'Volunteer', 'Intern']) +
      '<div class="frow2">' + fText('phone', 'Phone', v.phone, '06...') + fText('aso', 'ASO number', v.aso, 'e.g. 10234') + '</div>',
    onSave(sh, close){
      const val = collectForm(sh);
      if(!val.name){ toast('Name is required', false); return; }
      const oldName = v.name;
      Object.assign(v, val);
      if(isNew) (state.volunteers = state.volunteers || []).push(v);
      else if(oldName && oldName !== v.name){
        (state.clubs || []).forEach(c => {
          if(c.lead === oldName) c.lead = v.name;
          c.vol = (c.vol || []).map(n => n === oldName ? v.name : n);
        });
      }
      save(); close(); navHTML(); render(); toast(isNew ? 'Volunteer added' : 'Saved');
    }
  });
}
function eventSheet(e){
  const isNew = !e;
  e = e || {id: uid(), title:'', desc:'', recur:'weekly', day:'Sat', date:'', time:'', place:''};
  openSheet({
    title: isNew ? 'Add event' : 'Edit event',
    body: fText('title', 'Event name', e.title, 'Conversation Evening') +
      fArea('desc', 'What happens', e.desc, 'Short description', 2) +
      '<div class="frow2">' +
        fSelect('recur', 'Repeats', e.recur === 'none' ? 'One-time' : 'Every week', ['Every week', 'One-time']) +
        (e.recur === 'none' ? '' : '') +
      '</div>' +
      '<div data-evday>' + fSelect('day', 'Day of the week', e.day || 'Sat', DAY_KEYS) + '</div>' +
      '<div data-evdate style="display:none">' + fText('date', 'Date', e.date, '', 'date') + '</div>' +
      '<div class="frow2">' + fSlot('time', 'Time slot', e.time) + venueSelect('place', 'Where', e.place, 'The Main Library (ground floor) is public - weekend events can be held there.') + '</div>',
    onMount(sh){
      const sync = () => {
        const one = $('[data-f="recur"]', sh).value === 'One-time';
        $('[data-evday]', sh).style.display = one ? 'none' : '';
        $('[data-evdate]', sh).style.display = one ? '' : 'none';
      };
      $('[data-f="recur"]', sh).addEventListener('change', sync);
      sync();
    },
    onSave(sh, close){
      const v = collectForm(sh);
      if(!v.title){ toast('Name is required', false); return; }
      e.recur = v.recur === 'One-time' ? 'none' : 'weekly';
      e.day = v.day; e.date = v.date || '';
      if(e.recur === 'none' && !e.date){ toast('Pick a date for a one-time event', false); return; }
      const t = combineSlot(v);
      if(!t){ toast('The end must be after the start', false); return; }
      e.time = t; e.place = v.place;
      e.title = v.title; e.desc = v.desc;
      if(isNew) (state.events = state.events || []).push(e);
      save(); close(); navHTML(); render(); toast(isNew ? 'Event added' : 'Saved');
    }
  });
}

/* ================= Reports (v2.4): how to write them — template + example ================= */
const REPORT_EXAMPLE = /* v2.7/v2.15/v2.16/v2.19: one example, the official form structure - a detailed class report */
'REF-cls-a3b7c1-2026-10-21-1400   <- auto-generated by the site, you never type it\n' +
'Date: 2026-10-21 (Wednesday)\n' +
'Time: 14:00 - 16:00\n' +
'Topic: Kids · Beginners · Week 3 - Colors\n' +
'Speaker: Aya (ASO-K1, Room 1)\n' +
'Total audience: 11   <- auto-filled from the session\u2019s "Number of attendees", locked\n' +
'Type of activities: Class          (Meeting / Club / Event / Workshop / Class)\n' +
'Type of categories: English Language Learning\n' +
'                    (Information about the USA / English Language Learning / Education on the U.S.A. / Alumni Activities / Community Engagement)\n' +
'Summary text:\n' +
'Week 3 introduced the five colour words (red, blue, green, yellow, orange) and the frame "It is [colour].". Eleven learners were registered; nine attended (Imane and Yassine absent, recorded in Attendance). The lesson followed the standard 2-hour arc.\n' +
'\n' +
'After the hello routine, a quick feelings review showed the class still holds four of the six feeling words from Week 2. The new colour vocabulary was presented with large flashcards and modelled in full sentences; most learners could produce "It is red" by the end of the guided practice slot. The listening task ("Listen and colour") gave an honest comprehension check: eight of the nine present matched every description correctly. After the break, the team collage brought the language together. Three teams cut magazine pictures in their colour and presented "It is blue!" to the class. Reading and writing closed the session with tracing and colouring of the five target words.\n' +
'\n' +
'What worked: the team collage. Full sentences from every learner, real pride in the wall gallery, and the "It is [colour]" frame is now stable.\n' +
'What to change: red and orange were confused by three learners (the crayon shades are too close). Next week, use larger and more distinct colour swatches, and pair each colour with a classroom object to keep the words recycling.\n' +
'One concrete step for next week: link colours to classroom objects (the red chair, the blue pen) in Week 4 Numbers, so the colour words are reused in a new context.\n' +
'\n' +
'Drafted by: Aya';
/* v2.5: the official reporting system - steps + link */
const REPORT_SYSTEM_URL = 'https://sites.google.com/view/espaceamericainoujda/accueil/teacher-volunteer-intern-trainer';
const REPORT_STEPS = [
  { t:'Sign in', d:'Open the reporting site and login using your ASO number and password.' },
  { t:'First Class Info', d:'The first tab you should see. Fill in the details of your class: when your class starts, which student category and level, and the repetition - weekly, bi-weekly and so on.' },
  { t:'Participants Management', d:'The next tab. This is where you add all the ASO numbers of all your students. This is also where you put the marks.' },
  { t:'Courses Taught', d:'Register each new session every week here: your number, your full name, when the session happened and the number of attendees.' },
  { t:'Attendance', d:'Mark all the attendance during class - who came and who did not.' },
  { t:'Reports', d:'The final tab - your reports are there once the rest is filled in.' }
];
routes.reports = function(root){
  let h = internHead('Reports', 'How reporting works at ASO: the official system, the form, and one real example.');
  h += '<div class="sect-head"><span class="sect-title">The official reporting system</span></div>';
  h += '<div class="card card-pad mb"><div class="small" style="line-height:1.7">Every teacher, volunteer and intern files the class and session reports on the official ASO reporting site, from any phone or computer. Here is the whole path, in order:</div>' +
    '<div class="list" style="margin-top:10px">';
  REPORT_STEPS.forEach((s, i) => {
    h += '<div class="li-row"><div class="li-ic">' + (i + 1) + '</div>' +
      '<div class="grow"><div class="li-title">' + esc(s.t) + '</div>' +
      '<div class="li-sub">' + esc(s.d) + '</div></div></div>';
  });
  h += '</div>' +
    '<a class="btn primary" style="margin-top:12px;display:inline-flex" href="' + REPORT_SYSTEM_URL + '" target="_blank" rel="noopener">' + icon('ext', 15) + ' Open the reporting site</a></div>';
  h += '<div class="sect-head"><span class="sect-title">The report form, field by field</span></div>';
  h += '<div class="card card-pad mb"><div class="small" style="line-height:1.7">"Send a report" on the site opens this form - fields marked * are required:</div>' +
    '<div class="list" style="margin-top:10px">' +
    '<div class="li-row"><div class="li-ic">' + icon('file', 14) + '</div><div class="grow"><div class="li-title">REF-...</div><div class="li-sub">Auto-generated reference (REF-...-date-time). You never type it.</div></div></div>' +
    '<div class="li-row"><div class="li-ic">' + icon('cal', 14) + '</div><div class="grow"><div class="li-title">Date * · Time *</div><div class="li-sub">The date of the session and its time range, e.g. 11:11 - 23:49.</div></div></div>' +
    '<div class="li-row"><div class="li-ic">' + icon('pencil', 14) + '</div><div class="grow"><div class="li-title">Topic * · Speaker *</div><div class="li-sub">What the session was about, and who ran it - e.g. Khalid Chellali.</div></div></div>' +
    '<div class="li-row"><div class="li-ic">' + icon('users', 14) + '</div><div class="grow"><div class="li-title">Total audience *</div><div class="li-sub">Auto-filled from the "Number of attendees" of the corresponding session and cannot be changed - keep Courses Taught exact and this fills itself.</div></div></div>' +
    '<div class="li-row"><div class="li-ic">' + icon('check', 14) + '</div><div class="grow"><div class="li-title">Type of activities *</div><div class="li-sub">Check all that apply: Meeting · Club · Event · Workshop · Class.</div></div></div>' +
    '<div class="li-row"><div class="li-ic">' + icon('grid', 14) + '</div><div class="grow"><div class="li-title">Type of categories *</div><div class="li-sub">Check all that apply: Information about the USA · English Language Learning · Education on the U.S.A. · Alumni Activities · Community Engagement.</div></div></div>' +
    '<div class="li-row"><div class="li-ic">' + icon('chat', 14) + '</div><div class="grow"><div class="li-title">Summary text * · Drafted by *</div><div class="li-sub">A short honest summary of what happened, then your name.</div></div></div>' +
    '</div></div>';
  h += '<div class="card card-pad mb"><div class="li-title mb-s">Why we report the same way every time</div>' +
    '<div class="small" style="line-height:1.7">Every session gets a short write-up, the same way, every time. Teachers report after classes; the lead intern and volunteers report after clubs and events. ' +
    'It takes two minutes, it keeps the coordinator in the loop without a meeting, and by June it becomes the record of the whole year: what was taught, what worked and what to fix.</div>' +
    '<div class="small mt-s" style="line-height:1.9">' +
    '1. <b>Write it the same day</b> - details fade overnight.<br>' +
    '2. <b>Facts first</b> - name, date, who led, how many came.<br>' +
    '3. <b>Be honest in "what to change"</b> - this is how sessions improve.<br>' +
    '4. <b>One concrete step for next time</b> - never skip it.<br>' +
    '5. <b>Copy the text</b> and send it to the coordinator.</div></div>';
  h += '<div class="sect-head"><span class="sect-title">A filled example</span><span class="right tiny faint">a class report, exactly as the form wants it</span></div>';
  h += '<div class="card card-pad mb"><div class="row mb-s"><div class="li-title grow">Kids · Beginners · W3 Colors - filed on the reporting site</div>' +
    '<button class="btn ghost sm" data-rex>' + icon('copy', 13) + ' Copy example</button></div>' +
    '<div class="rep-doc">' + esc(REPORT_EXAMPLE) + '</div></div>';
  root.innerHTML = h;
  $$('[data-rex]', root).forEach(b => b.addEventListener('click', () => copyText(REPORT_EXAMPLE, 'Example copied')));
};

/* ================= v2.14: public Resources page (Library + Reports in one) =================
   The public nav gets a single "Resources" tab so visitors can reach the
   Drive library and the reporting guide without signing in. The page shows
   both sections stacked, with the admin-only buttons hidden for the public. */
routes.resources = function(root){
  /* ---- Library section (read-only for public) ---- */
  let h = '<div class="page-head"><div class="page-title">Resources</div>' +
    '<div class="page-sub">The Drive library and the reporting guide, open to everyone.</div></div>';
  h += '<div class="sect-head"><span class="sect-title">Library</span><span class="right tiny faint">' +
    state.library.length + ' folders, grouped by category</span></div>';
  h += '<div class="row mb" style="flex-wrap:wrap">' +
    LIB_SKILLS.map(k => '<button class="daypill' + (libFilter === k ? ' on' : '') + '" data-libf="' + k + '">' +
      (k ? k + ' \u00b7 ' + (SKILLS.find(s => s.k === k) || {}).name : 'All skills') + '</button>').join('') +
    '<span class="grow"></span><span class="tiny faint">' + filteredLib().length + ' of ' + state.library.length + ' folders</span></div>';
  const lib = filteredLib();
  /* v2.17: group folders by category, with a section header before each group */
  let lastCat = '';
  lib.forEach(l => {
    const cat = libCategory(l.name);
    if(cat.k !== lastCat){
      h += '<div class="sect-head"><span class="sect-title">' + esc(cat.label) + '</span></div>';
      lastCat = cat.k;
    }
    h += '<div class="li-row tap" data-open="' + esc(l.id) + '">' +
      '<div class="grow"><div class="li-title">' + esc(l.name) + '</div><div class="li-sub">' + esc(l.desc) + '</div>' +
      (l.sk && l.sk.length ? '<div class="row mt-s" style="gap:5px;flex-wrap:wrap">' +
        l.sk.map(k => '<span class="chip sk' + k + '">' + k + ' \u00b7 ' + (SKILLS.find(s => s.k === k) || {}).name + '</span>').join('') + '</div>' : '') + '</div>' +
      '<span class="li-ic" style="background:transparent;color:var(--text3)">' + icon('ext', 15) + '</span></div>';
  });
  if(!lib.length) h += '<div class="card empty">' + icon('folder', 26) + '<div class="t">Nothing for this skill yet</div><div class="s">Pick another skill.</div></div>';
  h += '<div class="row mt-s"><a class="btn plain sm" href="' + esc(state.rootUrl) + '" target="_blank" rel="noopener">' + icon('folder', 14) + ' Open the Drive root</a></div>';

  /* ---- Reports section ---- */
  h += '<div class="sect-head"><span class="sect-title">Reporting guide</span></div>';
  h += '<div class="card card-pad mb"><div class="small" style="line-height:1.7">Every teacher, volunteer and intern files the class and session reports on the official ASO reporting site, from any phone or computer. Here is the whole path, in order:</div>' +
    '<div class="list" style="margin-top:10px">';
  REPORT_STEPS.forEach((s, i) => {
    h += '<div class="li-row"><div class="li-ic">' + (i + 1) + '</div>' +
      '<div class="grow"><div class="li-title">' + esc(s.t) + '</div>' +
      '<div class="li-sub">' + esc(s.d) + '</div></div></div>';
  });
  h += '</div>' +
    '<a class="btn primary" style="margin-top:12px;display:inline-flex" href="' + REPORT_SYSTEM_URL + '" target="_blank" rel="noopener">' + icon('ext', 15) + ' Open the reporting site</a></div>';
  h += '<div class="card card-pad mb"><div class="row mb-s"><div class="li-title grow">Kids · Beginners · W3 Colors - a class report example</div>' +
    '<button class="btn ghost sm" data-rex>' + icon('copy', 13) + ' Copy example</button></div>' +
    '<div class="rep-doc">' + esc(REPORT_EXAMPLE) + '</div></div>';

  root.innerHTML = h;
  $$('[data-libf]', root).forEach(b => b.addEventListener('click', () => { libFilter = b.dataset.libf; render(); }));
  $$('[data-open]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const l = state.library.find(x => x.id === b.dataset.open);
    if(l) window.open(l.url, '_blank', 'noopener');
  }));
  $$('[data-rex]', root).forEach(b => b.addEventListener('click', () => copyText(REPORT_EXAMPLE, 'Example copied')));
};
/* ================= v2.5/v2.10: public clubs & events calendar ================= */
routes.calendar = function(root){
  const canEditC = canEditClub();
  let h = internHead('Clubs & events',
    'The American Space week - club sessions and what is coming up' + (canEditC ? '' : ' · open to everyone'),
    (canEditC ? '<button class="btn primary" data-addclub>' + icon('plus', 15) + ' Add club</button>' : '') +
    '<button class="btn ghost" data-pngc>' + icon('down', 15) + ' Export PNG</button>');
  h += clubGridHTML();
  /* v2.12: events as cards (same design as clubs) instead of a small row list,
     so visitors can click "Learn more" to expand the full description. */
  const evs = (state.events || []).map(e => ({e, d: nextOccurrence(e)})).filter(x => x.d).sort((a, b) => a.d - b.d);
  if(evs.length){
    h += '<div class="sect-head"><span class="sect-title">Upcoming events</span><span class="right tiny faint">' + evs.length + ' events</span></div>';
    h += '<div class="club-grid">';
    evs.forEach(x => { h += eventCardHTML(x.e, canEditClub()); });
    h += '</div>';
  } else {
    h += '<div class="sect-head"><span class="sect-title">Upcoming events</span></div>';
    h += '<div class="card empty">' + icon('cal', 26) + '<div class="t">Nothing scheduled</div><div class="s">Events land here as soon as they exist.</div></div>';
  }
  /* v2.10: below the calendar, list every club as a big card so the public
     can see the full poster and the details for each club in one scroll. */
  const clubs = state.clubs || [];
  if(clubs.length){
    h += '<div class="sect-head"><span class="sect-title">All clubs</span><span class="right tiny faint">' +
      clubs.length + ' clubs · ' + clubs.reduce((n, c) => n + (c.days || []).length, 0) + ' sessions / week</span></div>';
    h += '<div class="club-grid">';
    clubs.forEach(c => { h += clubCardHTML(c, canEditC); });
    h += '</div>';
  }
  root.innerHTML = h;
  const guardMsg = 'Sign in as the admin or the lead intern to make changes';
  $$('[data-editclub]', root).forEach(b => b.addEventListener('click', () => {
    if(!canEditC) return toast(guardMsg, false);
    clubSheet((state.clubs || []).find(c => c.id === b.dataset.editclub));
  }));
  const addC = $('[data-addclub]', root);
  if(addC) addC.addEventListener('click', () => clubSheet(null));
  $$('[data-pngc]', root).forEach(b => b.addEventListener('click', () => exportPng('clubs')));
  /* v2.22: 'PNG with icons' option removed — only the standard PNG export remains. */
  /* v2.12: bindClubCards wires the club card buttons + Learn more;
     bindEventCards wires the event card buttons + Learn more. */
  bindClubCards(root, canEditC);
  bindEventCards(root, canEditC);
};

/* ================= v2.6/v2.21: /login - the admin only, then pick a side ================= */
routes.login = function(root){
  if(isIntern()){ go('#/intern'); return; } /* legacy remembered intern */
  const logo = '<img class="gate-logo" alt="ASO logo" id="loginLogo">';
  if(isAdmin()){ /* signed in - which side? */
    root.innerHTML = '<div class="login-wrap"><div class="gate-box">' + logo +
      '<div class="gate-title">Signed in</div>' +
      '<div class="gate-sub">Which side do you want to open?</div>' +
      '<div class="gate-cards">' +
        '<button class="gate-card" data-side="elt"><span class="gc-ic">' + icon('grid', 20) + '</span>' +
          '<span class="gc-name">ELT side</span><span class="gc-sub">Classes, levels, weekly plans, library, team, settings</span></button>' +
        '<button class="gate-card" data-side="intern"><span class="gc-ic">' + icon('star', 20) + '</span>' +
          '<span class="gc-name">Lead intern side</span><span class="gc-sub">Intern space - clubs, events, volunteers, posters, reports</span></button>' +
      '</div>' +
      '<button class="link-btn" data-pubview style="margin-top:8px">Just browsing? Open the public view</button>' +
      '</div></div>';
    $('#loginLogo').src = LOGO;
    $$('[data-side]', root).forEach(b => b.addEventListener('click', () => {
      setSide(b.dataset.side === 'intern' ? 'intern' : 'elt'); /* v2.6: the side drives the sidebar */
      navHTML();
      go(b.dataset.side === 'intern' ? '#/intern' : '#/home');
    }));
    $('[data-pubview]', root).addEventListener('click', () => { /* v2.7 */
      setPubView(true); navHTML();
      if(location.hash === '#/home') render(); else go('#/home');
      toast('Public preview - tap "Back to admin" to return');
    });
    return;
  }
  /* v2.21: the login page now shows the password field directly, no "Admin"
     button box first. One step instead of two. */
  root.innerHTML = '<div class="login-wrap"><div class="gate-box">' + logo +
    '<div class="gate-title">ASO Companion</div>' +
    '<div class="gate-sub">American Space Oujda - admin sign in</div>' +
    '<div style="margin-top:20px">' + fText('code', 'Access code', '', '4 digits') + '</div>' +
    '<button class="btn primary" style="width:100%;margin-top:10px" data-goapp>Sign in</button>' +
    '<label class="check-row" style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;font-weight:600;cursor:pointer;user-select:none">' +
      '<input type="checkbox" data-remember checked style="width:16px;height:16px;accent-color:var(--accent)"> Remember me on this device</label>' +
    '<button class="link-btn" data-pubview style="margin-top:14px">Just browsing? Open the public view</button>' +
    '</div></div>';
  $('#loginLogo').src = LOGO;
  /* v2.21: inline the sign-in logic (no more sheet) */
  const attempt = () => {
    const inp = root.querySelector('[data-f="code"]');
    if(!inp){ return; }
    const ok = String(state.settings.adminCode || '1234');
    if(inp.value.trim() !== ok){ toast('Wrong admin code', false); return; }
    try{
      if(root.querySelector('[data-remember]') && root.querySelector('[data-remember]').checked) localStorage.setItem(ROLE_KEY, 'admin');
      else sessionStorage.setItem(ROLE_KEY, 'admin');
    }catch(e){}
    setPubView(false); /* v2.7 */
    navHTML();
    render(); /* re-render /login -> shows the side chooser now that isAdmin() is true */
    toast('Welcome');
  };
  root.querySelector('[data-goapp]').addEventListener('click', attempt);
  root.querySelector('[data-f="code"]').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); attempt(); } });
  root.querySelector('[data-pubview]').addEventListener('click', () => { /* v2.7 */
    setPubView(true); navHTML();
    if(location.hash === '#/home') render(); else go('#/home');
    toast('Public preview - tap "Back to admin" to return');
  });
};

function out_days(sh){
  return $$('.daypill.on', $('[data-days]', sh) || sh).map(b => b.dataset.day);
}
