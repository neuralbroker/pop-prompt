const { app, BrowserWindow, ipcMain, clipboard } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function getDataPath() {
  const dataDir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return path.join(dataDir, 'prompts.json')
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico')

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    frame: true,
    icon: iconPath,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'))
  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('get-prompts', async () => {
  try {
    const dataPath = getDataPath()
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify({ prompts: [] }, null, 2))
      return { prompts: [] }
    }
    const data = fs.readFileSync(dataPath, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Failed to read prompts:', err)
    return { prompts: [] }
  }
})

ipcMain.handle('save-prompts', async (_event, data) => {
  try {
    const dataPath = getDataPath()
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
    return { success: true }
  } catch (err) {
    console.error('Failed to save prompts:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('copy-to-clipboard', async (_event, text) => {
  clipboard.writeText(text)
  return { success: true }
})