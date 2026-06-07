import * as vscode from 'vscode'
import type { RunningRhythmHandles } from './runningRhythm'
import { noteAgentWorkActivity } from './agentSessionContext'
import type { CoachBridgeClient } from './coachClient'
import {
  bubbleTextPreview,
  getCursorGlobalStateDbPath,
  isUserComposerBubble,
  queryCursorDbJson,
} from './cursorStorage'

const POLL_MS = 2_000
const SEEN_KEY_CAP = 400
const BUBBLE_SCAN_SQL = `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%' ORDER BY rowid DESC LIMIT 40`

type BubbleRow = { key: string; value: string }

export function registerComposerPromptWatcher(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
  log: vscode.OutputChannel,
  runningRhythm: RunningRhythmHandles,
): void {
  const seenKeys = new Set<string>()
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let seeded = false
  let sqliteWarned = false

  const dispatch = (eventName: string, args: unknown[] = []) => {
    void client.dispatch(eventName, args)
  }

  const poll = async () => {
    const dbPath = getCursorGlobalStateDbPath()
    if (!dbPath) return

    try {
      const rows = await queryCursorDbJson<BubbleRow>(dbPath, BUBBLE_SCAN_SQL)
      if (!seeded) {
        for (const row of rows) seenKeys.add(row.key)
        seeded = true
        return
      }

      for (const row of rows) {
        if (seenKeys.has(row.key)) continue
        seenKeys.add(row.key)
        while (seenKeys.size > SEEN_KEY_CAP) {
          const first = seenKeys.values().next().value
          if (first) seenKeys.delete(first)
          else break
        }

        if (!isUserComposerBubble(row.value)) continue

        const preview = bubbleTextPreview(row.value)
        noteAgentWorkActivity()
        log.appendLine(`Composer prompt sent${preview ? `: ${preview}` : ''}`)
        dispatch('onAgentWorkNoted', [])
        dispatch('onComposerPrompted', [preview ?? ''])
        runningRhythm.noteAgentWork('prompt-sent')
      }
    } catch (error) {
      if (!sqliteWarned) {
        sqliteWarned = true
        const message = error instanceof Error ? error.message : String(error)
        log.appendLine(
          `Composer prompt detection: ${message} (needs sqlite3 CLI and Cursor globalStorage/state.vscdb).`,
        )
      }
    }
  }

  const start = () => {
    if (pollTimer) return
    seeded = false
    void poll()
    pollTimer = setInterval(() => void poll(), POLL_MS)
  }

  const stop = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
  }

  const syncEnabled = () => {
    const enabled = vscode.workspace
      .getConfiguration('cursorSpiderCoach')
      .get<boolean>('detectComposerPrompts', true)
    if (enabled) {
      const dbPath = getCursorGlobalStateDbPath()
      log.appendLine(
        `Composer prompt watcher: on${dbPath ? ` (${dbPath})` : ' (Cursor DB not found)'}`,
      )
      start()
    } else {
      log.appendLine('Composer prompt watcher: off (setting disabled)')
      stop()
    }
  }

  syncEnabled()
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cursorSpiderCoach.detectComposerPrompts')) {
        syncEnabled()
      }
    }),
    { dispose: stop },
  )
}
