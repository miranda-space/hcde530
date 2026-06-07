import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react'
import {
  getSpiderVideoCandidates,
  type SpiderCoachState,
} from '../data/spiderCoachStates'
import { useOverlayClickThrough } from '../hooks/useOverlayClickThrough'
import { useSpeechBubbleVisibility } from '../hooks/useSpeechBubbleVisibility'
import {
  playPreparedClip,
  prepareVideoClip,
  videoPathsMatch,
} from '../lib/spiderVideoPlayback'
import { getCoachBridge } from '../lib/coachBridge'
import { PixelSpeechBubble } from './PixelSpeechBubble'
import { SpiderCoachMessage } from './SpiderCoachMessage'
import '../styles/spiderCoach.css'

const SPIDER_VIDEO_SIZE = 240
const IDLE_PATH = getSpiderVideoCandidates('idle')[0] ?? '/assets/spider/spider_idle.mp4'

type SpiderCoachProps = {
  state: SpiderCoachState
  message: string
  presentationTick?: number
  /** Dev panel only: interrupt and show this snapshot immediately. */
  presentImmediately?: boolean
}

type PresentationTarget = {
  state: SpiderCoachState
  message: string
  presentationTick: number
}

type Playback = 'state' | 'idle'

type VideoLayer = 0 | 1

const DEFAULT_POSITION = { x: 24, y: 24 }

function isOverlayWindow(): boolean {
  return document.documentElement.classList.contains('electron-overlay')
}

function pathForState(coachState: SpiderCoachState): string {
  return getSpiderVideoCandidates(coachState)[0] ?? IDLE_PATH
}

type SpiderCoachVideoStackProps = {
  frontLayer: VideoLayer
  ariaState: SpiderCoachState
  layerRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>]
  onEnded: (layer: VideoLayer) => void
}

function SpiderCoachVideoStack({
  frontLayer,
  ariaState,
  layerRefs,
  onEnded,
}: SpiderCoachVideoStackProps) {
  const [loadFailed, setLoadFailed] = useState(false)
  const fallbacks = getSpiderVideoCandidates(ariaState)

  const handleVideoError = useCallback(
    (layer: VideoLayer) => {
      const video = layerRefs[layer].current
      const src = video?.currentSrc ?? fallbacks[0]
      console.error(`Spider video failed to load: ${src}`)
      setLoadFailed(true)
    },
    [fallbacks, layerRefs],
  )

  return (
    <div className="spider-coach-video-wrap">
      {([0, 1] as const).map((layer) => (
        <video
          key={layer}
          ref={layerRefs[layer]}
          className={
            layer === frontLayer
              ? 'spider-coach-video spider-coach-video-layer spider-coach-video-layer--front'
              : 'spider-coach-video spider-coach-video-layer'
          }
          width={SPIDER_VIDEO_SIZE}
          height={SPIDER_VIDEO_SIZE}
          muted
          playsInline
          onError={() => handleVideoError(layer)}
          onPlaying={() => setLoadFailed(false)}
          onEnded={() => onEnded(layer)}
          aria-hidden={layer !== frontLayer}
          aria-label={layer === frontLayer ? `Spider animation: ${ariaState}` : undefined}
        />
      ))}
      {loadFailed ? (
        <p className="spider-coach-video-error">Video failed to load for {ariaState}</p>
      ) : null}
    </div>
  )
}

