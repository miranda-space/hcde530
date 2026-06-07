import { pickSpiderMessage } from '../data/spiderCoachMessages'
import { type SpiderCoachState } from '../data/spiderCoachStates'
import { normalizeCommandLine } from './coachCommandClassifier'

// Integration surfaces (use the same methods everywhere):
// - Browser demo: DemoControls -> useCoachController -> local engine instance
// - Electron: DemoControls/overlay -> IPC -> electron/main.ts -> engine instance
// - Cursor extension: vibe sensors -> methods below

export type SessionEventType =
  | 'manual-state-change'
  | 'build-rhythm'
  | 'agent-running-rhythm'
  | 'agent-turn-celebrate'
  | 'composer-prompted'
  | 'idle-detected'
  | 'vibe-recovery'
  | 'agent-permission-check'

export type SessionEvent = {
  timestamp: string
  eventType: SessionEventType
  previousState: SpiderCoachState
  newState: SpiderCoachState
  coachingMessage: string
  copyPrompt?: string
}

export type CoachSnapshot = {
  currentState: SpiderCoachState
  previousState: SpiderCoachState
  coachingMessage: string
  copyPrompt?: string
  recentActivityHistory: SessionEventType[]
  sessionEvents: SessionEvent[]
  /** Bumps on rhythm/celebrate cues so the overlay can replay clips. */
  presentationTick: number
  /** Dev-panel dispatch only: overlay may interrupt the current presentation. */
  presentImmediately?: boolean
}

const MAX_ACTIVITY_HISTORY = 25
const MAX_SESSION_EVENTS = 200
const BUILD_RHYTHM_GAP_MS = 60_000
const RUNNING_RHYTHM_GAP_MS = 60_000
const STUCK_IDLE_COOLDOWN_MS = 2 * 60_000
const RECOVERY_AFTER_STUCK_MS = 5 * 60_000
const PERMISSION_COMMAND_COOLDOWN_MS = 5 * 60_000
const AGENT_PERMISSION_WINDOW_MS = 90_000

export class CodingStatusEngine {
  private currentState: SpiderCoachState = 'idle'
  private previousState: SpiderCoachState = 'idle'
  private coachingMessage: string
  private copyPrompt: string | undefined = undefined
  private recentActivityHistory: SessionEventType[] = []
  private sessionEvents: SessionEvent[] = []
  /** Last bubble line shown per state (avoid repeating when returning to that state). */
  private lastMessageByState: Partial<Record<SpiderCoachState, string>> = {}

  private lastStuckIdleMs = 0
  private lastBuildRhythmShowMs = 0
  private lastRunningRhythmShowMs = 0
  private lastPermissionCommandNorm = ''
  private lastPermissionAtMs = 0
  private lastAgentWorkAtMs = 0
  private presentationTick = 0

  constructor() {
    this.coachingMessage = this.pickMessageForState('idle')
  }

  /** Random line for `state`, avoiding the last line shown for that state (if any). */
  private pickMessageForState(state: SpiderCoachState): string {
    const message = pickSpiderMessage(state, this.lastMessageByState[state])
    this.lastMessageByState[state] = message
    return message
  }

