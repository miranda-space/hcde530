import { useCallback } from 'react'
import { DemoControls } from './components/DemoControls'
import { useCoachController } from './hooks/useCoachController'
import { getCoachBridge } from './lib/coachBridge'

export default function DevApp() {
  const { snapshot, reflection, dispatch, toggleReflection } = useCoachController()

  const devDispatch = useCallback(
    (eventName: string, args?: unknown[]) => dispatch(eventName, args, { immediate: true }),
    [dispatch],
  )

  return (
    <DemoControls
      snapshot={snapshot}
      reflection={reflection}
      onToggleReflection={() => void toggleReflection()}
      dispatch={devDispatch}
      engineMode={getCoachBridge() ? 'electron' : 'browser'}
    />
  )
}
