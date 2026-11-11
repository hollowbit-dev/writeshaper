// Reads the text selected in whatever app is in front, and pastes the new text back.
// It presses Copy / Paste for the user (Cmd+C / Ctrl+C), and puts their clipboard back afterwards.
// On a Mac this needs the Accessibility permission; Windows needs nothing extra.
const { clipboard, systemPreferences } = require('electron');
const { spawn, execFile } = require('child_process');

const isMac = process.platform === 'darwin';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Mac: one short JavaScript-for-Automation run. It waits until the user lets go of the
// shortcut keys (otherwise Cmd+C would arrive as Cmd+Shift+C), then posts the key press.
const JXA = `
ObjC.import('CoreGraphics');
function run(argv) {
  var mods = 0x20000 | 0x40000 | 0x80000 | 0x100000; // shift, control, option, command
  for (var i = 0; i < 75; i++) { if (($.CGEventSourceFlagsState(1) & mods) === 0) break; delay(0.02); }
  var code = argv[0] === 'v' ? 9 : 8;
  var src = $.CGEventSourceCreate(1);
  var d = $.CGEventCreateKeyboardEvent(src, code, true); $.CGEventSetFlags(d, 0x100000); $.CGEventPost(0, d);
  var u = $.CGEventCreateKeyboardEvent(src, code, false); $.CGEventSetFlags(u, 0x100000); $.CGEventPost(0, u);
}`;

// Windows: a PowerShell helper that stays open, so each key press costs milliseconds, not a startup.
const PS = `
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Threading;
public static class WsKeys {
  [DllImport("user32.dll")] static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int v);
  public static void Send(byte key) {
    int[] mods = { 0x10, 0x11, 0x12, 0x5B, 0x5C };
    for (int i = 0; i < 75; i++) { bool down = false; foreach (int v in mods) if ((GetAsyncKeyState(v) & 0x8000) != 0) down = true; if (!down) break; Thread.Sleep(20); }
    keybd_event(0x11, 0, 0, UIntPtr.Zero); keybd_event(key, 0, 0, UIntPtr.Zero);
    keybd_event(key, 0, 2, UIntPtr.Zero); keybd_event(0x11, 0, 2, UIntPtr.Zero);
  }
}
"@
[Console]::Out.WriteLine('ready')
while ($true) { $l = [Console]::In.ReadLine(); if ($l -eq $null) { break }; if ($l -eq 'c') { [WsKeys]::Send(0x43) } elseif ($l -eq 'v') { [WsKeys]::Send(0x56) }; [Console]::Out.WriteLine('ok') }
`;

let ps = null, psQueue = [];
function winHelper() {
  if (ps) return ps;
  ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'], { windowsHide: true });
  ps.stdout.on('data', (d) => {
    for (const line of d.toString().split(/\r?\n/)) if (line.trim() === 'ok' && psQueue.length) psQueue.shift()();
  });
  ps.on('exit', () => { ps = null; psQueue.splice(0).forEach((f) => f()); });
  ps.stdin.write(PS + '\n');
  return ps;
}

function press(key) {
  if (isMac) {
    return new Promise((resolve) => execFile('osascript', ['-l', 'JavaScript', '-e', JXA, key], () => resolve()));
  }
  return new Promise((resolve) => {
    const p = winHelper();
    psQueue.push(resolve);
    p.stdin.write(key + '\n');
    setTimeout(resolve, 1500); // never hang the app if PowerShell is slow
  });
}

// Start the Windows helper early so the first shortcut is quick.
function warm() { if (!isMac) winHelper(); }

function trusted(prompt) {
  if (!isMac) return true;
  return systemPreferences.isTrustedAccessibilityClient(!!prompt);
}

// What's on the clipboard (text, rich text, HTML, picture), so it can be put back afterwards.
function saveClipboard() {
  try {
    const img = clipboard.readImage();
    return { text: clipboard.readText(), html: clipboard.readHTML(), rtf: clipboard.readRTF(), image: img && !img.isEmpty() ? img : null };
  } catch { return { text: '' }; }
}
function restoreClipboard(s) {
  if (!s) return;
  try {
    const data = {};
    if (s.text) data.text = s.text;
    if (s.html) data.html = s.html;
    if (s.rtf) data.rtf = s.rtf;
    if (s.image) data.image = s.image;
    clipboard.clear();
    if (Object.keys(data).length) clipboard.write(data);
  } catch { if (s.text) clipboard.writeText(s.text); }
}

// Returns the selected text ('' when nothing is selected) and the saved clipboard.
async function grabSelection() {
  const saved = saveClipboard();
  const marker = `⁣ws${Date.now()}`;
  clipboard.writeText(marker);
  await press('c');
  let text = '';
  for (let i = 0; i < 20; i++) {
    const now = clipboard.readText();
    if (now !== marker) { text = now; break; }
    await wait(25);
  }
  restoreClipboard(saved);
  return { text, saved };
}

// Pastes text into the app in front, then gives the user their old clipboard back.
async function pasteText(text) {
  const saved = saveClipboard();
  clipboard.writeText(text);
  await wait(60);
  await press('v');
  await wait(450);
  restoreClipboard(saved);
}

module.exports = { grabSelection, pasteText, trusted, warm };
