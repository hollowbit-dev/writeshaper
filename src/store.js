// Settings, saved as JSON in the app's data folder. Writeshaper never saves the text you write.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const defaults = {
  shortcut: process.platform === 'darwin' ? 'Alt+Space' : 'Alt+Shift+Space',
  model: 'standard',
  firstAction: 'fix',
  translateTo: 'English',
  liveCheck: true,
  openAtLogin: false,
  onboarded: false,
  theme: 'system',
  autoUpdate: true,
  lastUpdateCheck: 0,
  skipVersion: '',
};
let settings = { ...defaults };
const file = () => path.join(app.getPath('userData'), 'writeshaper.json');

function load() {
  try { settings = { ...defaults, ...JSON.parse(fs.readFileSync(file(), 'utf8')) }; } catch { /* first run */ }
}
let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file(), JSON.stringify(settings, null, 1)); } catch (e) { console.error('Writeshaper: could not save settings', e); }
  }, 120);
}
module.exports = {
  load,
  defaults,
  get settings() { return settings; },
  set(patch) { Object.assign(settings, patch); save(); },
};
