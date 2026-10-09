/* ================= Views: Home + Level ================= */

let lvSeg = 0;           // 0 = S1, 1 = S2
const lvOpen = new Set();
let lvFlash = -1;        // week index to scroll to

function segHTML(options, active){
  let h = '<div class="seg" data-seg>';
  options.forEach((o, i) => { h += '<button class="seg-btn' + (i === active ? ' on' : '') + '" data-segi="' + i + '">' + esc(o) + '</button>'; });
  h += '<span class="seg-ind"></span></div>';
  return h;
}
function mountSeg(root, onChange){
  const seg = $('[data-seg]', root);
  if(!seg) return;
  const ind = $('.seg-ind', seg);
  const btns = $$('.seg-btn', seg);
  const place = () => {
    const on = $('.seg-btn.on', seg);
    if(!on) return;
    ind.style.width = on.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + (on.offsetLeft - 2.5) + 'px)';
  };
  place();
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    place();
    onChange(+b.dataset.segi);
  }));
  setTimeout(place, 60);
}

function driveLinksHTML(urls, res){
  if(!urls || !urls.length) return '<span class="faint">No Drive link set</span>';
  const segs = String(res || '').split(';').map(s => s.trim()).filter(Boolean);
  return urls.map((u, i) => {
    const label = segs.length === urls.length ? segs[i] : ('Drive folder ' + (i + 1));
    return '<div class="dl-row"><span class="dl-ic">' + icon('ext', 14) + '</span><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(label) + '</a></div>';
  }).join('');
}

/* ---------- weekly timetable ---------- */
function ttPad(n){ return String(n).padStart(2, '0'); }
/* v2.23: parseSlot now rounds the start time to the nearest hour for the row
   key, so events starting in the same hour (e.g. 15:00-17:00 and 15:30-17:30)
   share a row instead of creating separate rows. The full time range is kept
   as the label. This fixes the overlapping-time-slot confusion: events at
   15:00 and 16:00 are in different rows (correct — they start at different
   hours), but events at 15:00 and 15:30 are in the same row side by side. */
