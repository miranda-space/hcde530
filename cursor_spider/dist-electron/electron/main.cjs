"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../node_modules/electron-installer/electron.d.ts" />
const node_path_1 = require("node:path");
const codingStatusEngine_1 = require("../src/logic/codingStatusEngine");
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const isDev = process.env.ELECTRON_DEV === '1';
const OVERLAY_WIDTH = 360;
const OVERLAY_HEIGHT = 300;
const OVERLAY_TOP_MARGIN = 24;
// TODO: Later, detect the Cursor window bounds and snap this overlay to Cursor's top border
// using OS/window APIs or a VS Code/Cursor extension bridge.
function getOverlayStartPosition() {
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    return {
        x: Math.round((width - OVERLAY_WIDTH) / 2),
        y: OVERLAY_TOP_MARGIN,
    };
}
let overlayWindow = null;
let devWindow = null;
const engine = new codingStatusEngine_1.CodingStatusEngine();
function rendererUrl(mode) {
    if (isDev) {
        return `http://127.0.0.1:5173/?mode=${mode}`;
    }
    const indexPath = (0, node_path_1.join)(__dirname, '../../dist/index.html');
    return `file://${indexPath}?mode=${mode}`;
}
function broadcastSnapshot() {
    const snapshot = engine.getSnapshot();
    for (const window of [overlayWindow, devWindow]) {
        if (!window || window.isDestroyed())
            continue;
        window.webContents.send('coach:snapshot', snapshot);
    }
}
function dispatchCoachEvent(eventName, args = []) {
    const handler = engine[eventName];
    if (typeof handler !== 'function') {
        throw new Error(`Unknown coach event: ${eventName}`);
    }
    const snapshot = handler(...args);
    broadcastSnapshot();
    return snapshot;
}
function createOverlayWindow() {
    const { x, y } = getOverlayStartPosition();
    const window = new BrowserWindow({
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
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
            preload: (0, node_path_1.join)(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setAlwaysOnTop(true, 'floating');
    void window.loadURL(rendererUrl('overlay'));
    window.once('ready-to-show', () => window.show());
    return window;
}
function createDevWindow() {
    const window = new BrowserWindow({
        width: 380,
        height: 720,
        show: false,
        title: 'Cursor Spider Coach — Dev Panel',
        backgroundColor: '#ffffff',
        webPreferences: {
            preload: (0, node_path_1.join)(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    void window.loadURL(rendererUrl('dev'));
    window.once('ready-to-show', () => window.show());
    return window;
}
function registerCoachIpc() {
    // Future Cursor/VS Code extension hooks should call these same IPC handlers
    // (or invoke the engine methods directly from a shared host process).
    ipcMain.handle('coach:getSnapshot', () => engine.getSnapshot());
    ipcMain.handle('coach:getReflection', () => engine.generateSessionReflection());
    ipcMain.handle('coach:dispatch', (_event, payload) => {
        return dispatchCoachEvent(payload.eventName, payload.args ?? []);
    });
}
app.whenReady().then(() => {
    registerCoachIpc();
    overlayWindow = createOverlayWindow();
    devWindow = createDevWindow();
    broadcastSnapshot();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            overlayWindow = createOverlayWindow();
            devWindow = createDevWindow();
            broadcastSnapshot();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
