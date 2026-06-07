const path = require('node:path')
const { CodingStatusEngine } = require('../dist-electron/src/logic/codingStatusEngine')
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const { startCoachBridgeServer } = require('./coachBridgeServer.cjs')

const isDev = process.env.ELECTRON_DEV === '1'
const OVERLAY_WIDTH = 520
const OVERLAY_MIN_HEIGHT = 320
const OVERLAY_MAX_HEIGHT = 900
/** Matches #root padding (8px top + 12px bottom) plus small buffer */
const OVERLAY_CHROME_PADDING = 28
const OVERLAY_TOP_MARGIN = 24
const DEV_PANEL_WIDTH = 380
const DEV_PANEL_HEIGHT = 720
const DEV_PANEL_MARGIN = 24

// TODO: Later, detect the Cursor window bounds and snap this overlay to Cursor's top border
// using OS/window APIs or a VS Code/Cursor extension bridge.
function getOverlayStartPosition() {
  const area = screen.getPrimaryDisplay().workArea
  return {
    x: Math.round(area.x + (area.width - OVERLAY_WIDTH) / 2),
    y: area.y + OVERLAY_TOP_MARGIN,
  }
}

/** Electron throws if setPosition/setBounds get non-integer or non-finite values. */
function roundWindowCoord(value) {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? n : null
}

function safeOverlayPosition(x, y) {
  const px = roundWindowCoord(x)
  const py = roundWindowCoord(y)
  if (px === null || py === null) return null
  return { x: px, y: py }
}

function getDevWindowPosition() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  return {
    x: Math.max(DEV_PANEL_MARGIN, width - DEV_PANEL_WIDTH - DEV_PANEL_MARGIN),
    y: Math.max(DEV_PANEL_MARGIN, Math.round((height - DEV_PANEL_HEIGHT) / 2)),
  }
}

function showDevWindow() {
  if (!devWindow || devWindow.isDestroyed()) {
    devWindow = createDevWindow()
    return
  }
  if (devWindow.isMinimized()) devWindow.restore()
  devWindow.showInactive()
}

let overlayWindow = null
let devWindow = null
let coachBridgeServer = null
let cursorOverlayVisible = false
/** Dev: keep spider on screen while testing from the dev panel (ignores hide requests). */
let overlayPinned = isDev
const engine = new CodingStatusEngine()

function applyOverlayWindowVisibility() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (cursorOverlayVisible) {
    overlayWindow.showInactive()
  } else {
    overlayWindow.hide()
  }
}

function setOverlayVisible(visible) {
  if (!visible && overlayPinned) {
    return { visible: cursorOverlayVisible, pinned: overlayPinned, ignored: true }
  }
  cursorOverlayVisible = Boolean(visible)
  applyOverlayWindowVisibility()
  return { visible: cursorOverlayVisible, pinned: overlayPinned, ignored: false }
}

function setOverlayPinned(pinned) {
  overlayPinned = Boolean(pinned)
  if (overlayPinned) {
    cursorOverlayVisible = true
    applyOverlayWindowVisibility()
  }
  return getOverlayPinState()
}

function getOverlayPinState() {
  return {
    pinned: overlayPinned,
    visible: cursorOverlayVisible,
    dev: isDev,
  }
}

function rendererUrl(mode) {
  if (isDev) {
    return `http://127.0.0.1:5173/?mode=${mode}`
  }
  const indexPath = path.join(__dirname, '../dist/index.html')
  return `file://${indexPath}?mode=${mode}`
}

function broadcastSnapshot(overlayMeta = {}) {
  const snapshot = { ...engine.getSnapshot(), ...overlayMeta }
  for (const window of [overlayWindow, devWindow]) {
    if (!window || window.isDestroyed()) continue
    window.webContents.send('coach:snapshot', snapshot)
  }
}

function overlayMetaForSnapshot(before, after, forceImmediate = false) {
  if (forceImmediate) return { presentImmediately: true }
  if (
    before.currentState !== after.currentState ||
    before.presentationTick !== after.presentationTick
  ) {
    return { presentImmediately: true }
  }
  return {}
}

function dispatchCoachEvent(eventName, args = [], overlayMeta = {}) {
  const LEGACY = new Set([
    'onFileEdited',
    'onFileSaved',
    'onDiagnosticChanged',
    'onDiagnosticsChanged',
    'onTerminalSucceeded',
    'onTerminalFailed',
    'onTerminalStarted',
    'onRunStarted',
    'onRunFinished',
    'onLoopDetected',
    'onPermissionPromptShown',
  ])
  if (LEGACY.has(eventName)) {
    return engine.getSnapshot()
  }
  const handler = engine[eventName]
  if (typeof handler !== 'function') {
    throw new Error(`Unknown coach event: ${eventName}`)
  }
  const before = engine.getSnapshot()
  const snapshot = handler.apply(engine, args)
  const meta = {
    ...overlayMeta,
    ...overlayMetaForSnapshot(before, snapshot, Boolean(overlayMeta.presentImmediately)),
  }
  broadcastSnapshot(meta)
  return { ...snapshot, ...meta }
}