export function SpiderCoach({
  state,
  message,
  presentationTick = 0,
  presentImmediately = false,
}: SpiderCoachProps) {
  const overlayMode = isOverlayWindow()
  const coachRef = useRef<HTMLDivElement>(null)
  const layerRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>] = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ]
  const swappingRef = useRef(false)
  const presentationEpochRef = useRef(0)
  const didMountClipRef = useRef(false)
  const inactivePreparedPathRef = useRef<string | null>(null)
  const playbackRef = useRef<Playback>('state')
  const clipStateRef = useRef<SpiderCoachState>(state)
  const showBubbleRef = useRef(true)
  const frontLayerRef = useRef<VideoLayer>(0)
  const phaseRef = useRef<'idle' | 'presenting'>('idle')
  const liveRef = useRef<PresentationTarget>({ state, message, presentationTick })
  const presentedRef = useRef<PresentationTarget | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const overlayDragScreen = useRef({ x: 0, y: 0 })
  const [position, setPosition] = useState(DEFAULT_POSITION)
  const [frontLayer, setFrontLayer] = useState<VideoLayer>(0)
  const [phase, setPhase] = useState<'idle' | 'presenting'>('idle')
  const [displayState, setDisplayState] = useState<SpiderCoachState>(state)
  const [displayMessage, setDisplayMessage] = useState(message)

  const { showBubble, isHiding, onTypingComplete } = useSpeechBubbleVisibility(displayMessage)
  const [playback, setPlayback] = useState<Playback>('state')
  const [clipState, setClipState] = useState<SpiderCoachState>(state)

  playbackRef.current = playback
  clipStateRef.current = clipState
  showBubbleRef.current = showBubble
  frontLayerRef.current = frontLayer
  phaseRef.current = phase
  liveRef.current = { state, message, presentationTick }

  /** State clips play once; only idle loops. */
  const videoLoop = playback === 'idle'
  const ariaState = playback === 'idle' ? 'idle' : clipState

  const getActive = useCallback(() => layerRefs[frontLayerRef.current].current, [layerRefs])
  const getInactive = useCallback(() => {
    const back: VideoLayer = frontLayerRef.current === 0 ? 1 : 0
    return layerRefs[back].current
  }, [layerRefs])

  const swapLayers = useCallback(() => {
    setFrontLayer((layer) => {
      const next: VideoLayer = layer === 0 ? 1 : 0
      frontLayerRef.current = next
      return next
    })
  }, [])

  const { onPointerDown: onClickThroughDown, onPointerUp: onClickThroughUp } = useOverlayClickThrough(
    overlayMode,
    `${displayState}:${displayMessage}:${showBubble}`,
  )

  const prepareInactive = useCallback(
    async (path: string, loop: boolean, restart: boolean) => {
      const inactive = getInactive()
      if (!inactive) return
      await prepareVideoClip(inactive, path, { loop, restart })
      inactivePreparedPathRef.current = path
    },
    [getInactive],
  )

  const revealInactive = useCallback(
    async (loop: boolean) => {
      const active = getActive()
      const inactive = getInactive()
      if (!inactive) return

      await playPreparedClip(inactive, loop)
      swapLayers()
      active?.pause()
      inactivePreparedPathRef.current = null
    },
    [getActive, getInactive, swapLayers],
  )

  const cancelInFlightPresentation = useCallback(() => {
    presentationEpochRef.current += 1
    swappingRef.current = false
    for (const ref of layerRefs) {
      ref.current?.pause()
    }
  }, [layerRefs])

  const beginPresentation = useCallback(
    async (target: PresentationTarget, options?: { interrupt?: boolean }) => {
      if (phaseRef.current === 'presenting' && !options?.interrupt) return
      if (
        !options?.interrupt &&
        presentedRef.current?.state === target.state &&
        presentedRef.current.presentationTick === target.presentationTick
      ) {
        return
      }

      if (options?.interrupt) {
        cancelInFlightPresentation()
      }

      const epoch = presentationEpochRef.current
      const isStale = () => epoch !== presentationEpochRef.current

      swappingRef.current = true
      presentedRef.current = target
      phaseRef.current = 'presenting'
      setPhase('presenting')
      setDisplayState(target.state)
      setDisplayMessage(target.message)
      setClipState(target.state)
      setPlayback('state')

      try {
        await prepareInactive(pathForState(target.state), false, true)
        if (isStale()) return
        await revealInactive(false)
        if (isStale()) return
      } finally {
        if (!isStale()) swappingRef.current = false
      }
    },
    [prepareInactive, revealInactive, cancelInFlightPresentation],
  )

  const syncToLiveAfterCycle = useCallback(() => {
    const shown = presentedRef.current
    const live = liveRef.current
    presentedRef.current = null
    phaseRef.current = 'idle'
    setPhase('idle')

    if (!shown) {
      void beginPresentation(live)
      return
    }

    if (live.state !== shown.state || live.presentationTick !== shown.presentationTick) {
      void beginPresentation(live)
    }
  }, [beginPresentation])

  useEffect(() => {
    const active = getActive()
    if (!active || didMountClipRef.current) return
    didMountClipRef.current = true
    void beginPresentation({ state, message, presentationTick })
  }, [getActive, beginPresentation, message, presentationTick, state])

  useEffect(() => {
    if (!presentImmediately) return
    const live = liveRef.current
    const shown = presentedRef.current
    if (
      shown?.state === live.state &&
      shown.presentationTick === live.presentationTick &&
      phaseRef.current === 'presenting'
    ) {
      return
    }
    void beginPresentation(live, { interrupt: true })
  }, [presentImmediately, presentationTick, state, beginPresentation])

  useEffect(() => {
    if (presentImmediately) return
    if (phaseRef.current === 'presenting') return
    const shown = presentedRef.current
    if (shown?.state === state && shown.presentationTick === presentationTick) return
    void beginPresentation({ state, message, presentationTick })
  }, [state, message, presentationTick, presentImmediately, beginPresentation])

  useEffect(() => {
    const active = getActive()
    if (!active) return
    active.loop = videoLoop
  }, [getActive, videoLoop])

  useEffect(() => {
    const active = getActive()
    if (!active || playback !== 'state') return

    if (!showBubble) {
      active.loop = false
      const restartIdle = !videoPathsMatch(getInactive()?.currentSrc ?? '', IDLE_PATH)
      void prepareInactive(IDLE_PATH, true, restartIdle)
      return
    }

    active.loop = false
  }, [showBubble, playback, getActive, getInactive, prepareInactive])

  const handleVideoEnded = useCallback(
    (layer: VideoLayer) => {
      if (layer !== frontLayerRef.current) return
      if (swappingRef.current || playbackRef.current === 'idle') return

      swappingRef.current = true

      void (async () => {
        const inactive = getInactive()
        if (!inactive) return

        const restartIdle =
          inactivePreparedPathRef.current !== IDLE_PATH ||
          !videoPathsMatch(inactive.currentSrc, IDLE_PATH)

        if (restartIdle) {
          await prepareInactive(IDLE_PATH, true, true)
        }

        await revealInactive(true)
        setPlayback('idle')
        syncToLiveAfterCycle()
      })().finally(() => {
        swappingRef.current = false
      })
    },
    [getInactive, prepareInactive, revealInactive, syncToLiveAfterCycle],
  )

  useEffect(() => {
    if (!overlayMode) return
    const bridge = getCoachBridge()
    if (!bridge?.resizeOverlay) return

    const reportSize = () => {
      const node = coachRef.current
      if (!node) return
      bridge.resizeOverlay!(Math.ceil(node.getBoundingClientRect().height))
    }

    reportSize()
    const observer = new ResizeObserver(reportSize)
    const node = coachRef.current
    if (node) observer.observe(node)
    return () => observer.disconnect()
  }, [overlayMode, displayMessage, displayState, showBubble])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (overlayMode) onClickThroughDown()

      if (overlayMode) {
        overlayDragScreen.current = { x: event.screenX, y: event.screenY }
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }

      dragOffset.current = {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [overlayMode, onClickThroughDown, position.x, position.y],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return

      if (overlayMode) {
        const bridge = getCoachBridge()
        if (!bridge?.dragOverlayBy) return
        const dx = event.screenX - overlayDragScreen.current.x
        const dy = event.screenY - overlayDragScreen.current.y
        if (dx !== 0 || dy !== 0) {
          bridge.dragOverlayBy(dx, dy)
          overlayDragScreen.current = { x: event.screenX, y: event.screenY }
        }
        return
      }

      setPosition({
        x: Math.max(8, event.clientX - dragOffset.current.x),
        y: Math.max(8, event.clientY - dragOffset.current.y),
      })
    },
    [overlayMode],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (overlayMode) onClickThroughUp()
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [overlayMode, onClickThroughUp],
  )

  return (
    <div
      ref={coachRef}
      className={overlayMode ? 'spider-coach spider-coach--overlay' : 'spider-coach'}
      style={overlayMode ? undefined : { left: position.x, top: position.y }}
      onPointerDown={overlayMode ? undefined : handlePointerDown}
      onPointerMove={overlayMode ? undefined : handlePointerMove}
      role="complementary"
      aria-label="Cursor Spider Coach"
    >
      {showBubble ? (
        <PixelSpeechBubble
          speechKey={displayMessage}
          isHiding={isHiding}
          onPointerDown={overlayMode ? handlePointerDown : undefined}
          onPointerMove={overlayMode ? handlePointerMove : undefined}
          onPointerUp={overlayMode ? handlePointerUp : undefined}
          onPointerCancel={overlayMode ? handlePointerUp : undefined}
        >
          <SpiderCoachMessage message={displayMessage} onTypingComplete={onTypingComplete} />
        </PixelSpeechBubble>
      ) : null}

      <div
        className="spider-coach-anchor spider-coach-hit"
        onPointerDown={overlayMode ? handlePointerDown : undefined}
        onPointerMove={overlayMode ? handlePointerMove : undefined}
        onPointerUp={overlayMode ? handlePointerUp : undefined}
        onPointerCancel={overlayMode ? handlePointerUp : undefined}
      >
        <SpiderCoachVideoStack
          frontLayer={frontLayer}
          ariaState={ariaState}
          layerRefs={layerRefs}
          onEnded={handleVideoEnded}
        />
      </div>
    </div>
  )
}
