import type { CoachSnapshot } from '../logic/codingStatusEngine'

export type CoachDispatchOptions = {
  /** Dev panel: interrupt overlay and show this state immediately. */
  immediate?: boolean
}

export type CoachBridge = {
  dispatch: (
    eventName: string,
    args?: unknown[],
    options?: CoachDispatchOptions,
  ) => Promise<CoachSnapshot>
  getSnapshot: () => Promise<CoachSnapshot>
  getReflection: () => Promise<string>
  onSnapshot: (callback: (snapshot: CoachSnapshot) => void) => () => void
  resizeOverlay?: (contentHeight: number) => void
  dragOverlayBy?: (dx: number, dy: number) => void
  /** When true, transparent overlay pixels pass clicks to apps below (macOS/Windows forward). */
  setOverlayIgnoreMouse?: (ignore: boolean) => void
}

declare global {
  interface Window {
    coachBridge?: CoachBridge
  }
}

export function getCoachBridge(): CoachBridge | undefined {
  return window.coachBridge
}

export function isElectronRenderer(): boolean {
  return Boolean(getCoachBridge())
}
