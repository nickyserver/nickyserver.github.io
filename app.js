'use strict';

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
};
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------- service worker + install ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW registration failed', err));
  });
}
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  $('#install').hidden = false;
});
$('#install').addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  $('#install').hidden = true;
});
window.addEventListener('appinstalled', () => { $('#install').hidden = true; toast('Installed. Find it in your launcher.'); });

/* ---------- theme ---------- */
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const meta = $('meta[name="theme-color"]');
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  meta.content = dark ? '#0f1419' : '#ffffff';
}
let theme = store.get('theme', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
applyTheme(theme);
$('#theme').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  store.set('theme', theme);
  applyTheme(theme);
});

/* ---------- tabs ---------- */
const TOOLS = ['focus', 'calc', 'convert', 'notes'];
function showTool(name, { focusPanel = false } = {}) {
  if (!TOOLS.includes(name)) name = 'focus';
  TOOLS.forEach((t) => {
    $('#panel-' + t).hidden = t !== name;
    $('#tab-' + t).setAttribute('aria-selected', String(t === name));
    $('#tab-' + t).tabIndex = t === name ? 0 : -1;
  });
  store.set('tool', name);
  if (name === 'calc' && focusPanel) $('#calc-input').focus();
  if (name === 'notes' && focusPanel) $('#notes').focus();
}
$$('.tabs button').forEach((b) => b.addEventListener('click', () => showTool(b.dataset.tool, { focusPanel: true })));
$('.tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = TOOLS.indexOf(store.get('tool', 'focus'));
  const next = TOOLS[(i + (e.key === 'ArrowRight' ? 1 : TOOLS.length - 1)) % TOOLS.length];
  showTool(next);
  $('#tab-' + next).focus();
});

/* =====================================================================
   FOCUS TIMER
   ===================================================================== */
const CIRC = 2 * Math.PI * 54;
const timerCfg = Object.assign({ work: 25, short: 5, long: 15, notify: false, sound: true }, store.get('timerCfg', {}));
const today = () => new Date().toISOString().slice(0, 10);
let stats = store.get('stats', { date: today(), sessions: 0, minutes: 0 });
if (stats.date !== today()) stats = { date: today(), sessions: 0, minutes: 0 };

const T = {
  mode: 'work',
  total: timerCfg.work * 60,
  remaining: timerCfg.work * 60,
  running: false,
  endAt: 0,
  tick: null,
  cycle: 1,          // focus session number within a set of 4
  wakeLock: null,
};

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function renderTimer() {
  $('#time').textContent = fmt(Math.ceil(T.remaining));
  $('#ring-fg').style.strokeDasharray = CIRC;
  $('#ring-fg').style.strokeDashoffset = CIRC * (1 - T.remaining / T.total);
  $('#start').firstChild.textContent = T.running ? 'Pause ' : 'Start ';
  $$('.chip[data-mode]').forEach((c) => c.classList.toggle('active', c.dataset.mode === T.mode));
  document.body.dataset.mode = T.mode;
  $('#session-label').textContent = `Session ${T.cycle} of 4 · Keeps screen awake while running`;
  $('#stat-today').textContent = stats.sessions;
  $('#stat-min').textContent = stats.minutes;
  const label = { work: 'Focus', short: 'Short break', long: 'Long break' }[T.mode];
  document.title = T.running ? `${fmt(Math.ceil(T.remaining))} · ${label}` : 'Toolkit';
}

function setMode(mode) {
  stopTimer();
  T.mode = mode;
  T.total = T.remaining = timerCfg[mode] * 60;
  renderTimer();
}

async function lockScreen() {
  try {
    if ('wakeLock' in navigator && !T.wakeLock) {
      T.wakeLock = await navigator.wakeLock.request('screen');
      T.wakeLock.addEventListener('release', () => { T.wakeLock = null; });
    }
  } catch { /* not allowed (e.g. low battery); ignore */ }
}
function unlockScreen() { try { T.wakeLock && T.wakeLock.release(); } catch { /* noop */ } T.wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && T.running) { lockScreen(); onTick(); }
});

