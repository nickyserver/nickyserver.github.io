'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const iconPaths = {
  'folder-plus':'<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H11l2.5 2.5h5A2.5 2.5 0 0 1 21 10v2"/><path d="M3 9h18l-2 10H5L3 9Z"/><path d="M15 16h6m-3-3v6"/>',
  'file-plus':'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M13 3v5h5"/><path d="M13 3l5 5"/><path d="M17 16h6m-3-3v6"/>',
  folder:'<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H11l2.5 2.5h5A2.5 2.5 0 0 1 21 10v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
  'hard-drive':'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 14h18m-4 2h.01M7 16h.01"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  'arrow-down-a-z':'<path d="M4 7h8M4 11h6M4 15h4M16 4v16m-3-3 3 3 3-3"/>',
  'layout-grid':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  'layout-list':'<path d="M8 6h13M8 12h13M8 18h13"/><rect x="3" y="4" width="2" height="4" rx=".5"/><rect x="3" y="10" width="2" height="4" rx=".5"/><rect x="3" y="16" width="2" height="4" rx=".5"/>',
  plus:'<path d="M12 5v14m-7-7h14"/>',
  'shield-check':'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 17v3h14v-3"/>',
  'search-x':'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5m-12-12 4.5 4.5m0-4.5-4.5 4.5"/>',
  x:'<path d="m18 6-12 12M6 6l12 12"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  file:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  code:'<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-11-4 14"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9m-7 3v5m-2-3 2 2 2-2"/>',
  pdf:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7M7 16h2a1 1 0 0 0 0-2H7v4m5 0v-4h1a2 2 0 0 1 0 4h-1m4 0v-4h3m-3 2h2"/>',
  spreadsheet:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  document:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7M8 14h8m-8 4h8"/>',
  generic:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7"/>'
};

