#!/usr/bin/env node
/**
 * Simulates a vibe-coding session by posting real engine events to the
 * local coach bridge (same path the Cursor extension uses).
 *
 * Prerequisite: npm run dev:electron (or start:electron) must be running.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { HOST: COACH_BRIDGE_HOST, PORT: COACH_BRIDGE_PORT } = require('../shared/coachBridge.cjs')

const BASE = `http://${COACH_BRIDGE_HOST}:${COACH_BRIDGE_PORT}`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function health() {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}

async function dispatch(eventName, args = []) {
  const res = await fetch(`${BASE}/coach/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, args }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  console.log(`✓ ${eventName} → state: ${body.currentState}`)
  return body
}

async function main() {
  console.log(`Coach bridge: ${BASE}\n`)

  try {
    await health()
    console.log('Bridge is up.\n')
  } catch {
    console.error(
      'Cannot reach Spider Coach bridge.\n' +
        'Start Electron first:  npm run dev:electron\n',
    )
    process.exit(1)
  }

  console.log('Simulating: build → running → celebrate → stuck-idle\n')

  await dispatch('onBuildRhythm')
  await sleep(800)
  await dispatch('onAgentRunningRhythm')
  await sleep(800)
  await dispatch('onAgentTurnCelebrate')
  await sleep(800)
  await dispatch('onIdleDetected', ['stuck-idle'])

  console.log('\nDone. Watch the spider overlay for state changes.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
