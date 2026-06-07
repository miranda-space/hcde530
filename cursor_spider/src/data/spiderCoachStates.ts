export type SpiderCoachState =
  | 'idle'
  | 'build'
  | 'running'
  | 'stuck'
  | 'looping'
  | 'permission_check'
  | 'recovery'
  | 'success'

export const SPIDER_COACH_STATES: SpiderCoachState[] = [
  'idle',
  'build',
  'running',
  'stuck',
  'looping',
  'permission_check',
  'recovery',
  'success',
]

/** Shared clip for “pause and think before continuing” moments. */
const RECOVERY_VIDEO = ['/assets/spider/spider_recovery.mp4']

/** Update paths here when swapping .mov → .mp4 / .webm */
const SPIDER_VIDEO_BY_STATE: Partial<Record<SpiderCoachState, string[]>> = {
  idle: ['/assets/spider/spider_idle.mp4'],
  stuck: ['/assets/spider/spider_stuck.mp4'],
  success: ['/assets/spider/spider_celebrate.mp4'],
  recovery: RECOVERY_VIDEO,
  build: ['/assets/spider/spider_build.mp4'],
  running: ['/assets/spider/spider_running.mp4'],
  looping: ['/assets/spider/spider_looping.mp4'],
  permission_check: RECOVERY_VIDEO,
}

const DEFAULT_SPIDER_VIDEO = '/assets/spider/spider_idle.mp4'

export function getSpiderVideoCandidates(state: SpiderCoachState): string[] {
  const candidates = SPIDER_VIDEO_BY_STATE[state]
  return candidates?.length ? candidates : [DEFAULT_SPIDER_VIDEO]
}