function icon(name, extraClass='') {
  const body = iconPaths[name] || iconPaths.generic;
  return `<svg class="${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

$$('[data-icon]').forEach((node) => {
  const name = node.dataset.icon;
  node.innerHTML = icon(name);
});

const state = {
  installed: false,
  deferredInstallPrompt: null,
  entries: [],
  directoryStack: [],
  currentView: 'myfiles',
  search: '',
  sortAscending: true,
  gridView: true,
  selectedEntry: null,
  currentPreviewUrl: null,
  recentIds: [],
  starredIds: new Set(),
  toastTimer: null
};

const installGate = $('#install-gate');
const appShell = $('#app');
const installButton = $('#install-button');
const installHelp = $('#install-help');
const installStatus = $('#install-status');
const fallbackFileInput = $('#fallback-file-input');
const fallbackFolderInput = $('#fallback-folder-input');
const viewerDialog = $('#viewer-dialog');

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;
}

function showInstallGate() {
  installGate.hidden = false;
  appShell.hidden = true;
  if (state.deferredInstallPrompt) {
    installButton.textContent = 'Install Files';
    installHelp.hidden = true;
  } else {
    installHelp.hidden = false;
    installStatus.textContent = 'Use Chrome’s install option, then open the app from your launcher.';
  }
}

function unlockInstalledApp() {
  state.installed = true;
  installGate.hidden = true;
  appShell.hidden = false;
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  if (!state.installed) {
    installButton.textContent = 'Install Files';
    installHelp.hidden = true;
    installStatus.textContent = 'Chrome can install this app on your device.';
  }
});

window.addEventListener('appinstalled', () => {
  state.deferredInstallPrompt = null;
  installStatus.textContent = 'Files was installed. Open it from your Chromebook launcher.';
  installHelp.hidden = false;
  installHelp.innerHTML = '<strong>Almost there</strong><p>Launch the newly installed Files app from your Chromebook launcher. This browser tab will remain locked.</p>';
  installButton.disabled = true;
  installButton.textContent = 'Installed';
});

installButton.addEventListener('click', async () => {
  if (!state.deferredInstallPrompt) {
    installHelp.hidden = false;
    installStatus.textContent = 'Choose the install option in Chrome’s menu to continue.';
    return;
  }
  try {
    state.deferredInstallPrompt.prompt();
    const choice = await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    if (choice?.outcome === 'accepted') {
      installStatus.textContent = 'Installation started. Open Files from your launcher when it is ready.';
      installHelp.hidden = false;
    } else {
      installStatus.textContent = 'Installation was cancelled. You can install Files at any time from Chrome.';
    }
  } catch (error) {
    installStatus.textContent = 'Chrome could not start the install prompt. Use the Chrome menu instead.';
    installHelp.hidden = false;
  }
});

if (isStandalone()) unlockInstalledApp();
else showInstallGate();

window.matchMedia('(display-mode: standalone)').addEventListener?.('change', (event) => {
  if (event.matches) unlockInstalledApp();
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed:', error));
  });
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function extensionOf(name) {
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index + 1).toLowerCase() : '';
}

function typeLabel(entry) {
  if (entry.kind === 'directory') return 'Folder';
  const ext = extensionOf(entry.name);
  if (ext) return `${ext.toUpperCase()} file`;
  return entry.type || 'File';
}

function iconForEntry(entry) {
  if (entry.kind === 'directory') return 'folder';
  const ext = extensionOf(entry.name);
  const mime = (entry.type || '').toLowerCase();
  if (mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp','bmp','svg','avif'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4','webm','mov','m4v','ogv'].includes(ext)) return 'film';
  if (mime.startsWith('audio/') || ['mp3','wav','ogg','m4a','flac','aac'].includes(ext)) return 'music';
  if (ext === 'pdf') return 'pdf';
  if (['html','htm','js','css','json','xml','py','txt','md','sh','c','cpp','java','ts','jsx','tsx','yml','yaml'].includes(ext)) return 'code';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
  if (['xls','xlsx','csv','ods'].includes(ext)) return 'spreadsheet';
  if (['doc','docx','odt','rtf'].includes(ext)) return 'document';
  return 'file';
}

function makeEntry(file, handle = null, path = '') {
  const id = `${path}/${file.name}`.replace(/^\//, '');
  return {
    id,
    name: file.name,
    kind: 'file',
    type: file.type || '',
    size: file.size,
    modified: file.lastModified || 0,
    file,
    handle,
    path
  };
}

function normalizeLooseFiles(fileList) {
  const files = [...fileList];
  const entries = files.map((file) => makeEntry(file, null, file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0, -1).join('/') : ''));
  state.entries = entries;
  state.directoryStack = [];
  state.currentView = 'myfiles';
  setActiveNav('myfiles');
  updateLocation();
  renderEntries();
  toast(`${entries.length} file${entries.length === 1 ? '' : 's'} added`);
}

async function openFiles() {
  if (!state.installed) return;
  if (window.showOpenFilePicker) {
    try {
      const handles = await window.showOpenFilePicker({ multiple: true });
      const entries = await Promise.all(handles.map(async (handle) => {
        const file = await handle.getFile();
        return makeEntry(file, handle, '');
      }));
      mergeEntries(entries);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.warn('File picker unavailable:', error);
    }
  }
  fallbackFileInput.click();
}

async function openFolder() {
  if (!state.installed) return;
  if (window.showDirectoryPicker) {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      state.directoryStack = [{ handle, name: handle.name }];
      await loadDirectory(handle);
      state.currentView = 'myfiles';
      setActiveNav('myfiles');
      updateLocation();
      renderEntries();
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.warn('Directory picker failed:', error);
    }
  }
  fallbackFolderInput.click();
}

async function loadDirectory(directoryHandle) {
  const entries = [];
  for await (const [name, handle] of directoryHandle.entries()) {
    if (name.startsWith('.')) continue;
    if (handle.kind === 'directory') {
      entries.push({ id: `${currentPath()}/${name}`.replace(/^\//, ''), name, kind: 'directory', type: '', size: 0, modified: 0, handle, path: currentPath() });
    } else {
      const file = await handle.getFile();
      entries.push(makeEntry(file, handle, currentPath()));
    }
  }
  state.entries = entries;
}

function currentPath() {
  return state.directoryStack.map((part) => part.name).join('/');
}

async function navigateInto(entry) {
  if (!entry.handle || entry.kind !== 'directory') return;
  try {
    state.directoryStack.push({ handle: entry.handle, name: entry.name });
    await loadDirectory(entry.handle);
    state.currentView = 'myfiles';
    setActiveNav('myfiles');
    updateLocation();
    renderEntries();
  } catch (error) {
    state.directoryStack.pop();
    toast('This folder could not be opened. Check its permissions.');
  }
}

async function navigateUp(index) {
  if (index < 0 || index >= state.directoryStack.length - 1) return;
  state.directoryStack = state.directoryStack.slice(0, index + 1);
  const target = state.directoryStack[state.directoryStack.length - 1];
  await loadDirectory(target.handle);
  updateLocation();
  renderEntries();
}

function mergeEntries(entries) {
  const map = new Map(state.entries.map((entry) => [entry.id, entry]));
  entries.forEach((entry) => map.set(entry.id, entry));
  state.entries = [...map.values()];
  state.currentView = 'myfiles';
  setActiveNav('myfiles');
  updateLocation();
  renderEntries();
  toast(`${entries.length} file${entries.length === 1 ? '' : 's'} added`);
}

function setActiveNav(view) {
  $$('.nav-item').forEach((node) => node.classList.toggle('active', node.dataset.view === view));
}

function updateLocation() {
  const heading = $('#location-heading');
  const breadcrumbs = $('#breadcrumbs');
  breadcrumbs.replaceChildren();
  if (state.currentView === 'recent') {
    heading.textContent = 'Recent';
    return;
  }
  if (state.currentView === 'starred') {
    heading.textContent = 'Starred';
    return;
  }
  heading.textContent = 'My files';
  if (!state.directoryStack.length) {
    const crumb = document.createElement('span');
    crumb.className = 'crumb-current';
    crumb.textContent = 'All selected files';
    breadcrumbs.append(crumb);
  } else {
    state.directoryStack.forEach((part, index) => {
      if (index) {
        const separator = document.createElement('span');
        separator.className = 'crumb-separator';
        separator.textContent = '›';
        breadcrumbs.append(separator);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = part.name;
      if (index === state.directoryStack.length - 1) button.className = 'crumb-current';
      button.addEventListener('click', () => navigateUp(index));
      breadcrumbs.append(button);
    });
  }
}

function getVisibleEntries() {
  let entries = [...state.entries];
  if (state.currentView === 'starred') entries = entries.filter((entry) => state.starredIds.has(entry.id));
  if (state.currentView === 'recent') entries = entries.filter((entry) => state.recentIds.includes(entry.id)).sort((a, b) => state.recentIds.indexOf(a.id) - state.recentIds.indexOf(b.id));
  if (state.search.trim()) {
    const query = state.search.trim().toLowerCase();
    entries = entries.filter((entry) => entry.name.toLowerCase().includes(query));
  }
  if (state.currentView !== 'recent') {
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return state.sortAscending ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }
  return entries;
}

function renderEntries() {
  const visible = getVisibleEntries();
  const empty = $('#empty-state');
  const area = $('#file-area');
  const count = $('#item-count');
  const noResults = $('#no-results');
  const grid = $('#file-grid');
  const tableWrap = $('#file-table-wrap');
  const tableBody = $('#file-table-body');
  const hasEntries = state.entries.length > 0;
  empty.hidden = hasEntries;
  area.hidden = !hasEntries;
  noResults.hidden = visible.length > 0 || !hasEntries;
  grid.hidden = !state.gridView || visible.length === 0;
  tableWrap.hidden = state.gridView || visible.length === 0;
  count.textContent = `${visible.length} item${visible.length === 1 ? '' : 's'}`;
  grid.replaceChildren();
  tableBody.replaceChildren();

  visible.forEach((entry) => {
    const card = document.createElement('div');
    card.className = `file-card${entry.kind === 'directory' ? ' folder' : ''}`;
    card.setAttribute('role', 'listitem');
    card.tabIndex = 0;
    const fileIcon = document.createElement('div');
    fileIcon.className = 'file-icon';
    fileIcon.innerHTML = icon(iconForEntry(entry));
    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = entry.name;
    const meta = document.createElement('div');
    meta.className = 'file-meta';
    meta.textContent = entry.kind === 'directory' ? 'Folder' : formatSize(entry.size);
    const star = createStarButton(entry);
    card.append(star, fileIcon, name, meta);
    card.addEventListener('click', (event) => {
      if (event.target.closest('.file-star')) return;
      activateEntry(entry);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateEntry(entry); }
    });
    grid.append(card);

    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.className = 'name-cell';
    nameCell.innerHTML = icon(iconForEntry(entry));
    const label = document.createElement('span');
    label.textContent = entry.name;
    nameCell.append(label);
    const typeCell = document.createElement('td'); typeCell.textContent = typeLabel(entry);
    const sizeCell = document.createElement('td'); sizeCell.textContent = entry.kind === 'directory' ? '—' : formatSize(entry.size);
    const modifiedCell = document.createElement('td'); modifiedCell.textContent = formatDate(entry.modified);
    const actionsCell = document.createElement('td'); actionsCell.className = 'row-actions'; actionsCell.append(createStarButton(entry, true));
    row.append(nameCell, typeCell, sizeCell, modifiedCell, actionsCell);
    row.addEventListener('click', (event) => { if (!event.target.closest('.row-star')) activateEntry(entry); });
    tableBody.append(row);
  });
}

function createStarButton(entry, compact = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${compact ? 'row-star' : 'file-star'}${state.starredIds.has(entry.id) ? ' starred' : ''}`;
  button.title = state.starredIds.has(entry.id) ? 'Remove from Starred' : 'Add to Starred';
  button.setAttribute('aria-label', button.title);
  button.innerHTML = icon('star');
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (state.starredIds.has(entry.id)) state.starredIds.delete(entry.id);
    else state.starredIds.add(entry.id);
    saveStarred();
    renderEntries();
  });
  return button;
}