function parseSlot(t){
  const s = String(t || '').replace(/\s/g, '');
  let m = s.match(/^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/);
  if(m){
    const startHour = +m[1];
    return {
      k: 'h' + ttPad(startHour),
      label: ttPad(m[1]) + ':' + m[2] + '\u2013' + ttPad(m[3]) + ':' + m[4],
      mins: startHour * 60 + (+m[2])
    };
  }
  m = s.match(/^(\d{1,2})[:.](\d{2})$/);
  if(m) return {k:'h' + ttPad(+m[1]), label: ttPad(m[1]) + ':' + m[2], mins:(+m[1]) * 60 + (+m[2])};
  m = s.match(/^(\d{1,2})[:.](\d{2})?/);
  if(m) return {k:'h' + ttPad(+m[1]), label: ttPad(m[1]) + ':' + (m[2] || '00'), mins:(+m[1]) * 60 + (+m[2] || 0)};
  return {k:'raw:' + s, label: s || '\u2014', mins: 9999};
}
function toneClass(levelLabel){
  let i = state.levels.findIndex(l => l.label === levelLabel);
  if(i < 0){
    const s = String(levelLabel || '?'); let hsh = 0;
    for(let k = 0; k < s.length; k++) hsh = (hsh * 31 + s.charCodeAt(k)) >>> 0;
    i = hsh;
  }
  return 'tone-' + (i % 9);
}
function ttGridHTML(){
  if(!state.classes.length){
    return '<div class="card empty">' + icon('cal', 26) + '<div class="t">No classes yet</div><div class="s">The weekly timetable appears here once classes are added.</div></div>';
  }
  const slots = [], seen = {};
  state.classes.forEach(c => { const s = parseSlot(c.time); if(!seen[s.k]){ seen[s.k] = 1; slots.push(s); } });
  slots.sort((a, b) => a.mins - b.mins || a.label.localeCompare(b.label));
  const todayKey = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
  const stt = termStatus();
  let wkMon = null;
  if(stt.mode === 's1' || stt.mode === 's2') wkMon = weekMonday(stt.week - 1);
  else if(stt.mode === 'before') wkMon = stt.s1;
  else if(stt.mode === 'break') wkMon = stt.s2;
  const parsed = state.classes.map(c => ({c, s: parseSlot(c.time)}));
  let head = '<div class="tt-corner"></div>';
  DAY_KEYS.forEach((d, i) => {
    const dd = wkMon ? addDays(wkMon, i) : null;
    head += '<div class="tt-h' + (d === todayKey ? ' tt-today' : '') + '"><span class="tt-dname">' + d + '</span>' +
      (dd ? '<span class="tt-dnum">' + dd.getDate() + '</span>' : '') + '</div>';
  });
  let body = '';
  slots.forEach(s => {
    body += '<div class="tt-time">' + esc(s.label) + '</div>';
    DAY_KEYS.forEach(d => {
      const here = parsed.filter(p => (p.c.days || []).indexOf(d) > -1 && p.s.k === s.k);
      body += '<div class="tt-cell' + (d === todayKey ? ' tt-today' : '') + '">' +
        here.map(p => (canEdit() ? '<button type="button" class="tt-chip ' + toneClass(p.c.level) + '" data-ttc="' + esc(p.c.id) + '">' : '<div class="tt-chip ' + toneClass(p.c.level) + '">') +
          '<span class="tt-code"><i class="tt-dot"></i>' + esc(p.c.code) + '</span>' +
          '<span class="tt-meta">' + esc([p.c.level, p.c.teacher, p.c.room].filter(Boolean).join(' · ')) + '</span>' + (canEdit() ? '</button>' : '</div>')).join('') +
        '</div>';
    });
  });
  const floating = state.classes.filter(c => !(c.days || []).length).length;
  /* v2.2: legend = the levels actually used by classes, visible ones first */
  const used = [];
  state.classes.forEach(c => { if(c.level && used.indexOf(c.level) === -1) used.push(c.level); });
  const visLabs = visLevels().map(l => l.label);
  const legendLabels = used.filter(l => visLabs.indexOf(l) > -1).concat(used.filter(l => visLabs.indexOf(l) === -1));
  const legend = '<div class="tt-legend">' +
    legendLabels.map(l => '<span class="lg"><i class="' + toneClass(l) + '"></i>' + esc(l) + '</span>').join('') +
    (floating ? '<span class="lg">' + floating + ' class' + (floating > 1 ? 'es' : '') + ' without a day</span>' : '') + '</div>';
  return '<div class="card tt-card"><div class="tt-wrap"><div class="tt">' + head + body + '</div></div>' + legend + '</div>';
}

/* ==================== HOME ==================== */
/* v2.8: one front page, one order for everyone -
   teachers calendar, clubs & events calendar, then what is happening today.
   Admin extras (term status, weekly plans by group, quick library) sit below;
   the public view ends at Today, and the greeting carries no name. */
