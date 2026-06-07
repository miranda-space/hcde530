const http = require('node:http')
const { HOST, PORT } = require('../shared/coachBridge.cjs')

/**
 * Local HTTP bridge: Cursor extension / test scripts → Electron coaching engine.
 * Binds to 127.0.0.1 only (not exposed on the network).
 */
function startCoachBridgeServer({
  dispatchCoachEvent,
  getSnapshot,
  setOverlayVisible,
  setOverlayPinned,
  getOverlayPinState,
}) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, host: HOST, port: PORT, ...getOverlayPinState() }))
      return
    }

    if (req.method === 'GET' && url.pathname === '/coach/overlay-pin') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(getOverlayPinState()))
      return
    }

    if (req.method === 'POST' && url.pathname === '/coach/overlay-pin') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}')
          const state = setOverlayPinned(Boolean(payload.pinned))
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, ...state }))
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/coach/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(getSnapshot()))
      return
    }

    if (req.method === 'POST' && url.pathname === '/coach/overlay-visible') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}')
          const result = setOverlayVisible(Boolean(payload.visible))
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, ...result }))
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/coach/dispatch') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}')
          const eventName = payload.eventName
          const args = Array.isArray(payload.args) ? payload.args : []
          if (typeof eventName !== 'string' || !eventName) {
            throw new Error('eventName is required')
          }
          const snapshot = dispatchCoachEvent(eventName, args)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(snapshot))
        } catch (error) {
          if (!res.headersSent) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
          }
        }
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  server.listen(PORT, HOST, () => {
    console.log(`[coach-bridge] http://${HOST}:${PORT}`)
  })

  return server
}

module.exports = { startCoachBridgeServer, HOST, PORT }