function startTimer() {
  if (T.running) return;
  T.running = true;
  T.endAt = Date.now() + T.remaining * 1000;
  T.tick = setInterval(onTick, 250);
  lockScreen();
  if (timerCfg.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  renderTimer();
}
function stopTimer() {
  T.running = false;
  clearInterval(T.tick);
  unlockScreen();
}
function pauseTimer() { stopTimer(); renderTimer(); }

function onTick() {
  if (!T.running) return;
  T.remaining = Math.max(0, (T.endAt - Date.now()) / 1000);
  if (T.remaining <= 0) return finishSession();
  renderTimer();
}

function chime() {
  if (!timerCfg.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 1100].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.65);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch { /* audio blocked */ }
}

function finishSession() {
  const finished = T.mode;
  stopTimer();
  if (finished === 'work') {
    stats.sessions += 1;
    stats.minutes += timerCfg.work;
    store.set('stats', stats);
  }
  chime();
  const nextMode = finished === 'work' ? (T.cycle % 4 === 0 ? 'long' : 'short') : 'work';
  if (finished !== 'work') T.cycle = finished === 'long' ? 1 : T.cycle + 1;
  const msg = finished === 'work' ? 'Focus session complete. Time for a break.' : 'Break over. Ready to focus?';
  toast(msg);
  if (timerCfg.notify && 'Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification('Toolkit', { body: msg, icon: 'icons/icon-192.png', tag: 'toolkit-timer' }))
      .catch(() => new Notification('Toolkit', { body: msg }));
  }
  setMode(nextMode);
}

$('#start').addEventListener('click', () => (T.running ? pauseTimer() : startTimer()));
$('#reset').addEventListener('click', () => setMode(T.mode));
$('#skip').addEventListener('click', () => {
  const nextMode = T.mode === 'work' ? (T.cycle % 4 === 0 ? 'long' : 'short') : 'work';
  if (T.mode !== 'work') T.cycle = T.mode === 'long' ? 1 : T.cycle + 1;
  setMode(nextMode);
});
$$('.chip[data-mode]').forEach((c) => c.addEventListener('click', () => setMode(c.dataset.mode)));

function bindSetting(id, key, kind) {
  const el = $(id);
  if (kind === 'check') el.checked = !!timerCfg[key]; else el.value = timerCfg[key];
  el.addEventListener('change', async () => {
    if (kind === 'check') timerCfg[key] = el.checked;
    else {
      const n = Math.min(+el.max, Math.max(1, Math.round(+el.value || timerCfg[key])));
      timerCfg[key] = n; el.value = n;
    }
    store.set('timerCfg', timerCfg);
    if (key === 'notify' && el.checked && 'Notification' in window && Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { el.checked = false; timerCfg.notify = false; store.set('timerCfg', timerCfg); toast('Notifications are blocked for this app.'); }
    }
    if (!T.running && key === T.mode) { T.total = T.remaining = timerCfg[key] * 60; renderTimer(); }
  });
}
bindSetting('#set-work', 'work'); bindSetting('#set-short', 'short'); bindSetting('#set-long', 'long');
bindSetting('#set-notify', 'notify', 'check'); bindSetting('#set-sound', 'sound', 'check');
renderTimer();

/* =====================================================================
   CALCULATOR — hand-written parser (no eval)
   ===================================================================== */
const calcState = { ans: store.get('ans', 0), history: store.get('calcHistory', []) };

