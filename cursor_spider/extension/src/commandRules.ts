/** Mirror of src/logic/coachCommandClassifier.ts for extension sensors (keep in sync). */

const DENY_TOKENS = [
  'cd ',
  ' cd ',
  'ls ',
  ' ls',
  'pwd',
  'echo ',
  'clear',
  'which ',
  'head ',
  'tail ',
  'cat ',
  'npm install',
  'pnpm install',
  'pnpm i',
  'yarn install',
  'pip install',
  'git status',
  'git diff',
  'git add',
  'lsof ',
  'kill ',
  'pkill',
  'xargs kill',
]

const RISKY_TOKENS = [
  'sudo ',
  ' rm -rf',
  'rm -rf ',
  'chmod ',
  'chown ',
  'kill -9',
  'pkill -9',
  'dd if=',
  ':(){',
  'mkfs',
  'diskutil erase',
]

const RUN_TOKENS = [
  'test',
  'vitest',
  'jest',
  'pytest',
  'build',
  'typecheck',
  'tsc',
  'lint',
  'eslint',
  'webpack',
  'vite build',
  'npm run dev',
  'pnpm dev',
  'npm start',
  'npm run',
]

function normalize(command: string): string {
  return command.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isDenied(command: string): boolean {
  const n = normalize(command)
  if (!n) return true
  return DENY_TOKENS.some((token) => n.includes(token))
}

export function isMeaningfulRunCommand(command: string): boolean {
  const n = normalize(command)
  if (!n || isDenied(command)) return false
  if (RUN_TOKENS.some((token) => n.includes(token))) return true
  if (/\b(npm|pnpm|yarn|npx|node|python|pytest|cargo|go)\b/.test(n)) return true
  return n.length >= 6
}

export function isRiskyPermissionCommand(command: string): boolean {
  const n = normalize(command)
  if (!n) return false
  return RISKY_TOKENS.some((token) => n.includes(token))
}
