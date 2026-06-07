import type * as vscode from 'vscode'
import type { CoachBridgeClient } from './coachClient'

const ACTIVITY_TICK_MS = 30_000
/** No Composer typing for this long → coach stuck-idle (vibe-coding pause / wrestle with Cursor). */
const QUIET_STUCK_IDLE_MS = 2 * 60_000
const STUCK_IDLE_DISPATCH_GAP_MS = 2 * 60_000
const SESSION_GAP_MS = 90_000

export function registerActivityTimer(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
): { noteActivity: (kind: 'edit' | 'save') => void } {
  let lastActivityMs = Date.now()
  let hadActivity = false
  let lastStuckIdleDispatchMs = 0

  const dispatch = (eventName: string, args: unknown[] = []) => {
    void client.dispatch(eventName, args)
  }

  const noteActivity = () => {
    lastActivityMs = Date.now()
    hadActivity = true
  }

  const tick = () => {
    const now = Date.now()
    const quietMs = now - lastActivityMs

    if (
      hadActivity &&
      quietMs >= QUIET_STUCK_IDLE_MS &&
      now - lastStuckIdleDispatchMs >= STUCK_IDLE_DISPATCH_GAP_MS
    ) {
      lastStuckIdleDispatchMs = now
      dispatch('onIdleDetected', ['stuck-idle'])
    }

    if (quietMs >= SESSION_GAP_MS * 10) {
      hadActivity = false
    }
  }

  const interval = setInterval(tick, ACTIVITY_TICK_MS)

  context.subscriptions.push({
    dispose: () => clearInterval(interval),
  })

  return { noteActivity }
}
