import type { Title } from '../providers/types'
import { normalize } from '../text/normalize'

/**
 * "Find the poster": a square wall of COLS x ROWS posters. All geometry is in board units
 * (a tile is TILE_W x TILE_H, the board BOARD x BOARD); the component multiplies by px per unit.
 */
export const COLS = 12
export const ROWS = 9
/** A tile is 3:4 (posters are 2:3, cropped by ~11%): 12 x 9 of them make an exact square. */
export const TILE_W = 6
export const TILE_H = 8
/** Board side in units (= ROWS * TILE_H = COLS * TILE_W). */
export const BOARD = COLS * TILE_W
export const TILE_COUNT = COLS * ROWS
/** The final window is FINAL_COLS tiles wide... */
export const FINAL_COLS = 3
/** ...so FINAL_SIZE units, i.e. about 2 rows high: ~6 candidate posters at the end of the timer. */
export const FINAL_SIZE = FINAL_COLS * TILE_W
/**
 * Round fraction of the "35 points" mark (on the 100 -> 0 scale over the round, i.e. 35% of the
 * time left): until then the zoom is slow and steady...
 */
export const SLOW_FRACTION = 0.65
/** ...reaching SLOW_SIZE units (about 7 posters wide); it speeds up afterwards. */
export const SLOW_SIZE = 43
/** Round fraction at which the speed-up ramp ends: from there to the end the zoom is steady and faster... */
export const MID_FRACTION = 0.75
/**
 * ...from a view of MID_SIZE units (6 posters wide). Chosen so the ramp leg is about quadratic,
 * i.e. the zoom rate ramps up smoothly from the slow rate to the fast one.
 */
export const MID_SIZE = 36

