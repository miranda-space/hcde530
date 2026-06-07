const AGENT_ACTIVITY_WINDOW_MS = 90_000

let lastAgentWorkAtMs = 0
let agentWorkingNow = false
/** Cursor Agent chat often keeps draft in-memory until blur; DB may still update. */
let focusedComposerAgentMode = false
let focusedComposerDbDraftEmpty = true

export function noteAgentWorkActivity(): void {
  lastAgentWorkAtMs = Date.now()
}

export function setAgentWorkingNow(working: boolean): void {
  agentWorkingNow = working
}

export function isAgentWorkingNow(): boolean {
  return agentWorkingNow
}

export function isWithinAgentActivityWindow(windowMs = AGENT_ACTIVITY_WINDOW_MS): boolean {
  return Date.now() - lastAgentWorkAtMs < windowMs
}

export function setFocusedComposerAgentMode(agentMode: boolean): void {
  focusedComposerAgentMode = agentMode
}

export function isFocusedComposerAgentMode(): boolean {
  return focusedComposerAgentMode
}

export function setFocusedComposerDbDraftEmpty(empty: boolean): void {
  focusedComposerDbDraftEmpty = empty
}

export function isFocusedComposerDbDraftEmpty(): boolean {
  return focusedComposerDbDraftEmpty
}
