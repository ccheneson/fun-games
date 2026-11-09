import { BLUR_MAX, BLUR_MIN } from './points'

/** How the poster is revealed: line by line from the top / bottom (with blur), or pixelated. */
export type Transition = 'down' | 'up' | 'mosaic'

/** Tiles across the poster width at level 100 (the strongest pixelation). */
export const MOSAIC_MIN_CELLS = 8

/** Random transition, equal odds, for r in [0, 1) (e.g. Math.random()). */
export function pickTransition(r: number): Transition {
  if (r < 1 / 3) return 'down'
  if (r < 2 / 3) return 'up'
  return 'mosaic' // also 1 and NaN
}

/**
 * Number of tiles across the width for a level (100 = MOSAIC_MIN_CELLS, 10 = maxCells, i.e. clear).
 * Geometric interpolation, since pixelation is perceived logarithmically.
 */
export function mosaicCells(level: number, maxCells: number): number {
  const max = Math.max(1, Math.floor(Number.isFinite(maxCells) ? maxCells : 1))
  const l = Number.isFinite(level) ? Math.min(BLUR_MAX, Math.max(BLUR_MIN, level)) : BLUR_MAX
  const t = (BLUR_MAX - l) / (BLUR_MAX - BLUR_MIN)
  const cells = Math.round(MOSAIC_MIN_CELLS * (max / MOSAIC_MIN_CELLS) ** t)
  return Math.min(max, Math.max(1, cells))
}

/** Rows of tiles so they stay square on a width × height box. */
export function mosaicRows(cells: number, width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return Math.max(1, Math.round(cells) || 1)
  return Math.max(1, Math.round((cells * height) / width))
}

/** Source rectangle that fills dstW × dstH like CSS object-fit: cover (centred). */
export function coverCrop(srcW: number, srcH: number, dstW: number, dstH: number) {
  if (!(srcW > 0) || !(srcH > 0) || !(dstW > 0) || !(dstH > 0)) {
    return { sx: 0, sy: 0, sw: Math.max(0, srcW || 0), sh: Math.max(0, srcH || 0) }
  }
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const sw = dstW / scale
  const sh = dstH / scale
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh }
}
