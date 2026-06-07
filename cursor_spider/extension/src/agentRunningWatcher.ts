import * as fs from 'node:fs'
import * as vscode from 'vscode'
import type { CoachBridgeClient } from './coachClient'
import type { RunningRhythmHandles } from './runningRhythm'
import { noteAgentWorkActivity, setAgentWorkingNow } from './agentSessionContext'
import {
  getCursorGlobalStateDbPath,
  getWorkspaceStateDbPath,
  readComposerAgentWorkSignals,
  readFocusedComposerId,
} from './cursorStorage'

const POLL_MS = 500

export function registerAgentRunningWatcher(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
  log: vscode.OutputChannel,
  runningRhythm: RunningRhythmHandles,
): void {
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let dbWatch: fs.FSWatcher | undefined
  let wasWorking = false
  let sawWorkThisTurn = false
  let turnCompletionCount = 0
  let seeded = false
  let sqliteWarned = false
  let readyLogged = false
  let lastComposerId: string | null = null

  const poll = async () => {
    const globalDb = getCursorGlobalStateDbPath()
    if (!globalDb) return

    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    const workspaceDb = folder ? getWorkspaceStateDbPath(folder) : null

    try {
      const composerId = await readFocusedComposerId(workspaceDb, globalDb)
      if (!composerId) return

      if (composerId !== lastComposerId) {
        lastComposerId = composerId
        wasWorking = false
        sawWorkThisTurn = false
        turnCompletionCount = 0
        seeded = false
        readyLogged = false
      }

      const signals = await readComposerAgentWorkSignals(globalDb, composerId)
      if (!signals) return

      const working = signals.working
      setAgentWorkingNow(working)

      if (!seeded) {
        wasWorking = working
        seeded = true
        if (!readyLogged) {
          readyLogged = true
          log.appendLine(
            `Agent running watcher: tracking composer ${composerId.slice(0, 8)}… (generating ${signals.generatingCount}, tools loading ${signals.toolLoadingCount}, status ${signals.status})`,
          )
        }
        return
      }

      if (working && !wasWorking) {
        sawWorkThisTurn = true
        noteAgentWorkActivity()
        void client.dispatch('onAgentWorkNoted', [])
        log.appendLine(`Agent work started (${signals.source})`)
        runningRhythm.noteAgentWork(signals.source)
      }

      if (wasWorking && !working && sawWorkThisTurn) {
        sawWorkThisTurn = false
        turnCompletionCount += 1
        log.appendLine(`Agent turn ended (${turnCompletionCount})`)
        if (turnCompletionCount % 2 === 0) {
          log.appendLine('Agent turn celebrate (every other completion)')
          void client.dispatch('onAgentTurnCelebrate', [])
        }
      }

      wasWorking = working
    } catch (error) {
      if (!sqliteWarned) {
        sqliteWarned = true
        const message = error instanceof Error ? error.message : String(error)
        log.appendLine(`Agent running detection: ${message}`)
      }
    }
  }

  const attachDbWatch = (globalDb: string) => {
    if (dbWatch) {
      dbWatch.close()
      dbWatch = undefined
    }
    try {
      dbWatch = fs.watch(globalDb, { persistent: false }, () => void poll())
      context.subscriptions.push({ dispose: () => dbWatch?.close() })
    } catch {
      // poll only
    }
  }

  const start = () => {
    if (pollTimer) return
    seeded = false
    wasWorking = false
    sawWorkThisTurn = false
    const globalDb = getCursorGlobalStateDbPath()
    if (globalDb) attachDbWatch(globalDb)
    void poll()
    pollTimer = setInterval(() => void poll(), POLL_MS)
  }

  const stop = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
    if (dbWatch) {
      dbWatch.close()
      dbWatch = undefined
    }
  }

  const syncEnabled = () => {
    const enabled = vscode.workspace
      .getConfiguration('cursorSpiderCoach')
      .get<boolean>('detectAgentRunning', true)
    if (enabled) {
      log.appendLine('Agent running watcher: on')
      start()
    } else {
      log.appendLine('Agent running watcher: off')
      stop()
    }
  }

  syncEnabled()
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cursorSpiderCoach.detectAgentRunning')) {
        syncEnabled()
      }
    }),
    { dispose: stop },
  )
}