function activateEntry(entry) {
  if (entry.kind === 'directory') {
    navigateInto(entry);
    return;
  }
  openPreview(entry);
}

function saveStarred() {
  try { localStorage.setItem('chromeos-files-starred', JSON.stringify([...state.starredIds])); } catch (_) {}
}

try {
  const saved = JSON.parse(localStorage.getItem('chromeos-files-starred') || '[]');
  if (Array.isArray(saved)) state.starredIds = new Set(saved.filter((item) => typeof item === 'string'));
} catch (_) {}

function addRecent(entry) {
  state.recentIds = [entry.id, ...state.recentIds.filter((id) => id !== entry.id)].slice(0, 50);
}

async function getEntryFile(entry) {
  if (entry.file) return entry.file;
  if (entry.handle?.getFile) return entry.handle.getFile();
  throw new Error('This file is no longer available. Open it again from its folder.');
}

async function openPreview(entry) {
  try {
    const file = await getEntryFile(entry);
    state.selectedEntry = entry;
    addRecent(entry);
    $('#viewer-title').textContent = entry.name;
    $('#viewer-subtitle').textContent = `${typeLabel(entry)} · ${formatSize(file.size)} · Modified ${formatDate(file.lastModified)}`;
    $('#viewer-file-icon').innerHTML = icon(iconForEntry(entry));
    const content = $('#viewer-content');
    content.replaceChildren();
    if (state.currentPreviewUrl) URL.revokeObjectURL(state.currentPreviewUrl);
    state.currentPreviewUrl = URL.createObjectURL(file);
    const ext = extensionOf(file.name);
    const mime = (file.type || '').toLowerCase();

    if (mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp','bmp','avif'].includes(ext)) {
      const image = document.createElement('img');
      image.src = state.currentPreviewUrl;
      image.alt = entry.name;
      content.append(image);
    } else if (ext === 'svg' || mime === 'image/svg+xml') {
      const image = document.createElement('img');
      image.src = state.currentPreviewUrl;
      image.alt = entry.name;
      content.append(image);
    } else if (mime === 'application/pdf' || ext === 'pdf') {
      const frame = document.createElement('iframe');
      frame.src = state.currentPreviewUrl;
      frame.title = `PDF preview: ${entry.name}`;
      content.append(frame);
    } else if (mime.startsWith('video/') || ['mp4','webm','ogv','mov','m4v'].includes(ext)) {
      const video = document.createElement('video');
      video.src = state.currentPreviewUrl;
      video.controls = true;
      video.autoplay = false;
      content.append(video);
    } else if (mime.startsWith('audio/') || ['mp3','wav','ogg','m4a','flac','aac'].includes(ext)) {
      const audio = document.createElement('audio');
      audio.src = state.currentPreviewUrl;
      audio.controls = true;
      content.append(audio);
    } else if (isTextFile(file, ext)) {
      const text = document.createElement('pre');
      text.className = 'text-preview';
      const contentText = await file.text();
      text.textContent = contentText.length > 2_000_000 ? `${contentText.slice(0, 2_000_000)}\n\n[Preview limited to the first 2 MB of text.]` : contentText;
      content.append(text);
    } else {
      const unsupported = document.createElement('div');
      unsupported.className = 'unsupported-preview';
      unsupported.innerHTML = `${icon('file')}<h3>Preview not available</h3><p>This file type cannot be previewed here. You can still download a copy to open it with another app.</p>`;
      const downloadButton = document.createElement('button');
      downloadButton.type = 'button';
      downloadButton.className = 'secondary-button';
      downloadButton.innerHTML = `${icon('download')} Download file`;
      downloadButton.addEventListener('click', () => downloadEntry(entry, file));
      unsupported.append(downloadButton);
      content.append(unsupported);
    }
    $('#viewer-download').onclick = () => downloadEntry(entry, file);
    if (!viewerDialog.open) viewerDialog.showModal();
  } catch (error) {
    toast(error.message || 'Could not open this file.');
  }
}

