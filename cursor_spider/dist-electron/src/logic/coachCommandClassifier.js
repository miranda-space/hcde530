"use strict";
/** Normalize shell commands for allow/deny heuristics (Phase 1 v1). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCommandLine = normalizeCommandLine;
exports.isDeniedNoiseCommand = isDeniedNoiseCommand;
exports.isMeaningfulRunCommand = isMeaningfulRunCommand;
exports.isCelebrationCommand = isCelebrationCommand;
exports.isRiskyPermissionCommand = isRiskyPermissionCommand;
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
];
const CELEBRATION_TOKENS = [
    'test',
    'vitest',
    'jest',
    'pytest',
    'cargo test',
    'go test',
    'build',
    'typecheck',
    'type-check',
    'tsc',
    'lint',
    'eslint',
    'biome check',
    'webpack',
    'vite build',
    'next build',
    'npm run dev',
    'pnpm dev',
    'yarn dev',
    'npm start',
    'pnpm start',
    'npm run',
];
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
    'curl ',
    'wget ',
];
function normalizeCommandLine(command) {
    return command.trim().toLowerCase().replace(/\s+/g, ' ');
}
function isDeniedNoiseCommand(command) {
    const normalized = normalizeCommandLine(command);
    if (!normalized)
        return true;
    return DENY_TOKENS.some((token) => normalized.includes(token));
}
/** Commands that count as a meaningful run/check (running + success). */
function isMeaningfulRunCommand(command) {
    const normalized = normalizeCommandLine(command);
    if (!normalized || isDeniedNoiseCommand(command))
        return false;
    if (CELEBRATION_TOKENS.some((token) => normalized.includes(token)))
        return true;
    if (/\b(npm|pnpm|yarn|npx|node|python|pytest|cargo|go)\b/.test(normalized))
        return true;
    return normalized.length >= 6;
}
function isCelebrationCommand(command) {
    const normalized = normalizeCommandLine(command);
    if (!normalized || isDeniedNoiseCommand(command))
        return false;
    return CELEBRATION_TOKENS.some((token) => normalized.includes(token));
}
/** Risky shell patterns — extension may surface permission coaching. */
function isRiskyPermissionCommand(command) {
    const normalized = normalizeCommandLine(command);
    if (!normalized)
        return false;
    return RISKY_TOKENS.some((token) => normalized.includes(token));
}