/** A square in board units. */
export interface Rect { x: number; y: number; size: number }
/** The posters in grid order (row by row); `target` is the index of the one to find. */
export interface Board { tiles: Title[]; target: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const pick = (n: number, rng: () => number) => Math.min(n - 1, Math.floor(rng() * n))

/**
 * `count` distinct titles (by normalized title) with a poster, one of them the target, avoiding
 * `exclude` ids as target when possible. null if fewer than `count` candidates. Input untouched.
 */
export function pickBoard(titles: Title[], count: number, exclude: Set<string>, rng: () => number = Math.random): Board | null {
  const seen = new Set<string>()
  const pool: Title[] = []
  for (const t of titles) {
    if (!t.posterUrl) continue
    const key = normalize(t.title)
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(t)
  }
  if (count <= 0 || pool.length < count) return null

  const eligible = pool.filter((t) => !exclude.has(t.id))
  const from = eligible.length > 0 ? eligible : pool
  const target = from[pick(from.length, rng)]

  // Partial Fisher-Yates on the others: the first count - 1 are the rest of the board.
  const rest = pool.filter((t) => t !== target)
  for (let i = 0; i < count - 1; i++) {
    const j = i + pick(rest.length - i, rng)
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  const tiles = rest.slice(0, count - 1)
  const at = pick(count, rng)
  tiles.splice(at, 0, target)
  return { tiles, target: at }
}

export function tileRect(index: number): { x: number; y: number; w: number; h: number } {
  return { x: (index % COLS) * TILE_W, y: Math.floor(index / COLS) * TILE_H, w: TILE_W, h: TILE_H }
}

/**
 * View for a round fraction 0..1 (clamped; NaN = 0): from the full board to `final`. The zoom is
 * slow and steady until 35 points (SLOW_FRACTION, 65% of the round, SLOW_SIZE), ramps up until 75%
 * (MID_FRACTION, MID_SIZE), then steady and faster to the end. The size shrinks strictly and the position is the linear blend of
 * both rects, so each view contains every later one (the final window, hence the target, is always visible).
 */
export function viewAt(fraction: number, final: Rect): Rect {
  const f = Number.isFinite(fraction) ? clamp(fraction, 0, 1) : 0
  if (f === 0) return { x: 0, y: 0, size: BOARD }
  if (f === 1) return { x: final.x, y: final.y, size: final.size }
  const size = Math.exp(logSize(f, final.size))
  const k = BOARD === final.size ? 1 : (BOARD - size) / (BOARD - final.size)
  return { x: k * final.x, y: k * final.y, size }
}

/** Cubic Hermite on [a, b] from (a, ya) with slope ma to (b, yb) with slope mb, at f. */
function hermite(ya: number, yb: number, ma: number, mb: number, a: number, b: number, f: number): number {
  const w = b - a
  const t = (f - a) / w
  const t2 = t * t
  const t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * ya + (t3 - 2 * t2 + t) * w * ma + (-2 * t3 + 3 * t2) * yb + (t3 - t2) * w * mb
}

/**
 * ln(size) at round fraction f: a C1 piecewise cubic Hermite curve through (0, BOARD),
 * (SLOW_FRACTION, SLOW_SIZE), (MID_FRACTION, MID_SIZE) and (1, final). The first leg is linear in
 * log (a steady, slow zoom until 35 points, 65% of the round), the last one too (a steady, faster zoom
 * from 75% to the end), and the middle leg ramps between both rates. The slope is continuous at every knot (no jolt) and the
 * curve is monotone (both rates are within 3x the middle leg's secant, Fritsch-Carlson).
 */
function logSize(f: number, finalSize: number): number {
  const y0 = Math.log(BOARD)
  const y1 = Math.log(SLOW_SIZE)
  const y2 = Math.log(MID_SIZE)
  const y3 = Math.log(finalSize)
  const m1 = (y1 - y0) / SLOW_FRACTION
  const m2 = (y3 - y2) / (1 - MID_FRACTION)
  if (f <= SLOW_FRACTION) return hermite(y0, y1, m1, m1, 0, SLOW_FRACTION, f)
  if (f <= MID_FRACTION) return hermite(y1, y2, m1, m2, SLOW_FRACTION, MID_FRACTION, f)
  return hermite(y2, y3, m2, m2, MID_FRACTION, 1, f)
}

/** FINAL_SIZE window centred on the target (clamped in the board), for the end reveal. */
export function revealView(target: number): Rect {
  return finalWindow(target, () => 0.5)
}

/** Vertical margin (board units) the target keeps from the top and bottom of the final window. */
export const FINAL_MARGIN = 1

/**
 * The round's final window: FINAL_SIZE, clamped in the board, holding the whole target tile, at a
 * random offset from centred so the answer is not always the middle poster. Horizontally the shift
 * is a whole tile (-TILE_W, 0 or +TILE_W): 3 whole columns stay visible, the answer in the left,
 * middle or right one. Vertically it is continuous, keeping FINAL_MARGIN from the top and bottom
 * when the board allows it. Two rng calls (x, then y); rng = () => 0.5 gives the centred window.
 */
export function finalWindow(target: number, rng: () => number = Math.random): Rect {
  const r = tileRect(target)
  const max = BOARD - FINAL_SIZE
  const maxDy = (FINAL_SIZE - TILE_H) / 2 - FINAL_MARGIN
  const dx = (pick(3, () => clamp(rng(), 0, 1)) - 1) * TILE_W
  const dy = (2 * clamp(rng(), 0, 1) - 1) * maxDy
  return {
    x: clamp(r.x + r.w / 2 - FINAL_SIZE / 2 + dx, 0, max),
    y: clamp(r.y + r.h / 2 - FINAL_SIZE / 2 + dy, 0, max),
    size: FINAL_SIZE,
  }
}

/**
 * CSS numbers for a view. The board element is laid out at its zoomed-in size
 * (viewportPx * BOARD / FINAL_SIZE px) and scaled down: `transform-origin: 0 0;
 * transform: scale(scale) translate(-tx px, -ty px)`.
 */
export function cameraTransform(view: Rect, viewportPx: number): { scale: number; tx: number; ty: number } {
  const unitPx = viewportPx / FINAL_SIZE
  return { scale: FINAL_SIZE / view.size, tx: view.x * unitPx, ty: view.y * unitPx }
}

/** Tile under a point of the viewport (px from its top-left corner), or null outside the board. */
export function tileAt(px: number, py: number, view: Rect, viewportPx: number): number | null {
  if (!(viewportPx > 0)) return null
  const k = view.size / viewportPx
  const ux = view.x + px * k
  const uy = view.y + py * k
  if (!(ux >= 0 && uy >= 0 && ux <= BOARD && uy <= BOARD)) return null
  const col = Math.min(COLS - 1, Math.floor(ux / TILE_W))
  const row = Math.min(ROWS - 1, Math.floor(uy / TILE_H))
  return row * COLS + col
}

const EPS = 1e-9

/** Indices of the tiles at least partly inside the view (merely touching its edge does not count). */
export function visibleTiles(view: Rect): number[] {
  const out: number[] = []
  for (let i = 0; i < TILE_COUNT; i++) {
    const r = tileRect(i)
    if (r.x < view.x + view.size - EPS && r.x + r.w > view.x + EPS && r.y < view.y + view.size - EPS && r.y + r.h > view.y + EPS) {
      out.push(i)
    }
  }
  return out
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

/** Arrow-key navigation in the grid, clamped at the edges (no wrapping across rows). */
export function moveSelection(index: number, key: ArrowKey): number {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  switch (key) {
    case 'ArrowLeft': return col > 0 ? index - 1 : index
    case 'ArrowRight': return col < COLS - 1 ? index + 1 : index
    case 'ArrowUp': return row > 0 ? index - COLS : index
    case 'ArrowDown': return row < ROWS - 1 ? index + COLS : index
  }
}

/** The view `p` (0..1, clamped) of the way from `from` to `to` (each coordinate blended linearly). */
export function blendView(from: Rect, to: Rect, p: number): Rect {
  const t = Number.isFinite(p) ? clamp(p, 0, 1) : 1
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, size: from.size + (to.size - from.size) * t }
}

/** CSS `ease` (cubic-bezier(0.25, 0.1, 0.25, 1)) at time t (0..1, clamped). */
export function easeCss(t: number): number {
  const x = Number.isFinite(t) ? clamp(t, 0, 1) : 1
  if (x === 0 || x === 1) return x
  const bez = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3
  // Solve bezX(u) = x by bisection (bezX is increasing), then return bezY(u).
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (bez(0.25, 0.25, mid) < x) lo = mid
    else hi = mid
  }
  return bez(0.1, 1, (lo + hi) / 2)
}
