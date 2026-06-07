import * as vscode from 'vscode'
import type { CoachBridgeClient } from './coachClient'
import { COACH_BRIDGE_BASE } from './coachBridgeConfig'
import { registerActivityTimer } from './activityTimer'

export function registerCursorFocusVisibility(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
): () => void {
  let lastFocused: boolean | undefined
  let bridgeIsDev = false

  const keepVisibleInDev = () =>
    vscode.workspace
      .getConfiguration('cursorSpiderCoach')
      .get<boolean>('keepOverlayVisibleInDev', true)

  const refreshBridgeDev = async () => {
    try {
      const response = await fetch(`${COACH_BRIDGE_BASE}/health`)
      if (response.ok) {
        const data = (await response.json()) as { dev?: boolean }
        bridgeIsDev = Boolean(data.dev)
      }
    } catch {
      bridgeIsDev = false
    }
  }

  const syncOverlayVisibility = (focused: boolean, force = false) => {
    if (!focused && bridgeIsDev && keepVisibleInDev()) {
      if (!force && lastFocused === focused) return
      lastFocused = focused
      return
    }
    if (!force && lastFocused === focused) return
    lastFocused = focused
    void client.setOverlayVisible(focused)
  }

  void refreshBridgeDev()
  const devPoll = setInterval(() => void refreshBridgeDev(), 15_000)
  context.subscriptions.push({ dispose: () => clearInterval(devPoll) })

  syncOverlayVisibility(vscode.window.state.focused, true)

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      syncOverlayVisibility(state.focused)
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cursorSpiderCoach.keepOverlayVisibleInDev')) {
        syncOverlayVisibility(vscode.window.state.focused, true)
      }
    }),
  )

  return () => syncOverlayVisibility(vscode.window.state.focused, true)
}

/** Vibe-only: quiet timer for stuck-idle. User activity comes from Composer draft + prompts only. */
export function registerVibeActivitySensors(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
): { noteActivity: (kind: 'edit' | 'save') => void } {
  return registerActivityTimer(context, client)
}
