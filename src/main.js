// Writeshaper: select text in any app, press the shortcut, get it fixed or rewritten, paste it back.
// Everything runs on this computer. The only network use: the one-time model download from
// Hugging Face, and (unless turned off) a daily check of GitHub for a newer version.
const { app, BrowserWindow, ipcMain, globalShortcut, screen, shell, Tray, Menu, nativeImage, clipboard, nativeTheme, systemPreferences } = require('electron');
const path = require('path');
const store = require('./store');
const keys = require('./keys');
const { setupUpdates } = require('./update-check');
const { createModels } = require('./models');
const { LANGS } = require('./prompts');

const DEMO = process.env.WRITESHAPER_DEMO === '1';
if (process.env.WRITESHAPER_DATA) app.setPath('userData', process.env.WRITESHAPER_DATA);
const engine = DEMO ? require('./demo').engine : require('./engine');
const isMac = process.platform === 'darwin';

let win = null, panel = null, tray = null, models = null, updates = null;
let engineState = { state: 'idle' };
let jobs = new Map();
let panelPrev = null; // was the main window focused when the panel opened?

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => showMain());

const send = (w, ch, d) => { if (w && !w.isDestroyed()) w.webContents.send(ch, d); };
const broadcast = (ch, d) => { send(win, ch, d); send(panel, ch, d); };

function setEngine(s) { engineState = s; broadcast('engine', s); }

async function startEngine() {
  const file = DEMO ? 'demo' : models.pathFor(store.settings.model) || models.pathFor('standard') || models.pathFor('best');
  if (!file) { setEngine({ state: 'nomodel' }); return; }
  setEngine({ state: 'starting' });
  try { await engine.start(app, file); setEngine({ state: 'ready' }); }
  catch (e) { setEngine({ state: 'error', error: e.message || String(e) }); }
}

// ---------- windows ----------
function createMain() {
  win = new BrowserWindow({
    width: 1120, height: 760, minWidth: 860, minHeight: 600,
    show: false,
    title: 'Writeshaper',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: isMac ? undefined : { color: '#00000000', symbolColor: '#6b6b78', height: 44 },
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: 'followWindow',
    backgroundColor: isMac ? '#00000000' : (nativeTheme.shouldUseDarkColors ? '#14131a' : '#f4f3f8'),
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, spellcheck: false },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => { if (!process.env.WRITESHAPER_HIDDEN) win.show(); });
  win.on('close', (e) => {
    // Closing the window keeps Writeshaper running in the menu bar / tray, so the shortcut still works.
    if (!app.quitting) { e.preventDefault(); win.hide(); if (isMac) app.dock?.hide(); }
  });
}

function showMain(view) {
  if (!win || win.isDestroyed()) createMain();
  if (isMac) app.dock?.show();
  win.show(); win.focus();
  if (view) send(win, 'go', view);
}

function createPanel() {
  panel = new BrowserWindow({
    width: 620, height: 300, show: false, frame: false, resizable: false, movable: true,
    transparent: true, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, fullscreenable: false,
    minimizable: false, maximizable: false,
    type: isMac ? 'panel' : undefined,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, spellcheck: false },
  });
  panel.setAlwaysOnTop(true, 'floating');
  if (isMac) panel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  panel.loadFile(path.join(__dirname, 'renderer', 'panel.html'));
  panel.on('blur', () => { if (panel.isVisible() && !panel.pinned && !process.env.WRITESHAPER_KEEP_PANEL) hidePanel(); });
}

function placePanel(h) {
  const pt = screen.getCursorScreenPoint();
  const area = screen.getDisplayNearestPoint(pt).workArea;
  const w = 620;
  let x = Math.round(pt.x - w / 2), y = pt.y + 18;
  if (y + h > area.y + area.height - 12) y = Math.max(area.y + 12, pt.y - h - 18);
  x = Math.min(Math.max(x, area.x + 12), area.x + area.width - w - 12);
  panel.setBounds({ x, y, width: w, height: h });
}

