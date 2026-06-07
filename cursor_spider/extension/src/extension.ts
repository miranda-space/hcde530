import * as vscode from 'vscode'
import { registerBuildRhythm } from './buildRhythm'
import { registerRunningRhythm } from './runningRhythm'
import { registerAgentRunningWatcher } from './agentRunningWatcher'
import { CoachBridgeClient } from './coachClient'
import { registerComposerAgentInputWatcher } from './composerAgentInputWatcher'
import { registerComposerDraftWatcher } from './composerDraftWatcher'
import { registerComposerPromptWatcher } from './composerPromptWatcher'
import { registerCursorFocusVisibility, registerVibeActivitySensors } from './sensors'
import { registerPermissionWatcher } from './permissionWatcher'
import {
  getCursorGlobalStateDbPath,
  getWorkspaceStateDbPath,
  readComposerAgentWorkSignals,
  readComposerDraftSnapshot,
  readComposerUnifiedMode,
  readFocusedComposerId,
  resolveSqlite3Executable,
} from './cursorStorage'
import * as fs from 'node:fs'

let outputChannel: vscode.OutputChannel | undefined
let coachClient: CoachBridgeClient | undefined

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Cursor Spider Coach')
  const log = outputChannel
  log.show(true)
  coachClient = new CoachBridgeClient(log)

  const resyncOverlayVisibility = registerCursorFocusVisibility(context, coachClient)
  const buildRhythm = registerBuildRhythm(context, coachClient, log)
  const runningRhythm = registerRunningRhythm(context, coachClient, log)
  const { noteActivity } = registerVibeActivitySensors(context, coachClient)
  registerComposerDraftWatcher(context, log, buildRhythm, noteActivity)
  registerComposerAgentInputWatcher(context, log, buildRhythm, noteActivity)
  registerComposerPromptWatcher(context, coachClient, log, runningRhythm)
  registerAgentRunningWatcher(context, coachClient, log, runningRhythm)
  registerPermissionWatcher(context, coachClient, log)

  context.subscriptions.push(
    vscode.commands.registerCommand('cursorSpiderCoach.showLog', async () => {
      log.show(true)
      log.appendLine('---')
      log.appendLine(`Spider Coach log (${new Date().toLocaleTimeString()})`)
      const ok = await coachClient?.checkHealth()
      log.appendLine(
        ok
          ? 'Bridge: connected (Electron).'
          : 'Bridge: NOT connected — run `npm run dev:electron` in cursor_spider.',
      )
      const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      const globalDb = getCursorGlobalStateDbPath()
      const workspaceDb = folder ? getWorkspaceStateDbPath(folder) : null
      if (!globalDb) {
        log.appendLine('Composer probe: globalStorage/state.vscdb not found.')
        return
      }
      const composerId = await readFocusedComposerId(workspaceDb, globalDb)
      if (!composerId) {
        log.appendLine('Composer probe: no focused Composer id (open a Composer chat first).')
        return
      }
      const unifiedMode = await readComposerUnifiedMode(globalDb, composerId)
      const draft = await readComposerDraftSnapshot(globalDb, composerId)
      const preview = draft?.extracted?.replace(/\s+/g, ' ').trim().slice(0, 60) ?? ''
      log.appendLine(
        `Composer probe: id ${composerId.slice(0, 8)}… mode ${unifiedMode ?? '?'} draft ${draft?.extracted.length ?? 0} chars` +
          (preview ? ` (“${preview}”)` : unifiedMode === 'agent'
            ? ' (agent mode — draft not on disk; input hook should log typing)'
            : ' (empty — type in Composer input, not after Send)'),
      )
      const sqlite = resolveSqlite3Executable()
      log.appendLine(
        `sqlite3: ${sqlite}${fs.existsSync(sqlite) || sqlite === 'sqlite3' ? '' : ' (NOT FOUND — install sqlite3)'}`,
      )
      const agent = await readComposerAgentWorkSignals(globalDb, composerId)
      if (agent) {
        log.appendLine(
          `Agent probe: working=${agent.working} source=${agent.source} generating=${agent.generatingCount} toolsLoading=${agent.toolLoadingCount} status=${agent.status}`,
        )
      }
      log.appendLine('Build: Composer typing — 12+ chars or ~2.5s composing in one burst (input before Send).')
      log.appendLine('Running: agent generating / reading file / tool loading in bubbles.')
      log.appendLine('If bridge connected but no → lines when you type/run agent, reload the extension window.')
    }),
    vscode.commands.registerCommand('cursorSpiderCoach.testBuild', async () => {
      log.appendLine('Manual test: onBuildRhythm')
      await coachClient?.dispatch('onBuildRhythm', [])
    }),
    vscode.commands.registerCommand('cursorSpiderCoach.testRunning', async () => {
      log.appendLine('Manual test: onAgentRunningRhythm')
      await coachClient?.dispatch('onAgentRunningRhythm', [])
    }),
    vscode.commands.registerCommand('cursorSpiderCoach.testCelebrate', async () => {
      log.appendLine('Manual test: onAgentTurnCelebrate')
      await coachClient?.dispatch('onAgentTurnCelebrate', [])
    }),
    vscode.commands.registerCommand('cursorSpiderCoach.reconnect', async () => {
      log.show(true)
      const ok = await coachClient?.checkHealth()
      log.appendLine(ok ? 'Bridge: connected.' : 'Bridge: NOT connected — run `npm run dev:electron`.')
      if (ok) await coachClient?.dispatch('onBuildRhythm', [])
    }),
  )

  let bridgeWasConnected = false
  let bridgeStatusLogged = false

  const reportBridge = (ok: boolean) => {
    if (ok) {
      if (!bridgeWasConnected || !bridgeStatusLogged) {
        log.appendLine('Bridge: connected (http://127.0.0.1:39217).')
        bridgeStatusLogged = true
      }
      if (!bridgeWasConnected) {
        bridgeWasConnected = true
        setTimeout(() => resyncOverlayVisibility(), 600)
      }
      vscode.window.setStatusBarMessage('Spider Coach: connected', 4000)
      return
    }
    if (bridgeWasConnected) {
      log.appendLine('Bridge: lost — run `npm run dev:electron` in cursor_spider.')
      bridgeWasConnected = false
    } else if (!bridgeStatusLogged) {
      log.appendLine('Bridge: NOT connected — run `npm run dev:electron` in cursor_spider.')
      bridgeStatusLogged = true
    }
    vscode.window.setStatusBarMessage('Spider Coach: not connected — start Electron app', 6000)
  }

  const version = context.extension.packageJSON.version ?? '?'
  const extPath = context.extension.extensionPath
  const storedVersion = context.globalState.get<string>('coachExtensionVersion')
  if (storedVersion && storedVersion !== version) {
    void context.globalState.update('coachExtensionVersion', version)
    log.appendLine(`Spider Coach upgraded ${storedVersion} → ${version}; restarting extension host…`)
    void vscode.commands.executeCommand('workbench.action.restartExtensionHost')
    return
  }
  void context.globalState.update('coachExtensionVersion', version)

  log.appendLine(`--- Spider Coach v${version} LOADED ${new Date().toISOString()} ---`)
  log.appendLine(`Extension loaded from: ${extPath}`)

  void coachClient.checkHealth().then(reportBridge)

  const healthInterval = setInterval(() => {
    void coachClient?.checkHealth().then(reportBridge)
  }, 5000)
  context.subscriptions.push({ dispose: () => clearInterval(healthInterval) })
}

export function deactivate(): void {
  void coachClient?.setOverlayVisible(false)
  coachClient = undefined
  outputChannel?.dispose()
  outputChannel = undefined
}