function homeHero(){
  const now = new Date();
  const dateLine = fmtD(now, {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const named = isAdmin() && !pubView(); /* v2.8: no "Khalid" after Good afternoon for the public */
  return '<div class="hero"><div class="grow"><div class="greet-time">' + esc(dateLine) + '</div>' +
    '<div class="hi">' + esc(greeting()) + (named ? ', ' + esc(String(state.settings.coordinator || '').split(' ')[0]) : '') + '</div></div></div>';
}
function homeUpcomingHTML(limit){
  const evs = (state.events || []).map(e => ({e, d: nextOccurrence(e)})).filter(x => x.d)
    .sort((a, b) => a.d - b.d).slice(0, limit || 3);
  if(!evs.length) return '';
  return '<div class="list">' + evs.map(x =>
    '<div class="li-row"><div class="li-ic">' + icon('star', 15) + '</div>' +
    '<div class="grow"><div class="li-title">' + esc(x.e.title) + '</div>' +
    '<div class="li-sub">' + esc([fmtD(x.d, {weekday:'long', day:'numeric', month:'long'}), x.e.time, x.e.place].filter(Boolean).join(' \u00b7 ')) + '</div></div>' +
    '<span class="chip gold">' + esc(fmtEventWhen(x.e)) + '</span></div>').join('') + '</div>';
}
function homeTodayHTML(){
  const now = new Date();
  const dayKey = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];
  const items = [];
  (state.classes || []).forEach(c => {
    if((c.days || []).indexOf(dayKey) < 0) return;
    items.push({mins: parseSlot(c.time).mins, html:
      '<div class="li-row"><div class="li-ic">' + icon('book', 15) + '</div>' +
      '<div class="grow"><div class="li-title">' + esc(c.code) + ' \u00b7 ' + esc(c.level) + '</div>' +
      '<div class="li-sub">' + esc(c.time) + (c.room ? ' \u00b7 ' + esc(c.room) : '') + (c.teacher ? ' \u00b7 ' + esc(c.teacher) : '') + '</div></div>' +
      '<span class="chip">class</span></div>'});
  });
  (state.clubs || []).forEach(c => {
    if((c.days || []).indexOf(dayKey) < 0) return;
    items.push({mins: parseSlot(c.time).mins, html:
      '<div class="li-row"><div class="li-ic">' + icon('star', 15) + '</div>' +
      '<div class="grow"><div class="li-title">' + esc(c.name) + '</div>' +
      '<div class="li-sub">' + esc(c.time) + (c.room ? ' \u00b7 ' + esc(c.room) : '') + (c.lead ? ' \u00b7 lead: ' + esc(c.lead) : '') + '</div></div>' +
      '<span class="chip blue">club</span></div>'});
  });
  (state.events || []).forEach(e => {
    const isToday = e.recur === 'none'
      ? (e.date && +parseISO(e.date) === +startOfDay(now))
      : DAY_KEYS.indexOf(e.day) === (now.getDay() + 6) % 7;
    if(!isToday) return;
    items.push({mins: parseSlot(e.time || '23:59').mins, html:
      '<div class="li-row"><div class="li-ic">' + icon('cal', 15) + '</div>' +
      '<div class="grow"><div class="li-title">' + esc(e.title) + '</div>' +
      '<div class="li-sub">' + esc([e.time, e.place].filter(Boolean).join(' \u00b7 ') || 'all day') + '</div></div>' +
      '<span class="chip gold">event</span></div>'});
  });
  items.sort((a, b) => a.mins - b.mins);
  let h = '<div class="sect-head"><span class="sect-title">Today \u00b7 ' + esc(DAY_FULL[dayKey] || dayKey) + '</span>' +
    '<span class="right"><span class="tiny faint">' + (items.length ? items.length + ' on today' : 'all clear') + '</span></span></div>';
  if(items.length) h += '<div class="list">' + items.map(i => i.html).join('') + '</div>';
  else h += '<div class="card empty">' + icon('coffee', 26) + '<div class="t">Nothing on today</div><div class="s">No classes, clubs or events today.</div></div>';
  return h;
}
routes.home = function(root){
  const admin = isAdmin() && !pubView(); /* v2.8: the preview sees the public home */
  const st = termStatus();
  let h = homeHero();

  if(admin){
    if(st.mode === 's1' || st.mode === 's2'){
      const mon = weekMonday(st.week - 1);
      const sun = addDays(mon, 6);
      const isLast = st.mode === 's1' ? st.week === st.n1 : st.week === totalWeeks();
      h += '<div class="card status-card"><div class="status-ic">' + icon('cal', 20) + '</div>' +
        '<div class="grow"><div class="big">' + semOf(st.week - 1) + ' · Week ' + st.week + ' of ' + totalWeeks() + '</div>' +
        '<div class="sm2">' + fmtD(mon) + ' – ' + fmtD(sun) +
        (noteFor(st.week - 1) ? ' · ' + esc(noteFor(st.week - 1)) : '') +
        (isLast ? ' · final teaching week' : '') + '</div></div></div>';
    } else if(st.mode === 'break'){
      h += '<div class="card status-card"><div class="status-ic" style="background:var(--gold-tint);color:var(--gold)">' + icon('coffee', 20) + '</div>' +
        '<div class="grow"><div class="big">Winter break</div><div class="sm2">Semester 2 starts Monday ' + fmtD(st.s2, {day:'numeric', month:'long', year:'numeric'}) + ' (Week ' + st.nextWeek + ') - in ' + st.daysTo + ' days</div></div></div>';
    } else if(st.mode === 'before'){
      h += '<div class="card status-card"><div class="status-ic" style="background:var(--gold-tint);color:var(--gold)">' + icon('cal', 20) + '</div>' +
        '<div class="grow"><div class="big">The year starts Monday ' + fmtD(st.s1, {day:'numeric', month:'long'}) + '</div><div class="sm2">' + st.daysTo + ' days to go - set term dates any time in Settings</div></div></div>';
    } else {
      h += '<div class="card status-card"><div class="status-ic" style="background:var(--ok-tint);color:var(--ok)">' + icon('star', 20) + '</div>' +
        '<div class="grow"><div class="big">Year complete - well done!</div><div class="sm2">Set the new term start dates in Settings when next year is planned</div></div></div>';
    }
  }

  /* v2.8 front-page order: teachers calendar -> clubs & events -> today */
  h += '<div class="sect-head"><span class="sect-title">Teachers calendar</span><span class="right">' +
    (admin ? '<button class="link-btn" data-addc>' + icon('plus', 13) + ' Add class</button>' : '') +
    '<button class="link-btn" data-pngsched>' + icon('down', 13) + ' Export PNG</button></span></div>' + ttGridHTML();

  h += '<div class="sect-head"><span class="sect-title">Clubs &amp; events</span><span class="right"><button class="link-btn" data-go="#/calendar">Open calendar</button></span></div>' +
    clubGridHTML() + homeUpcomingHTML(3);

  h += homeTodayHTML();

  if(admin){
    h += '<div class="sect-head"><span class="sect-title">This week by group</span></div>';
    let curBand = null;
    visLevels().forEach(lv => {
      const b = lv.band || '';
      if(b !== curBand){
        if(curBand !== null) h += '</div>';
        curBand = b;
        h += (b ? '<div class="band-head">' + esc(b) + '</div>' : '') + '<div class="lv-grid">';
      }
      h += levelCard(lv, st);
    });
    if(curBand !== null) h += '</div>';

    h += '<div class="sect-head"><span class="sect-title">Quick library</span><span class="right"><button class="link-btn" data-go="#/library">See all</button></span></div>';
    h += '<div class="qk-grid">';
    libSorted().slice(0, 3).forEach(l => {
      h += '<a class="qk" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + icon('folder', 16) + '<span class="qk-label grow">' + esc(l.name) + '</span>' + icon('ext', 13) + '</a>';
    });
    h += '<a class="qk" href="' + esc(state.rootUrl) + '" target="_blank" rel="noopener">' + icon('folder', 16) + '<span class="qk-label grow">Drive root</span>' + icon('ext', 13) + '</a>';
    h += '</div>';
  }

  root.innerHTML = h;

  $$('[data-open]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); go('#/lv/' + b.dataset.open); }));
  if(admin){ /* v2.8: timetable + club chips open their edit sheets for the admin only */
    $$('[data-ttc]', root).forEach(b => b.addEventListener('click', () => {
      const c = state.classes.find(x => x.id === b.dataset.ttc);
      if(c) classSheet(c);
    }));
    $$('[data-addc]', root).forEach(b => b.addEventListener('click', () => classSheet(null)));
    $$('[data-editclub]', root).forEach(b => b.addEventListener('click', () => {
      const c = (state.clubs || []).find(x => x.id === b.dataset.editclub);
      if(c) clubSheet(c);
    }));
  }
  $$('[data-pngsched]', root).forEach(b => b.addEventListener('click', () => exportPng('sched')));
}

/* ==================== v2.8/v2.10: MENU -> ELTASO - the teacher section ==================== */
routes.menu = function(root){
  const st = termStatus();
  let h = '<div class="page-head"><div class="page-title">ELTASO</div>' +
    '<div class="page-sub">The teacher section - weekly plans for every level, the library and reports.</div></div>';
  h += '<div class="sect-head"><span class="sect-title">Weekly plans</span></div>';
  let curBand = null;
  visLevels().forEach(lv => {
    const b = lv.band || '';
    if(b !== curBand){
      if(curBand !== null) h += '</div>';
      curBand = b;
      h += (b ? '<div class="band-head">' + esc(b) + '</div>' : '') + '<div class="lv-grid">';
    }
    h += levelCard(lv, st);
  });
  if(curBand !== null) h += '</div>';
  h += '<div class="sect-head"><span class="sect-title">Library</span><span class="right"><button class="link-btn" data-go="#/library">Open library</button></span></div>';
  h += '<div class="qk-grid">';
  libSorted().slice(0, 3).forEach(l => {
    h += '<a class="qk" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + icon('folder', 16) + '<span class="qk-label grow">' + esc(l.name) + '</span>' + icon('ext', 13) + '</a>';
  });
  h += '<a class="qk" href="' + esc(state.rootUrl) + '" target="_blank" rel="noopener">' + icon('folder', 16) + '<span class="qk-label grow">Drive root</span>' + icon('ext', 13) + '</a>';
  h += '</div>';
  h += '<div class="sect-head"><span class="sect-title">Reports</span></div>';
  h += '<div class="card card-pad" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
    '<div class="grow"><div class="li-title">How reporting works at ASO</div>' +
    '<div class="li-sub">The official reporting system step by step, the form field by field, and one real example.</div></div>' +
    '<button class="btn primary sm" data-go="#/reports">' + icon('file', 13) + ' Open reports</button></div>';
  root.innerHTML = h;
  $$('[data-open]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); go('#/lv/' + b.dataset.open); }));
}

function levelCard(lv, st){
  const inSession = st.mode === 's1' || st.mode === 's2';
  const wi = inSession ? st.week - 1 : -1;
  const w = (wi >= 0 && wi < lv.weeks.length) ? lv.weeks[wi] : null;
  const showWi = w ? wi : Math.min(lv.weeks.length - 1, Math.max(0, wi));
  const sw = lv.weeks[showWi];
  let inner;
  if(sw){
    /* v2.16/v2.18: removed the per-week objective line from the level card
       and replaced it with the general level description (lv.desc). The
       "This week · W1" line and theme still show so teachers can see where
       the class is, but the body of the card describes the whole level. */
    inner = '<div class="wk-line">' + (w ? 'This week · W' : 'Next up · W') + (showWi + 1) + ' · ' + esc(sw.theme || '—') + '</div>' +
      '<div class="obj-line clamp3">' + esc(lv.desc || '') + '</div>' +
      '<div class="lv-foot"><span class="grow"></span>' +
      '<button class="btn ghost sm" data-open="' + esc(lv.key) + '">Open</button></div>';
  } else {
    inner = '<div class="obj-line clamp3">' + esc(lv.desc || 'No weeks planned yet.') + '</div>';
  }
  return '<div class="card lv-card" data-go="#/lv/' + esc(lv.key) + '">' +
    '<div class="lv-top"><div class="lv-name grow">' + esc(lv.label) + '</div><span class="chip blue">' + esc(lv.cefr || '') + '</span></div>' +
    inner + '</div>';
}

/* ==================== LEVEL ==================== */
routes.lv = function(root, key){
  const lv = state.levels.find(l => l.key === key);
  if(!lv){ go('#/home'); return; }
  const st = termStatus();
  const n1 = s1Weeks();
  const total = lv.weeks.length;
  const inS1 = lvSeg === 0;
  const from = inS1 ? 0 : n1;
  const to = inS1 ? Math.min(n1, total) : total;
  const curWi = (st.mode === 's1' || st.mode === 's2') ? st.week - 1 : -1;

  let h = '<div class="page-head row">' +
    '<div class="grow"><div class="page-title" style="display:flex;align-items:center;gap:10px">' + esc(lv.label) + ' <span class="chip blue">' + esc(lv.cefr || '') + '</span></div>' +
    '<div class="page-sub">' + total + ' weeks · ' + esc(state.settings.year) + ' · all four skills weekly · tap a week to open it</div></div>' +
    '<button class="icon-btn" data-exportdoc="' + esc(lv.key) + '" title="Export this level as Word (.doc)">' + icon('file', 16) + '</button>' +
    '<button class="icon-btn" data-exportxlsx="' + esc(lv.key) + '" title="Export this level as Excel (.xlsx)">' + icon('grid', 16) + '</button>' +
    (lv.key === 'kids-beg' ? '<button class="icon-btn" data-packguide title="Lesson plan pack guide">' + icon('star', 16) + '</button>' : '') +
    '<button class="icon-btn" data-editlev title="Rename / remove level">' + icon('pencil', 16) + '</button></div>';

  // current week banner
  if(curWi >= 0 && curWi < total){
    const w = lv.weeks[curWi];
    h += '<div class="card status-card" style="border-color:var(--accent)" data-flashwi="' + curWi + '">' +
      '<div class="status-ic">' + icon('cal', 20) + '</div>' +
      '<div class="grow"><div class="big">This week · W' + (curWi + 1) + ' · ' + esc(w.theme || '—') + '</div>' +
      '<div class="sm2">' + fmtD(weekMonday(curWi), {day:'numeric', month:'long'}) + (noteFor(curWi) ? ' · ' + esc(noteFor(curWi)) : '') + '</div></div>' +
      '<button class="btn ghost sm" data-openwk="' + curWi + '">Open week</button></div>';
  }

  h += '<div class="row mb" style="margin-top:16px">' + segHTML(['Semester 1', 'Semester 2'], lvSeg) +
    '<span class="grow"></span><span class="tiny faint">' + (inS1 ? 'Weeks 1–' + n1 : 'Weeks ' + (n1 + 1) + '–' + Math.max(n1 + 1, total)) + '</span></div>';

  if(from >= to){
    h += '<div class="card empty">' + icon('book', 26) + '<div class="t">No weeks in this semester yet</div><div class="s">Add one below.</div></div>';
  }
  for(let wi = from; wi < to; wi++){
    h += weekRow(lv, wi, curWi);
  }
  h += '<button class="btn plain mt" data-addweek style="width:100%">' + icon('plus', 15) + ' Add week ' + (total + 1) + '</button>';

  root.innerHTML = h;

  mountSeg(root, i => { lvSeg = i; render(); });
  $$('[data-wk]', root).forEach(row => {
    row.querySelector('.wk-head').addEventListener('click', () => {
      const wi = +row.dataset.wk;
      if(lvOpen.has(wi)) lvOpen.delete(wi); else lvOpen.add(wi);
      row.classList.toggle('open');
    });
  });
  $$('[data-openwk]', root).forEach(b => b.addEventListener('click', () => {
    const wi = +b.dataset.openwk;
    lvOpen.add(wi);
    if((wi < n1 ? 0 : 1) !== lvSeg){ lvSeg = wi < n1 ? 0 : 1; }
    render();
    setTimeout(() => {
      const el = $('[data-wk="' + wi + '"]', root);
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 120);
  }));
  const addBtn = $('[data-addweek]', root);
  if(addBtn){
    if(!isAdmin() || pubView()) addBtn.style.display = 'none';
    else addBtn.addEventListener('click', () => {
      lv.weeks.push({theme:'', obj:'', lang:'', res:'', urls:[], act:'', hw:'', skills:{L:'',S:'',R:'',W:''}});
      save(); lvOpen.add(lv.weeks.length - 1); render();
      toast('Week ' + lv.weeks.length + ' added');
    });
  }
  const editBtn = $('[data-editlev]', root);
  if(editBtn){
    if(!isAdmin() || pubView()) editBtn.style.display = 'none';
    else editBtn.addEventListener('click', () => levelSheet(lv));
  }
  $$('[data-exportxlsx]', root).forEach(b => b.addEventListener('click', () => exportLevelXlsx(lv)));
  $$('[data-exportdoc]', root).forEach(b => b.addEventListener('click', () => exportLevelDoc(lv)));
  $$('[data-editwk]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if(isAdmin() && !pubView()) weekSheet(lv, +b.dataset.editwk);
  }));
  $$('[data-lpwi]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    lessonPlanSheet(lv, +b.dataset.lpwi);
  }));
  const pgBtn = $('[data-packguide]', root);
  if(pgBtn) pgBtn.addEventListener('click', () => packGuideSheet());
  if(lvFlash > -1){
    const wi = lvFlash; lvFlash = -1;
    setTimeout(() => {
      const el = $('[data-wk="' + wi + '"]', root);
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 150);
  }
}

function weekRow(lv, wi, curWi){
  const w = lv.weeks[wi];
  const note = noteFor(wi);
  const isCur = wi === curWi;
  return '<div class="wk' + (lvOpen.has(wi) ? ' open' : '') + (isCur ? ' current' : '') + '" data-wk="' + wi + '">' +
    '<div class="wk-head">' +
      '<div class="wk-num">' + (wi + 1) + '<small>WEEK</small></div>' +
      '<div class="grow"><div class="wk-theme">' + esc(w.theme || 'Untitled week') + '</div>' +
      '<div class="wk-meta"><span>' + fmtD(weekMonday(wi)) + '</span>' + skillChips(w, wi, true) +
      (isCur ? '<span class="wk-current-chip">THIS WEEK</span>' : '') +
      (note ? '<span class="chip gold">' + icon('star', 10) + esc(note) + '</span>' : '') + '</div></div>' +
      '<span class="wk-chev">' + icon('chevR', 17) + '</span></div>' +
    '<div class="wk-body"><div class="wk-body-in"><div class="wk-content">' +
      '<div class="kv"><div class="k">Objectives</div><div class="v">' + escNl(w.obj || '—') + '</div></div>' +
      skillsBlockHTML(w, wi) +
      '<div class="kv"><div class="k">Key language</div><div class="v">' + escNl(w.lang || '—') + '</div></div>' +
      '<div class="kv"><div class="k">Resources</div><div class="v">' + escNl(w.res || '—') + '<div class="mt-s">' + driveLinksHTML(w.urls, w.res) + '</div></div></div>' +
      '<div class="kv"><div class="k">Activities</div><div class="v">' + escNl(w.act || '—') + '</div></div>' +
      '<div class="kv"><div class="k">Homework</div><div class="v">' + escNl(w.hw || '—') + '</div></div>' +
      '<div class="divider"></div>' +
      '<div class="wk-actions">' +
        (canEdit() ? '<button class="btn ghost sm" data-editwk="' + wi + '">' + icon('pencil', 13) + ' Edit week</button>' : '') +
        /* v2.13: always show the Lesson plan button — it opens the detailed
           lesson plan if `lp` exists, otherwise a "coming soon" view. */
        '<button class="btn ghost sm" data-lpwi="' + wi + '">' + icon('book', 13) + ' Lesson plan</button>' +
      '</div>' +
    '</div></div></div></div>';
}

function refreshLevel(root, key){
  const sc = $('#content').scrollTop;
  routes.lv(root, key);
  $('#content').scrollTop = sc;
}