function isTextFile(file, ext) {
  return file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/xml' ||
    ['txt','md','markdown','csv','json','xml','html','htm','css','js','mjs','cjs','ts','tsx','jsx','py','sh','bash','yml','yaml','toml','ini','log','sql','c','h','cpp','java','rs','go','rb','php','svg'].includes(ext);
}

function downloadEntry(entry, file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = entry.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#viewer-close').addEventListener('click', () => viewerDialog.close());
viewerDialog.addEventListener('close', () => {
  if (state.currentPreviewUrl) URL.revokeObjectURL(state.currentPreviewUrl);
  state.currentPreviewUrl = null;
  state.selectedEntry = null;
});

$('#search-input').addEventListener('input', (event) => {
  state.search = event.target.value;
  renderEntries();
});
$('#sort-button').addEventListener('click', () => {
  state.sortAscending = !state.sortAscending;
  $('#sort-button').title = state.sortAscending ? 'Sort A to Z' : 'Sort Z to A';
  renderEntries();
});
$('#view-toggle').addEventListener('click', () => {
  state.gridView = !state.gridView;
  $('#view-toggle').innerHTML = icon(state.gridView ? 'layout-grid' : 'layout-list');
  $('#view-toggle').title = state.gridView ? 'Switch to list view' : 'Switch to grid view';
  renderEntries();
});

$$('.nav-item').forEach((button) => button.addEventListener('click', () => {
  state.currentView = button.dataset.view;
  state.search = '';
  $('#search-input').value = '';
  setActiveNav(state.currentView);
  updateLocation();
  renderEntries();
}));

$('#open-files-sidebar').addEventListener('click', openFiles);
$('#top-open-files').addEventListener('click', openFiles);
$('#empty-open-files').addEventListener('click', openFiles);
$('#open-folder-sidebar').addEventListener('click', openFolder);
$('#top-open-folder').addEventListener('click', openFolder);
$('#empty-open-folder').addEventListener('click', openFolder);

fallbackFileInput.addEventListener('change', () => {
  if (fallbackFileInput.files?.length) mergeEntries([...fallbackFileInput.files].map((file) => makeEntry(file)));
  fallbackFileInput.value = '';
});
fallbackFolderInput.addEventListener('change', () => {
  if (fallbackFolderInput.files?.length) normalizeLooseFiles(fallbackFolderInput.files);
  fallbackFolderInput.value = '';
});

const contentArea = $('.content-area');
contentArea.addEventListener('dragover', (event) => {
  event.preventDefault();
  $('#drop-hint').hidden = false;
});
contentArea.addEventListener('dragleave', (event) => {
  if (!contentArea.contains(event.relatedTarget)) $('#drop-hint').hidden = true;
});
contentArea.addEventListener('drop', (event) => {
  event.preventDefault();
  $('#drop-hint').hidden = true;
  const files = [...(event.dataTransfer?.files || [])];
  if (files.length) mergeEntries(files.map((file) => makeEntry(file)));
});

$('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.addEventListener('click', (event) => {
  if (window.innerWidth <= 650 && !event.target.closest('#sidebar') && !event.target.closest('#mobile-menu')) $('#sidebar').classList.remove('open');
});