function hidePanel() {
  if (!panel || !panel.isVisible()) return;
  for (const [id, j] of jobs) if (j.owner === 'panel') { j.cancel(); jobs.delete(id); }
  panel.hide();
  send(panel, 'panel-hidden');
}

// Give focus back to the app the text came from.
async function refocusSource() {
  if (isMac) {
    if (!panelPrev) app.hide();
  } else {
    panel.blur();
  }
  await new Promise((r) => setTimeout(r, isMac ? 140 : 90));
}

let busy = false;
async function onShortcut() {
  if (busy) return;
  if (panel && panel.isVisible()) { hidePanel(); return; }
  if (engineState.state === 'nomodel' || !store.settings.onboarded) { showMain('setup'); return; }
  if (isMac && !DEMO && process.env.WRITESHAPER_TEST_SELECTION == null && !keys.trusted(false)) { showMain('permission'); return; }
  busy = true;
  try {
    panelPrev = !!(win && win.isFocused());
    const { text } = DEMO ? { text: process.env.WRITESHAPER_DEMO_TEXT ?? require('./demo').SELECTION }
      : process.env.WRITESHAPER_TEST_SELECTION != null ? { text: process.env.WRITESHAPER_TEST_SELECTION } : await keys.grabSelection();
    placePanel(text ? 300 : 230);
    send(panel, 'panel-open', { text, action: store.settings.firstAction, translateTo: store.settings.translateTo, langs: LANGS, platform: process.platform, shortcut: store.settings.shortcut });
    panel.show(); panel.focus();
  } finally { busy = false; }
}

function registerShortcut(acc) {
  globalShortcut.unregisterAll();
  try { return globalShortcut.register(acc, onShortcut); } catch { return false; }
}

// ---------- tray ----------
function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', isMac ? 'trayTemplate.png' : 'tray.png'));
  if (isMac) img.setTemplateImage(true);
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip('Writeshaper');
  const menu = () => Menu.buildFromTemplate([
    { label: `Shortcut: ${pretty(store.settings.shortcut)}`, enabled: false },
    { type: 'separator' },
    { label: 'Open Writeshaper', click: () => showMain('write') },
    { label: 'Settings…', click: () => showMain('settings') },
    { type: 'separator' },
    { label: 'Quit Writeshaper', role: 'quit' },
  ]);
  tray.on('click', () => { if (!isMac) showMain('write'); });
  tray.setContextMenu(menu());
  tray.refresh = () => tray.setContextMenu(menu());
}
const pretty = (acc) => isMac ? acc.replace('CommandOrControl', '⌘').replace('Command', '⌘').replace('Alt', '⌥').replace('Shift', '⇧').replace('Control', '⌃').replace(/\+/g, '') : acc.replace('CommandOrControl', 'Ctrl').replace(/\+/g, ' + ');

