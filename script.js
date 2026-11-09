const $=id=>document.getElementById(id);
let tabs=[],activeTabId=null,nextTabId=1;
const STORAGE={BOOK:'mc_bmk',HIST:'mc_hist'};
let notificationHistory = []; // Persistent logging layer for sidebar feed

// Globally scoped placeholder elements to avoid head-loading crashes
let searchSel, addr, status, webArea, loading;
let bookmarksEl, historyEl, addrFav, notificationsEl;
let internalPage;

const SCRIPT_VERSION = "5.1"; 
let osEnabled = localStorage.getItem('vav_os_mode') === 'true';

// Prevent full screen flashing before OS layer migrates elements
if (osEnabled) {
  const maskStyle = document.createElement('style');
  maskStyle.innerHTML = `body > #tabs, body > .toolbar, body > .content { display: none !important; }`;
  document.head.appendChild(maskStyle);
}

function faviconFor(url){
  try{
    if(url.toLowerCase().startsWith('vav://')) return "";
    let u=new URL(url); return "https://www.google.com/s2/favicons?sz=32&domain_url="+u.origin;
  }catch(e){return "";}
}

function createTab(url='',activate=true){
  const id='t'+(nextTabId++);
  const tab={id,url,history:url?[url]:[],i:url?0:-1,title:url.toLowerCase().startsWith('vav://')?url:'New Tab',iframe:null,favicon:''};
  tabs.push(tab);
  if(activate) activateTab(id);
  renderTabs();
}

function renderTabs(){
  const tabContainer = $('tabs');
  if(!tabContainer) return;
  tabContainer.innerHTML='';
  tabs.forEach(t=>{
    const el=document.createElement('div');
    el.className='tab'+(t.id===activeTabId?' active':'');
    el.innerHTML=`<div class="favicon">${t.favicon?`<img src="${t.favicon}">`:''}</div>
                  <div class="title">${t.title}</div>
                  <div class="close">✕</div>`;
    el.onclick=()=>activateTab(t.id);
    el.querySelector('.close').onclick=(e)=>{e.stopPropagation();closeTab(t.id)};
    tabContainer.appendChild(el);
  });
  const btn=document.createElement('button');btn.className='add-tab';btn.textContent='+';btn.onclick=()=>createTab('',true);
  tabContainer.appendChild(btn);
}

function activateTab(id){
  activeTabId=id;renderTabs();renderWeb();
  const t=getTab(id);
  if(t && addr) addr.value=t.url||'';
  if(t && addrFav) addrFav.src=t.favicon||'';
}

function getTab(id){return tabs.find(t=>t.id===id);}

function closeTab(id){
  const i=tabs.findIndex(x=>x.id===id);
  if(i<0)return;
  if(tabs[i].iframe)tabs[i].iframe.remove();
  tabs.splice(i,1);
  activeTabId=tabs.length?tabs[Math.max(0,i-1)].id:null;
  renderTabs();renderWeb();
}

function renderWeb(){
  const activeTab = getTab(activeTabId);
  if(internalPage) {
    if(activeTab && activeTab.url && activeTab.url.toLowerCase().startsWith('vav://')){
      internalPage.style.display = 'block';
      renderInternalPage(activeTab.url);
    } else {
      internalPage.style.display = 'none';
    }
  }

  tabs.forEach(t=>{
    if(!t.iframe && webArea){
      const ifr=document.createElement('iframe');ifr.className='webview';ifr.dataset.tab=t.id;webArea.appendChild(ifr);t.iframe=ifr;
      ifr.addEventListener('load',()=>{
        if(t.url && t.url.toLowerCase().startsWith('vav://')) return;
        t.title=t.url||'New Tab';t.favicon=faviconFor(t.url);
        renderTabs();if(t.id===activeTabId && addrFav) addrFav.src=t.favicon;
        if(loading) loading.style.width='0%';
        if(status) status.textContent='Loaded';
      });
    }
    if(t.iframe) {
      t.iframe.style.display=(t.id===activeTabId && !t.url.toLowerCase().startsWith('vav://'))?'block':'none';
      if(t.id===activeTabId && t.url && !t.url.toLowerCase().startsWith('vav://') && t.iframe.src!==t.url){
        if(loading) loading.style.width='70%';
        if(status) status.textContent='Loading...';
        t.iframe.src=t.url;
      }
    }
  });
}