// A freshly installed PWA should enter through its standalone window.
if (isStandalone()) {
  document.documentElement.classList.add('installed-mode');
}


/* Google Drive integration: client-side OAuth, read-only Drive API access. */
Object.assign(state, {
  driveEntries: [],
  driveFolderStack: [],
  drivePageToken: null,
  driveToken: null,
  driveTokenExpiry: 0,
  driveAccount: '',
  driveLoading: false
});

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
let driveTokenClient = null;
let driveTokenRequest = null;
let googleIdentityPromise = null;

function configuredDriveClientId() {
  return (localStorage.getItem('chromeos-files-google-client-id') || '').trim();
}

function updateDriveConnectionUI() {
  const connected = Boolean(state.driveToken && state.driveTokenExpiry > Date.now());
  const status = $('#drive-connect-status');
  const connect = $('#drive-connect-button');
  const disconnect = $('#drive-disconnect-button');
  const dot = $('#drive-nav-dot');
  if (status) status.textContent = connected ? (state.driveAccount ? `Connected as ${state.driveAccount}` : 'Connected to your account') : 'Not connected';
  if (connect) connect.textContent = connected ? 'Refresh connection' : (configuredDriveClientId() ? 'Connect Google Drive' : 'Set up Google Drive');
  if (disconnect) disconnect.hidden = !connected;
  if (dot) dot.classList.toggle('connected', connected);
}

function openDriveSetup() {
  const dialog = $('#drive-setup-dialog');
  $('#drive-client-id').value = configuredDriveClientId();
  if (!dialog.open) dialog.showModal();
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleIdentityPromise) return googleIdentityPromise;
  googleIdentityPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.accounts?.oauth2 ? resolve() : reject(new Error('Google sign-in did not initialise.'));
    script.onerror = () => reject(new Error('Could not load Google sign-in. Check your internet connection.'));
    document.head.append(script);
  });
  return googleIdentityPromise;
}

async function requestDriveAccess() {
  const clientId = configuredDriveClientId();
  if (!clientId || !clientId.endsWith('.apps.googleusercontent.com')) {
    openDriveSetup();
    return null;
  }
  await loadGoogleIdentity();
  if (!driveTokenClient) {
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          driveTokenRequest?.reject(new Error(response.error_description || response.error));
          driveTokenRequest = null;
          return;
        }
        state.driveToken = response.access_token;
        state.driveTokenExpiry = Date.now() + (Number(response.expires_in || 3600) * 1000);
        driveTokenRequest?.resolve(response);
        driveTokenRequest = null;
        updateDriveConnectionUI();
      },
      error_callback: (error) => {
        driveTokenRequest?.reject(new Error(error?.message || 'Google sign-in was cancelled.'));
        driveTokenRequest = null;
      }
    });
  }
  return new Promise((resolve, reject) => {
    driveTokenRequest = { resolve, reject };
    try {
      driveTokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
      driveTokenRequest = null;
      reject(error);
    }
  });
}

async function connectGoogleDrive() {
  if (!configuredDriveClientId()) {
    openDriveSetup();
    return;
  }
  try {
    $('#drive-connect-button').disabled = true;
    toast('Connecting to Google Drive…');
    await requestDriveAccess();
    if (state.driveToken) {
      state.driveFolderStack = [];
      state.currentView = 'drive';
      state.search = '';
      $('#search-input').value = '';
      setActiveNav('drive');
      await loadDriveFolder('root', 'My Drive', false);
      updateLocation();
      renderEntries();
      toast('Google Drive connected');
    }
  } catch (error) {
    console.error('Google Drive connection failed:', error);
    toast(error.message || 'Could not connect to Google Drive.');
  } finally {
    $('#drive-connect-button').disabled = false;
    updateDriveConnectionUI();
  }
}

