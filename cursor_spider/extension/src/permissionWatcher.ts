import * as vscode from 'vscode'
import type { CoachBridgeClient } from './coachClient'
import { isWithinAgentActivityWindow } from './agentSessionContext'

export function registerPermissionWatcher(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
  log: vscode.OutputChannel,
): void {
  const dispatch = (eventName: string, args: unknown[] = []) => {
    void client.dispatch(eventName, args)
  }

  if (!vscode.window.onDidStartTerminalShellExecution) {
    log.appendLine('Permission watcher: terminal shell API unavailable.')
    return
  }

  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution((event) => {
      const commandLine = event.execution?.commandLine?.value?.trim()
      if (!commandLine) return
      if (!isWithinAgentActivityWindow()) return

      log.appendLine(`Agent permission window: terminal started (${commandLine.slice(0, 60)})`)
      dispatch('onAgentPermissionCheck', [commandLine])
    }),
  )

  log.appendLine('Permission watcher: on (agent window 90s)')
}
