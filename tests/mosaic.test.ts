import { describe, expect, it } from 'vitest'
import { MOSAIC_MIN_CELLS, coverCrop, mosaicCells, mosaicRows, pickTransition } from '../src/lib/games/mosaic'

const LEVELS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]

describe('mosaicCells', () => {
  it('is MOSAIC_MIN_CELLS at level 100 and maxCells at level 10', () => {
    expect(mosaicCells(100, 300)).toBe(MOSAIC_MIN_CELLS)
    expect(mosaicCells(10, 300)).toBe(300)
  })
  it('increases monotonically as the level goes down', () => {
    const cells = LEVELS.map((l) => mosaicCells(l, 300))
    for (let i = 1; i < cells.length; i++) expect(cells[i]).toBeGreaterThan(cells[i - 1])
  })
  it('returns integers', () => {
    for (const l of [100, 95, 73, 55.5, 31, 10]) expect(Number.isInteger(mosaicCells(l, 317))).toBe(true)
  })
  it('is geometric rather than linear', () => {
    // halfway through the scale is far below the linear midpoint
    expect(mosaicCells(55, 300)).toBeLessThan((MOSAIC_MIN_CELLS + 300) / 2)
  })
  it('clamps out-of-range and NaN levels', () => {
    expect(mosaicCells(NaN, 300)).toBe(MOSAIC_MIN_CELLS)
    expect(mosaicCells(500, 300)).toBe(MOSAIC_MIN_CELLS)
    expect(mosaicCells(-20, 300)).toBe(300)
  })
  it('never goes below 1 nor above maxCells', () => {
    for (const l of LEVELS) {
      const c = mosaicCells(l, 3)
      expect(c).toBeGreaterThanOrEqual(1)
      expect(c).toBeLessThanOrEqual(3)
    }
    expect(mosaicCells(100, 0)).toBeGreaterThanOrEqual(1)
  })
})

describe('mosaicRows', () => {
  it('keeps tiles square for a 2:3 poster', () => {
    expect(mosaicRows(20, 200, 300)).toBe(30)
    expect(mosaicRows(8, 200, 300)).toBe(12)
  })
  it('never returns less than 1', () => {
    expect(mosaicRows(1, 1000, 10)).toBe(1)
    expect(mosaicRows(8, 0, 0)).toBeGreaterThanOrEqual(1)
  })
})

describe('coverCrop', () => {
  it('uses the full image when ratios match', () => {
    expect(coverCrop(200, 300, 100, 150)).toEqual({ sx: 0, sy: 0, sw: 200, sh: 300 })
  })
  it('crops the sides (centred) when the source is wider', () => {
    expect(coverCrop(400, 300, 100, 150)).toEqual({ sx: 100, sy: 0, sw: 200, sh: 300 })
  })
  it('crops top and bottom (centred) when the source is taller', () => {
    expect(coverCrop(200, 600, 100, 150)).toEqual({ sx: 0, sy: 150, sw: 200, sh: 300 })
  })
  it('does not produce NaN with zero sizes', () => {
    for (const args of [[0, 0, 100, 150], [200, 300, 0, 0], [0, 300, 100, 0]] as const) {
      const r = coverCrop(...args)
      for (const v of Object.values(r)) expect(Number.isNaN(v)).toBe(false)
    }
  })
})

describe('pickTransition', () => {
  it('splits [0,1) in three equal ranges', () => {
    expect(pickTransition(0)).toBe('down')
    expect(pickTransition(0.33)).toBe('down')
    expect(pickTransition(0.4)).toBe('up')
    expect(pickTransition(0.66)).toBe('up')
    expect(pickTransition(0.9)).toBe('mosaic')
    expect(pickTransition(0.999)).toBe('mosaic')
  })
  it('handles 1 and NaN without throwing', () => {
    expect(pickTransition(1)).toBe('mosaic')
    expect(['down', 'up', 'mosaic']).toContain(pickTransition(NaN))
  })
})