async function driveFetch(path, params = {}) {
  if (!state.driveToken || state.driveTokenExpiry <= Date.now()) {
    state.driveToken = null;
    updateDriveConnectionUI();
    throw new Error('Your Google Drive connection expired. Connect again to continue.');
  }
  const url = new URL(`${DRIVE_API}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: { Authorization: `Bearer ${state.driveToken}` } });
  if (response.status === 401) {
    state.driveToken = null;
    state.driveTokenExpiry = 0;
    updateDriveConnectionUI();
    throw new Error('Google Drive needs you to reconnect. Select Connect Google Drive.');
  }
  if (!response.ok) {
    let message = `Google Drive request failed (${response.status}).`;
    try { const data = await response.json(); message = data.error?.message || message; } catch (_) {}
    throw new Error(message);
  }
  return response;
}

function driveFolderId() {
  return state.driveFolderStack.length ? state.driveFolderStack[state.driveFolderStack.length - 1].id : 'root';
}

async function loadDriveFolder(folderId = 'root', folderName = 'My Drive', push = true, append = false) {
  if (!state.driveToken) throw new Error('Connect Google Drive first.');
  state.driveLoading = true;
  const query = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
  const params = {
    q: query,
    pageSize: 1000,
    orderBy: 'folder,name',
    fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,capabilities(canDownload),shortcutDetails(targetId,targetMimeType))',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  };
  if (append && state.drivePageToken) params.pageToken = state.drivePageToken;
  try {
    const response = await driveFetch('/files', params);
    const data = await response.json();
    const mapped = (data.files || []).filter(file => file.mimeType !== 'application/vnd.google-apps.shortcut').map(file => ({
      id: `drive:${file.id}`,
      driveId: file.id,
      name: file.name,
      kind: file.mimeType === 'application/vnd.google-apps.folder' ? 'directory' : 'file',
      type: file.mimeType || '',
      mimeType: file.mimeType || '',
      size: Number(file.size || 0),
      modified: file.modifiedTime ? new Date(file.modifiedTime).getTime() : 0,
      webViewLink: file.webViewLink || `https://drive.google.com/open?id=${encodeURIComponent(file.id)}`,
      thumbnailLink: file.thumbnailLink || '',
      canDownload: file.capabilities?.canDownload !== false,
      origin: 'drive',
      path: folderName
    }));
    state.driveEntries = append ? [...state.driveEntries, ...mapped] : mapped;
    state.drivePageToken = data.nextPageToken || null;
    if (push) {
      state.driveFolderStack.push({ id: folderId, name: folderName });
    } else if (folderId === 'root') {
      state.driveFolderStack = [];
    }
    state.driveLoading = false;
    updateDriveConnectionUI();
    return mapped.length;
  } catch (error) {
    state.driveLoading = false;
    throw error;
  }
}

async function enterDriveFolder(entry) {
  if (!state.driveToken) return connectGoogleDrive();
  try {
    await loadDriveFolder(entry.driveId, entry.name, true, false);
    updateLocation();
    renderEntries();
  } catch (error) { toast(error.message || 'Could not open this Drive folder.'); }
}

async function driveNavigateUp(index) {
  if (index < 0) return;
  const target = index === -1 ? { id: 'root', name: 'My Drive' } : state.driveFolderStack[index];
  state.driveFolderStack = index === -1 ? [] : state.driveFolderStack.slice(0, index + 1);
  try {
    await loadDriveFolder(target.id, target.name, false, false);
    updateLocation();
    renderEntries();
  } catch (error) { toast(error.message || 'Could not open this Drive location.'); }
}

function getVisibleEntries() {
  const source = state.currentView === 'drive' ? state.driveEntries : state.entries;
  let entries = [...source];
  if (state.currentView === 'starred') entries = [...state.entries, ...state.driveEntries].filter(entry => state.starredIds.has(entry.id));
  if (state.currentView === 'recent') entries = [...state.entries, ...state.driveEntries].filter(entry => state.recentIds.includes(entry.id)).sort((a, b) => state.recentIds.indexOf(a.id) - state.recentIds.indexOf(b.id));
  if (state.search.trim()) {
    const query = state.search.trim().toLowerCase();
    entries = entries.filter(entry => entry.name.toLowerCase().includes(query));
  }
  if (state.currentView !== 'recent') {
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return state.sortAscending ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }
  return entries;
}

function updateLocation() {
  const heading = $('#location-heading');
  const breadcrumbs = $('#breadcrumbs');
  breadcrumbs.replaceChildren();
  if (state.currentView === 'drive') {
    heading.textContent = state.driveFolderStack.length ? state.driveFolderStack[state.driveFolderStack.length - 1].name : 'My Drive';
    const root = document.createElement('button');
    root.type = 'button'; root.textContent = 'My Drive'; root.className = state.driveFolderStack.length ? '' : 'crumb-current';
    root.addEventListener('click', () => driveNavigateUp(-1));
    breadcrumbs.append(root);
    state.driveFolderStack.forEach((part, index) => {
      if (index === 0 && part.id === 'root') return;
      const separator = document.createElement('span'); separator.className = 'crumb-separator'; separator.textContent = '›';
      const button = document.createElement('button'); button.type = 'button'; button.textContent = part.name;
      if (index === state.driveFolderStack.length - 1) button.className = 'crumb-current';
      button.addEventListener('click', () => driveNavigateUp(index));
      breadcrumbs.append(separator, button);
    });
    return;
  }
  if (state.currentView === 'recent') { heading.textContent = 'Recent'; return; }
  if (state.currentView === 'starred') { heading.textContent = 'Starred'; return; }
  heading.textContent = 'My files';
  if (!state.directoryStack.length) {
    const crumb = document.createElement('span'); crumb.className = 'crumb-current'; crumb.textContent = 'On this device'; breadcrumbs.append(crumb);
  } else {
    state.directoryStack.forEach((part, index) => {
      if (index) { const separator = document.createElement('span'); separator.className = 'crumb-separator'; separator.textContent = '›'; breadcrumbs.append(separator); }
      const button = document.createElement('button'); button.type = 'button'; button.textContent = part.name;
      if (index === state.directoryStack.length - 1) button.className = 'crumb-current';
      button.addEventListener('click', () => navigateUp(index)); breadcrumbs.append(button);
    });
  }
}

