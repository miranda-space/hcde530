import * as vscode from 'vscode'
import { COACH_BRIDGE_BASE } from './coachBridgeConfig'

export type CoachDispatchPayload = {
  eventName: string
  args?: unknown[]
}

/** Pre-vibe sensors; engine no longer handles these. Drop silently to avoid log spam. */
const LEGACY_EVENT_NAMES = new Set([
  'onFileEdited',
  'onFileSaved',
  'onDiagnosticChanged',
  'onDiagnosticsChanged',
  'onTerminalSucceeded',
  'onTerminalFailed',
  'onRunStarted',
  'onRunFinished',
  'onLoopDetected',
])

export class CoachBridgeClient {
  private connected = false
  private legacyEventWarned = false

  constructor(private readonly log: vscode.OutputChannel) {}

  get isConnected(): boolean {
    return this.connected
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${COACH_BRIDGE_BASE}/health`, { method: 'GET' })
      this.connected = response.ok
      return this.connected
    } catch {
      this.connected = false
      return false
    }
  }

  async setOverlayVisible(visible: boolean): Promise<void> {
    try {
      const response = await fetch(`${COACH_BRIDGE_BASE}/coach/overlay-visible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      this.connected = true
    } catch (error) {
      this.connected = false
      const message = error instanceof Error ? error.message : String(error)
      this.log.appendLine(`✗ overlay visibility: ${message}`)
    }
  }

  async dispatch(eventName: string, args: unknown[] = []): Promise<void> {
    if (LEGACY_EVENT_NAMES.has(eventName)) {
      if (!this.legacyEventWarned) {
        this.legacyEventWarned = true
        this.log.appendLine(
          `Ignoring legacy ${eventName} (vibe-only). Reload the window if these keep appearing.`,
        )
      }
      return
    }

    try {
      const response = await fetch(`${COACH_BRIDGE_BASE}/coach/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName, args } satisfies CoachDispatchPayload),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      this.connected = true
      const snapshot = (await response.json()) as { currentState?: string }
      this.log.appendLine(`→ ${eventName} (${snapshot.currentState ?? 'ok'})`)
    } catch (error) {
      this.connected = false
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('Unknown coach event') && LEGACY_EVENT_NAMES.has(eventName)) {
        if (!this.legacyEventWarned) {
          this.legacyEventWarned = true
          this.log.appendLine(
            `Ignoring legacy ${eventName} (vibe-only). Reload the window if these keep appearing.`,
          )
        }
        return
      }
      this.log.appendLine(`✗ ${eventName}: ${message}`)
    }
  }
}
