import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './electron-shell.css'
import App from './App.tsx'
import DevApp from './DevApp.tsx'
import OverlayApp from './OverlayApp.tsx'

const mode = new URLSearchParams(window.location.search).get('mode') ?? 'browser'

if (mode === 'overlay') {
  document.documentElement.classList.add('electron-overlay')
} else if (mode === 'dev') {
  document.documentElement.classList.add('electron-dev')
}

const RootApp = mode === 'overlay' ? OverlayApp : mode === 'dev' ? DevApp : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
