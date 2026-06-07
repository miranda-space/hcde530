import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { getCoachBridge } from '../lib/coachBridge'

function setIgnoreMouse(ignore: boolean) {
  getCoachBridge()?.setOverlayIgnoreMouse?.(ignore)
}

/**
 * Electron overlay: pass clicks through transparent window pixels; only
 * `.spider-coach-hit` elements stay interactive. Keeps ignore off while dragging.
 */
export function useOverlayClickThrough(enabled: boolean, layoutKey: string) {
  const interactiveCount = useRef(0)
  const isDragging = useRef(false)

  const syncIgnore = useCallback(() => {
    if (!enabled) return
    if (isDragging.current || interactiveCount.current > 0) {
      setIgnoreMouse(false)
      return
    }
    setIgnoreMouse(true)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    setIgnoreMouse(true)
    return () => {
      interactiveCount.current = 0
      isDragging.current = false
      setIgnoreMouse(false)
    }
  }, [enabled])

  useLayoutEffect(() => {
    if (!enabled) return

    const onEnter = () => {
      interactiveCount.current += 1
      syncIgnore()
    }

    const onLeave = () => {
      interactiveCount.current = Math.max(0, interactiveCount.current - 1)
      syncIgnore()
    }

    const nodes = document.querySelectorAll('.spider-coach-hit')
    for (const node of nodes) {
      node.addEventListener('mouseenter', onEnter)
      node.addEventListener('mouseleave', onLeave)
    }

    syncIgnore()

    return () => {
      for (const node of nodes) {
        node.removeEventListener('mouseenter', onEnter)
        node.removeEventListener('mouseleave', onLeave)
      }
    }
  }, [enabled, layoutKey, syncIgnore])

  const onPointerDown = useCallback(() => {
    if (!enabled) return
    isDragging.current = true
    setIgnoreMouse(false)
  }, [enabled])

  const onPointerUp = useCallback(() => {
    if (!enabled) return
    isDragging.current = false
    syncIgnore()
  }, [enabled, syncIgnore])

  return { onPointerDown, onPointerUp }
}