function setOverlayIgnoreMouseEvents(ignore) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (ignore) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  } else {
    overlayWindow.setIgnoreMouseEvents(false)
  }
}

function createOverlayWindow() {
  const { x, y } = getOverlayStartPosition()
  const window = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_MIN_HEIGHT,
    x,
    y,
    show: false,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    fullscreenable: false,
    maximizable: false,
    backgroundColor: '#00000000',
    ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Stay on the current Space only; extension shows/hides when Cursor is focused.
  window.setAlwaysOnTop(true, 'floating')
  window.webContents.on('did-finish-load', () => {
    setOverlayIgnoreMouseEvents(true)
  })
  void window.loadURL(rendererUrl('overlay'))
  window.once('ready-to-show', () => {
    setOverlayIgnoreMouseEvents(true)
    if (cursorOverlayVisible) window.showInactive()
  })
  return window
}

function createDevWindow() {
  const { x, y } = getDevWindowPosition()
  const window = new BrowserWindow({
    width: DEV_PANEL_WIDTH,
    height: DEV_PANEL_HEIGHT,
    x,
    y,
    show: false,
    title: 'Cursor Spider Coach — Dev Panel',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  window.on('closed', () => {
    devWindow = null
  })

  void window.loadURL(rendererUrl('dev'))
  window.once('ready-to-show', () => {
    window.showInactive()
  })
  return window
}

function registerCoachIpc() {
  // Future Cursor/VS Code extension hooks should call these same IPC handlers
  // (or invoke the engine methods directly from a shared host process).
  ipcMain.handle('coach:getSnapshot', () => engine.getSnapshot())
  ipcMain.handle('coach:getReflection', () => engine.generateSessionReflection())
  ipcMain.handle('coach:dispatch', (_event, payload) => {
    const overlayMeta = payload.immediate ? { presentImmediately: true } : {}
    return dispatchCoachEvent(payload.eventName, payload.args ?? [], overlayMeta)
  })

  ipcMain.on('coach:dragOverlayBy', (_event, payload) => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const dx = Number(payload?.dx)
    const dy = Number(payload?.dy)
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return
    try {
      const bounds = overlayWindow.getBounds()
      const pos = safeOverlayPosition(bounds.x + dx, bounds.y + dy)
      if (!pos) return
      overlayWindow.setPosition(pos.x, pos.y)
    } catch (error) {
      console.warn('[coach] drag overlay skipped:', error instanceof Error ? error.message : error)
    }
  })

  ipcMain.on('coach:setOverlayIgnoreMouse', (_event, payload) => {
    setOverlayIgnoreMouseEvents(Boolean(payload?.ignore))
  })

  ipcMain.on('coach:resizeOverlay', (_event, contentHeight) => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const parsed = Number(contentHeight)
    if (!Number.isFinite(parsed) || parsed <= 0) return

    try {
      const targetHeight = Math.min(
        OVERLAY_MAX_HEIGHT,
        Math.max(OVERLAY_MIN_HEIGHT, Math.ceil(parsed + OVERLAY_CHROME_PADDING)),
      )
      const bounds = overlayWindow.getBounds()
      if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y) || !Number.isFinite(bounds.height)) {
        return
      }
      if (bounds.height === targetHeight) return

      const heightDelta = targetHeight - bounds.height
      const x = roundWindowCoord(bounds.x)
      const y = roundWindowCoord(bounds.y - heightDelta)
      if (x === null || y === null) return

      overlayWindow.setBounds({
        x,
        y,
        width: OVERLAY_WIDTH,
        height: targetHeight,
      })
    } catch (error) {
      console.warn('[coach] resize overlay skipped:', error instanceof Error ? error.message : error)
    }
  })
}

app.whenReady().then(() => {
  registerCoachIpc()
  coachBridgeServer = startCoachBridgeServer({
    dispatchCoachEvent,
    getSnapshot: () => engine.getSnapshot(),
    setOverlayVisible,
    setOverlayPinned,
    getOverlayPinState,
  })
  overlayWindow = createOverlayWindow()
  // Dev: show spider immediately; pinned by default so dev-panel clicks don't hide it.
  if (isDev) {
    setOverlayPinned(true)
  } else {
    setOverlayVisible(false)
  }
  devWindow = createDevWindow()
  broadcastSnapshot()

  app.on('activate', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      overlayWindow = createOverlayWindow()
    }
    showDevWindow()
    broadcastSnapshot()
  })
})

app.on('before-quit', () => {
  if (coachBridgeServer) {
    coachBridgeServer.close()
    coachBridgeServer = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
