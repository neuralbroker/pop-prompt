const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getPrompts: () => ipcRenderer.invoke('get-prompts'),
  savePrompts: (data) => ipcRenderer.invoke('save-prompts', data),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text)
})