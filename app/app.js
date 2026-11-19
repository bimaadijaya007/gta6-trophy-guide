// GTA 6 Trophy Guide — offline tracker.
// Loads the trophy data from data/trophies.json (a local file, no network),
// keeps earned trophies in localStorage, and renders the checklist, the
// detail panel, the 6-stage roadmap and the missables section from it.
// Sources are shown as plain text (never links), so the page fetches nothing.

const STORAGE_KEY = 'gta6-trophy-guide-v1';
const DATA_URL = 'data/trophies.json';

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectible: 'Collectible',
  activity: 'Activity',
  combat: 'Combat',
  economy: 'Economy',
  exploration: 'Exploration',
};

const STAGE_INFO = [
  { n: 1, title: 'Story — Chapters 1-5', text: 'Play the story through. All chapter and mission trophies pop automatically. Do the one missable thing while you are here: the Chapter 1 meditation for Positive Mental Attitude.' },
  { n: 2, title: 'Final mission + 100% completion', text: 'Finish the final mission (gold), then open the 100% Completion checklist under Progress, Stats, 100% Completion and work it — it is closer to 60% true completion.' },
  { n: 3, title: 'Strangers & side missions', text: 'Finish the character questlines (Andy, Kenton, Billy, Randy, Tyrone), the 8 Strangers & Freaks strands, Cal\'s fishing, Bret\'s hunting and the Kingpin Bowling valuables.' },
  { n: 4, title: 'Collectibles', text: 'Card sets, WAiNK scans, vehicle discoveries and unfogging the whole map of Leonida.' },
  { n: 5, title: 'Activities & challenges', text: 'Shooting ranges, drone races, races, arcade games, challenges, partner robberies, the VCIA plane, the tank, and the still-unconfirmed odd ones.' },
  { n: 6, title: 'Cleanup & grinds', text: 'Stunts, bank vaults, gang operations, the criminal-profile count, laundering, shopping and garages — then the platinum pops.' },
];

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detail');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const kindEl = document.getElementById('kindFilters');
const hideEarnedEl = document.getElementById('hideEarned');
const spoilerEl = document.getElementById('spoilerToggle');
const countEl = document.getElementById('listCount');
const emptyEl = document.getElementById('emptyState');

let trophies = [];
let earned = new Set();
let selectedId = 1;
let activeKind = 'all';

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Array.isArray(raw.earned)) earned = new Set(raw.earned.filter((id) => Number.isInteger(id)));
    if (typeof raw.spoiler === 'boolean') spoilerEl.checked = raw.spoiler;
    if (typeof raw.hideEarned === 'boolean') hideEarnedEl.checked = raw.hideEarned;
  } catch {
    earned = new Set();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    earned: [...earned].sort((a, b) => a - b),
    spoiler: spoilerEl.checked,
    hideEarned: hideEarnedEl.checked,
  }));
}

function isSpoilered(t) {
  return spoilerEl.checked && t.kind === 'story' && !earned.has(t.id);
}

function gradeBadge(t) {
  const span = document.createElement('span');
  span.className = 'badge ' + t.grade;
  span.textContent = t.grade;
  return span;
}

function kindTag(t) {
  const span = document.createElement('span');
  span.className = 'tag';
  span.textContent = KIND_LABELS[t.kind] || t.kind;
  return span;
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressText').textContent = done + ' / ' + total + ' earned';
  document.getElementById('progressPct').textContent = pct + '%';
  const fill = document.getElementById('progressFill');
  fill.style.width = pct + '%';
  document.getElementById('progressBar').setAttribute('aria-valuenow', String(done));
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] || { done: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (earned.has(t.id)) byGrade[t.grade].done += 1;
  }
  const order = ['platinum', 'gold', 'silver', 'bronze'];
  document.getElementById('gradeBreakdown').textContent = order
    .filter((g) => byGrade[g])
    .map((g) => g[0].toUpperCase() + g.slice(1) + ' ' + byGrade[g].done + '/' + byGrade[g].total)
    .join(' · ');
}

