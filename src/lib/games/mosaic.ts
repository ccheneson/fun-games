import { BLUR_MAX, BLUR_MIN } from './points'

/** How the poster is revealed: line by line from the top / bottom (with blur), or pixelated. */
export type Transition = 'down' | 'up' | 'mosaic'

/** Tiles across the poster width at level 100 (the strongest pixelation). */
export const MOSAIC_MIN_CELLS = 8

/**
 * Tiles across the width when the poster is "almost clear" (approached just above level 10).
 * The single tuning knob for the end of the mosaic: lower = harder in the last points band.
 */
export const MOSAIC_CLEAR_CELLS = 160

/** Random transition, equal odds, for r in [0, 1) (e.g. Math.random()). */
export function pickTransition(r: number): Transition {
  if (r < 1 / 3) return 'down'
  if (r < 2 / 3) return 'up'
  return 'mosaic' // also 1 and NaN
}

/**
 * Number of tiles across the width for a level: 100 = MOSAIC_MIN_CELLS, just above 10 ≈
 * MOSAIC_CLEAR_CELLS (almost clear), exactly 10 = maxCells (one tile per device pixel, fully clear).
 * Geometric interpolation, since pixelation is perceived logarithmically. The curve does not depend
 * on maxCells (the canvas width in device pixels) except to cap it, so it looks the same on a phone
 * with a high devicePixelRatio as on a desktop.
 */
export function mosaicCells(level: number, maxCells: number): number {
  const max = Math.max(1, Math.floor(Number.isFinite(maxCells) ? maxCells : 1))
  const l = Number.isFinite(level) ? Math.min(BLUR_MAX, Math.max(BLUR_MIN, level)) : BLUR_MAX
  if (l <= BLUR_MIN) return max // fully clear: one tile per device pixel
  const end = Math.min(max, MOSAIC_CLEAR_CELLS) // never more tiles than pixels
  const start = Math.min(MOSAIC_MIN_CELLS, end) // tiny canvas: stays monotonic
  const t = (BLUR_MAX - l) / (BLUR_MAX - BLUR_MIN)
  return Math.min(end, Math.max(1, Math.round(start * (end / start) ** t)))
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
