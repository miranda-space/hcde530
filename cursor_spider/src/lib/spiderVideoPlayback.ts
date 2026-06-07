export function resolveVideoUrl(path: string): string {
  if (path.startsWith('http') || path.startsWith('file:')) return path
  return new URL(path, window.location.href).href
}

export function videoPathsMatch(currentSrc: string, path: string): boolean {
  if (!currentSrc) return false
  return currentSrc === resolveVideoUrl(path)
}

function waitCanPlayThrough(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const onReady = () => {
      video.removeEventListener('canplaythrough', onReady)
      resolve()
    }
    video.addEventListener('canplaythrough', onReady, { once: true })
    video.load()
  })
}

/** Load a clip on a hidden layer; keep the visible layer untouched. */
export async function prepareVideoClip(
  video: HTMLVideoElement,
  path: string,
  options: { loop: boolean; restart: boolean },
): Promise<void> {
  const sameClip = videoPathsMatch(video.currentSrc, path)
  video.loop = options.loop

  if (!sameClip) {
    video.src = resolveVideoUrl(path)
    await waitCanPlayThrough(video)
  }

  if (options.restart || !sameClip) {
    video.currentTime = 0
  }

  video.pause()
}

/** Show a prepared layer (call after visibility swap or play-underneath). */
export async function playPreparedClip(
  video: HTMLVideoElement,
  loop: boolean,
): Promise<void> {
  video.loop = loop
  try {
    await video.play()
  } catch {
    /* autoplay */
  }
}

export async function applyVideoClip(
  video: HTMLVideoElement,
  path: string,
  options: { loop: boolean; restart: boolean },
): Promise<void> {
  await prepareVideoClip(video, path, options)
  await playPreparedClip(video, options.loop)
}
