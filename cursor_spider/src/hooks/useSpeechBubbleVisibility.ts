import { useCallback, useEffect, useRef, useState } from 'react'

export const BUBBLE_HOLD_MS = 6000
/** Match `.spider-coach-bubble-shell--hiding` animation duration */
const BUBBLE_HIDE_MS = 320

export function useSpeechBubbleVisibility(message: string) {
  const [showBubble, setShowBubble] = useState(true)
  const [isHiding, setIsHiding] = useState(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    clearTimers()
    setShowBubble(true)
    setIsHiding(false)
  }, [message, clearTimers])

  useEffect(() => () => clearTimers(), [clearTimers])

  const onTypingComplete = useCallback(() => {
    clearTimers()
    holdTimerRef.current = setTimeout(() => {
      setIsHiding(true)
      hideTimerRef.current = setTimeout(() => {
        setShowBubble(false)
        setIsHiding(false)
      }, BUBBLE_HIDE_MS)
    }, BUBBLE_HOLD_MS)
  }, [clearTimers])

  return { showBubble, isHiding, onTypingComplete }
}
