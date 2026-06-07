import { SpiderCoach } from './components/SpiderCoach'
import { useCoachController } from './hooks/useCoachController'

export default function OverlayApp() {
  const { snapshot } = useCoachController()

  return (
    <SpiderCoach
      state={snapshot.currentState}
      message={snapshot.coachingMessage}
      presentationTick={snapshot.presentationTick}
      presentImmediately={snapshot.presentImmediately}
    />
  )
}
