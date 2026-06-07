import { useEffect, useState } from 'react'
import { type CoachSnapshot, type SessionEvent } from '../logic/codingStatusEngine'
import { SPIDER_COACH_STATES, type SpiderCoachState } from '../data/spiderCoachStates'
import { COACH_BRIDGE_HTTP } from '../lib/coachBridgeConfig'

type BridgeHealth = {
  ok: boolean
  dev?: boolean
  pinned?: boolean
  visible?: boolean
}

async function fetchBridgeHealth(): Promise<BridgeHealth | null> {
  try {
    const response = await fetch(`${COACH_BRIDGE_HTTP}/health`)
    if (!response.ok) return null
    return (await response.json()) as BridgeHealth
  } catch {
    return null
  }
}

async function setOverlayPinned(pinned: boolean): Promise<BridgeHealth | null> {
  try {
    const response = await fetch(`${COACH_BRIDGE_HTTP}/coach/overlay-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    if (!response.ok) return null
    return (await response.json()) as BridgeHealth
  } catch {
    return null
  }
}

type DemoControlsProps = {
  snapshot: CoachSnapshot
  reflection: string | null
  onToggleReflection: () => void
  dispatch: (eventName: string, args?: unknown[]) => void | Promise<unknown>
  engineMode: 'electron' | 'browser'
}

type StateTrigger = {
  state: SpiderCoachState
  sub: string
  live: boolean
  eventName: string
  args?: unknown[]
  /** Dev panel: fire these first so live gates (agent window, stuck, etc.) pass. */
  primeEvents?: { eventName: string; args?: unknown[] }[]
}

const STATE_TRIGGERS: StateTrigger[] = [
  { state: 'idle', sub: 'preview', live: false, eventName: 'onManualStateChange', args: ['idle'] },
  { state: 'build', sub: 'Composer typing', live: true, eventName: 'onBuildRhythm' },
  { state: 'running', sub: 'agent working', live: true, eventName: 'onAgentRunningRhythm' },
  { state: 'stuck', sub: '2 min quiet', live: true, eventName: 'onIdleDetected', args: ['stuck-idle'] },
  { state: 'looping', sub: 'preview', live: false, eventName: 'onManualStateChange', args: ['looping'] },
  {
    state: 'permission_check',
    sub: 'agent terminal',
    live: true,
    primeEvents: [{ eventName: 'onAgentWorkNoted' }],
    eventName: 'onAgentPermissionCheck',
    args: ['npm run dev'],
  },
  {
    state: 'recovery',
    sub: 'type after stuck',
    live: true,
    primeEvents: [{ eventName: 'onIdleDetected', args: ['stuck-idle'] }],
    eventName: 'onVibeTypingResumed',
  },
  { state: 'success', sub: 'agent turn done', live: true, eventName: 'onAgentTurnCelebrate' },
]

function formatLastEvent(events: SessionEvent[]): string {
  const last = events[events.length - 1]
  if (!last) return 'No events yet'
  return `${last.eventType} (${last.previousState} → ${last.newState})`
}

function previewMessage(message: string, max = 88): string {
  const oneLine = message.replace(/\s+/g, ' ').trim()
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`
}

function formatStateLabel(state: SpiderCoachState): string {
  if (state === 'permission_check') return 'Permission'
  if (state === 'success') return 'Celebrate'
  return state.charAt(0).toUpperCase() + state.slice(1)
}

export function DemoControls({
  snapshot,
  reflection,
  onToggleReflection,
  dispatch,
  engineMode,
}: DemoControlsProps) {
  const [extensionBridgeOk, setExtensionBridgeOk] = useState<boolean | null>(null)
  const [bridgeDevMode, setBridgeDevMode] = useState(false)
  const [overlayPinned, setOverlayPinnedState] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const health = await fetchBridgeHealth()
      if (cancelled) return
      setExtensionBridgeOk(health?.ok ?? false)
      setBridgeDevMode(Boolean(health?.dev))
      if (health?.pinned !== undefined) {
        setOverlayPinnedState(health.pinned)
      }
    }

    void check()
    const interval = setInterval(() => void check(), 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const toggleOverlayPin = () => {
    void (async () => {
      const next = !overlayPinned
      const result = await setOverlayPinned(next)
      if (result?.pinned !== undefined) {
        setOverlayPinnedState(result.pinned)
      }
    })()
  }

  const eventHistory = snapshot.sessionEvents.slice(-8).reverse()
  const celebrateCount = snapshot.sessionEvents.filter(
    (e) => e.eventType === 'agent-turn-celebrate',
  ).length
  const missingStates = SPIDER_COACH_STATES.filter(
    (state) => !STATE_TRIGGERS.some((trigger) => trigger.state === state),
  )

  return (
    <aside className="spider-dev-panel" aria-label="Spider Coach session panel">
      <h2>Spider Coach — Session</h2>

      <section className="spider-dev-status" aria-label="Live status">
        <p className="spider-dev-status-row">
          <span className="spider-dev-label">State</span>
          <strong>{snapshot.currentState}</strong>
        </p>
        <p className="spider-dev-status-message">{previewMessage(snapshot.coachingMessage)}</p>
        <p className="spider-dev-status-row">
          <span className="spider-dev-label">Engine</span>
          <span>{engineMode === 'electron' ? 'Electron (live)' : 'Browser (local)'}</span>
        </p>
        <p className="spider-dev-status-row">
          <span className="spider-dev-label">Extension bridge</span>
          <span
            className={
              extensionBridgeOk === null
                ? 'spider-dev-pill spider-dev-pill--muted'
                : extensionBridgeOk
                  ? 'spider-dev-pill spider-dev-pill--ok'
                  : 'spider-dev-pill spider-dev-pill--bad'
            }
          >
            {extensionBridgeOk === null
              ? 'Checking…'
              : extensionBridgeOk
                ? 'Reachable'
                : 'Not reachable'}
          </span>
        </p>
        <p className="spider-dev-status-row spider-dev-status-row--last">
          <span className="spider-dev-label">Last event</span>
          <span>{formatLastEvent(snapshot.sessionEvents)}</span>
        </p>
      </section>

      {bridgeDevMode ? (
        <section className="spider-dev-pin" aria-label="Overlay pin">
          <button
            type="button"
            className={`spider-dev-pin-btn${overlayPinned ? ' spider-dev-pin-btn--on' : ''}`}
            onClick={toggleOverlayPin}
            aria-pressed={overlayPinned ?? false}
          >
            {overlayPinned ? 'Spider pinned (stays visible)' : 'Pin spider visible'}
          </button>
          <p className="spider-dev-hint spider-dev-hint--small">
            On by default in dev. Unpin to test focus hide/show like production.
          </p>
        </section>
      ) : null}

      <section className="spider-dev-vibe" aria-label="Spider states">
        <h3>States ({SPIDER_COACH_STATES.length})</h3>
        <p className="spider-dev-hint">
          Live buttons match extension vibe triggers. Build = ~12 chars or ~2.5s composing in Composer input before Send.
        </p>
        <div className="spider-dev-vibe-grid">
          {STATE_TRIGGERS.map((trigger) => (
            <button
              key={trigger.state}
              type="button"
              className={`spider-dev-btn spider-dev-btn--vibe${snapshot.currentState === trigger.state ? ' spider-dev-btn--active' : ''}`}
              onClick={() => {
                void (async () => {
                  for (const prime of trigger.primeEvents ?? []) {
                    await dispatch(prime.eventName, prime.args ?? [])
                  }
                  await dispatch(trigger.eventName, trigger.args ?? [])
                })()
              }}
            >
              {formatStateLabel(trigger.state)}
              <span className="spider-dev-btn-sub">
                {trigger.sub}
                {trigger.state === 'success' && celebrateCount > 0 ? ` · ${celebrateCount} so far` : ''}
                {!trigger.live ? ' · preview' : ''}
              </span>
            </button>
          ))}
        </div>
        {missingStates.length > 0 ? (
          <p className="spider-dev-hint spider-dev-hint--small">Missing triggers: {missingStates.join(', ')}</p>
        ) : null}
        <p className="spider-dev-hint spider-dev-hint--small">
          Celebrate in real use: every 2nd agent turn end (1st skip, 2nd celebrate, …).
        </p>
      </section>

      <button type="button" className="spider-reflection-btn" onClick={onToggleReflection}>
        {reflection ? 'Hide Session Reflection' : 'Show Session Reflection'}
      </button>

      {reflection ? (
        <section className="spider-reflection-panel" aria-label="Session reflection">
          {reflection.split('\n\n').map((part) => (
            <p key={part}>{part}</p>
          ))}
        </section>
      ) : null}

      <section className="spider-history" aria-label="Event history">
        <h3>Event history</h3>
        <ul>
          {eventHistory.length === 0 ? <li>No events yet.</li> : null}
          {eventHistory.map((event) => (
            <li key={`${event.timestamp}-${event.eventType}`}>
              <strong>{event.eventType}</strong> {event.previousState} → {event.newState}
              <br />
              <span>{event.coachingMessage}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
