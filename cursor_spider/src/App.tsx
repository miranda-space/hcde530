import { useCallback } from 'react'
import { DemoControls } from './components/DemoControls'
import { SpiderCoach } from './components/SpiderCoach'
import { useCoachController } from './hooks/useCoachController'
import { getCoachBridge } from './lib/coachBridge'
import './App.css'

function App() {
  const { snapshot, reflection, dispatch, toggleReflection } = useCoachController()

  const devDispatch = useCallback(
    (eventName: string, args?: unknown[]) => dispatch(eventName, args, { immediate: true }),
    [dispatch],
  )

  return (
    <>
      <main className="app-shell" aria-hidden="true">
        <p className="app-shell-hint">
          Cursor Spider Coach browser prototype. Use the session panel to simulate vibe-coding
          moments.
        </p>
      </main>

      <SpiderCoach
        state={snapshot.currentState}
        message={snapshot.coachingMessage}
        presentationTick={snapshot.presentationTick}
      />

      <DemoControls
        snapshot={snapshot}
        reflection={reflection}
        onToggleReflection={() => void toggleReflection()}
        dispatch={devDispatch}
        engineMode={getCoachBridge() ? 'electron' : 'browser'}
      />
    </>
  )
}

export default App
