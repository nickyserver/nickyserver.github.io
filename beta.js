/* ============================================================
   vav4.2 Engine Script for vavbrowser.html
   Coded By Rocco Beban
   =========================================================== */

(function () {
  const STORAGE = { BOOK: 'mc_bmk', HIST: 'mc_hist' };

  // 1. Inject required CSS styles directly into <head>
  function injectStyles() {
    if (document.getElementById('vav-dynamic-styles')) return;
    const style = document.createElement('style');
    style.id = 'vav-dynamic-styles';
    style.textContent = `
      .bookmarks-bar {
        background: var(--toolbar);
        height: 32px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        white-space: nowrap;
        overflow-x: auto;
        transition: height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
        box-sizing: border-box;
      }
      .bookmarks-bar.hidden {
        height: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        border-bottom: none !important;
        overflow: hidden !important;
        opacity: 0;
        pointer-events: none;
      }
      .bm-btn {
        display: flex;
        align-items: center;
        background: var(--tab);
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        color: var(--muted);
        user-select: none;
        transition: background var(--transition, 0.18s), color var(--transition, 0.18s);
      }
      .bm-btn:hover {
        background: var(--active-tab);
        color: #fff;
      }
      .bm-btn img {
        width: 16px;
        height: 16px;
        margin-right: 6px;
        border-radius: 3px;
      }
      @keyframes forceShow {
  from { display: block !important; opacity: 1 !important; visibility: visible !important; }
  to { display: block !important; opacity: 1 !important; visibility: visible !important; }
}

.fullscreen-hide {
  display: none !important;
}
.fullscreen-webview {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  
  /* Forces the element into the browser's official Top Layer */
  overlay: top !important; 
}
.bm-manager, iframe.webview, img[data-tab], video[data-tab], audio[data-tab] {
  position: relative;
  z-index: auto;
}

    `;
    document.head.appendChild(style);
  }
  // 2. Inject missing DOM elements into vavbrowser.html
  function setupDOMStructure() {
    injectStyles();

    const toolbar = document.querySelector('.toolbar');
    const sidePanels = document.getElementById('sidePanels');
    const content = document.querySelector('.content');

    // Add missing toolbar controls
    if (toolbar && !document.getElementById('toggleBookmarksBar')) {
      const goBtn = document.getElementById('goBtn');

      const toggleBMBar = document.createElement('div');
      toggleBMBar.className = 'btn';
      toggleBMBar.id = 'toggleBookmarksBar';
      toggleBMBar.title = 'Toggle Bookmarks Bar';
      toggleBMBar.textContent = '⬍';
      toolbar.insertBefore(toggleBMBar, goBtn ? goBtn.nextSibling : null);

      const openFileBtn = document.createElement('div');
      openFileBtn.className = 'btn';
      openFileBtn.id = 'openFileBtn';
      openFileBtn.title = 'Open File';
      openFileBtn.textContent = '◉';
      toolbar.insertBefore(openFileBtn, toggleBMBar.nextSibling);

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'openFile';
      fileInput.accept = '.html,.htm,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.mp4';
      fileInput.style.display = 'none';
      toolbar.appendChild(fileInput);
    }

    // Add Bookmarks Bar element beneath Toolbar
    if (!document.getElementById('bookmarksBar') && content) {
      const bmBar = document.createElement('div');
      bmBar.className = 'bookmarks-bar';
      bmBar.id = 'bookmarksBar';
      content.parentNode.insertBefore(bmBar, content);
    }

    // Add Exit Fullscreen Overlay
    if (!document.getElementById('exitFullscreenOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'exitFullscreenOverlay';
      overlay.textContent = '✕ Exit Fullscreen';
      overlay.style.cssText = `
        position:fixed; top:12px; right:12px; z-index:2147483647;
        background:rgba(0,0,0,0.65); padding:8px 12px; border-radius:8px;
        font-size:14px; cursor:pointer; user-select:none; display:none;
        color:white; font-weight:600; backdrop-filter: blur(4px); pointer-events:auto;
      `;
      document.body.appendChild(overlay);
    }

    // Configure Side Panel HTML
    if (sidePanels) {
      sidePanels.innerHTML = `
        <div class="btn" id="fullscreenBtn" style="margin:8px">▶</div>
        <h3 style="padding:8px;color:var(--muted)">
          Bookmarks
          <button id="clearBookmarksBtn" style="float:right; background:var(--tab); color:var(--muted); border:none; padding:4px 8px; border-radius:6px; cursor:pointer;">Clear</button>
        </h3>
        <div id="bookmarksList"></div>
        <h3 style="padding:8px;color:var(--muted)">
          History (by rocco beban)
          <button id="clearHistoryBtn" style="float:right; background:var(--tab); color:var(--muted); border:none; padding:4px 8px; border-radius:6px; cursor:pointer;">Clear</button>
          <button id="openBookmarksManagerBtn" style="float:right; background:var(--tab); color:var(--muted); border:none; padding:4px 8px; border-radius:6px; cursor:pointer; margin-right:4px;">★</button>
        </h3>
        <div id="historyList"></div>
      `;
    }
  }

  setupDOMStructure();

  /* ============================
     Core State & Helpers
     ============================ */
  const $ = id => document.getElementById(id);
  let tabs = [], activeTabId = null, nextTabId = 1;

  const searchSel = $('searchEngine'), addr = $('address'), status = $('status'), webArea = $('webviewArea'), loading = $('loadingBar');
  const bookmarksEl = $('bookmarksList'), historyEl = $('historyList'), addrFav = $('addrFavicon');

  function getTab(id) {
    return tabs.find(t => t.id === id) || null;
  }

  function faviconFor(url) {
    try {
      let u = new URL(url);
      return "https://www.google.com/s2/favicons?sz=32&domain_url=" + u.origin;
    } catch (e) {
      return "";
    }
  }

  /* ============================
     Tabs Engine
     ============================ */
  function createTab(url = '', activate = true) {
    const id = 't' + (nextTabId++);
    const tab = { id, url, history: url ? [url] : [], i: url ? 0 : -1, title: 'New Tab', iframe: null, favicon: '' };
    tabs.push(tab);
    if (activate) activateTab(id);
    renderTabs();
  }

  function renderTabs() {
    $('tabs').innerHTML = '';
    tabs.forEach(t => {
      const el = document.createElement('div');
      el.className = 'tab' + (t.id === activeTabId ? ' active' : '');
      el.innerHTML = `<div class="favicon">${t.favicon ? `<img src="${t.favicon}">` : ''}</div>
                    <div class="title">${t.title}</div>
                    <div class="close" title="Close">✕</div>`;
      el.onclick = () => activateTab(t.id);
      el.querySelector('.close').onclick = (e) => { e.stopPropagation(); closeTab(t.id); };
      $('tabs').appendChild(el);
    });
    const btn = document.createElement('button');
    btn.className = 'add-tab';
    btn.textContent = '+';
    btn.onclick = () => createTab('', true);
    $('tabs').appendChild(btn);
  }

  function activateTab(id) {
    activeTabId = id;
    renderTabs();
    renderWeb();
    const t = getTab(id);
    addr.value = t && t.url ? t.url : '';
    if (t && t.favicon) {
      addrFav.src = t.favicon;
      addrFav.style.display = 'inline-block';
    } else {
      addrFav.style.display = 'none';
    }
  }

  function closeTab(id) {
    const i = tabs.findIndex(x => x.id === id);
    if (i < 0) return;
    const t = tabs[i];
    if (t.iframe) t.iframe.remove();
    const img = document.querySelector(`img[data-tab="${id}"]`); if (img) img.remove();
    const aud = document.querySelector(`audio[data-tab="${id}"]`); if (aud) aud.remove();
    const vid = document.querySelector(`video[data-tab="${id}"]`); if (vid) vid.remove();
    tabs.splice(i, 1);
    activeTabId = tabs.length ? tabs[Math.max(0, i - 1)].id : null;
    renderTabs();
    renderWeb();
  }

  function renderWeb() {
    tabs.forEach(t => {
      const imgs = document.querySelectorAll(`img[data-tab]`); imgs.forEach(im => im.style.display = im.dataset.tab === t.id && t.id === activeTabId ? 'block' : 'none');
      const auds = document.querySelectorAll(`audio[data-tab]`); auds.forEach(a => a.style.display = a.dataset.tab === t.id && t.id === activeTabId ? 'block' : 'none');
      const vids = document.querySelectorAll(`video[data-tab]`); vids.forEach(v => v.style.display = v.dataset.tab === t.id && t.id === activeTabId ? 'block' : 'none');

      if (!t.iframe) {
        const ifr = document.createElement('iframe');
        ifr.className = 'webview';
        ifr.dataset.tab = t.id;
        webArea.appendChild(ifr);
        t.iframe = ifr;

        ifr.addEventListener('load', () => {
          try {
            t.title = t.iframe.contentDocument && t.iframe.contentDocument.title ? t.iframe.contentDocument.title : (t.url || 'New Tab');
          } catch (e) {
            t.title = t.url || 'New Tab';
          }
          t.favicon = faviconFor(t.url);
          renderTabs();
          if (t.id === activeTabId) {
            addrFav.src = t.favicon || '';
            addrFav.style.display = t.favicon ? 'inline-block' : 'none';
          }
          if (loading) loading.style.width = '0%';
          if (status) status.textContent = 'Loaded';
        });

        ifr.addEventListener('error', () => {
          if (loading) loading.style.width = '0%';
          if (status) status.textContent = 'Load error';
        });
      }

      if (t.iframe) t.iframe.style.display = t.id === activeTabId ? 'block' : 'none';

      if (t.id === activeTabId && t.url) {
        if (t.iframe.src !== t.url) {
          if (loading) loading.style.width = '40%';
          if (status) status.textContent = 'Loading...';
          t.iframe.src = t.url;
        }
      }
    });

    const activeTabObj = getTab(activeTabId);
    if (activeTabObj && activeTabObj.isManager) {
      renderManager(activeTabObj);
    } else {
      document.querySelectorAll('.bm-manager').forEach(el => el.remove());
    }
  }

  /* ============================
     Navigation & History
     ============================ */
  function nav(raw) {
    const t = getTab(activeTabId); if (!t) return;
    let u = raw.trim(); if (!u) return;
    if (/\s/.test(u) || !u.includes('.')) u = searchSel.value + encodeURIComponent(u);
    else if (!/^https?:\/\//.test(u)) u = 'https://' + u;

    t.history = t.history.slice(0, t.i + 1);
    t.history.push(u); t.i = t.history.length - 1;
    t.url = u; addr.value = u; t.favicon = faviconFor(u);
    if (t.favicon) { addrFav.src = t.favicon; addrFav.style.display = 'inline-block'; }

    if (loading) loading.style.width = '40%';
    if (status) status.textContent = 'Loading...';
    renderWeb(); pushHist(u);
  }

  function pushHist(u) {
    const h = JSON.parse(localStorage.getItem(STORAGE.HIST) || '[]');
    h.unshift({ u, ts: Date.now() });
    localStorage.setItem(STORAGE.HIST, JSON.stringify(h.slice(0, 100)));
    renderPanels();
  }

  /* ============================
     Bookmarks & Panels Engine
     ============================ */
  function addBmk(u) {
    if (!u) return;
    const b = JSON.parse(localStorage.getItem(STORAGE.BOOK) || '[]');
    if (!b.find(x => x.u === u)) {
      b.unshift({ u, ts: Date.now() });
      localStorage.setItem(STORAGE.BOOK, JSON.stringify(b));
      renderPanels();
    }
  }

  function renderPanels() {
    if (bookmarksEl) {
      bookmarksEl.innerHTML = '';
      JSON.parse(localStorage.getItem(STORAGE.BOOK) || '[]').forEach(x => {
        const d = document.createElement('div'); d.className = 'card';
        d.innerHTML = `<div>${x.u}</div><small>★</small>`;
        d.onclick = () => createTab(x.u, true);
        bookmarksEl.appendChild(d);
      });
    }

    if (historyEl) {
      historyEl.innerHTML = '';
      JSON.parse(localStorage.getItem(STORAGE.HIST) || '[]').forEach(x => {
        const d = document.createElement('div'); d.className = 'card';
        d.innerHTML = `<div>${x.u}</div><small>${new Date(x.ts).toLocaleString()}</small>`;
        d.onclick = () => createTab(x.u, true);
        historyEl.appendChild(d);
      });
    }

    renderBookmarksBar();
  }

  function renderBookmarksBar() {
    const bookmarksBar = $('bookmarksBar');
    if (!bookmarksBar) return;

    const b = JSON.parse(localStorage.getItem(STORAGE.BOOK) || '[]');
    bookmarksBar.innerHTML = '';

    if (b.length === 0) {
      const emptyHint = document.createElement('span');
      emptyHint.style.cssText = 'color:var(--muted); font-size:12px; padding:0 4px;';
      emptyHint.textContent = 'No bookmarks yet (Click ☆ to bookmark a site)';
      bookmarksBar.appendChild(emptyHint);
      return;
    }

    b.forEach(x => {
      const btn = document.createElement('div');
      btn.className = 'bm-btn';

      const icon = document.createElement('img');
      icon.src = faviconFor(x.u);
      icon.onerror = () => { icon.style.display = 'none'; };
      btn.appendChild(icon);

      const label = document.createElement('span');
      try {
        label.textContent = x.title || new URL(x.u).hostname.replace('www.', '');
      } catch (err) {
        label.textContent = x.u;
      }
      btn.appendChild(label);

      btn.onclick = () => createTab(x.u, true);
      bookmarksBar.appendChild(btn);
    });
  }

  /* ============================
     UI Control Handlers
     ============================ */
  $('goBtn').onclick = () => nav(addr.value);
  addr.onkeydown = e => { if (e.key === 'Enter') nav(addr.value); };

  $('reload').onclick = () => { const t = getTab(activeTabId); if (t && t.iframe) t.iframe.src = t.url; };
  $('home').onclick = () => nav('https://google.com');
  $('bookmarkBtn').onclick = () => { const t = getTab(activeTabId); if (t && t.url) addBmk(t.url); };
  $('toggleBookmarks').onclick = () => { $('sidePanels').style.display = $('sidePanels').style.display === 'none' ? 'block' : 'none'; };

  $('back').onclick = () => {
    const t = getTab(activeTabId);
    if (t && t.i > 0) {
      t.i--; t.url = t.history[t.i]; addr.value = t.url; t.favicon = faviconFor(t.url);
      if (t.favicon) { addrFav.src = t.favicon; addrFav.style.display = 'inline-block'; }
      renderWeb();
    }
  };

  $('forward').onclick = () => {
    const t = getTab(activeTabId);
    if (t && t.i < t.history.length - 1) {
      t.i++; t.url = t.history[t.i]; addr.value = t.url; t.favicon = faviconFor(t.url);
      if (t.favicon) { addrFav.src = t.favicon; addrFav.style.display = 'inline-block'; }
      renderWeb();
    }
  };

  if ($('toggleBookmarksBar')) {
    $('toggleBookmarksBar').onclick = () => {
      const bmBar = $('bookmarksBar');
      if (bmBar) bmBar.classList.toggle('hidden');
    };
  }
  if ($('clearHistoryBtn')) {
    $('clearHistoryBtn').onclick = () => { localStorage.setItem(STORAGE.HIST, '[]'); renderPanels(); };
  }
  if ($('clearBookmarksBtn')) {
    $('clearBookmarksBtn').onclick = () => { localStorage.setItem(STORAGE.BOOK, '[]'); renderPanels(); };
  }

  /* ============================
     Local File Viewer
     ============================ */
  const fileInput = $('openFile');
  if ($('openFileBtn') && fileInput) {
    $('openFileBtn').onclick = () => fileInput.click();

    fileInput.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const t = getTab(activeTabId) || (() => { createTab('', true); return getTab(activeTabId); })();
      const ext = file.name.toLowerCase().split('.').pop();
      const blobURL = URL.createObjectURL(file);

      if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
        if (t.iframe) t.iframe.style.display = "none";
        const oldImg = document.querySelector(`img[data-tab="${t.id}"]`); if (oldImg) oldImg.remove();

        const img = document.createElement("img");
        img.src = blobURL; img.dataset.tab = t.id;
        img.style.cssText = "position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000;";
        webArea.appendChild(img);

        t.url = blobURL; t.title = file.name; t.favicon = ""; addr.value = file.name;
        t.history.push(blobURL); t.i = t.history.length - 1;
        renderTabs(); return;
      }

      if (["mp3"].includes(ext)) {
        if (t.iframe) t.iframe.style.display = "none";
        const oldAudio = document.querySelector(`audio[data-tab="${t.id}"]`); if (oldAudio) oldAudio.remove();

        const audio = document.createElement("audio");
        audio.dataset.tab = t.id; audio.controls = true; audio.src = blobURL;
        audio.style.cssText = "position:absolute; inset:0; width:80%; margin:auto; height:50px;";
        webArea.appendChild(audio);

        t.url = blobURL; t.title = file.name; t.favicon = ""; addr.value = file.name;
        t.history.push(blobURL); t.i = t.history.length - 1;
        renderTabs(); return;
      }

      if (["mp4"].includes(ext)) {
        if (t.iframe) t.iframe.style.display = "none";
        const oldVid = document.querySelector(`video[data-tab="${t.id}"]`); if (oldVid) oldVid.remove();

        const vid = document.createElement("video");
        vid.src = blobURL; vid.dataset.tab = t.id; vid.controls = true;
        vid.style.cssText = "position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000;";
        webArea.appendChild(vid);

        t.url = blobURL; t.title = file.name; t.favicon = ""; addr.value = file.name;
        t.history.push(blobURL); t.i = t.history.length - 1;
        renderTabs(); return;
      }

      const reader = new FileReader();
      reader.onload = evt => {
        const html = evt.target.result;
        const blob = new Blob([html], { type: "text/html" });
        const htmlURL = URL.createObjectURL(blob);

        t.url = htmlURL; t.title = file.name; t.favicon = ""; addr.value = file.name;
        t.history.push(htmlURL); t.i = t.history.length - 1;
        if (t.iframe) t.iframe.src = htmlURL;
        renderTabs();
      };
      reader.readAsText(file);
    };
  }

  /* ============================
     Bookmarks Manager Module
     ============================ */
  if ($('openBookmarksManagerBtn')) {
    $('openBookmarksManagerBtn').onclick = openBookmarksManager;
  }

  function openBookmarksManager() {
    createTab('', true);
    const t = getTab(activeTabId);
    t.isManager = true;
    t.title = 'Bookmarks Manager';
    renderTabs();
    renderManager(t);
  }

  function renderManager(tab) {
    document.querySelectorAll('.bm-manager').forEach(el => el.remove());
    if (tab.iframe) tab.iframe.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = 'bm-manager';
    wrap.style.cssText = 'position:absolute; inset:0; padding:20px; overflow:auto; background:linear-gradient(180deg, rgba(6,10,15,0.98), rgba(7,11,17,0.98)); color:#fff;';

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <h1 style="margin:0;font-size:18px">Bookmarks Manager for rizzlers</h1>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <input id="bmSearch" placeholder="Search bookmarks" style="padding:6px 10px;border-radius:8px;border:0;background:var(--tab);color:#fff;min-width:180px"/>
          <button id="bmNew" style="padding:6px 10px;border-radius:8px;border:0;background:var(--tab);cursor:pointer;color:#fff">New</button>
          <button id="bmImportBtn" style="padding:6px 10px;border-radius:8px;border:0;background:var(--tab);cursor:pointer;color:#fff">Import</button>
          <button id="bmExportBtn" style="padding:6px 10px;border-radius:8px;border:0;background:var(--tab);cursor:pointer;color:#fff">Export</button>
          <button id="bmClearAll" style="padding:6px 10px;border-radius:8px;border:0;background:#8b2;cursor:pointer;color:#fff">Clear</button>
        </div>
      </div>
      <div id="bmList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;"></div>
      <input type="file" id="bmImportFile" accept=".vav" style="display:none" />
    `;

    webArea.appendChild(wrap);

    const bmSearch = wrap.querySelector('#bmSearch');
    const bmList = wrap.querySelector('#bmList');
    const bmNew = wrap.querySelector('#bmNew');
    const bmExportBtn = wrap.querySelector('#bmExportBtn');
    const bmImportBtn = wrap.querySelector('#bmImportBtn');
    const bmImportFile = wrap.querySelector('#bmImportFile');
    const bmClearAll = wrap.querySelector('#bmClearAll');

    function loadBookmarks() { return JSON.parse(localStorage.getItem(STORAGE.BOOK) || '[]'); }
    function saveBookmarks(arr) { localStorage.setItem(STORAGE.BOOK, JSON.stringify(arr)); renderPanels(); }

    function renderList(filter = '') {
      const b = loadBookmarks();
      const q = filter.trim().toLowerCase();
      bmList.innerHTML = '';
      if (b.length === 0) {
        bmList.innerHTML = `<div style="grid-column:1/-1;padding:20px;background:var(--tab);border-radius:8px;color:var(--muted)">No bookmarks yet. Click "New" to add one or import a JSON file.</div>`;
        return;
      }
      b.forEach((item, idx) => {
        if (q && !(item.u + ' ' + (item.title || '') + ' ' + (item.tag || '')).toLowerCase().includes(q)) return;
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--tab); padding:12px; border-radius:10px; display:flex; flex-direction:column; gap:8px;';
        card.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center">
            <img src="${faviconFor(item.u)}" style="width:20px;height:20px;border-radius:4px;flex:0 0 20px" onerror="this.style.display='none'"/>
            <div style="flex:1;overflow:hidden">
              <div style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title || new URL(item.u).hostname}</div>
              <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.u}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button data-idx="${idx}" data-action="open" style="flex:1;padding:6px;border-radius:8px;border:0;background:var(--active-tab);cursor:pointer;color:#fff">Open</button>
            <button data-idx="${idx}" data-action="openNew" style="padding:6px;border-radius:8px;border:0;background:var(--tab);cursor:pointer;color:#fff">↗</button>
            <button data-idx="${idx}" data-action="edit" style="padding:6px;border-radius:8px;border:0;background:var(--tab);cursor:pointer;color:#fff">✎</button>
            <button data-idx="${idx}" data-action="del" style="padding:6px;border-radius:8px;border:0;background:#b33;cursor:pointer;color:#fff">🗑</button>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <input data-idx="${idx}" data-action="tag" placeholder="tag / folder" value="${item.tag || ''}" style="padding:6px;border-radius:8px;border:0;background:rgba(255,255,255,0.03);color:#fff;flex:1" />
          </div>
        `;
        bmList.appendChild(card);
      });
    }

    renderList('');

    bmSearch.addEventListener('input', e => renderList(e.target.value));
    bmSearch.addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; renderList(''); } });

    bmNew.onclick = () => {
      const url = prompt('Enter URL for new bookmark (include https:// if needed):', 'https://');
      if (!url) return;
      let title = prompt('Optional: title for this bookmark', '');
      const arr = loadBookmarks();
      arr.unshift({ u: url, ts: Date.now(), title: title || url, tag: '' });
      saveBookmarks(arr);
      renderList(bmSearch.value);
    };

    bmList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      const arr = loadBookmarks();
      const item = arr[idx];
      if (!item) return;
      if (action === 'open' || action === 'openNew') {
        createTab(item.u, true);
      } else if (action === 'edit') {
        const newUrl = prompt('Edit URL:', item.u);
        if (!newUrl) return;
        const newTitle = prompt('Edit title:', item.title || '');
        arr[idx].u = newUrl;
        arr[idx].title = newTitle || newUrl;
        saveBookmarks(arr);
        renderList(bmSearch.value);
      } else if (action === 'del') {
        if (!confirm('Delete this bookmark?')) return;
        arr.splice(idx, 1);
        saveBookmarks(arr);
        renderList(bmSearch.value);
      }
    });

    bmList.addEventListener('change', (e) => {
      const input = e.target;
      if (input && input.dataset && input.dataset.action === 'tag') {
        const idx = Number(input.dataset.idx);
        const arr = loadBookmarks();
        if (arr[idx]) {
          arr[idx].tag = input.value;
          saveBookmarks(arr);
        }
      }
    });

    bmExportBtn.onclick = () => {
      const data = loadBookmarks();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/.vav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'bookmarks.vav'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    };

    bmImportBtn.onclick = () => bmImportFile.click();
    bmImportFile.onchange = (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (ee) => {
        try {
          const parsed = JSON.parse(ee.target.result);
          if (!Array.isArray(parsed)) throw new Error('Invalid format');
          const cur = loadBookmarks();
          parsed.forEach(p => {
            if (!cur.find(x => x.u === p.u)) cur.push({ u: p.u, title: p.title || p.u, ts: p.ts || Date.now(), tag: p.tag || '' });
          });
          saveBookmarks(cur);
          renderList(bmSearch.value);
          bmImportFile.value = '';
          alert('Imported ' + parsed.length + ' bookmarks.');
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      r.readAsText(f);
    };

    bmClearAll.onclick = () => {
      if (!confirm('Clear ALL bookmarks? This cannot be undone.')) return;
      saveBookmarks([]);
      renderList('');
    };
  }

  /* ============================
     Fullscreen System
     ============================ */
  let isFullscreen = false;
  let exitOverlayTimer = null;

  function showExitOverlay() {
    const el = $('exitFullscreenOverlay');
    if (!el) return;
    el.style.display = 'block';
    if (exitOverlayTimer) clearTimeout(exitOverlayTimer);
    exitOverlayTimer = setTimeout(() => { el.style.display = 'none'; exitOverlayTimer = null; }, 3500);
  }

  function hideExitOverlay() {
    const el = $('exitFullscreenOverlay');
    if (!el) return;
    el.style.display = 'none';
    if (exitOverlayTimer) { clearTimeout(exitOverlayTimer); exitOverlayTimer = null; }
  }

  async function setFullscreen(enable, useNative = false) {
    const tabsBar = $('tabs');
    const toolbar = document.querySelector('.toolbar');
    const bookmarksBar = $('bookmarksBar');
    const sidePanels = $('sidePanels');

    if (enable) {
      if (useNative && !document.fullscreenElement) {
        try { await document.documentElement.requestFullscreen(); } catch (e) { }
      }
      [tabsBar, toolbar, bookmarksBar, sidePanels].forEach(el => el && el.classList.add('fullscreen-hide'));
      webArea.classList.add('fullscreen-webview');
      if ($('fullscreenBtn')) $('fullscreenBtn').style.background = 'rgba(255,255,255,0.1)';
      isFullscreen = true;
      showExitOverlay();
    } else {
      if (useNative && document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) { }
      }
      [tabsBar, toolbar, bookmarksBar, sidePanels].forEach(el => el && el.classList.remove('fullscreen-hide'));
      webArea.classList.remove('fullscreen-webview');
      if ($('fullscreenBtn')) $('fullscreenBtn').style.background = 'none';
      isFullscreen = false;
      hideExitOverlay();
    }
  }

  if ($('fullscreenBtn')) {
    $('fullscreenBtn').onclick = () => setFullscreen(!isFullscreen, true);
  }

  if ($('exitFullscreenOverlay')) {
    $('exitFullscreenOverlay').onclick = () => setFullscreen(false, true);
  }

  document.addEventListener('keydown', async (e) => {
    if (e.key === 'F10') {
      e.preventDefault();
      setFullscreen(!isFullscreen, true);
    } else if (e.key === 'Escape') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (isFullscreen) {
        setFullscreen(false, true);
      }
    }
  });

  // Launch initial tab & render panels/bookmarks bar
  createTab('', true);
  renderPanels();

})();
function initSpeechToText() {
  const addressInput = document.getElementById('address');
  const goBtn = document.getElementById('goBtn');
  const statusEl = document.getElementById('status');

  if (!addressInput) return;

  if (!document.querySelector("link[href*='icon_names=mic']")) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=mic';
    document.head.appendChild(link);
  }

  const micBtn = document.createElement('span');
  micBtn.id = 'micBtn';
  micBtn.className = 'material-symbols-outlined';
  micBtn.innerText = 'mic';
  micBtn.title = 'Search with your voice';
  
  micBtn.style.cssText = 'cursor:pointer; padding:0 6px; opacity:0.6; font-size:22px; transition:opacity 0.18s, transform 0.18s, color 0.18s; user-select:none; display:inline-flex; align-items:center;';

  micBtn.addEventListener('mouseenter', () => { 
    micBtn.style.opacity = '1'; 
    micBtn.style.transform = 'scale(1.08)'; 
  });
  micBtn.addEventListener('mouseleave', () => { 
    micBtn.style.opacity = '0.6'; 
    micBtn.style.transform = 'scale(1)'; 
  });

  addressInput.parentNode.insertBefore(micBtn, addressInput.nextSibling);

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isListening = false;

    micBtn.addEventListener('click', () => {
      if (isListening) recognition.stop(); else recognition.start();
    });

    recognition.onstart = () => {
      isListening = true;
      micBtn.style.color = '#ef5350';
      micBtn.style.opacity = '1';
      addressInput.value = '';
      addressInput.placeholder = 'Listening...';
      if (statusEl) statusEl.textContent = "Listening to voice input...";
      // Notification Hook: Voice Start
      if(typeof window.showOSNotification === 'function') {
        window.showOSNotification('Voice Engine Active', 'Listening to structural audio input...', 'mic');
      }
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.style.color = '';
      micBtn.style.opacity = '0.6';
      addressInput.placeholder = 'Search or type URL';
    };

    recognition.onresult = (event) => {
      const voiceResult = event.results[0][0].transcript;
      addressInput.value = voiceResult;
      if (statusEl) statusEl.textContent = "Searching for: " + voiceResult;
      // Notification Hook: Voice Processed Result
      if(typeof window.showOSNotification === 'function') {
        window.showOSNotification('Speech Processed', `Searching for: "${voiceResult}"`, 'record_voice_over');
      }
      setTimeout(() => { if (goBtn) goBtn.click(); }, 500);
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error: ", event.error);
      if (statusEl) statusEl.textContent = "Voice Search Error: " + event.error;
      // Notification Hook: Voice Exception Fault
      if(typeof window.showOSNotification === 'function') {
        window.showOSNotification('Voice Engine Error', event.error, 'error');
      }
    };
  } else {
    micBtn.style.display = 'none';
  }
}
