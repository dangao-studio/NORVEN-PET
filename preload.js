/* 諾文桌寵：讓網頁跟主程式溝通 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pet", {
  desktop: true,
  setIgnore: ignore => ipcRenderer.send("set-ignore", !!ignore),
  openPanel: tab => ipcRenderer.send("open-panel", tab || ""),
  openStream: () => ipcRenderer.send("open-stream"),
  toggleHide: () => ipcRenderer.send("toggle-hide"),
  quit: () => ipcRenderer.send("quit"),
  idleSeconds: () => ipcRenderer.invoke("idle"),
  getAutoStart: () => ipcRenderer.invoke("get-autostart"),
  setAutoStart: on => ipcRenderer.invoke("set-autostart", !!on),
  version: () => ipcRenderer.invoke("version"),
  onResumed: fn => ipcRenderer.on("resumed", () => fn()),
  onTab: fn => ipcRenderer.on("tab", (e, t) => fn(t))
});
