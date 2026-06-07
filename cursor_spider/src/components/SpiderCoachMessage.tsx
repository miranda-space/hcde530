import { useEffect, useRef } from 'react'
import { useTypewriterText } from '../hooks/useTypewriterText'

type SpiderCoachMessageProps = {
  message: string
  onTypingComplete?: () => void
}

export function SpiderCoachMessage({ message, onTypingComplete }: SpiderCoachMessageProps) {
  const { displayed, isTyping } = useTypewriterText(message)
  const completedMessageRef = useRef<string | null>(null)

  useEffect(() => {
    if (isTyping || displayed !== message) return
    if (completedMessageRef.current === message) return
    completedMessageRef.current = message
    onTypingComplete?.()
  }, [displayed, isTyping, message, onTypingComplete])

  useEffect(() => {
    completedMessageRef.current = null
  }, [message])

  return (
    <p className={`spider-coach-message${isTyping ? ' spider-coach-message--typing' : ''}`}>
      {displayed}
      {isTyping ? <span className="spider-coach-message-cursor" aria-hidden /> : null}
    </p>
  )
}