function renderEntries() {
  const visible = getVisibleEntries();
  const empty = $('#empty-state');
  const area = $('#file-area');
  const count = $('#item-count');
  const noResults = $('#no-results');
  const grid = $('#file-grid');
  const tableWrap = $('#file-table-wrap');
  const tableBody = $('#file-table-body');
  const source = state.currentView === 'drive' ? state.driveEntries : state.entries;
  const hasEntries = source.length > 0;
  empty.hidden = hasEntries;
  area.hidden = !hasEntries;
  noResults.hidden = visible.length > 0 || !hasEntries;
  grid.hidden = !state.gridView || visible.length === 0;
  tableWrap.hidden = state.gridView || visible.length === 0;
  count.textContent = `${visible.length} item${visible.length === 1 ? '' : 's'}`;
  $('#drive-load-row').hidden = state.currentView !== 'drive' || !state.drivePageToken;
  $('#drive-upload-button').hidden = state.currentView !== 'drive' || !state.driveToken;
  $('#empty-state h2').textContent = state.currentView === 'drive' ? (state.driveToken ? 'This folder is empty' : 'Connect Google Drive') : 'Your files, all in one place';
  $('#empty-state > p:not(.privacy-note)').textContent = state.currentView === 'drive'
    ? (state.driveToken ? 'There are no files in this Google Drive folder.' : 'Connect your Google account to browse files stored in Google Drive.')
    : 'Open a folder to browse its contents, or choose individual files to view them here.';
  $('#empty-open-folder').hidden = state.currentView === 'drive';
  $('#empty-open-files').hidden = state.currentView === 'drive';
  $('.privacy-note').hidden = state.currentView === 'drive';
  grid.replaceChildren(); tableBody.replaceChildren();

  visible.forEach((entry) => {
    const card = document.createElement('div');
    card.className = `file-card${entry.kind === 'directory' ? ' folder' : ''}`;
    card.setAttribute('role', 'listitem'); card.tabIndex = 0;
    const fileIcon = document.createElement('div'); fileIcon.className = 'file-icon'; fileIcon.innerHTML = icon(iconForEntry(entry));
    const name = document.createElement('div'); name.className = 'file-name'; name.textContent = entry.name;
    const meta = document.createElement('div'); meta.className = 'file-meta'; meta.textContent = entry.kind === 'directory' ? 'Folder' : formatSize(entry.size);
    card.append(createStarButton(entry), fileIcon, name, meta);
    card.addEventListener('click', (event) => { if (!event.target.closest('.file-star')) activateEntry(entry); });
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateEntry(entry); } });
    grid.append(card);

    const row = document.createElement('tr');
    const nameCell = document.createElement('td'); nameCell.className = 'name-cell'; nameCell.innerHTML = icon(iconForEntry(entry));
    const label = document.createElement('span'); label.textContent = entry.name; nameCell.append(label);
    const typeCell = document.createElement('td'); typeCell.textContent = entry.kind === 'directory' ? 'Folder' : (entry.origin === 'drive' ? (entry.mimeType.startsWith('application/vnd.google-apps.') ? 'Google file' : typeLabel(entry)) : typeLabel(entry));
    const sizeCell = document.createElement('td'); sizeCell.textContent = entry.kind === 'directory' ? '—' : formatSize(entry.size);
    const modifiedCell = document.createElement('td'); modifiedCell.textContent = formatDate(entry.modified);
    const actionsCell = document.createElement('td'); actionsCell.className = 'row-actions'; actionsCell.append(createStarButton(entry, true));
    row.append(nameCell, typeCell, sizeCell, modifiedCell, actionsCell);
    row.addEventListener('click', (event) => { if (!event.target.closest('.row-star')) activateEntry(entry); });
    tableBody.append(row);
  });
}

function activateEntry(entry) {
  if (entry.origin === 'drive') {
    if (entry.kind === 'directory') enterDriveFolder(entry);
    else openDrivePreview(entry);
    return;
  }
  if (entry.kind === 'directory') { navigateInto(entry); return; }
  openPreview(entry);
}

