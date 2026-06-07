import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCoachBridge, type CoachDispatchOptions } from '../lib/coachBridge'
import { CodingStatusEngine, type CoachSnapshot } from '../logic/codingStatusEngine'
import { pickSpiderMessage } from '../data/spiderCoachMessages'

const emptySnapshot: CoachSnapshot = {
  currentState: 'idle',
  previousState: 'idle',
  coachingMessage: pickSpiderMessage('idle'),
  recentActivityHistory: [],
  sessionEvents: [],
  presentationTick: 0,
}

export function useCoachController() {
  const bridge = getCoachBridge()
  const localEngine = useMemo(() => (bridge ? null : new CodingStatusEngine()), [bridge])
  const [snapshot, setSnapshot] = useState<CoachSnapshot>(() =>
    bridge ? emptySnapshot : localEngine!.getSnapshot(),
  )
  const [reflection, setReflection] = useState<string | null>(null)
  useEffect(() => {
    if (!bridge) return

    let cancelled = false
    void bridge.getSnapshot().then((initial) => {
      if (!cancelled) setSnapshot(initial)
    })

    const unsubscribe = bridge.onSnapshot(setSnapshot)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [bridge])

  const update = useCallback((next: CoachSnapshot) => {
    setSnapshot(next)
    setReflection(null)
  }, [])

  const dispatch = useCallback(
    async (eventName: string, args: unknown[] = [], options?: CoachDispatchOptions) => {
      if (bridge) {
        const next = await bridge.dispatch(eventName, args, options)
        update(next)
        return next
      }

      const method = localEngine![eventName as keyof CodingStatusEngine]
      if (typeof method !== 'function') {
        throw new Error(`Unknown coach event: ${eventName}`)
      }
      const next = (method as (...methodArgs: unknown[]) => CoachSnapshot).apply(localEngine, args)
      const withMeta = options?.immediate ? { ...next, presentImmediately: true } : next
      update(withMeta)
      return withMeta
    },
    [bridge, localEngine, update],
  )

  const toggleReflection = useCallback(async () => {
    if (reflection) {
      setReflection(null)
      return
    }

    if (bridge) {
      setReflection(await bridge.getReflection())
      return
    }

    setReflection(localEngine!.generateSessionReflection())
  }, [bridge, localEngine, reflection])

  return {
    snapshot,
    reflection,
    dispatch,
    toggleReflection,
  }
}