function evaluate(src) {
  const text = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/,/g, '.');
  const tokens = [];
  const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z]+|[-+*/^%()])/gy;
  let m, pos = 0;
  while (pos < text.length && (m = re.exec(text))) { tokens.push(m[1]); pos = re.lastIndex; }
  if (text.slice(pos).trim()) throw new Error('Unexpected character: ' + text.slice(pos).trim()[0]);

  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const rad = (d) => (d * Math.PI) / 180;
  const FUNCS = {
    sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10,
    sin: (x) => Math.sin(rad(x)), cos: (x) => Math.cos(rad(x)), tan: (x) => Math.tan(rad(x)),
    asin: (x) => (Math.asin(x) * 180) / Math.PI, acos: (x) => (Math.acos(x) * 180) / Math.PI, atan: (x) => (Math.atan(x) * 180) / Math.PI,
    round: Math.round, floor: Math.floor, ceil: Math.ceil, exp: Math.exp,
  };
  const CONSTS = { pi: Math.PI, e: Math.E, ans: calcState.ans };

  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = unary();
    while (peek() === '*' || peek() === '/') {
      const op = next(); const r = unary();
      if (op === '/' && r === 0) throw new Error('Cannot divide by zero');
      v = op === '*' ? v * r : v / r;
    }
    // implicit multiplication: 2(3+4), 2pi
    while (peek() !== undefined && (peek() === '(' || /^[a-z]/.test(peek()))) v *= unary();
    return v;
  }
  function unary() {
    if (peek() === '-') { next(); return -unary(); }
    if (peek() === '+') { next(); return unary(); }
    return power();
  }
  function power() {
    const base = postfix();
    if (peek() === '^') { next(); return Math.pow(base, unary()); } // right-assoc, allows 2^-3
    return base;
  }
  function postfix() {
    let v = primary();
    while (peek() === '%') { next(); v /= 100; }
    return v;
  }
  function primary() {
    const t = next();
    if (t === undefined) throw new Error('Incomplete expression');
    if (t === '(') {
      const v = expr();
      if (next() !== ')') throw new Error('Missing )');
      return v;
    }
    if (/^[\d.]/.test(t)) return parseFloat(t);
    if (/^[a-z]+$/.test(t)) {
      if (t in CONSTS) return CONSTS[t];
      if (t in FUNCS) {
        if (next() !== '(') throw new Error(`${t} needs parentheses`);
        const arg = expr();
        if (next() !== ')') throw new Error('Missing )');
        return FUNCS[t](arg);
      }
      throw new Error('Unknown name: ' + t);
    }
    throw new Error('Unexpected ' + t);
  }

  const result = expr();
  if (i < tokens.length) throw new Error('Unexpected ' + tokens[i]);
  if (!Number.isFinite(result)) throw new Error('Result is not a real number');
  return result;
}

function formatNumber(n) {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString('en-US', { useGrouping: false });
  const r = parseFloat(n.toPrecision(12));
  return Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-7 && r !== 0) ? r.toExponential(6) : String(r);
}

const calcInput = $('#calc-input'), calcResult = $('#calc-result');
function liveCalc() {
  const v = calcInput.value.trim();
  calcResult.classList.remove('error');
  if (!v) { calcResult.textContent = '0'; return null; }
  try { const r = evaluate(v); calcResult.textContent = formatNumber(r); return r; }
  catch (err) { calcResult.textContent = /Incomplete|Missing|Unexpected/.test(err.message) ? '…' : err.message; calcResult.classList.toggle('error', !/…/.test(calcResult.textContent)); return null; }
}
function commitCalc() {
  const v = calcInput.value.trim();
  if (!v) return;
  try {
    const r = evaluate(v);
    calcState.ans = r; store.set('ans', r);
    calcState.history.unshift({ expr: v, result: formatNumber(r) });
    calcState.history = calcState.history.slice(0, 50);
    store.set('calcHistory', calcState.history);
    calcInput.value = formatNumber(r);
    renderHistory(); liveCalc();
  } catch (err) { calcResult.textContent = err.message; calcResult.classList.add('error'); }
}
function renderHistory() {
  const ul = $('#calc-history');
  ul.replaceChildren();
  if (!calcState.history.length) { const li = document.createElement('li'); li.textContent = 'No calculations yet'; li.style.cursor = 'default'; ul.append(li); return; }
  calcState.history.forEach((h) => {
    const li = document.createElement('li');
    const a = document.createElement('span'); a.className = 'expr'; a.textContent = h.expr;
    const b = document.createElement('span'); b.textContent = '= ' + h.result;
    li.append(a, b);
    li.title = 'Click to reuse result';
    li.addEventListener('click', () => { insertAtCursor(h.result); calcInput.focus(); });
    ul.append(li);
  });
}
function insertAtCursor(text) {
  const s = calcInput.selectionStart ?? calcInput.value.length, e = calcInput.selectionEnd ?? s;
  calcInput.value = calcInput.value.slice(0, s) + text + calcInput.value.slice(e);
  const p = s + text.length;
  calcInput.setSelectionRange(p, p);
  liveCalc();
}
const KEYS = [
  ['C', 'clear', 'fn'], ['⌫', 'back', 'fn'], ['(', '(', 'fn'], [')', ')', 'fn'], ['÷', '/', 'op'],
  ['sin', 'sin(', 'fn'], ['7'], ['8'], ['9'], ['×', '*', 'op'],
  ['cos', 'cos(', 'fn'], ['4'], ['5'], ['6'], ['−', '-', 'op'],
  ['√', 'sqrt(', 'fn'], ['1'], ['2'], ['3'], ['+', '+', 'op'],
  ['%', '%', 'fn'], ['0'], ['.'], ['^', '^', 'op'], ['=', 'eq', 'eq'],
];
KEYS.forEach(([label, val = label, cls = '']) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = label; if (cls) b.className = cls;
  b.addEventListener('click', () => {
    if (val === 'clear') { calcInput.value = ''; liveCalc(); }
    else if (val === 'back') { calcInput.value = calcInput.value.slice(0, -1); liveCalc(); }
    else if (val === 'eq') commitCalc();
    else insertAtCursor(val);
    calcInput.focus();
  });
  $('#keys').append(b);
});
calcInput.addEventListener('input', liveCalc);
calcInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); commitCalc(); }
  if (e.key === 'Escape') { calcInput.value = ''; liveCalc(); }
});
$('#calc-clear-hist').addEventListener('click', () => { calcState.history = []; store.set('calcHistory', []); renderHistory(); });
renderHistory();