async function openDrivePreview(entry) {
  try {
    toast('Loading preview…');
    const googleMime = entry.mimeType;
    let url;
    let previewName = entry.name;
    if (googleMime === 'application/vnd.google-apps.document' || googleMime === 'application/vnd.google-apps.spreadsheet' || googleMime === 'application/vnd.google-apps.presentation' || googleMime === 'application/vnd.google-apps.drawing') {
      url = `${DRIVE_API}/files/${encodeURIComponent(entry.driveId)}/export?mimeType=application%2Fpdf`;
    } else {
      url = `${DRIVE_API}/files/${encodeURIComponent(entry.driveId)}?alt=media`;
    }
    const response = await fetch(url, { headers: { Authorization: `Bearer ${state.driveToken}` } });
    if (response.status === 401) {
      state.driveToken = null; state.driveTokenExpiry = 0; updateDriveConnectionUI();
      throw new Error('Google Drive needs you to reconnect.');
    }
    if (!response.ok) {
      let message = `Could not download this Drive file (${response.status}).`;
      try { const data = await response.json(); message = data.error?.message || message; } catch (_) {}
      if (entry.webViewLink) {
        const open = window.confirm(`${message}\n\nOpen this file in Google Drive instead?`);
        if (open) window.open(entry.webViewLink, '_blank', 'noopener');
        return;
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const type = blob.type || (url.includes('/export') ? 'application/pdf' : 'application/octet-stream');
    if (!entry.canDownload && !type.includes('pdf')) {
      window.open(entry.webViewLink, '_blank', 'noopener');
      return;
    }
    if (url.includes('/export')) previewName = `${entry.name}.pdf`;
    const file = new File([blob], previewName, { type, lastModified: entry.modified || Date.now() });
    const localPreviewEntry = { ...entry, name: previewName, type, size: file.size, file, origin: 'drive-preview' };
    await openPreview(localPreviewEntry);
  } catch (error) {
    toast(error.message || 'Could not preview this Drive file.');
  }
}

$('#drive-connect-button').addEventListener('click', connectGoogleDrive);
$('#drive-disconnect-button').addEventListener('click', () => {
  if (state.driveToken) google.accounts.oauth2.revoke(state.driveToken, () => {});
  state.driveToken = null; state.driveTokenExpiry = 0; state.driveAccount = '';
  state.driveEntries = []; state.driveFolderStack = []; state.drivePageToken = null;
  if (state.currentView === 'drive') { state.currentView = 'myfiles'; setActiveNav('myfiles'); updateLocation(); renderEntries(); }
  updateDriveConnectionUI(); toast('Google Drive disconnected');
});
$('#drive-nav').addEventListener('click', async () => {
  if (!state.driveToken || state.driveTokenExpiry <= Date.now()) return connectGoogleDrive();
  state.driveFolderStack = []; state.currentView = 'drive'; state.search = ''; $('#search-input').value = '';
  try { await loadDriveFolder('root', 'My Drive', false); updateLocation(); renderEntries(); }
  catch (error) { toast(error.message || 'Could not load Google Drive.'); }
});
$('#drive-load-more').addEventListener('click', async () => {
  try { await loadDriveFolder(driveFolderId(), state.driveFolderStack.at(-1)?.name || 'My Drive', false, true); renderEntries(); }
  catch (error) { toast(error.message || 'Could not load more Drive files.'); }
});

// Upload selected local files into the currently open Google Drive folder.
const driveUploadInput = $('#drive-upload-input');
$('#drive-upload-button').addEventListener('click', () => driveUploadInput.click());
driveUploadInput.addEventListener('change', async () => {
  const files = [...(driveUploadInput.files || [])];
  driveUploadInput.value = '';
  if (!files.length || !state.driveToken) return;
  const folderId = driveFolderId();
  $('#drive-upload-button').disabled = true;
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      toast(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
      const metadata = { name: file.name, parents: [folderId] };
      const boundary = '-------chromeosfiles' + Math.random().toString(16).slice(2);
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
        file, `\r\n--${boundary}--`
      ]);
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,capabilities(canDownload)', {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.driveToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
      });
      if (!response.ok) {
        let message = `Upload failed (${response.status}).`;
        try { message = (await response.json()).error?.message || message; } catch (_) {}
        throw new Error(message);
      }
    }
    await loadDriveFolder(folderId, state.driveFolderStack.at(-1)?.name || 'My Drive', false, false);
    renderEntries();
    toast(`${files.length} file${files.length === 1 ? '' : 's'} uploaded to Google Drive`);
  } catch (error) { toast(error.message || 'Could not upload to Google Drive.'); }
  finally { $('#drive-upload-button').disabled = false; }
});

$('#drive-setup-close').addEventListener('click', () => $('#drive-setup-dialog').close());
$('#drive-setup-cancel').addEventListener('click', () => $('#drive-setup-dialog').close());
$('#drive-setup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const clientId = $('#drive-client-id').value.trim();
  if (!clientId.endsWith('.apps.googleusercontent.com')) { toast('Enter a valid Google OAuth client ID.'); return; }
  localStorage.setItem('chromeos-files-google-client-id', clientId);
  $('#drive-setup-dialog').close();
  await connectGoogleDrive();
});

updateDriveConnectionUI();
