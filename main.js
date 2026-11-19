/* 諾文桌寵：主程式（視窗、系統匣、開機啟動） */
const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, powerMonitor } = require("electron");
const path = require("path");

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId("studio.dangao.novumpet");

let stage = null, panel = null, stream = null, tray = null, hidden = false;
const PRELOAD = path.join(__dirname, "preload.js");
const APP = f => path.join(__dirname, "app", f);

function workArea() { return screen.getPrimaryDisplay().workArea; }

function createStage() {
  const wa = workArea();
  stage = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    transparent: true, frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    skipTaskbar: true, alwaysOnTop: true, focusable: false, hasShadow: false, show: false,
    backgroundColor: "#00000000", title: "諾文桌寵",
    webPreferences: { preload: PRELOAD, backgroundThrottling: false }
  });
  stage.setAlwaysOnTop(true, "floating");
  stage.setIgnoreMouseEvents(true, { forward: true });
  stage.loadFile(APP("stage.html"));
  stage.once("ready-to-show", () => stage.showInactive());
  stage.on("closed", () => { stage = null; });
}

function fitStage() {
  if (!stage) return;
  const wa = workArea();
  stage.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
}

function openPanel(tab) {
  if (panel) { panel.show(); panel.focus(); if (tab) panel.webContents.send("tab", tab); return; }
  panel = new BrowserWindow({
    width: 440, height: 700, minWidth: 380, minHeight: 520, title: "諾文桌寵",
    icon: APP("icons/icon-192.png"), autoHideMenuBar: true, backgroundColor: "#F3EEE4",
    webPreferences: { preload: PRELOAD }
  });
  panel.setMenu(null);
  panel.loadFile(APP("panel.html"), tab ? { hash: tab } : undefined);
  panel.on("closed", () => { panel = null; });
}

function openStream() {
  if (stream) { stream.show(); stream.focus(); return; }
  stream = new BrowserWindow({
    width: 1280, height: 400, title: "諾文桌寵 實況視窗（綠幕）",
    icon: APP("icons/icon-192.png"), autoHideMenuBar: true, backgroundColor: "#00B140",
    webPreferences: { preload: PRELOAD, backgroundThrottling: false }
  });
  stream.setMenu(null);
  stream.loadFile(APP("stage.html"), { query: { mode: "stream" } });
  stream.on("closed", () => { stream = null; });
}

function toggleHide() {
  if (!stage) return;
  hidden = !hidden;
  if (hidden) stage.hide(); else stage.showInactive();
  buildTray();
}

function autoStartPath() { return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath; }
function getAutoStart() { return app.getLoginItemSettings({ path: autoStartPath() }).openAtLogin; }
function setAutoStart(on) { app.setLoginItemSettings({ openAtLogin: !!on, path: autoStartPath() }); }

function buildTray() {
  if (!tray) {
    const img = nativeImage.createFromPath(APP("icons/tray.png"));
    tray = new Tray(img);
    tray.setToolTip("諾文桌寵");
    tray.on("click", () => openPanel());
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "打開面板", click: () => openPanel() },
    { label: "選擇今天出門的人", click: () => openPanel("who") },
    { label: "小鎮日誌", click: () => openPanel("log") },
    { type: "separator" },
    { label: hidden ? "讓大家出來" : "先讓大家躲起來", click: toggleHide },
    { label: "實況視窗（綠幕）", click: openStream },
    { type: "separator" },
    { label: "結束", click: () => app.quit() }
  ]));
}

ipcMain.on("set-ignore", (e, ignore) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w || w !== stage) return;
  if (ignore) w.setIgnoreMouseEvents(true, { forward: true });
  else w.setIgnoreMouseEvents(false);
});
ipcMain.on("open-panel", (e, tab) => openPanel(tab));
ipcMain.on("open-stream", () => openStream());
ipcMain.on("toggle-hide", () => toggleHide());
ipcMain.on("quit", () => app.quit());
ipcMain.handle("idle", () => powerMonitor.getSystemIdleTime());
ipcMain.handle("get-autostart", () => getAutoStart());
ipcMain.handle("set-autostart", (e, on) => { setAutoStart(on); return getAutoStart(); });
ipcMain.handle("version", () => app.getVersion());

app.on("second-instance", () => openPanel());
app.whenReady().then(() => {
  createStage();
  buildTray();
  screen.on("display-metrics-changed", fitStage);
  screen.on("display-added", fitStage);
  screen.on("display-removed", fitStage);
  const resumed = () => { if (stage) stage.webContents.send("resumed"); };
  powerMonitor.on("resume", resumed);
  powerMonitor.on("unlock-screen", resumed);
});
// 關掉面板不會結束程式，只有從系統匣按「結束」才會
app.on("window-all-closed", e => { /* 保持在系統匣 */ });
