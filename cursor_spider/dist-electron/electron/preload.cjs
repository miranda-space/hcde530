"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { contextBridge, ipcRenderer } = require('electron');
const coachBridge = {
    dispatch: (eventName, args) => ipcRenderer.invoke('coach:dispatch', { eventName, args }),
    getSnapshot: () => ipcRenderer.invoke('coach:getSnapshot'),
    getReflection: () => ipcRenderer.invoke('coach:getReflection'),
    onSnapshot: (callback) => {
        const listener = (_event, snapshot) => {
            callback(snapshot);
        };
        ipcRenderer.on('coach:snapshot', listener);
        return () => {
            ipcRenderer.removeListener('coach:snapshot', listener);
        };
    },
};
contextBridge.exposeInMainWorld('coachBridge', coachBridge);