function nav(raw){
  const t=getTab(activeTabId);if(!t)return;
  let u=raw.trim();if(!u)return;
  
  const isInternal = u.toLowerCase().startsWith('vav://');
  if(!isInternal){
    if(/\s/.test(u)||!u.includes('.'))u=searchSel.value+encodeURIComponent(u);
    else if(!/^https?:\/\//.test(u))u='https://'+u;
  }
  
  t.history=t.history.slice(0,t.i+1);t.history.push(u);t.i++;
  t.url=u; if(addr) addr.value=u;
  
  if(isInternal){
    t.title=u;t.favicon='';if(addrFav) addrFav.src='';
    if(loading) loading.style.width='0%'; if(status) status.textContent='Ready';
    renderTabs();renderWeb();
  } else {
    t.favicon=faviconFor(u);if(addrFav) addrFav.src=t.favicon;
    if(loading) loading.style.width='40%'; if(status) status.textContent='Loading...';
    renderWeb();pushHist(u);
  }
}

function renderInternalPage(url) {
  if (!internalPage) return;
  const target = url.trim().toLowerCase();
  if (target === 'vav://settings') {
    internalPage.innerHTML = `
      <h2 style="color:var(--accent); margin-top:0;">System Settings</h2>
      <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:20px 0;">
      
      <div style="margin-bottom:25px; background:rgba(255,255,255,0.03); padding:18px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
        <h3 style="margin-top:0; margin-bottom:5px; color:#fff; display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="color:var(--accent)">desktop_windows</span> Chrome OS Desktop Subsystem
        </h3>
        <p style="color:var(--muted); font-size:14px; margin-top:0;">Reconstruct global document paths into an interactive multi-window workspace equipped with an independent application dock, status trays, and standalone utilities.</p>
        <button id="osToggleBtn" style="border:none; padding:10px 20px; border-radius:6px; background:${osEnabled ? '#ef5350' : '#00bcd4'}; color:${osEnabled ? '#fff' : '#000'}; cursor:pointer; font-weight:700;" onclick="window.toggleOSMode()">
          ${osEnabled ? 'Deactivate OS Workspace Layer' : 'Activate Immersive OS Mode'}
        </button>
      </div>

      <div style="margin-bottom:25px;">
        <h3 style="margin-bottom:5px;">Release Channel Deployment</h3>
        <p style="color:var(--muted); font-size:14px; margin-top:0;">Toggle software development compilation instances.</p>
        <button style="border:none; color:#fff; padding:8px 16px; border-radius:6px; background:var(--active-tab); cursor:pointer; font-weight:600;" onclick="window.location.search = window.location.search.includes('mode=beta') ? '' : '?mode=beta';">
          Switch System Channel
        </button>
      </div>
      <div>
        <h3>Build Diagnostics</h3>
        <p style="color:var(--muted); font-size:14px; margin:5px 0;">Script Registry: <strong style="color:#fff;">v${SCRIPT_VERSION}</strong></p>
        <p style="color:var(--muted); font-size:14px; margin:5px 0;">Runtime Branch: <strong style="color:#fff;">${window.location.search.includes('mode=beta') ? 'Beta Testing' : 'Stable Production'}</strong></p>
      </div>`;
  } else if (target === 'vav://history') {
    const historyHTML = historyEl?.innerHTML || '<p style="color:var(--muted);">No cached history instances detected.</p>';
    internalPage.innerHTML = `
      <h2 style="color:var(--accent); margin-top:0;">Global History Ledger</h2>
      <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:20px 0;">
      <div style="display:flex; flex-direction:column; gap:10px;">${historyHTML}</div>`;
  } else if (target === 'vav://bookmarks') {
    const bookmarksHTML = bookmarksEl?.innerHTML || '<p style="color:var(--muted);">No stored bookmarks references available.</p>';
    internalPage.innerHTML = `
      <h2 style="color:var(--accent); margin-top:0;">Directory Bookmarks</h2>
      <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:20px 0;">
      <div style="display:flex; flex-direction:column; gap:10px;">${bookmarksHTML}</div>`;
  } else if (target === 'vav://vav-urls') {
    internalPage.innerHTML = `
      <h2 style="color:var(--accent); margin-top:0;">Internal Command Directories</h2>
      <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:20px 0;">
      <p style="color:var(--muted); margin-bottom:20px;">Direct system indexing loops available inside this build layer:</p>
      <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:14px;">
        <li><a href="#" style="color:var(--accent); text-decoration:none; font-weight:600; font-size:16px;" onclick="window.navInternal('vav://settings')">vav://settings</a> — System parameters</li>
        <li><a href="#" style="color:var(--accent); text-decoration:none; font-weight:600; font-size:16px;" onclick="window.navInternal('vav://history')">vav://history</a> — Full indexed session logs</li>
        <li><a href="#" style="color:var(--accent); text-decoration:none; font-weight:600; font-size:16px;" onclick="window.navInternal('vav://bookmarks')">vav://bookmarks</a> — Stored directory indices</li>
        <li><a href="#" style="color:var(--accent); text-decoration:none; font-weight:600; font-size:16px;" onclick="window.navInternal('vav://vav-urls')">vav://vav-urls</a> — Index reference mapping</li>
      </ul>`;
  } else {
    internalPage.innerHTML = `
      <h2 style="color:#ff5555; margin-top:0;">Address Verification Fault</h2>
      <p style="color:var(--muted);">The internal instruction link <strong>${url}</strong> does not exist.</p>
      <a href="#" style="color:var(--accent); text-decoration:none; font-weight:600;" onclick="window.navInternal('vav://vav-urls')">Return to index core →</a>`;
  }
}
window.navInternal = function(url) { nav(url); };

function pushHist(u){const h=JSON.parse(localStorage.getItem(STORAGE.HIST)||'[]');h.unshift({u,ts:Date.now()});localStorage.setItem(STORAGE.HIST,JSON.stringify(h.slice(0,100)));renderPanels();}

function addBmk(u){
  const b=JSON.parse(localStorage.getItem(STORAGE.BOOK)||'[]');
  if(!b.find(x=>x.u===u)){
    b.unshift({u,ts:Date.now()});
    localStorage.setItem(STORAGE.BOOK,JSON.stringify(b));
    renderPanels();
    // Notification Hook: Bookmark Added
    if(typeof window.showOSNotification === 'function') {
      window.showOSNotification('Bookmark Saved', `Successfully added "${u}" to directories.`, 'star');
    }
  } else {
    // Notification Hook: Bookmark Warning
    if(typeof window.showOSNotification === 'function') {
      window.showOSNotification('Bookmark Notice', 'This URL is already bookmarked.', 'info');
    }
  }
}

function renderSidebarNotifications() {
  if (!notificationsEl) return;
  notificationsEl.innerHTML = '';
  
  if (notificationHistory.length === 0) {
    notificationsEl.innerHTML = '<p style="color:var(--muted); font-size:11px; margin:4px 0; font-style:italic;">No logged notifications.</p>';
    return;
  }
  
  notificationHistory.forEach(item => {
    const d = document.createElement('div');
    d.className = 'card';
    d.style.cssText = 'display:flex; gap:10px; align-items:flex-start; padding:8px 10px; margin-bottom:6px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.04);';
    d.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:16px; color:var(--accent); margin-top:2px;">${item.icon || 'notifications'}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:12px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.title}</div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px; line-height:1.3; word-break:break-word;">${item.message}</div>
        <small style="font-size:9px; color:rgba(255,255,255,0.25); display:block; margin-top:4px;">${new Date(item.ts).toLocaleTimeString()}</small>
      </div>
    `;
    notificationsEl.appendChild(d);
  });
}

function renderPanels(){
  if(bookmarksEl) {
    bookmarksEl.innerHTML='';
    JSON.parse(localStorage.getItem(STORAGE.BOOK)||'[]').forEach(x=>{
      const d=document.createElement('div');d.className='card';d.innerHTML=`<div>${x.u}</div><small>★</small>`;d.onclick=()=>createTab(x.u,true);bookmarksEl.appendChild(d);
    });
  }
  if(historyEl) {
    historyEl.innerHTML='';
    JSON.parse(localStorage.getItem(STORAGE.HIST)||'[]').forEach(x=>{
      const d=document.createElement('div');d.className='card';d.innerHTML=`<div>${x.u}</div><small>${new Date(x.ts).toLocaleTimeString()}</small>`;d.onclick=()=>createTab(x.u,true);historyEl.appendChild(d);
    });
  }
  renderSidebarNotifications();
}

function initBrowserCore() {
  searchSel=$('searchEngine'); addr=$('address'); status=$('status'); webArea=$('webviewArea'); loading=$('loadingBar');
  bookmarksEl=$('bookmarksList'); historyEl=$('historyList'); addrFav=$('addrFavicon');
  notificationsEl=$('notificationsList');

  // Dynamic structural generation of sidebar notification frame if omitted inside native layout
  if($('sidePanels') && !notificationsEl) {
    const notifyPanel = document.createElement('div');
    notifyPanel.id = 'sidebarNotificationsContainer';
    notifyPanel.style.cssText = 'margin-top:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;';
    notifyPanel.innerHTML = `
      <h3 style="font-size:11px; text-transform:uppercase; color:var(--accent); margin:0 0 10px 0; letter-spacing:0.6px; display:flex; align-items:center; gap:6px; font-weight:700;">
        <span class="material-symbols-outlined" style="font-size:16px;">notifications</span> Notification History
      </h3>
      <div id="notificationsList" style="max-height:220px; overflow-y:auto; padding-right:2px;"></div>
    `;
    $('sidePanels').appendChild(notifyPanel);
    notificationsEl = $('notificationsList');
  }

  internalPage = document.createElement('div');
  internalPage.id = 'internalPage';
  internalPage.style.cssText = 'position:absolute; inset:0; background:var(--bg); padding:40px 30px; display:none; z-index:10; overflow:auto; box-sizing:border-box;';
  if(webArea) webArea.appendChild(internalPage);

  if($('goBtn')) $('goBtn').onclick=()=>nav(addr.value);
  if(addr) addr.onkeydown=e=>{if(e.key==='Enter')nav(addr.value);}
  if($('reload')) $('reload').onclick=()=>{const t=getTab(activeTabId);if(t){ if(t.url.toLowerCase().startsWith('vav://')) renderWeb(); else t.iframe.src=t.url; }}
  if($('home')) $('home').onclick=()=>nav('https://example.com');
  if($('bookmarkBtn')) $('bookmarkBtn').onclick=()=>{const t=getTab(activeTabId);if(t&&t.url&&!t.url.toLowerCase().startsWith('vav://'))addBmk(t.url);}
  if($('toggleBookmarks')) $('toggleBookmarks').onclick=()=>{$('sidePanels').style.display=$('sidePanels').style.display==='none'?'block':'none';}
  if($('back')) $('back').onclick=()=>{const t=getTab(activeTabId);if(t&&t.i>0){t.i--;t.url=t.history[t.i];addr.value=t.url;t.favicon=faviconFor(t.url);addrFav.src=t.favicon;renderWeb();}}
  if($('forward')) $('forward').onclick=()=>{const t=getTab(activeTabId);if(t&&t.i<t.history.length-1){t.i++;t.url=t.history[t.i];addr.value=t.url;t.favicon=faviconFor(t.url);addrFav.src=t.favicon;renderWeb();}}

  createTab('',true);
  renderPanels();
}


// --- JS SPEECH TO TEXT GENERATION ---
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


// --- DYNAMIC TOAST NOTIFICATION ENGINE ---
function initNotificationEngine() {
  const style = document.createElement('style');
  style.innerHTML = `
    .os-noti-container {
      position: fixed;
      bottom: 60px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 2000000;
      pointer-events: none;
    }
    .os-toast {
      background: rgba(24, 28, 36, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px 16px;
      color: #fff;
      min-width: 260px;
      max-width: 340px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.25s ease;
      opacity: 0;
    }
    .os-toast.visible {
      transform: translateX(0);
      opacity: 1;
    }
    .os-toast-body { flex: 1; }
    .os-toast-title { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px; }
    .os-toast-msg { font-size: 12px; color: var(--muted); line-height: 1.4; word-break: break-word; }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'osNotificationContainer';
  container.className = 'os-noti-container';
  document.body.appendChild(container);

  window.showOSNotification = function(title, message, icon = 'notifications') {
    const toast = document.createElement('div');
    toast.className = 'os-toast';
    toast.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 20px; color: var(--accent); margin-top: 1px;">${icon}</span>
      <div class="os-toast-body">
        <div class="os-toast-title">${title}</div>
        <div class="os-toast-msg">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    
    // Smooth transition trigger
    requestAnimationFrame(() => { toast.classList.add('visible'); });

    // Automatic decay sequence
    setTimeout(() => {
      toast.classList.remove('visible');
      toast.style.transform = 'translateY(-10px) scale(0.9)';
      setTimeout(() => { toast.remove(); }, 300);
    }, 4000);

    // Sidebar integration stream pipeline
    notificationHistory.unshift({ title, message, icon, ts: Date.now() });
    if (notificationHistory.length > 50) notificationHistory.pop();
    renderSidebarNotifications();
  };
}


// --- ADVANCED EXTENSION PARADIGM: CORE OPERATING SYSTEM LAYERING ENGINE ---
window.toggleOSMode = function() {
  osEnabled = !osEnabled;
  localStorage.setItem('vav_os_mode', osEnabled);
  window.location.reload(); 
};

let openWindows = {};
let topZIndex = 2000;

function initOSCore() {
  if (!osEnabled) return;

  // 1. Dynamic CSS Stylesheet Compiling for OS Elements & Fluid App Sizing
  const sheet = document.createElement('style');
  sheet.innerHTML = `
    body {
      background: url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920') no-repeat center center fixed !important;
      background-size: cover !important; overflow: hidden !important; height: 100vh !important; margin: 0 !important;
    }
    body > #tabs, body > .toolbar, body > .content { display: none !important; }
    
    .os-desktop { position: fixed; inset: 0; bottom: 48px; overflow: hidden; z-index: 5000; }
    
    .os-window {
      position: absolute; background: var(--bg); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px; box-shadow: 0 25px 60px rgba(0,0,0,0.65); display: flex; flex-direction: column;
      overflow: hidden; min-width: 280px; min-height: 180px; z-index: 5010;
      transition: transform 0.22s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.15s ease;
    }
    .os-window.maximized { top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border-radius: 0; border: none; }
    .os-window.minimized { transform: translateY(80px) scale(0.75); opacity: 0; pointer-events: none; }
    
    .os-window-header {
      background: var(--toolbar); padding: 10px 14px; display: flex; align-items: center;
      user-select: none; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: move;
    }
    .os-window-content { flex: 1; overflow: auto; position: relative; background: var(--bg); display: flex; flex-direction: column; }
    
    .os-window-content > #tabs { width: 100%; box-sizing: border-box; flex-shrink: 0; }
    .os-window-content > .toolbar { width: 100%; box-sizing: border-box; flex-shrink: 0; }
    .os-window-content > .content { width: 100%; flex: 1; display: flex; overflow: hidden; height: 100%; }
    
    .os-shelf {
      position: fixed; bottom: 0; left: 0; right: 0; height: 48px;
      background: rgba(20, 24, 33, 0.75); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
      border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between;
      padding: 0 15px; z-index: 1000000; user-select: none;
    }
    .shelf-item {
      width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
      color: #fff; cursor: pointer; transition: background 0.2s, transform 0.1s; position: relative;
    }
    .shelf-item:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
    .shelf-item.active-dot::after {
      content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
      width: 4px; height: 4px; background: var(--accent); border-radius: 50%;
    }
    
    .os-launcher {
      position: fixed; bottom: 56px; left: 12px; width: 340px;
      background: rgba(24, 28, 36, 0.94); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 15px 40px rgba(0,0,0,0.5);
      z-index: 1000005; padding: 18px; display: none; animation: launcherIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
    }
    @keyframes launcherIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .launcher-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .launcher-app {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 12px; border-radius: 12px; color: #fff; cursor: pointer; font-size: 12px; text-align: center; transition: background 0.15s;
    }
    .launcher-app:hover { background: rgba(255,255,255,0.08); }
    .launcher-app span { font-size: 28px; }
    
    .os-tray {
      display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05);
      padding: 4px 12px; border-radius: 20px; color: #fff; font-size: 13px; cursor: pointer; transition: background 0.2s;
    }
    .os-tray:hover { background: rgba(255,255,255,0.1); }
    
    .quick-settings {
      position: fixed; bottom: 56px; right: 12px; width: 260px;
      background: rgba(24, 28, 36, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px; box-shadow: 0 15px 40px rgba(0,0,0,0.5); z-index: 1000005; padding: 16px; display: none; color: #fff;
    }
    .qs-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .qs-btn {
      background: rgba(255,255,255,0.05); border: none; color: #fff; padding: 8px 12px;
      border-radius: 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center;
    }
    .qs-btn.active { background: var(--accent); color: #000; font-weight: 600; }
  `;
  document.head.appendChild(sheet);

  function bringToFront(win) {
    topZIndex++;
    win.style.zIndex = topZIndex;
  }

  // Notification Hook: OS Workspace Welcoming Status
  setTimeout(() => {
    window.showOSNotification('System Ready', `Running VAV workspace layer build v${SCRIPT_VERSION} successfully.`, 'check_circle');
  }, 800);

  function makeDraggable(win, header) {
    header.onpointerdown = (e) => {
      if (e.target.closest('.os-win-controls') || win.classList.contains('maximized')) return;
      bringToFront(win);
      
      let shiftX = e.clientX - win.getBoundingClientRect().left;
      let shiftY = e.clientY - win.getBoundingClientRect().top;
      
      function moveAt(clientX, clientY) {
        win.style.left = (clientX - shiftX) + 'px';
        win.style.top = (clientY - shiftY) + 'px';
      }
      
      function onPointerMove(ev) { moveAt(ev.clientX, ev.clientY); }
      document.addEventListener('pointermove', onPointerMove);
      
      document.onpointerup = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.onpointerup = null;
      };
    };
    header.ondragstart = () => false;
  }

  window.osOpenWindow = function(id, title, icon, initCallback) {
    if (openWindows[id]) {
      let win = openWindows[id];
      if (win.classList.contains('minimized')) win.classList.remove('minimized');
      bringToFront(win);
      return win;
    }

    let win = document.createElement('div');
    win.className = 'os-window';
    win.id = 'win-' + id;
    win.style.width = id === 'browser' ? '920px' : '640px';
    win.style.height = id === 'browser' ? '640px' : '360px';
    win.style.left = (80 + Object.keys(openWindows).length * 30) + 'px';
    win.style.top = (60 + Object.keys(openWindows).length * 30) + 'px';

    win.innerHTML = `
      <div class="os-window-header">
        <span class="material-symbols-outlined" style="font-size:18px; color:var(--accent); margin-right:8px;">${icon}</span>
        <span style="font-size:13px; font-weight:600; flex:1; color:#e2e8f0;">${title}</span>
        <div class="os-win-controls" style="display:flex; gap:6px;">
          <button class="os-min-btn" style="background:#ffbd44; border:none; width:12px; height:12px; border-radius:50%; cursor:pointer;" title="Minimize"></button>
          <button class="os-max-btn" style="background:#00ca4e; border:none; width:12px; height:12px; border-radius:50%; cursor:pointer;" title="Maximize"></button>
          <button class="os-close-btn" style="background:#ff5f56; border:none; width:12px; height:12px; border-radius:50%; cursor:pointer;" title="Close"></button>
        </div>
      </div>
      <div class="os-window-content"></div>
    `;

    $('osDesktop').appendChild(win);
    openWindows[id] = win;

    makeDraggable(win, win.querySelector('.os-window-header'));
    win.onpointerdown = () => bringToFront(win);

    win.querySelector('.os-min-btn').onclick = (e) => {
      e.stopPropagation(); win.classList.add('minimized'); window.updateShelfIndicators();
    };
    win.querySelector('.os-max-btn').onclick = (e) => {
      e.stopPropagation(); win.classList.toggle('maximized');
    };
    win.querySelector('.os-close-btn').onclick = (e) => {
      e.stopPropagation();
      if (id === 'browser') {
        win.classList.add('minimized');
      } else {
        win.remove(); delete openWindows[id];
      }
      window.updateShelfIndicators();
    };

    if (initCallback) initCallback(win.querySelector('.os-window-content'));
    bringToFront(win);
    window.updateShelfIndicators();
    return win;
  };

  // Construct Material Symbols link if not already appended
  if (!document.querySelector("link[href*='Material+Symbols']")) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0';
    document.head.appendChild(link);
  }

  const desktop = document.createElement('div');
  desktop.id = 'osDesktop';
  desktop.className = 'os-desktop';
  document.body.appendChild(desktop);

  // Nest and scale native HTML browser nodes inside OS frame container safely
  window.osOpenWindow('browser', 'Web Browser', 'language', (content) => {
    const tbs = $('tabs'), tlbar = document.querySelector('.toolbar'), cr = document.querySelector('.content');
    if (tbs) content.appendChild(tbs);
    if (tlbar) content.appendChild(tlbar);
    if (cr) content.appendChild(cr);
    if (internalPage) content.appendChild(internalPage);
  });

  const shelf = document.createElement('div');
  shelf.className = 'os-shelf';
  shelf.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <div class="shelf-item material-symbols-outlined" id="osLauncherBtn" style="background:rgba(255,255,255,0.12);">☰</div>
      <div class="shelf-item material-symbols-outlined active-dot" id="shelf-btn-browser" onclick="window.toggleWindowMin('browser')">🌐</div>
      <div class="shelf-item material-symbols-outlined" id="shelf-btn-notes" onclick="window.toggleWindowMin('notes')" style="display:none;">🗒</div>
      <div class="shelf-item material-symbols-outlined" id="shelf-btn-calc" onclick="window.toggleWindowMin('calc')" style="display:none;">📱</div>
      <div class="shelf-item material-symbols-outlined" id="shelf-btn-monitor" onclick="window.toggleWindowMin('monitor')" style="display:none;">🧪</div>
    </div>
    <div class="os-tray" id="osTrayBtn">
      <span class="material-symbols-outlined" style="font-size:16px;">wifi</span>
      <span class="material-symbols-outlined" style="font-size:16px;">battery_full</span>
      <span id="osSystemClock">--:-- --</span>
    </div>
  `;
  document.body.appendChild(shelf);

  const launcher = document.createElement('div');
  launcher.className = 'os-launcher';
  launcher.id = 'osLauncherPanel';
  launcher.innerHTML = `
    <h3 style="margin-top:0; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:14px;">Launcher Applications</h3>
    <div class="launcher-grid">
      <div class="launcher-app" onclick="window.launchOSApp('browser')">
        <span class="material-symbols-outlined" style="color:var(--accent);">⬤</span>
        <div>Browser</div>
      </div>
      <div class="launcher-app" onclick="window.launchOSApp('notes')">
        <span class="material-symbols-outlined" style="color:#ffb74d;">🗒</span>
        <div>Notes Notepad</div>
      </div>
      <div class="launcher-app" onclick="window.launchOSApp('calc')">
        <span class="material-symbols-outlined" style="color:#4db6ac;">📱</span>
        <div>Calculator</div>
      </div>
      <div class="launcher-app" onclick="window.launchOSApp('monitor')">
        <span class="material-symbols-outlined" style="color:#81c784;">🧪</span>
        <div>Diagnostics</div>
      </div>
      <div class="launcher-app" onclick="window.launchOSApp('settings')">
        <span class="material-symbols-outlined" style="color:#e0e0e0;">📠</span>
        <div>Settings</div>
      </div>
    </div>
  `;
  document.body.appendChild(launcher);

  const qs = document.createElement('div');
  qs.className = 'quick-settings';
  qs.id = 'osQuickSettingsPanel';
  qs.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
      <h4 style="margin:0; font-size:13px;">Quick Settings</h4>
      <span style="font-size:11px; color:var(--muted);">VAV OS Layer</span>
    </div>
    <div class="qs-row" style="gap:8px;">
      <button class="qs-btn active"><span class="material-symbols-outlined" style="font-size:15px;">wifi</span> Connected</button>
      <button class="qs-btn active"><span class="material-symbols-outlined" style="font-size:15px;">bluetooth</span> On</button>
    </div>
    <div class="qs-row">
      <button class="qs-btn" onclick="window.toggleOSMode()" style="background:#ef5350; font-weight:700; color:#fff;">
        <span class="material-symbols-outlined" style="font-size:16px;">power_settings_new</span> Deactivate OS Mode
      </button>
    </div>
  `;
  document.body.appendChild(qs);

  $('osLauncherBtn').onclick = (e) => {
    e.stopPropagation(); launcher.style.display = launcher.style.display === 'block' ? 'none' : 'block'; qs.style.display = 'none';
  };
  $('osTrayBtn').onclick = (e) => {
    e.stopPropagation(); qs.style.display = qs.style.display === 'block' ? 'none' : 'block'; launcher.style.display = 'none';
  };
  document.addEventListener('click', () => { launcher.style.display = 'none'; qs.style.display = 'none'; });
  launcher.onclick = qs.onclick = (e) => e.stopPropagation();

  function runOSClock() {
    const d = new Date(); let h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; m = m < 10 ? '0' + m : m;
    if ($('osSystemClock')) $('osSystemClock').textContent = `${h}:${m} ${ampm}`;
  }
  setInterval(runOSClock, 1000); runOSClock();
}

window.launchOSApp = function(appId) {
  const panel = $('osLauncherPanel');
  if (panel) panel.style.display = 'none';
  
  if (appId === 'browser') window.toggleWindowMin('browser', true);
  else if (appId === 'settings') { window.toggleWindowMin('browser', true); nav('vav://settings'); }
  else if (appId === 'notes') {
    // Notification Hook: App Launch
    window.showOSNotification('App Initialized', 'Opening Notes Notepad module workspace.', 'description');
    window.osOpenWindow('notes', 'Notes Notepad', 'description', (content) => {
      content.innerHTML = `<textarea style="width:100%; height:100%; background:#12161f; color:#fff; border:none; padding:12px; box-sizing:border-box; font-family:monospace; font-size:13px; resize:none; outline:none;" placeholder="Write structural notes or copy links here..."></textarea>`;
    });
  } else if (appId === 'calc') {
    // Notification Hook: App Launch
    window.showOSNotification('App Initialized', 'Opening Math Processing Engine.', 'calculate');
    window.osOpenWindow('calc', 'Calculator', 'calculate', (content) => {
      content.style.padding = '12px'; content.style.display = 'flex'; content.style.justifyContent = 'center';
      content.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:6px; width:200px;">
          <input id="calcDisplay" readonly style="width:100%; height:36px; background:#1c2331; border:1px solid rgba(255,255,255,0.1); color:#fff; text-align:right; padding:6px; box-sizing:border-box; font-size:16px; border-radius:6px;" value="0">
          <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px;">
            <button class="add-tab" style="background:rgba(255,255,255,0.06); border-radius:4px; color:#fff;" onclick="calcPress('C')">C</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.06); border-radius:4px; color:#fff;" onclick="calcPress('/')">/</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.06); border-radius:4px; color:#fff;" onclick="calcPress('*')">*</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.06); border-radius:4px; color:#fff;" onclick="calcPress('-')">-</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('7')">7</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('8')">8</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('9')">9</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.06); border-radius:4px; color:#fff;" onclick="calcPress('+')">+</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('4')">4</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('5')">5</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('6')">6</button>
            <button class="add-tab" style="background:var(--accent); border-radius:4px; color:#000; font-weight:bold; grid-row:span 2; height:100%;" onclick="calcPress('=')">=</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('1')">1</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('2')">2</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff;" onclick="calcPress('3')">3</button>
            <button class="add-tab" style="background:rgba(255,255,255,0.03); border-radius:4px; color:#fff; grid-column:span 3;" onclick="calcPress('0')">0</button>
          </div>
        </div>
      `;
    });
  } else if (appId === 'monitor') {
    // Notification Hook: App Launch
    window.showOSNotification('App Initialized', 'Compiling sandbox metrics telemetry.', 'monitoring');
    window.osOpenWindow('monitor', 'Diagnostics Monitor', 'monitoring', (content) => {
      content.style.padding = '14px';
      content.innerHTML = `
        <h4 style="margin-top:0; color:var(--accent); margin-bottom:8px;">VAV OS Resource Metrics</h4>
        <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
          <div>Emulated Kernel Core: <strong style="color:#fff;">VAV Architecture Kernel v${SCRIPT_VERSION}</strong></div>
          <div>Thread Pools Active: <strong style="color:#fff;">${Object.keys(openWindows).length + 3} isolated event loops</strong></div>
          <div>Sandbox State: <strong style="color:#fff;">Secure Local Environment</strong></div>
          <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;">
          <div style="font-family:monospace; color:var(--muted); font-size:10px; line-height:1.4;">
            [OK] Mounted Desktop Shell Core successfully.<br>
            [OK] Nesting full window pipeline tracking maps.<br>
            [OK] Listening to peripheral speech tracking interfaces.
          </div>
        </div>
      `;
    });
  }
};

window.calcPress = function(val) {
  let disp = document.getElementById('calcDisplay'); if (!disp) return;
  if (val === 'C') disp.value = '0';
  else if (val === '=') { try { disp.value = eval(disp.value); } catch(e) { disp.value = 'Error'; } }
  else { if (disp.value === '0' || disp.value === 'Error') disp.value = val; else disp.value += val; }
};

window.toggleWindowMin = function(id, forceShow = false) {
  let win = openWindows[id]; if (!win) { window.launchOSApp(id); return; }
  if (forceShow) { win.classList.remove('minimized'); bringToFront(win); }
  else {
    if (win.classList.contains('minimized')) { win.classList.remove('minimized'); bringToFront(win); }
    else {
      let isTop = true;
      Object.values(openWindows).forEach(w => {
        if (w !== win && parseInt(w.style.zIndex || 0) > parseInt(win.style.zIndex || 0) && !w.classList.contains('minimized')) isTop = false;
      });
      if (isTop) win.classList.add('minimized'); else bringToFront(win);
    }
  }
  window.updateShelfIndicators();
};

window.updateShelfIndicators = function() {
  ['notes', 'calc', 'monitor'].forEach(id => {
    let btn = document.getElementById('shelf-btn-' + id); if (btn) btn.style.display = openWindows[id] ? 'grid' : 'none';
  });
  Object.keys(openWindows).forEach(id => {
    let btn = document.getElementById('shelf-btn-' + id);
    if (btn) { if (!openWindows[id].classList.contains('minimized')) btn.classList.add('active-dot'); else btn.classList.remove('active-dot'); }
  });
};


// --- SAFE MASTER ENGINE COORD PIPELINE ---
function startSystem() {
  initBrowserCore();
  initSpeechToText();
  initNotificationEngine(); // Set up toast overlay styles and layout loop
  if (osEnabled) {
    initOSCore();
  }
}

// Prevents race condition breaks regardless of whether loaded asynchronously or inline
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startSystem);
} else {
  startSystem();
}
