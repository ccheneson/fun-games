export function remainingMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now)
}

export interface CountdownEnv {
  now: () => number
  raf: (cb: () => void) => number
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
  const frame = () => {
    if (cancelled) return
    const left = remainingMs(deadline, env.now())
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
