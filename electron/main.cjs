const { app, BrowserWindow, Menu } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const runtimeDir = path.join(app.getPath('temp'), 'Horloge-DELF-DALF-TCF')
try {
  fs.mkdirSync(runtimeDir, { recursive: true })
} catch {
  // Ignore folder creation errors; Electron will fallback to default paths.
}

app.setPath('userData', runtimeDir)
app.commandLine.appendSwitch('disable-gpu')

function writeStartupLog(message) {
  try {
    fs.appendFileSync(path.join(runtimeDir, 'startup.log'), `${new Date().toISOString()} ${message}\n`, 'utf8')
  } catch {
    // Ignore logging failures.
  }
}

function resolveRendererPath() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'web', 'index.html'),
    path.join(process.resourcesPath, 'app.asar', 'dist', 'web', 'index.html'),
    path.join(process.resourcesPath, 'dist', 'web', 'index.html'),
  ]

  return candidates.find((target) => fs.existsSync(target))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    autoHideMenuBar: true,
    backgroundColor: '#f7f3e9',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  Menu.setApplicationMenu(null)
  const rendererPath = resolveRendererPath()
  if (!rendererPath) {
    writeStartupLog('Renderer path not found in expected locations.')
    throw new Error('Impossible de trouver dist/web/index.html pour charger l\'application.')
  }

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    writeStartupLog(`did-fail-load code=${errorCode} desc=${errorDescription} url=${validatedURL}`)
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    writeStartupLog(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`)
  })

  writeStartupLog(`Loading renderer: ${rendererPath}`)
  win.loadFile(rendererPath)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (error) => {
  writeStartupLog(`uncaughtException: ${error?.stack || String(error)}`)
})

process.on('unhandledRejection', (reason) => {
  writeStartupLog(`unhandledRejection: ${String(reason)}`)
})