/* =====================================================================
   CONVERTER
   ===================================================================== */
const UNITS = {
  Length: { base: 'm', units: { km: 1000, m: 1, cm: 0.01, mm: 0.001, mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254, 'nautical mile': 1852 } },
  Mass: { base: 'kg', units: { tonne: 1000, kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.028349523125, stone: 6.35029318 } },
  Temperature: { special: true, units: ['°C', '°F', 'K'] },
  Volume: { base: 'L', units: { L: 1, mL: 0.001, 'm³': 1000, 'US gal': 3.785411784, 'US qt': 0.946352946, 'US cup': 0.2365882365, 'fl oz (US)': 0.0295735295625, tbsp: 0.01478676478, tsp: 0.00492892159 } },
  Speed: { base: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knot: 0.514444444, 'ft/s': 0.3048 } },
  Area: { base: 'm²', units: { 'km²': 1e6, 'm²': 1, 'ha': 1e4, acre: 4046.8564224, 'sq mile': 2589988.110336, 'sq ft': 0.09290304, 'sq in': 0.00064516 } },
  Time: { base: 's', units: { week: 604800, day: 86400, hour: 3600, minute: 60, second: 1, ms: 0.001 } },
  Data: { base: 'B', units: { bit: 0.125, B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776 } },
};
const conv = Object.assign({ cat: 'Length', from: 'km', to: 'mile' }, store.get('conv', {}));
if (!UNITS[conv.cat]) Object.assign(conv, { cat: 'Length', from: 'km', to: 'mile' });

const toK = { '°C': (v) => v + 273.15, '°F': (v) => ((v - 32) * 5) / 9 + 273.15, K: (v) => v };
const fromK = { '°C': (k) => k - 273.15, '°F': (k) => ((k - 273.15) * 9) / 5 + 32, K: (k) => k };

