import { describe, expect, it } from 'vitest'
import { remainingMs, startCountdown, type CountdownEnv } from '../src/lib/timer'

function fakeEnv() {
  let time = 0
  let pending: ((frameTime?: number) => void) | null = null
  const env: CountdownEnv = {
    now: () => time,
    raf: (cb) => ((pending = cb), 1),
    caf: () => (pending = null),
  }
  return {
    env,
    advance(ms: number, frameTime?: number) {
      time += ms
      const cb = pending
      pending = null
      cb?.(frameTime)
    },
  }
}

describe('timer', () => {
  it('never goes below zero', () => {
    expect(remainingMs(100, 250)).toBe(0)
  })
  it('ticks down and ends exactly once', () => {
    const { env, advance } = fakeEnv()
    const ticks: number[] = []
    let ended = 0
    startCountdown(1000, (r) => ticks.push(r), () => ended++, env)
    advance(400)
    advance(700)
    advance(100)
    expect(ticks).toEqual([1000, 600, 0])
    expect(ended).toBe(1)
  })
  it('ticks with the frame timestamp when the environment passes one', () => {
    const { env, advance } = fakeEnv()
    const ticks: number[] = []
    startCountdown(1000, (r) => ticks.push(r), () => {}, env)
    // The callback runs late (now = 420) but the frame started at 400.
    advance(420, 400)
    // A frame that began just before the countdown started never reports more than the duration.
    advance(0, -5)
    expect(ticks).toEqual([1000, 600, 1000])
  })
  it('does not fire onEnd after cancel', () => {
    const { env, advance } = fakeEnv()
    let ended = 0
    const cancel = startCountdown(1000, () => {}, () => ended++, env)
    cancel()
    advance(2000)
    expect(ended).toBe(0)
  })
})
