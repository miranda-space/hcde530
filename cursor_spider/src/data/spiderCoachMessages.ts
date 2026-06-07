import type { SpiderCoachState } from './spiderCoachStates'

/** Only lines the spider may say in the speech bubble. */
export const SPIDER_MESSAGE_POOLS: Record<SpiderCoachState, readonly string[]> = {
  idle: [
    'Psst… start with one tiny thing you want Cursor to help with. Tiny tasks are easier for both you and the AI spider brain.',
    'Ready when you are. Try asking Cursor to break your idea into the smallest first step before jumping into code.',
    'No rush. A good first prompt is not "build everything" — it\'s "help me start with one safe piece."',
  ],
  build: [
    'Good prompt recipe: goal, context, constraint, next step. Tap tap… that gives Cursor a stronger thread to follow.',
    'Prompt tip: don\'t just say "fix this." Try: "Here\'s what I want, here\'s what\'s happening, and here\'s the smallest part to change."',
    'Ask Cursor for a plan before code. A little "tell me your approach first" can save you from a giant tangled web.',
    'Spider rule: one prompt, one target. If you ask for layout, logic, and animation all at once, Cursor may crawl everywhere.',
    'Before Composer runs, add one boundary: "Do not redesign anything else." Tiny fences keep the AI spider on the path.',
    'Tell Cursor what to preserve. Try: "Keep the current layout and behavior, only change ___."',
    'If your idea is fuzzy, ask Cursor to help shape it first: "Ask me 3 questions before coding."',
    'Psst… before you hit send, tell Cursor the goal, the current problem, and what "done" should look like. Clear web, cleaner code.',
  ],
  running: [
    'Tiny patience moment. While Cursor runs, watch for which files it opens — that tells you where it thinks the problem lives.',
    "Cursor is spinning its little code web. Don't stack another request yet; let this one land first.",
    "Psst… don't vibe-code on autopilot. After this run, ask Cursor to show the important diff in plain English.",
    'Agent spider is crawling through the code right now. When it stops, ask it to summarize what changed and why.',
  ],
  stuck: [
    'Psst… if Cursor keeps guessing wrong, pause the battle. Ask it to restate the plan first, then fix the plan before fixing the code.',
    'Spider wisdom: “try again” is too blurry. Try: “Keep everything the same except ___.” That gives Cursor a smaller web to crawl.',
    'If the result feels wrong but you don’t know why, ask Cursor to list what it changed and what each change was supposed to do.',
    'Tiny coach spider tip: when the AI goes sideways, stop adding requests. First ask it to explain its current approach.',
  ],
  looping: [
    "Loop alert… you've changed this a few times, but the bug still looks the same. Shrink the problem to one file or one component.",
    'Spidey sense says we might be circling the same web. Ask Cursor to compare what changed versus what stayed broken.',
    'Before another fix attempt, ask Cursor: "What assumption are we repeating?" That question can save a lot of crawling.',
  ],
  permission_check: [
    'Tiny safety check: Run executes this command now. Allow gives Cursor permission to continue. If you see sudo, rm -rf, delete, or reset, pause first.',
    'Before clicking, ask: will this command install, run, stop, or delete something? If you\'re unsure, make Cursor explain it in plain English.',
    'Spider rule: npm run dev is usually friendly. rm -rf and sudo deserve a serious little eyebrow raise.',
  ],
  recovery: [
    'Wiggle wiggle, welcome back!',
    'Aww, proud spider moment. You’re getting better at guiding the AI instead of fighting the web!',
    'You paused, breathed, and came back. That’s a good coder habit too.',
    'Tap tap, look at you go! You’re getting better at turning confusion into direction.',
  ],
  success: [
    'Nice, it works! Tiny checkpoint: save, commit, or write down what changed before starting the next web.',
    'Victory wiggle! Before adding more, ask Cursor to summarize this working state and the safest next step.',
    'This is a good stopping point. Future-you will love a tiny note about what worked and what to test next.',
  ],
}

/** `lastMessage` = last line shown for this state (not the previous on-screen line). */
export function pickSpiderMessage(state: SpiderCoachState, lastMessage?: string): string {
  const pool = SPIDER_MESSAGE_POOLS[state]
  if (pool.length === 0) return ''
  if (pool.length === 1) return pool[0]

  const alternatives = lastMessage ? pool.filter((line) => line !== lastMessage) : [...pool]
  const choices = alternatives.length > 0 ? alternatives : [...pool]
  return choices[Math.floor(Math.random() * choices.length)]!
}
