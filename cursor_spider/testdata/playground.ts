/**
 * Real-events test file — use in the Extension Development Host window only.
 *
 * Prerequisites:
 *   Terminal A: npm run dev:electron  (keep running)
 *   Cursor: Run → Start Debugging → "Run Spider Coach extension"
 *
 * Watch the spider overlay + Dev Panel "Current state" while you do each step.
 */

// STEP 1 — Build rhythm
// Type in Composer input (~12 chars or ~2.5s composing) → build (can show while still typing).
export const step1_editMe = 'change-this-line'

// STEP 2 — Running rhythm
// Send a Composer prompt and let the agent work. After a random 2–8s delay → running.

// STEP 3 — Celebrate
// Let the agent finish two turns. Every 2nd turn end → success / celebrate.

// STEP 4 — Stuck (quiet pause)
// Stop typing/editing for ~2 minutes after some activity → stuck-idle.

// STEP 5 — Logs (optional)
// Command Palette → "Spider Coach: Show Bridge Log"
// You should see lines like: → onBuildRhythm (build)
