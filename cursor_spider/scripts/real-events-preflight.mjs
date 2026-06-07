#!/usr/bin/env node
/**
 * Checks that Spider Coach is ready for real Cursor event testing.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { HOST, PORT } = require('../shared/coachBridge.cjs')
const BASE = `http://${HOST}:${PORT}`
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const extensionOut = join(root, 'extension/out/extension.js')

let ok = true

async function checkBridge() {
  try {
    const res = await fetch(`${BASE}/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    console.log('✓ Electron coach bridge is running (' + BASE + ')')
    return true
  } catch {
    console.log('✗ Coach bridge not reachable')
    console.log('  → In another terminal, run:  npm run dev:electron')
    console.log('  → Leave that terminal open while testing')
    return false
  }
}

function checkExtension() {
  if (existsSync(extensionOut)) {
    console.log('✓ Extension is compiled (extension/out/extension.js)')
    return true
  }
  console.log('✗ Extension not compiled')
  console.log('  → Run once:  npm run build:extension')
  return false
}

console.log('\nSpider Coach — real events preflight\n')

ok = (await checkBridge()) && ok
ok = checkExtension() && ok

console.log('')
if (ok) {
  console.log('Ready. Follow the playbook:')
  console.log('  open testdata/REAL_EVENTS_PLAYBOOK.md')
  console.log('')
  console.log('Quick start in Cursor:')
  console.log('  1. Keep npm run dev:electron running')
  console.log('  2. Run → Start Debugging → "Run Spider Coach extension"')
  console.log('  3. In the NEW window, open testdata/playground.ts and follow the steps')
  process.exit(0)
}

console.log('Fix the items above, then run this script again.\n')
process.exit(1)
