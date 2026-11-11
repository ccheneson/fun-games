export function remainingMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now)
}

export interface CountdownEnv {
  now: () => number
  /** Calls back with the frame's timestamp (same clock as `now`), when the environment provides one. */
  raf: (cb: (frameTime?: number) => void) => number
  caf: (id: number) => void
}

const browserEnv = (): CountdownEnv => ({
  now: () => performance.now(),
  raf: (cb) => requestAnimationFrame(cb),
  caf: (id) => cancelAnimationFrame(id),
})

/**
 * Deadline-based countdown (no drift). Returns a cancel function.
 * `onTick` receives the remaining milliseconds; `onEnd` fires once at 0.
 * Ticks use the frame's timestamp rather than the time the callback happens to run, so values
 * derived from them (e.g. a camera driven by the timer) advance by even steps from frame to frame.
 */
export function startCountdown(
  durationMs: number,
  onTick: (remaining: number) => void,
  onEnd: () => void,
  env: CountdownEnv = browserEnv(),
): () => void {
  const deadline = env.now() + durationMs
  let id = 0
  let cancelled = false
  const frame = (frameTime?: number) => {
    if (cancelled) return
    // A frame timestamp can be slightly earlier than the start (it marks the frame's beginning).
    const left = Math.min(durationMs, remainingMs(deadline, frameTime ?? env.now()))
    onTick(left)
    if (left <= 0) {
      cancelled = true
      onEnd()
      return
    }
    id = env.raf(frame)
  }
  onTick(durationMs)
  id = env.raf(frame)
  return () => {
    cancelled = true
    env.caf(id)
  }
}
