/** The poster height is split in BANDS equal bands; the top one is worth the most. */
export const BANDS = 10
export const MAX_POINTS = 100
const STEP = MAX_POINTS / BANDS

/** Band (0 = top) the reveal line is in, for a revealed fraction between 0 and 1. */
export function bandAt(fraction: number): number {
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0
  return Math.min(BANDS - 1, Math.floor(f * BANDS))
}

export function pointsForBand(band: number): number {
  return MAX_POINTS - band * STEP
}

export function pointsAt(fraction: number): number {
  return pointsForBand(bandAt(fraction))
}

export const BLUR_MAX = 100 // fully blurry
export const BLUR_MIN = 10 // clear
const BLUR_PX_PER_LEVEL = 0.1 // level 100 = 10px, level 10 = 1px

/**
 * Obscuring level (100 = fully hidden, 10 = clear) for a revealed fraction between 0 and 1.
 * Drives both the blur and the mosaic transitions.
 */
export function levelAt(fraction: number): number {
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0
  return BLUR_MAX - (BLUR_MAX - BLUR_MIN) * f
}

/** Blur level for a revealed fraction (same as levelAt, kept for the blur transitions). */
export const blurAt = levelAt

/** CSS blur radius in pixels for a blur level. */
export function blurPx(level: number): number {
  return level * BLUR_PX_PER_LEVEL
}

/** Points still on offer with `left` ms of a `duration` ms round (100 at start, 10 at the end). */
export function pointsLeft(left: number, duration: number): number {
  // (duration - left) / duration, not 1 - left / duration: avoids 1 - 0.9 = 0.0999… at band edges.
  return pointsAt(duration > 0 ? (duration - left) / duration : 1)
}
