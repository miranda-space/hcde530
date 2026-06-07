import type { PointerEventHandler, ReactNode } from 'react'

/**
 * Pure CSS pixel speech bubble (glenthemes).
 * @see https://codepen.io/glenthemes/pen/aMWeRb
 */
type PixelSpeechBubbleProps = {
  children: ReactNode
  /** Bumps on every message change to replay pop / tail animations */
  speechKey?: string
  isHiding?: boolean
  onPointerDown?: PointerEventHandler<HTMLDivElement>
  onPointerMove?: PointerEventHandler<HTMLDivElement>
  onPointerUp?: PointerEventHandler<HTMLDivElement>
  onPointerCancel?: PointerEventHandler<HTMLDivElement>
}

export function PixelSpeechBubble({
  children,
  speechKey,
  isHiding = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PixelSpeechBubbleProps) {
  return (
    <div
      key={speechKey}
      className={`spider-coach-bubble-shell spider-coach-hit${
        isHiding ? ' spider-coach-bubble-shell--hiding' : ' spider-coach-bubble-shell--speaking'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="spider-coach-pixel-bubble">
        <div className="spider-coach-bubble-edge-a" aria-hidden />
        <div className="spider-coach-bubble-edge-b" aria-hidden />
        <div className="spider-coach-bubble-edge-c" aria-hidden />
        <div className="spider-coach-bubble-edge-d" aria-hidden />
        <div className="spider-coach-bubble-edge-e" aria-hidden />
        <div className="spider-coach-bubble-body" aria-live="polite">
          {children}
        </div>
        <div className="spider-coach-bubble-edge-e" aria-hidden />
        <div className="spider-coach-bubble-edge-d" aria-hidden />
        <div className="spider-coach-bubble-edge-c" aria-hidden />
        <div className="spider-coach-bubble-edge-b" aria-hidden />
        <div className="spider-coach-bubble-edge-a" aria-hidden />
        <div className="spider-coach-bubble-arrow" aria-hidden>
          <div className="spider-coach-bubble-arrow-w" />
          <div className="spider-coach-bubble-arrow-x" />
          <div className="spider-coach-bubble-arrow-y" />
          <div className="spider-coach-bubble-arrow-z" />
        </div>
      </div>
    </div>
  )
}