function trophyMatches(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.chapter || '')).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (activeKind === 'missable') {
    if (!t.missable) return false;
  } else if (activeKind !== 'all' && t.kind !== activeKind) {
    return false;
  }
  if (hideEarnedEl.checked && earned.has(t.id)) return false;
  return true;
}

function renderList() {
  listEl.replaceChildren();
  let shown = 0;
  for (const t of trophies) {
    if (!trophyMatches(t)) continue;
    shown += 1;
    const li = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'trophy-card' + (earned.has(t.id) ? ' earned' : '') + (t.id === selectedId ? ' selected' : '');
    card.dataset.trophyId = String(t.id);
    card.setAttribute('aria-pressed', earned.has(t.id) ? 'true' : 'false');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'trophy-check';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    box.addEventListener('click', (event) => {
      event.stopPropagation();
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveState();
      renderAll();
    });

    const body = document.createElement('span');
    body.className = 'trophy-body';
    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = isSpoilered(t) ? 'Hidden story trophy' : t.name;
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.style.display = 'block';
    desc.textContent = isSpoilered(t)
      ? 'Hidden until earned — spoiler-free mode is on.'
      : t.description;
    const meta = document.createElement('span');
    meta.className = 'trophy-meta';
    meta.append(gradeBadge(t), kindTag(t));
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag missable';
      m.textContent = 'Missable';
      meta.append(m);
    }
    const stage = document.createElement('span');
    stage.className = 'tag stage';
    stage.textContent = 'Stage ' + t.roadmap_stage;
    meta.append(stage);
    if (t.chapter) {
      const ch = document.createElement('span');
      ch.className = 'tag';
      ch.textContent = isSpoilered(t) ? 'Story' : t.chapter;
      meta.append(ch);
    }
    body.append(name, desc, meta);
    card.append(box, body);
    card.addEventListener('click', () => {
      selectedId = t.id;
      renderAll();
    });
    li.append(card);
    listEl.append(li);
  }
  countEl.textContent = shown + ' of ' + trophies.length + ' trophies shown';
  emptyEl.hidden = shown !== 0;
}

function renderDetail() {
  const t = trophies.find((x) => x.id === selectedId) || trophies[0];
  if (!t) { detailEl.replaceChildren(); return; }
  detailEl.replaceChildren();
  const hidden = isSpoilered(t);

  const title = document.createElement('h2');
  title.textContent = hidden ? 'Hidden story trophy' : t.name;
  detailEl.append(title);

  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  meta.append(gradeBadge(t), kindTag(t));
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag missable';
    m.textContent = 'Missable';
    meta.append(m);
  }
  const stage = document.createElement('span');
  stage.className = 'tag stage';
  stage.textContent = 'Roadmap stage ' + t.roadmap_stage;
  meta.append(stage);
  if (t.chapter && !hidden) {
    const ch = document.createElement('span');
    ch.className = 'tag';
    ch.textContent = t.chapter;
    meta.append(ch);
  }
  detailEl.append(meta);

  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = hidden
    ? 'Official description hidden until earned — spoiler-free mode is on.'
    : 'Official: "' + t.description + '"';
  detailEl.append(official);

  if (hidden) {
    const note = document.createElement('p');
    note.className = 'spoiler-hidden';
    note.textContent = 'Turn spoiler-free mode off, or tick this trophy as earned, to reveal its guide.';
    detailEl.append(note);
  } else {
    const guide = document.createElement('p');
    guide.className = 'guide';
    guide.textContent = t.guide;
    detailEl.append(guide);

    if (Array.isArray(t.steps) && t.steps.length) {
      const h = document.createElement('h3');
      h.textContent = 'Steps';
      const ol = document.createElement('ol');
      for (const s of t.steps) {
        const li = document.createElement('li');
        li.textContent = s;
        ol.append(li);
      }
      detailEl.append(h, ol);
    }
  }

  if (t.missable && t.missable_note && !hidden) {
    const note = document.createElement('p');
    note.className = 'missable-note';
    const strong = document.createElement('strong');
    strong.textContent = 'Missable: ';
    note.append(strong, document.createTextNode(t.missable_note));
    detailEl.append(note);
  }

  if (Array.isArray(t.sources) && t.sources.length && !hidden) {
    const wrap = document.createElement('div');
    wrap.className = 'sources';
    const h = document.createElement('h3');
    h.textContent = 'Sources';
    wrap.append(h);
    for (const s of t.sources) {
      const line = document.createElement('p');
      line.className = 'source-line';
      const b = document.createElement('b');
      b.textContent = s.name;
      line.append(b, document.createTextNode(' — ' + s.url));
      wrap.append(line);
    }
    detailEl.append(wrap);
  }

  const earnedBtn = document.createElement('button');
  earnedBtn.type = 'button';
  earnedBtn.textContent = earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  earnedBtn.addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id); else earned.add(t.id);
    saveState();
    renderAll();
  });
  detailEl.append(earnedBtn);
}

