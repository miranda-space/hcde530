import type * as vscode from 'vscode'
import type { CoachBridgeClient } from './coachClient'

/** Enough typed content in one burst → build (works while still typing). */
const BUILD_CHARS_THRESHOLD = 12
/** Or this long actively composing in one burst → build. */
const BUILD_ACTIVE_MS = 2_500
/** Quiet this long starts a new composing burst. */
const BURST_IDLE_MS = 8_000
/** Minimum time between build “shows” (engine also enforces). */
export const BUILD_SHOW_GAP_MS = 60_000

export type BuildRhythmHandles = {
  /** First keystroke after idle — recovery check (immediate). */
  signalTypingBurstStart: () => void
  /** Call on each Composer typing tick (chars added this event, default 1). */
  noteComposingActivity: (source?: string, charDelta?: number) => void
}

export function registerBuildRhythm(
  context: vscode.ExtensionContext,
  client: CoachBridgeClient,
  log: vscode.OutputChannel,
): BuildRhythmHandles {
  let burstIdleTimer: ReturnType<typeof setTimeout> | undefined
  let charsInBurst = 0
  let burstStartMs = 0
  let buildShownThisBurst = false
  let inBurst = false

  const dispatch = (eventName: string, args: unknown[] = []) => {
    void client.dispatch(eventName, args)
  }

  const clearBurstIdleTimer = () => {
    if (burstIdleTimer) {
      clearTimeout(burstIdleTimer)
      burstIdleTimer = undefined
    }
  }

  const endBurst = () => {
    clearBurstIdleTimer()
    inBurst = false
    charsInBurst = 0
    buildShownThisBurst = false
    burstStartMs = 0
  }

  const armBurstIdle = () => {
    clearBurstIdleTimer()
    burstIdleTimer = setTimeout(endBurst, BURST_IDLE_MS)
  }

  const fireBuild = (source: string, reason: 'chars' | 'active') => {
    buildShownThisBurst = true
    log.appendLine(
      `Build rhythm (${source}): firing onBuildRhythm (${reason}, ${charsInBurst} chars in burst)`,
    )
    dispatch('onBuildRhythm', [])
  }

  const maybeFireBuild = (source: string) => {
    if (buildShownThisBurst || !inBurst || charsInBurst <= 0) return
    const now = Date.now()
    const activeMs = now - burstStartMs
    if (charsInBurst >= BUILD_CHARS_THRESHOLD) {
      fireBuild(source, 'chars')
      return
    }
    if (activeMs >= BUILD_ACTIVE_MS) {
      fireBuild(source, 'active')
    }
  }

  const beginBurst = () => {
    inBurst = true
    charsInBurst = 0
    buildShownThisBurst = false
    burstStartMs = Date.now()
  }

  const signalTypingBurstStart = () => {
    if (inBurst) return
    beginBurst()
    dispatch('onVibeTypingResumed', [])
  }

  const noteComposingActivity = (source = 'typing', charDelta = 1) => {
    const delta = Math.max(0, Math.floor(charDelta))
    if (delta === 0) return

    if (!inBurst) {
      beginBurst()
      dispatch('onVibeTypingResumed', [])
      log.appendLine(`Build rhythm (${source}): composing burst started`)
    }

    charsInBurst += delta
    armBurstIdle()
    maybeFireBuild(source)
  }

  context.subscriptions.push({ dispose: endBurst })

  return { signalTypingBurstStart, noteComposingActivity }
}
