import type * as vscode from 'vscode'
import type { CoachBridgeClient } from './coachClient'

/** After agent work starts, fire running once at a random point in this window. */
const RUNNING_CUE_MIN_MS = 2_000
const RUNNING_CUE_MAX_MS = 8_000
/** Minimum time between running “shows” (engine also enforces). */
export const RUNNING_SHOW_GAP_MS = 60_000
/** Gap without agent activity before a new running session. */
const AGENT_SESSION_GAP_MS = 60_000

export type RunningRhythmHandles = {
  noteAgentWork: (source: string) => void
}

export function registerRunningRhythm(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
  log: vscode.OutputChannel,
): RunningRhythmHandles {
  let lastWorkMs = 0
  let lastShowMs = 0
  let sessionOpen = false
  let cueTimer: ReturnType<typeof setTimeout> | undefined

  const dispatch = (eventName: string, args: unknown[] = []) => {
    void client.dispatch(eventName, args)
  }

  const clearCueTimer = () => {
    if (cueTimer) {
      clearTimeout(cueTimer)
      cueTimer = undefined
    }
  }

  const scheduleCue = (source: string) => {
    clearCueTimer()
    const delay =
      RUNNING_CUE_MIN_MS + Math.floor(Math.random() * (RUNNING_CUE_MAX_MS - RUNNING_CUE_MIN_MS + 1))
    log.appendLine(`Running rhythm (${source}): cue in ${Math.round(delay / 1000)}s`)
    cueTimer = setTimeout(() => {
      cueTimer = undefined
      sessionOpen = false
      lastShowMs = Date.now()
      log.appendLine('Running rhythm: firing onAgentRunningRhythm')
      dispatch('onAgentRunningRhythm', [])
    }, delay)
  }

  const noteAgentWork = (source: string) => {
    const now = Date.now()
    const gap = now - lastWorkMs
    lastWorkMs = now

    if (now - lastShowMs < RUNNING_SHOW_GAP_MS) return
    if (sessionOpen && gap < AGENT_SESSION_GAP_MS) return

    sessionOpen = true
    scheduleCue(source)
  }

  context.subscriptions.push({ dispose: () => clearCueTimer() })

  return { noteAgentWork }
}