function renderRoadmap() {
  const ol = document.getElementById('roadmapStages');
  ol.replaceChildren();
  for (const stage of STAGE_INFO) {
    const members = trophies.filter((t) => t.roadmap_stage === stage.n);
    const done = members.filter((t) => earned.has(t.id)).length;
    const li = document.createElement('li');
    li.className = 'stage-card';
    const h = document.createElement('h3');
    h.textContent = stage.title;
    const count = document.createElement('p');
    count.className = 'stage-count';
    count.textContent = done + ' / ' + members.length + ' trophies';
    const text = document.createElement('p');
    text.className = 'muted';
    text.textContent = stage.text;
    const names = document.createElement('p');
    names.className = 'stage-trophies';
    names.textContent = members.map((t) => (earned.has(t.id) ? '✓ ' : '') + t.name).join(' · ');
    li.append(h, count, text, names);
    ol.append(li);
  }
}

function renderMissables() {
  const wrap = document.getElementById('missableList');
  wrap.replaceChildren();
  const flagged = trophies.filter((t) => t.missable);
  if (!flagged.length) {
    const p = document.createElement('p');
    p.textContent = 'No trophy in this list is flagged missable.';
    wrap.append(p);
    return;
  }
  for (const t of flagged) {
    const card = document.createElement('div');
    card.className = 'missable-card';
    const name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = t.name + ' — ' + t.grade;
    const note = document.createElement('p');
    note.textContent = t.missable_note || t.guide;
    card.append(name, note);
    wrap.append(card);
  }
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = 'That is the only missable trophy in the set, as reported by PowerPyx and GTABase. Everything else can be earned in free-roam after the story, and all trophy-related quest givers return after the story.';
  wrap.append(p);
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportProgress() {
  download('gta6-trophy-progress.json', JSON.stringify({
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    total: trophies.length,
  }, null, 2));
}

function importProgress(file) {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = new Set(trophies.map((t) => t.id));
      const next = new Set(ids.filter((id) => valid.has(id)));
      earned = next;
      saveState();
      renderAll();
    } catch {
      window.alert('That file is not a valid progress export.');
    }
  });
  reader.readAsText(file);
}

async function boot() {
  const response = await fetch(DATA_URL);
  const data = await response.json();
  trophies = data.trophies || [];
  loadState();
  searchEl.addEventListener('input', renderAll);
  gradeEl.addEventListener('change', renderAll);
  hideEarnedEl.addEventListener('change', () => { saveState(); renderAll(); });
  spoilerEl.addEventListener('change', () => { saveState(); renderAll(); });
  kindEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-kind]');
    if (!button) return;
    activeKind = button.dataset.kind;
    for (const b of kindEl.querySelectorAll('button')) b.classList.toggle('active', b === button);
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (window.confirm('Clear all earned trophies and settings?')) {
      earned = new Set();
      saveState();
      renderAll();
    }
  });
  renderAll();
}

boot();