function unitNames(cat) { const c = UNITS[cat]; return c.special ? c.units : Object.keys(c.units); }
function convert(v, cat, from, to) {
  const c = UNITS[cat];
  if (c.special) return fromK[to](toK[from](v));
  return (v * c.units[from]) / c.units[to];
}
function renderConvCats() {
  const wrap = $('#conv-cats');
  wrap.replaceChildren();
  Object.keys(UNITS).forEach((cat) => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat === conv.cat ? ' active' : ''); b.textContent = cat;
    b.addEventListener('click', () => {
      conv.cat = cat;
      const names = unitNames(cat);
      conv.from = names[0]; conv.to = names[1] || names[0];
      renderConvCats(); renderConvUnits(); runConv('from');
    });
    wrap.append(b);
  });
}
function renderConvUnits() {
  const names = unitNames(conv.cat);
  for (const [id, key] of [['#conv-from-unit', 'from'], ['#conv-to-unit', 'to']]) {
    const sel = $(id);
    sel.replaceChildren(...names.map((n) => { const o = document.createElement('option'); o.value = o.textContent = n; return o; }));
    sel.value = conv[key];
  }
}
function niceNum(n) {
  if (!Number.isFinite(n)) return '';
  const r = parseFloat(n.toPrecision(10));
  return String(r);
}
function runConv(source) {
  const fromEl = $('#conv-from-val'), toEl = $('#conv-to-val');
  if (source === 'from') {
    const v = parseFloat(fromEl.value);
    toEl.value = Number.isNaN(v) ? '' : niceNum(convert(v, conv.cat, conv.from, conv.to));
  } else {
    const v = parseFloat(toEl.value);
    fromEl.value = Number.isNaN(v) ? '' : niceNum(convert(v, conv.cat, conv.to, conv.from));
  }
  store.set('conv', conv);
  const v = parseFloat(fromEl.value), r = parseFloat(toEl.value);
  $('#conv-note').textContent = Number.isNaN(v) || Number.isNaN(r) ? '' : `${niceNum(v)} ${conv.from} = ${niceNum(r)} ${conv.to}`;
}
$('#conv-from-val').addEventListener('input', () => runConv('from'));
$('#conv-to-val').addEventListener('input', () => runConv('to'));
$('#conv-from-unit').addEventListener('change', (e) => { conv.from = e.target.value; runConv('from'); });
$('#conv-to-unit').addEventListener('change', (e) => { conv.to = e.target.value; runConv('from'); });
$('#conv-swap').addEventListener('click', () => {
  [conv.from, conv.to] = [conv.to, conv.from];
  renderConvUnits();
  runConv('from');
});
renderConvCats(); renderConvUnits(); runConv('from');

/* =====================================================================
   SCRATCHPAD — autosave + File System Access API (Chrome OS Files app)
   ===================================================================== */
const notes = $('#notes');
notes.value = store.get('notes', '');
let saveTimer, fileHandle = null;
function updateCount() {
  const words = notes.value.trim() ? notes.value.trim().split(/\s+/).length : 0;
  $('#notes-count').textContent = `${words} word${words === 1 ? '' : 's'}`;
}
notes.addEventListener('input', () => {
  $('#notes-status').textContent = 'Saving…';
  updateCount();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { store.set('notes', notes.value); $('#notes-status').textContent = 'Saved'; }, 400);
});
updateCount();

async function saveNotesFile() {
  const text = notes.value;
  try {
    if ('showSaveFilePicker' in window) {
      if (!fileHandle) fileHandle = await window.showSaveFilePicker({ suggestedName: 'scratchpad.txt', types: [{ description: 'Text', accept: { 'text/plain': ['.txt', '.md'] } }] });
      const w = await fileHandle.createWritable();
      await w.write(text); await w.close();
      toast('Saved to ' + fileHandle.name);
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = 'scratchpad.txt'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  } catch (err) { if (err.name !== 'AbortError') toast('Could not save file'); }
}
async function openNotesFile() {
  try {
    if ('showOpenFilePicker' in window) {
      [fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'Text', accept: { 'text/plain': ['.txt', '.md'] } }] });
      notes.value = await (await fileHandle.getFile()).text();
    } else {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.txt,.md,text/plain' });
      await new Promise((res) => { input.onchange = res; input.click(); });
      if (!input.files[0]) return;
      notes.value = await input.files[0].text();
    }
    notes.dispatchEvent(new Event('input'));
    toast('File loaded');
  } catch (err) { if (err.name !== 'AbortError') toast('Could not open file'); }
}
$('#notes-save').addEventListener('click', saveNotesFile);
$('#notes-open').addEventListener('click', openNotesFile);
$('#notes-clear').addEventListener('click', () => {
  if (notes.value && !confirm('Clear the scratchpad? This cannot be undone.')) return;
  notes.value = ''; fileHandle = null; notes.dispatchEvent(new Event('input'));
});

/* ---------- global keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (store.get('tool', 'focus') === 'notes') saveNotesFile();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
  const idx = ['1', '2', '3', '4'].indexOf(e.key);
  if (idx >= 0) { showTool(TOOLS[idx], { focusPanel: true }); e.preventDefault(); return; }
  if (store.get('tool', 'focus') !== 'focus') return;
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); $('#start').click(); }
  else if (e.key.toLowerCase() === 'r') $('#reset').click();
  else if (e.key.toLowerCase() === 'n') $('#skip').click();
});

/* ---------- boot ---------- */
const params = new URLSearchParams(location.search);
showTool(params.get('tool') || store.get('tool', 'focus'));
