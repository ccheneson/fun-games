import { describe, expect, it } from 'vitest'
import { bandAt, blurAt, levelAt, pointsAt, pointsForBand, pointsLeft } from '../src/lib/games/points'

describe('points', () => {
  it('is worth 100 in the first tenth and 10 in the last', () => {
    expect(pointsAt(0)).toBe(100)
    expect(pointsAt(0.099)).toBe(100)
    expect(pointsAt(0.1)).toBe(90)
    expect(pointsAt(0.95)).toBe(10)
    expect(pointsAt(1)).toBe(10)
  })
  it('clamps out-of-range values', () => {
    expect(bandAt(-1)).toBe(0)
    expect(bandAt(2)).toBe(9)
    expect(bandAt(NaN)).toBe(0)
  })
  it('lists 100 down to 10', () => {
    expect(Array.from({ length: 10 }, (_, i) => pointsForBand(i))).toEqual([100, 90, 80, 70, 60, 50, 40, 30, 20, 10])
  })
})

describe('blur', () => {
  it('goes from 100 (blurry) to 10 (clear)', () => {
    expect(blurAt(0)).toBe(100)
    expect(blurAt(1)).toBe(10)
    expect(blurAt(0.5)).toBe(55)
    expect(blurAt(NaN)).toBe(100)
    expect(blurAt(2)).toBe(10)
  })
})

describe('levelAt', () => {
  it('is the neutral name of blurAt', () => {
    for (const f of [0, 0.25, 0.5, 1, NaN, 2]) expect(levelAt(f)).toBe(blurAt(f))
    expect(levelAt(0)).toBe(100)
    expect(levelAt(1)).toBe(10)
  })
})

describe('pointsLeft', () => {
  it('maps remaining time to the 100 → 10 bands', () => {
    expect(pointsLeft(10000, 10000)).toBe(100)
    expect(pointsLeft(9001, 10000)).toBe(100)
    expect(pointsLeft(9000, 10000)).toBe(90)
    expect(pointsLeft(500, 10000)).toBe(10)
    expect(pointsLeft(0, 10000)).toBe(10)
  })
  it('handles a zero duration and clamps over-long remaining time', () => {
    expect(pointsLeft(5, 0)).toBe(10)
    expect(pointsLeft(20000, 10000)).toBe(100)
  })
})
