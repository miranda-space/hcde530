import { useEffect, useState } from 'react'

const MIN_MS_PER_CHAR = 36
const MAX_MS_PER_CHAR = 72
const TARGET_TYPE_MS = 5200

function msPerChar(textLength: number): number {
  if (textLength <= 0) return MAX_MS_PER_CHAR
  return Math.min(MAX_MS_PER_CHAR, Math.max(MIN_MS_PER_CHAR, Math.floor(TARGET_TYPE_MS / textLength)))
}

export function useTypewriterText(text: string) {
  const [displayed, setDisplayed] = useState(text)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setDisplayed(text)
      setIsTyping(false)
      return
    }

    setDisplayed('')
    setIsTyping(true)
    let index = 0
    const delay = msPerChar(text.length)

    const timer = window.setInterval(() => {
      index += 1
      setDisplayed(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(timer)
        setIsTyping(false)
      }
    }, delay)

    return () => window.clearInterval(timer)
  }, [text])

  return { displayed, isTyping }
}