// ---------- IPC ----------
function wire() {
  ipcMain.handle('get-state', () => ({
    settings: store.settings, engine: engineState, models: models.list(), langs: LANGS,
    platform: process.platform, version: app.getVersion(), demo: DEMO, trusted: keys.trusted(false),
  }));
  ipcMain.handle('set-settings', async (_e, patch) => {
    const old = { ...store.settings };
    if (patch.shortcut && patch.shortcut !== old.shortcut) {
      if (!registerShortcut(patch.shortcut)) { registerShortcut(old.shortcut); return { ok: false, error: 'That shortcut is taken by another app. Try another one.' }; }
    }
    store.set(patch);
    if ('openAtLogin' in patch && app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!patch.openAtLogin, openAsHidden: true, args: ['--hidden'] });
    if (patch.model && patch.model !== old.model) startEngine();
    if (patch.theme) nativeTheme.themeSource = patch.theme;
    tray?.refresh?.();
    broadcast('settings', store.settings);
    return { ok: true, settings: store.settings };
  });
  ipcMain.handle('pause-shortcut', (_e, on) => { if (on) globalShortcut.unregisterAll(); else registerShortcut(store.settings.shortcut); return true; });

  ipcMain.handle('models', () => models.list());
  ipcMain.handle('download-model', (_e, id) => { models.download(id); return true; });
  ipcMain.handle('cancel-download', (_e, id) => { models.cancel(id); return true; });
  ipcMain.handle('delete-model', (_e, id) => {
    if (id === store.settings.model) engine.stop();
    models.remove(id);
    startEngine();
    return models.list();
  });
  ipcMain.handle('start-engine', () => startEngine());

  // Streams a rewrite to the window that asked. Returns when finished.
  ipcMain.handle('rewrite', async (e, { id, mode, text, extra }) => {
    const owner = e.sender === panel?.webContents ? 'panel' : 'main';
    const target = BrowserWindow.fromWebContents(e.sender);
    if (engineState.state !== 'ready') {
      if (engineState.state === 'starting') await new Promise((r) => { const t = setInterval(() => { if (engineState.state !== 'starting') { clearInterval(t); r(); } }, 150); });
      if (engineState.state !== 'ready') return { error: engineState.error || 'The writing engine is not ready yet.' };
    }
    let job;
    try {
      job = engine.rewrite({ mode, text, extra }, (t) => send(target, 'stream', { id, text: t }));
      jobs.set(id, { cancel: job.cancel, owner });
      const out = await job.done;
      return { text: out };
    } catch (err) {
      if (err.name === 'AbortError') return { cancelled: true };
      return { error: err.message || String(err) };
    } finally { jobs.delete(id); }
  });
  ipcMain.handle('cancel', (_e, id) => { const j = jobs.get(id); if (j) { j.cancel(); jobs.delete(id); } return true; });

  // Panel actions
  ipcMain.handle('panel-size', (_e, h) => { if (panel) { const b = panel.getBounds(); panel.setBounds({ ...b, height: Math.round(Math.min(h, 640)) }); } });
  ipcMain.handle('panel-pin', (_e, on) => { if (panel) panel.pinned = !!on; });
  ipcMain.handle('panel-close', () => hidePanel());
  ipcMain.handle('panel-copy', (_e, text) => { clipboard.writeText(text); hidePanel(); return true; });
  ipcMain.handle('panel-replace', async (_e, text) => {
    hidePanel();
    if (DEMO) return true;
    await refocusSource();
    await keys.pasteText(text);
    return true;
  });
  ipcMain.handle('panel-open-app', () => { hidePanel(); showMain('write'); });

  ipcMain.handle('permission', (_e, prompt) => {
    const ok = keys.trusted(!!prompt);
    if (!ok && prompt && isMac) shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
    return ok;
  });
  ipcMain.handle('try-shortcut', () => onShortcut());
  ipcMain.handle('open-external', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
  ipcMain.handle('check-updates', () => updates.check({ manual: true }));
  ipcMain.handle('skip-version', (_e, v) => store.set({ skipVersion: v }));
}

app.whenReady().then(() => {
  store.load();
  nativeTheme.themeSource = store.settings.theme || 'system';
  models = createModels(app, (p) => {
    broadcast('model-progress', p);
    if (p.done && (p.id === store.settings.model || engineState.state === 'nomodel')) {
      if (p.id !== store.settings.model) store.set({ model: p.id });
      startEngine();
    }
  });
  if (DEMO) models.list = require('./demo').models;
  wire();
  if (process.argv.includes('--hidden') && store.settings.onboarded) { process.env.WRITESHAPER_HIDDEN = '1'; if (isMac) app.dock?.hide(); }
  createMain();
  createPanel();
  createTray();
  registerShortcut(store.settings.shortcut);
  keys.warm();
  startEngine();
  updates = setupUpdates({ app, repo: 'hollowbit-dev/writeshaper', getSettings: () => store.settings, setSettings: (p) => store.set(p), send: (s) => send(win, 'update', s) });
  updates.schedule();
  app.on('activate', () => showMain());
});

app.on('before-quit', () => { app.quitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); engine.stop(); });
app.on('window-all-closed', (e) => e.preventDefault());