  getSnapshot(): CoachSnapshot {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      coachingMessage: this.coachingMessage,
      copyPrompt: this.copyPrompt,
      recentActivityHistory: [...this.recentActivityHistory],
      sessionEvents: [...this.sessionEvents],
      presentationTick: this.presentationTick,
    }
  }

  /** Random-delay build cue from editor typing or Composer drafts (extension timers). */
  onBuildRhythm(): CoachSnapshot {
    const now = Date.now()
    const inGap = now - this.lastBuildRhythmShowMs < BUILD_RHYTHM_GAP_MS
    if (inGap && this.currentState === 'build') {
      return this.getSnapshot()
    }
    this.lastBuildRhythmShowMs = now
    if (this.currentState === 'build') {
      this.presentationTick += 1
      this.coachingMessage = this.pickMessageForState('build')
      this.recentActivityHistory.push('build-rhythm')
      this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY)
      return this.getSnapshot()
    }
    return this.transition('build-rhythm', 'build')
  }

  /** Random-delay running cue when Cursor agent starts working (extension timers). */
  onAgentRunningRhythm(): CoachSnapshot {
    const now = Date.now()
    const inGap = now - this.lastRunningRhythmShowMs < RUNNING_RHYTHM_GAP_MS
    if (inGap && this.currentState === 'running') {
      return this.getSnapshot()
    }
    this.lastRunningRhythmShowMs = now
    if (this.currentState === 'running') {
      this.presentationTick += 1
      this.coachingMessage = this.pickMessageForState('running')
      this.recentActivityHistory.push('agent-running-rhythm')
      this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY)
      return this.getSnapshot()
    }
    return this.transition('agent-running-rhythm', 'running')
  }

  /** Logged when extension detects a new user Composer bubble (optional preview text). */
  onComposerPrompted(preview = ''): CoachSnapshot {
    void preview
    this.recentActivityHistory.push('composer-prompted')
    this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY)
    return this.getSnapshot()
  }

  /** Every-other agent turn completion (extension). */
  onAgentTurnCelebrate(): CoachSnapshot {
    if (this.currentState === 'success') {
      this.presentationTick += 1
      this.coachingMessage = this.pickMessageForState('success')
      this.recentActivityHistory.push('agent-turn-celebrate')
      this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY)
      return this.getSnapshot()
    }
    return this.transition('agent-turn-celebrate', 'success')
  }

  /** Long pause with no typing/editing — vibe struggle moment. */
  onIdleDetected(context: 'stuck-idle' = 'stuck-idle'): CoachSnapshot {
    if (context !== 'stuck-idle') {
      return this.getSnapshot()
    }

    const now = Date.now()
    if (this.currentState === 'stuck' && now - this.lastStuckIdleMs < STUCK_IDLE_COOLDOWN_MS) {
      return this.getSnapshot()
    }
    this.lastStuckIdleMs = now
    return this.transition('idle-detected', 'stuck')
  }

  /** First typing after stuck-idle within 5 min → recovery (before build rhythm). */
  onVibeTypingResumed(): CoachSnapshot {
    const now = Date.now()
    if (this.currentState !== 'stuck' || now - this.lastStuckIdleMs > RECOVERY_AFTER_STUCK_MS) {
      return this.getSnapshot()
    }
    return this.transition('vibe-recovery', 'recovery')
  }

  /** Terminal command while agent was active recently. */
  onAgentPermissionCheck(command = 'terminal command'): CoachSnapshot {
    const normalized = normalizeCommandLine(command)
    const now = Date.now()
    if (now - this.lastAgentWorkAtMs > AGENT_PERMISSION_WINDOW_MS) {
      return this.getSnapshot()
    }
    if (
      normalized === this.lastPermissionCommandNorm &&
      now - this.lastPermissionAtMs < PERMISSION_COMMAND_COOLDOWN_MS
    ) {
      return this.getSnapshot()
    }
    this.lastPermissionCommandNorm = normalized
    this.lastPermissionAtMs = now
    if (this.currentState === 'permission_check') {
      this.presentationTick += 1
      this.coachingMessage = this.pickMessageForState('permission_check')
      this.recentActivityHistory.push('agent-permission-check')
      this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY)
      return this.getSnapshot()
    }
    return this.transition('agent-permission-check', 'permission_check')
  }

  /** Extension heartbeat when agent work starts (permission window). */
  onAgentWorkNoted(): CoachSnapshot {
    this.lastAgentWorkAtMs = Date.now()
    return this.getSnapshot()
  }

  /** Dev panel preview for states without automatic vibe triggers yet. */
  onManualStateChange(state: SpiderCoachState): CoachSnapshot {
    return this.transition('manual-state-change', state)
  }

  generateSessionReflection(): string {
    const events = this.sessionEvents
    const totalEvents = events.length
    const buildCount = events.filter((e) => e.newState === 'build').length
    const runningCount = events.filter((e) => e.newState === 'running').length
    const celebrateCount = events.filter((e) => e.eventType === 'agent-turn-celebrate').length
    const stuckCount = events.filter((e) => e.newState === 'stuck').length

    const rhythm =
      buildCount + runningCount >= 4
        ? 'You kept a nice build → run → celebrate rhythm going.'
        : 'Short check-ins between prompts will keep momentum easy.'

    const tricky =
      stuckCount > 0
        ? 'You hit a pause where things felt stuck — normal when vibe coding.'
        : 'You stayed in flow without long dead air.'

    const littleWin =
      celebrateCount > 0
        ? 'You earned at least one celebrate moment from agent turns finishing.'
        : 'Each agent turn is a chance to ship a small slice — celebrate the next one.'

    return [
      `Today’s vibe-coding story:\n${totalEvents} coach moments this session. ${rhythm}`,
      `Tricky moment:\n${tricky}`,
      `Little win:\n${littleWin}`,
      'Tiny next step:\nSend one clear Composer prompt, let the agent run, then glance at the spider before the next ask.',
    ].join('\n\n')
  }

  private transition(eventType: SessionEventType, nextState: SpiderCoachState): CoachSnapshot {
    const priorState = this.currentState
    this.previousState = priorState
    this.currentState = nextState
    this.coachingMessage = this.pickMessageForState(nextState)
    this.copyPrompt = undefined
    this.presentationTick += 1

    this.recentActivityHistory.push(eventType)
    this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY)

    this.sessionEvents.push({
      timestamp: new Date().toISOString(),
      eventType,
      previousState: priorState,
      newState: nextState,
      coachingMessage: this.coachingMessage,
      copyPrompt: this.copyPrompt,
    })
    this.sessionEvents = this.sessionEvents.slice(-MAX_SESSION_EVENTS)

    return this.getSnapshot()
  }
}
