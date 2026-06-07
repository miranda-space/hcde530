"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodingStatusEngine = void 0;
const spiderCoachMessages_1 = require("../data/spiderCoachMessages");
const coachCommandClassifier_1 = require("./coachCommandClassifier");
const MAX_ACTIVITY_HISTORY = 25;
const MAX_SESSION_EVENTS = 200;
const BUILD_RHYTHM_GAP_MS = 60_000;
const RUNNING_RHYTHM_GAP_MS = 60_000;
const STUCK_IDLE_COOLDOWN_MS = 2 * 60_000;
const RECOVERY_AFTER_STUCK_MS = 5 * 60_000;
const PERMISSION_COMMAND_COOLDOWN_MS = 5 * 60_000;
const AGENT_PERMISSION_WINDOW_MS = 90_000;
class CodingStatusEngine {
    currentState = 'idle';
    previousState = 'idle';
    coachingMessage;
    copyPrompt = undefined;
    recentActivityHistory = [];
    sessionEvents = [];
    /** Last bubble line shown per state (avoid repeating when returning to that state). */
    lastMessageByState = {};
    lastStuckIdleMs = 0;
    lastBuildRhythmShowMs = 0;
    lastRunningRhythmShowMs = 0;
    lastPermissionCommandNorm = '';
    lastPermissionAtMs = 0;
    lastAgentWorkAtMs = 0;
    presentationTick = 0;
    constructor() {
        this.coachingMessage = this.pickMessageForState('idle');
    }
    /** Random line for `state`, avoiding the last line shown for that state (if any). */
    pickMessageForState(state) {
        const message = (0, spiderCoachMessages_1.pickSpiderMessage)(state, this.lastMessageByState[state]);
        this.lastMessageByState[state] = message;
        return message;
    }
    getSnapshot() {
        return {
            currentState: this.currentState,
            previousState: this.previousState,
            coachingMessage: this.coachingMessage,
            copyPrompt: this.copyPrompt,
            recentActivityHistory: [...this.recentActivityHistory],
            sessionEvents: [...this.sessionEvents],
            presentationTick: this.presentationTick,
        };
    }
    /** Random-delay build cue from editor typing or Composer drafts (extension timers). */
    onBuildRhythm() {
        const now = Date.now();
        const inGap = now - this.lastBuildRhythmShowMs < BUILD_RHYTHM_GAP_MS;
        if (inGap && this.currentState === 'build') {
            return this.getSnapshot();
        }
        this.lastBuildRhythmShowMs = now;
        if (this.currentState === 'build') {
            this.presentationTick += 1;
            this.coachingMessage = this.pickMessageForState('build');
            this.recentActivityHistory.push('build-rhythm');
            this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY);
            return this.getSnapshot();
        }
        return this.transition('build-rhythm', 'build');
    }
    /** Random-delay running cue when Cursor agent starts working (extension timers). */
    onAgentRunningRhythm() {
        const now = Date.now();
        const inGap = now - this.lastRunningRhythmShowMs < RUNNING_RHYTHM_GAP_MS;
        if (inGap && this.currentState === 'running') {
            return this.getSnapshot();
        }
        this.lastRunningRhythmShowMs = now;
        if (this.currentState === 'running') {
            this.presentationTick += 1;
            this.coachingMessage = this.pickMessageForState('running');
            this.recentActivityHistory.push('agent-running-rhythm');
            this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY);
            return this.getSnapshot();
        }
        return this.transition('agent-running-rhythm', 'running');
    }
    /** Logged when extension detects a new user Composer bubble (optional preview text). */
    onComposerPrompted(preview = '') {
        void preview;
        this.recentActivityHistory.push('composer-prompted');
        this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY);
        return this.getSnapshot();
    }
    /** Every-other agent turn completion (extension). */
    onAgentTurnCelebrate() {
        if (this.currentState === 'success') {
            this.presentationTick += 1;
            this.coachingMessage = this.pickMessageForState('success');
            this.recentActivityHistory.push('agent-turn-celebrate');
            this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY);
            return this.getSnapshot();
        }
        return this.transition('agent-turn-celebrate', 'success');
    }
    /** Long pause with no typing/editing — vibe struggle moment. */
    onIdleDetected(context = 'stuck-idle') {
        if (context !== 'stuck-idle') {
            return this.getSnapshot();
        }
        const now = Date.now();
        if (this.currentState === 'stuck' && now - this.lastStuckIdleMs < STUCK_IDLE_COOLDOWN_MS) {
            return this.getSnapshot();
        }
        this.lastStuckIdleMs = now;
        return this.transition('idle-detected', 'stuck');
    }
    /** First typing after stuck-idle within 5 min → recovery (before build rhythm). */
    onVibeTypingResumed() {
        const now = Date.now();
        if (this.currentState !== 'stuck' || now - this.lastStuckIdleMs > RECOVERY_AFTER_STUCK_MS) {
            return this.getSnapshot();
        }
        return this.transition('vibe-recovery', 'recovery');
    }
    /** Terminal command while agent was active recently. */
    onAgentPermissionCheck(command = 'terminal command') {
        const normalized = (0, coachCommandClassifier_1.normalizeCommandLine)(command);
        const now = Date.now();
        if (now - this.lastAgentWorkAtMs > AGENT_PERMISSION_WINDOW_MS) {
            return this.getSnapshot();
        }
        if (normalized === this.lastPermissionCommandNorm &&
            now - this.lastPermissionAtMs < PERMISSION_COMMAND_COOLDOWN_MS) {
            return this.getSnapshot();
        }
        this.lastPermissionCommandNorm = normalized;
        this.lastPermissionAtMs = now;
        if (this.currentState === 'permission_check') {
            this.presentationTick += 1;
            this.coachingMessage = this.pickMessageForState('permission_check');
            this.recentActivityHistory.push('agent-permission-check');
            this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY);
            return this.getSnapshot();
        }
        return this.transition('agent-permission-check', 'permission_check');
    }
    /** Extension heartbeat when agent work starts (permission window). */
    onAgentWorkNoted() {
        this.lastAgentWorkAtMs = Date.now();
        return this.getSnapshot();
    }
    /** Dev panel preview for states without automatic vibe triggers yet. */
    onManualStateChange(state) {
        return this.transition('manual-state-change', state);
    }
    generateSessionReflection() {
        const events = this.sessionEvents;
        const totalEvents = events.length;
        const buildCount = events.filter((e) => e.newState === 'build').length;
        const runningCount = events.filter((e) => e.newState === 'running').length;
        const celebrateCount = events.filter((e) => e.eventType === 'agent-turn-celebrate').length;
        const stuckCount = events.filter((e) => e.newState === 'stuck').length;
        const rhythm = buildCount + runningCount >= 4
            ? 'You kept a nice build → run → celebrate rhythm going.'
            : 'Short check-ins between prompts will keep momentum easy.';
        const tricky = stuckCount > 0
            ? 'You hit a pause where things felt stuck — normal when vibe coding.'
            : 'You stayed in flow without long dead air.';
        const littleWin = celebrateCount > 0
            ? 'You earned at least one celebrate moment from agent turns finishing.'
            : 'Each agent turn is a chance to ship a small slice — celebrate the next one.';
        return [
            `Today’s vibe-coding story:\n${totalEvents} coach moments this session. ${rhythm}`,
            `Tricky moment:\n${tricky}`,
            `Little win:\n${littleWin}`,
            'Tiny next step:\nSend one clear Composer prompt, let the agent run, then glance at the spider before the next ask.',
        ].join('\n\n');
    }
    transition(eventType, nextState) {
        const priorState = this.currentState;
        this.previousState = priorState;
        this.currentState = nextState;
        this.coachingMessage = this.pickMessageForState(nextState);
        this.copyPrompt = undefined;
        this.presentationTick += 1;
        this.recentActivityHistory.push(eventType);
        this.recentActivityHistory = this.recentActivityHistory.slice(-MAX_ACTIVITY_HISTORY);
        this.sessionEvents.push({
            timestamp: new Date().toISOString(),
            eventType,
            previousState: priorState,
            newState: nextState,
            coachingMessage: this.coachingMessage,
            copyPrompt: this.copyPrompt,
        });
        this.sessionEvents = this.sessionEvents.slice(-MAX_SESSION_EVENTS);
        return this.getSnapshot();
    }
}
exports.CodingStatusEngine = CodingStatusEngine;
