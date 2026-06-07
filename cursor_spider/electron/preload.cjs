const { contextBridge, ipcRenderer } = require('electron')

const coachBridge = {
  dispatch: (eventName, args, options) =>
    ipcRenderer.invoke('coach:dispatch', {
      eventName,
      args,
      immediate: Boolean(options?.immediate),
    }),
  getSnapshot: () => ipcRenderer.invoke('coach:getSnapshot'),
  getReflection: () => ipcRenderer.invoke('coach:getReflection'),
  onSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot)
    ipcRenderer.on('coach:snapshot', listener)
    return () => ipcRenderer.removeListener('coach:snapshot', listener)
  },
  resizeOverlay: (contentHeight) => ipcRenderer.send('coach:resizeOverlay', contentHeight),
  dragOverlayBy: (dx, dy) => ipcRenderer.send('coach:dragOverlayBy', { dx, dy }),
  setOverlayIgnoreMouse: (ignore) =>
    ipcRenderer.send('coach:setOverlayIgnoreMouse', { ignore: Boolean(ignore) }),
}

contextBridge.exposeInMainWorld('coachBridge', coachBridge)
