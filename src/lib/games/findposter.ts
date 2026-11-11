import type { Title } from '../providers/types'
import { normalize } from '../text/normalize'

/**
 * "Find the poster": a square wall of COLS x ROWS posters. All geometry is in board units
 * (a tile is TILE_W x TILE_H, the board BOARD x BOARD); the component multiplies by px per unit.
 */
export const COLS = 9
export const ROWS = 6
export const TILE_W = 2
export const TILE_H = 3
/** Board side in units (= ROWS * TILE_H: 9 x 6 tiles of 2:3 make an exact square). */
export const BOARD = COLS * TILE_W
export const TILE_COUNT = COLS * ROWS
/** The final window is FINAL_COLS tiles wide... */
export const FINAL_COLS = 3
/** ...so FINAL_SIZE units, i.e. 2 rows high: 6 candidate posters at the end of the timer. */
export const FINAL_SIZE = FINAL_COLS * TILE_W
const FINAL_ROWS = FINAL_SIZE / TILE_H

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
 * Random final window (FINAL_SIZE square, whole tiles) containing the target, inside the board.
 * Picked uniformly among every window position that contains the target, so the target can sit
 * in any of its cells and the centre of the zoom does not give the answer away (edges included).
 */
export function finalWindow(target: number, rng: () => number = Math.random): Rect {
  const col = target % COLS
  const row = Math.floor(target / COLS)
  const cLo = Math.max(0, col - FINAL_COLS + 1)
  const cHi = Math.min(col, COLS - FINAL_COLS)
  const rLo = Math.max(0, row - FINAL_ROWS + 1)
  const rHi = Math.min(row, ROWS - FINAL_ROWS)
  const nc = cHi - cLo + 1
  const n = pick(nc * (rHi - rLo + 1), rng)
  const c0 = cLo + (n % nc)
  const r0 = rLo + Math.floor(n / nc)
  return { x: c0 * TILE_W, y: r0 * TILE_H, size: FINAL_SIZE }
}

/**
 * View for a round fraction 0..1 (clamped; NaN = 0): from the full board to `final`. The size
 * shrinks geometrically and the position is the linear blend of both rects, so each view contains
 * every later one (the final window, hence the target, is always visible).
 */
export function viewAt(fraction: number, final: Rect): Rect {
  const f = Number.isFinite(fraction) ? clamp(fraction, 0, 1) : 0
  if (f === 0) return { x: 0, y: 0, size: BOARD }
  if (f === 1) return { x: final.x, y: final.y, size: final.size }
  const size = BOARD * Math.pow(final.size / BOARD, f)
  const k = BOARD === final.size ? 1 : (BOARD - size) / (BOARD - final.size)
  return { x: k * final.x, y: k * final.y, size }
}

/** FINAL_SIZE window centred on the target (clamped in the board), for the end reveal. */
export function revealView(target: number): Rect {
  const r = tileRect(target)
  const max = BOARD - FINAL_SIZE
  return {
    x: clamp(r.x + r.w / 2 - FINAL_SIZE / 2, 0, max),
    y: clamp(r.y + r.h / 2 - FINAL_SIZE / 2, 0, max),
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
