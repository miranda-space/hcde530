"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPIDER_COACH_STATES = void 0;
exports.getSpiderVideoCandidates = getSpiderVideoCandidates;
exports.SPIDER_COACH_STATES = [
    'idle',
    'build',
    'running',
    'stuck',
    'looping',
    'permission_check',
    'recovery',
    'success',
];
/** Shared clip for “pause and think before continuing” moments. */
const RECOVERY_VIDEO = ['/assets/spider/spider_recovery.mp4'];
/** Update paths here when swapping .mov → .mp4 / .webm */
const SPIDER_VIDEO_BY_STATE = {
    idle: ['/assets/spider/spider_idle.mp4'],
    stuck: ['/assets/spider/spider_stuck.mp4'],
    success: ['/assets/spider/spider_celebrate.mp4'],
    recovery: RECOVERY_VIDEO,
    build: ['/assets/spider/spider_build.mp4'],
    running: ['/assets/spider/spider_running.mp4'],
    looping: ['/assets/spider/spider_looping.mp4'],
    permission_check: RECOVERY_VIDEO,
};
const DEFAULT_SPIDER_VIDEO = '/assets/spider/spider_idle.mp4';
function getSpiderVideoCandidates(state) {
    const candidates = SPIDER_VIDEO_BY_STATE[state];
    return candidates?.length ? candidates : [DEFAULT_SPIDER_VIDEO];
}
