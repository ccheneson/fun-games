import { describe, expect, it } from 'vitest'
import {
  BOARD,
  COLS,
  FINAL_COLS,
  FINAL_MARGIN,
  FINAL_SIZE,
  MID_FRACTION,
  MID_SIZE,
  ROWS,
  SLOW_FRACTION,
  SLOW_SIZE,
  TILE_COUNT,
  TILE_H,
  TILE_W,
  blendView,
  cameraTransform,
  easeCss,
  finalWindow,
  moveSelection,
  pickBoard,
  revealView,
  tileAt,
  tileRect,
  viewAt,
  visibleTiles,
  type Rect,
} from '../src/lib/games/findposter'
import { pointsAt } from '../src/lib/games/points'
import { normalize } from '../src/lib/text/normalize'
import type { Title } from '../src/lib/providers/types'

/** Deterministic rng (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const EPS = 1e-9
const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet']

/** Distinct normalized titles: "Alpha 0", "Bravo 1"... */
function makeTitles(n: number, withPoster = true): Title[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    type: 'movie' as const,
    title: `${NAMES[i % NAMES.length]} ${i}`,
    posterUrl: withPoster ? `https://example.test/${i}.jpg` : undefined,
  }))
}

const FULL = { x: 0, y: 0, size: BOARD }

function inside(inner: { x: number; y: number; size: number }, outer: { x: number; y: number; size: number }) {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.size <= outer.x + outer.size + EPS &&
    inner.y + inner.size <= outer.y + outer.size + EPS
  )
}

function containsTile(view: { x: number; y: number; size: number }, index: number) {
  const r = tileRect(index)
  return (
    r.x >= view.x - EPS &&
    r.y >= view.y - EPS &&
    r.x + r.w <= view.x + view.size + EPS &&
    r.y + r.h <= view.y + view.size + EPS
  )
}

describe('constants', () => {
  it('makes a square board of 70 tiles', () => {
    expect(COLS * TILE_W).toBe(ROWS * TILE_H)
    expect(BOARD).toBe(COLS * TILE_W)
    expect(TILE_COUNT).toBe(70)
    expect(TILE_COUNT).toBe(COLS * ROWS)
  })
  it('has a final window 3 cols wide (about 2 rows high)', () => {
    expect(FINAL_COLS).toBe(3)
    expect(FINAL_SIZE).toBe(FINAL_COLS * TILE_W)
  })
})

describe('pickBoard', () => {
  const titles = makeTitles(120)

  it('returns exactly count tiles with distinct ids, distinct normalized titles and posters', () => {
    const b = pickBoard(titles, TILE_COUNT, new Set(), seeded(1))!
    expect(b).not.toBeNull()
    expect(b.tiles).toHaveLength(TILE_COUNT)
    expect(new Set(b.tiles.map((t) => t.id)).size).toBe(TILE_COUNT)
    expect(new Set(b.tiles.map((t) => normalize(t.title))).size).toBe(TILE_COUNT)
    for (const t of b.tiles) expect(t.posterUrl).toBeTruthy()
  })
  it('has a target index in range', () => {
    for (let s = 1; s < 30; s++) {
      const b = pickBoard(titles, TILE_COUNT, new Set(), seeded(s))!
      expect(Number.isInteger(b.target)).toBe(true)
      expect(b.target).toBeGreaterThanOrEqual(0)
      expect(b.target).toBeLessThan(TILE_COUNT)
    }
  })
  it('avoids excluded ids as target when others exist', () => {
    const exclude = new Set(titles.slice(0, 100).map((t) => t.id))
    for (let s = 1; s < 30; s++) {
      const b = pickBoard(titles, TILE_COUNT, exclude, seeded(s))!
      expect(exclude.has(b.tiles[b.target].id)).toBe(false)
    }
  })
  it('picks the only non-excluded title as target', () => {
    const exact = makeTitles(TILE_COUNT)
    const exclude = new Set(exact.filter((t) => t.id !== 'id-17').map((t) => t.id))
    for (let s = 1; s < 10; s++) {
      const b = pickBoard(exact, TILE_COUNT, exclude, seeded(s))!
      expect(b.tiles[b.target].id).toBe('id-17')
    }
  })
  it('still returns a board when every title is excluded', () => {
    const exact = makeTitles(TILE_COUNT)
    const b = pickBoard(exact, TILE_COUNT, new Set(exact.map((t) => t.id)), seeded(3))
    expect(b).not.toBeNull()
    expect(b!.tiles).toHaveLength(TILE_COUNT)
  })
  it('returns null when there are not enough candidates', () => {
    expect(pickBoard(makeTitles(TILE_COUNT - 1), TILE_COUNT, new Set(), seeded(1))).toBeNull()
    expect(pickBoard([], TILE_COUNT, new Set(), seeded(1))).toBeNull()
  })
  it('ignores titles without a poster', () => {
    const mixed = [...makeTitles(TILE_COUNT - 1), ...makeTitles(30, false).map((t, i) => ({ ...t, id: `np-${i}`, title: `NoPoster ${i}` }))]
    expect(pickBoard(mixed, TILE_COUNT, new Set(), seeded(1))).toBeNull()
  })
  it('ignores same-normalized-title duplicates', () => {
    const dupes = makeTitles(TILE_COUNT - 1)
    for (let i = 0; i < 10; i++) dupes.push({ id: `dup-${i}`, type: 'movie', title: dupes[0].title.toUpperCase(), posterUrl: 'https://example.test/d.jpg' })
    expect(pickBoard(dupes, TILE_COUNT, new Set(), seeded(1))).toBeNull()
    const ok = pickBoard([...dupes, ...makeTitles(1).map((t) => ({ ...t, id: 'extra', title: 'Totally Different' }))], TILE_COUNT, new Set(), seeded(1))!
    expect(new Set(ok.tiles.map((t) => normalize(t.title))).size).toBe(TILE_COUNT)
  })
  it('does not mutate its input', () => {
    const copy = titles.map((t) => t.id)
    pickBoard(titles, TILE_COUNT, new Set(), seeded(5))
    expect(titles.map((t) => t.id)).toEqual(copy)
  })
  it('is deterministic for a given rng and differs between rngs', () => {
    const a1 = pickBoard(titles, TILE_COUNT, new Set(), seeded(1))!
    const a2 = pickBoard(titles, TILE_COUNT, new Set(), seeded(1))!
    const b = pickBoard(titles, TILE_COUNT, new Set(), seeded(2))!
    expect(a1.tiles.map((t) => t.id)).toEqual(a2.tiles.map((t) => t.id))
    expect(a1.target).toBe(a2.target)
    expect(a1.tiles.map((t) => t.id)).not.toEqual(b.tiles.map((t) => t.id))
  })
})

describe('tileRect', () => {
  it('lays tiles out row by row, 2x3 units each', () => {
    expect(tileRect(0)).toEqual({ x: 0, y: 0, w: TILE_W, h: TILE_H })
    expect(tileRect(1)).toEqual({ x: TILE_W, y: 0, w: TILE_W, h: TILE_H })
    expect(tileRect(COLS)).toEqual({ x: 0, y: TILE_H, w: TILE_W, h: TILE_H })
    expect(tileRect(TILE_COUNT - 1)).toEqual({ x: BOARD - TILE_W, y: BOARD - TILE_H, w: TILE_W, h: TILE_H })
  })
  it('tiles the board without overlap or gap', () => {
    let area = 0
    for (let i = 0; i < TILE_COUNT; i++) {
      const r = tileRect(i)
      area += r.w * r.h
      expect(r.x + r.w).toBeLessThanOrEqual(BOARD)
      expect(r.y + r.h).toBeLessThanOrEqual(BOARD)
    }
    expect(area).toBe(BOARD * BOARD)
  })
})

describe('tileAt', () => {
  const VP = 300
  const centreOf = (i: number, view: { x: number; y: number; size: number }) => {
    const r = tileRect(i)
    const k = VP / view.size
    return { px: (r.x + r.w / 2 - view.x) * k, py: (r.y + r.h / 2 - view.y) * k }
  }

  it('maps the centre of every tile back to its index under the full view', () => {
    for (let i = 0; i < TILE_COUNT; i++) {
      const { px, py } = centreOf(i, FULL)
      expect(tileAt(px, py, FULL, VP)).toBe(i)
    }
  })
  it('maps tile centres back under a zoomed view', () => {
    const view = { x: 14, y: 10, size: 21 }
    for (const i of visibleTiles(view)) {
      const r = tileRect(i)
      if (!containsTile(view, i)) continue
      const { px, py } = centreOf(i, view)
      expect(tileAt(px, py, view, VP)).toBe(i)
      expect(r.w).toBe(TILE_W)
    }
  })
  it('returns null outside the board', () => {
    expect(tileAt(-1, 10, FULL, VP)).toBeNull()
    expect(tileAt(10, -1, FULL, VP)).toBeNull()
    expect(tileAt(VP + 20, 10, FULL, VP)).toBeNull()
    expect(tileAt(10, VP + 20, FULL, VP)).toBeNull()
  })
  it('never returns an out-of-range index at the far edge', () => {
    const r = tileAt(VP, VP, FULL, VP)
    expect(r === null || (r >= 0 && r < TILE_COUNT)).toBe(true)
    const r0 = tileAt(0, 0, FULL, VP)
    expect(r0).toBe(0)
  })
})

describe('final window', () => {
  const FEPS = 1e-9
  const maxDy = (FINAL_SIZE - TILE_H) / 2 - FINAL_MARGIN

  it('is a FINAL_SIZE square inside the board that contains the target tile, for every target and seed', () => {
    for (let target = 0; target < TILE_COUNT; target++) {
      for (let seed = 1; seed <= 20; seed++) {
        const w = finalWindow(target, seeded(seed))
        expect(w.size).toBe(FINAL_SIZE)
        expect(inside(w, FULL)).toBe(true)
        expect(containsTile(w, target)).toBe(true)
      }
      const d = finalWindow(target)
      expect(d.size).toBe(FINAL_SIZE)
      expect(inside(d, FULL)).toBe(true)
      expect(containsTile(d, target)).toBe(true)
    }
  })
  it('keeps FINAL_MARGIN vertically when not clamped, and contains the tile horizontally', () => {
    let checked = 0
    for (let target = 0; target < TILE_COUNT; target++) {
      const r = tileRect(target)
      for (let seed = 1; seed <= 20; seed++) {
        const w = finalWindow(target, seeded(seed))
        // horizontally the outer margin may be 0: only containment is required
        expect(r.x).toBeGreaterThanOrEqual(w.x - FEPS)
        expect(r.x + r.w).toBeLessThanOrEqual(w.x + w.size + FEPS)
        if (w.y <= FEPS || w.y >= BOARD - FINAL_SIZE - FEPS) continue
        checked++
        expect(r.y - w.y).toBeGreaterThanOrEqual(FINAL_MARGIN - FEPS)
        expect(w.y + w.size - (r.y + r.h)).toBeGreaterThanOrEqual(FINAL_MARGIN - FEPS)
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
  it('shows 3 whole tile columns when not clamped horizontally', () => {
    let checked = 0
    for (let target = 0; target < TILE_COUNT; target++) {
      for (let seed = 1; seed <= 20; seed++) {
        const w = finalWindow(target, seeded(seed))
        if (w.x <= FEPS || w.x >= BOARD - FINAL_SIZE - FEPS) continue
        checked++
        const col0 = Math.round(w.x / TILE_W)
        expect(w.x).toBeCloseTo(col0 * TILE_W, 9)
        for (let c = col0; c < col0 + FINAL_COLS; c++) {
          const x0 = c * TILE_W
          expect(x0).toBeGreaterThanOrEqual(w.x - FEPS)
          expect(x0 + TILE_W).toBeLessThanOrEqual(w.x + w.size + FEPS)
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
  it('is deterministic for a given rng and differs between seeds', () => {
    const t = 3 * COLS + 4
    expect(finalWindow(t, seeded(5))).toEqual(finalWindow(t, seeded(5)))
    const seen = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      const w = finalWindow(t, seeded(seed))
      seen.add(`${w.x.toFixed(6)},${w.y.toFixed(6)}`)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
  it('is not always centred: horizontal offset is -TILE_W, 0 or +TILE_W, on both sides', () => {
    const t = 3 * COLS + 4
    const r = tileRect(t)
    const rng = seeded(42)
    const dxs = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const w = finalWindow(t, rng)
      const dx = w.x + w.size / 2 - (r.x + r.w / 2)
      const dy = w.y + w.size / 2 - (r.y + r.h / 2)
      const k = Math.round(dx / TILE_W)
      expect([-1, 0, 1]).toContain(k)
      expect(dx).toBeCloseTo(k * TILE_W, 9)
      expect(Math.abs(dy)).toBeLessThanOrEqual(maxDy + FEPS)
      dxs.add(k)
    }
    expect(dxs.has(-1)).toBe(true)
    expect(dxs.has(0)).toBe(true)
    expect(dxs.has(1)).toBe(true)
  })
  it('handles extreme rng values (0, ~1, 1)', () => {
    for (const v of [0, 0.999999, 1]) {
      for (let target = 0; target < TILE_COUNT; target++) {
        const w = finalWindow(target, () => v)
        expect(w.size).toBe(FINAL_SIZE)
        expect(inside(w, FULL)).toBe(true)
        expect(containsTile(w, target)).toBe(true)
      }
    }
  })
  it('viewAt towards it contains the target for the whole zoom, for all targets', () => {
    for (let t = 0; t < TILE_COUNT; t++) {
      const w = finalWindow(t, seeded(t + 100))
      for (let i = 0; i <= 20; i++) {
        expect(containsTile(viewAt(i / 20, w), t)).toBe(true)
      }
    }
  })
})

describe('viewAt', () => {
  const finals = [0, 20, 31, 69, 8, 45].map((t) => ({ t, w: finalWindow(t, seeded(t + 7)) }))

  it('starts on the full board and ends on the final window', () => {
    for (const { w } of finals) {
      const a = viewAt(0, w)
      expect(a.x).toBeCloseTo(0, 9)
      expect(a.y).toBeCloseTo(0, 9)
      expect(a.size).toBeCloseTo(BOARD, 9)
      const b = viewAt(1, w)
      expect(b.x).toBeCloseTo(w.x, 9)
      expect(b.y).toBeCloseTo(w.y, 9)
      expect(b.size).toBeCloseTo(w.size, 9)
    }
  })
  it('clamps below 0, above 1 and NaN', () => {
    const w = finals[1].w
    expect(viewAt(-3, w)).toEqual(viewAt(0, w))
    expect(viewAt(7, w)).toEqual(viewAt(1, w))
    expect(viewAt(NaN, w)).toEqual(viewAt(0, w))
  })
  it('shrinks strictly', () => {
    const w = finals[1].w
    let prev = viewAt(0, w).size
    for (let i = 1; i <= 20; i++) {
      const s = viewAt(i / 20, w).size
      expect(s).toBeLessThan(prev)
      prev = s
    }
    // between the full board and the 40-point view
    expect(viewAt(0.5, w).size).toBeGreaterThan(MID_SIZE)
    expect(viewAt(0.5, w).size).toBeLessThan(BOARD)
  })
  it('shows a 6-tile-wide view at 40 points (60% of the round)', () => {
    const w = finals[1].w
    expect(viewAt(MID_FRACTION, w).size).toBeCloseTo(MID_SIZE, 9)
    expect(MID_SIZE).toBe(6 * TILE_W)
  })
  describe('slow zoom until 50 points, faster afterwards', () => {
    const cases: { name: string; w: Rect }[] = [
      ...finals.map(({ t, w }) => ({ name: `target ${t}`, w })),
      { name: 'custom rect', w: { x: 0, y: 0, size: FINAL_SIZE } },
    ]
    const ln = (f: number, w: Rect) => Math.log(viewAt(f, w).size)
    const rate = (f: number, w: Rect, h = 1e-4) => (ln(f - h, w) - ln(f + h, w)) / (2 * h)

    it('defines the slow knot at 50 points', () => {
      expect(SLOW_FRACTION).toBe(0.5)
      expect(SLOW_SIZE).toBe(50)
      expect(pointsAt(SLOW_FRACTION)).toBe(50)
      for (const { w } of cases) expect(viewAt(SLOW_FRACTION, w).size).toBeCloseTo(SLOW_SIZE, 6)
    })
    it('zooms at least 2x slower in the first half than in the second', () => {
      for (const { w } of cases) {
        const s = viewAt(SLOW_FRACTION, w).size
        const first = Math.log(BOARD / s) / SLOW_FRACTION
        const second = Math.log(s / w.size) / (1 - SLOW_FRACTION)
        expect(first * 2).toBeLessThanOrEqual(second)
      }
    })
    it('has done less than 30% of the log zoom at 50 points (was 34%)', () => {
      for (const { w } of cases) {
        const s = viewAt(0.5, w).size
        const progress = (Math.log(BOARD) - Math.log(s)) / (Math.log(BOARD) - Math.log(FINAL_SIZE))
        expect(progress).toBeLessThan(0.3)
      }
    })
    it('zooms steadily (geometric sizes) from 100 to 50 points', () => {
      for (const { w } of cases) {
        const sizes = [0, 1, 2, 3, 4, 5].map((i) => viewAt(i / 10, w).size)
        const ratio = sizes[1] / sizes[0]
        for (let i = 1; i < sizes.length; i++) expect(sizes[i] / sizes[i - 1]).toBeCloseTo(ratio, 6)
      }
    })
    it('zooms faster after 50 points than in the first leg', () => {
      for (const { w } of cases) {
        const r1 = Math.log(BOARD / SLOW_SIZE) / SLOW_FRACTION
        for (let i = 51; i <= 99; i++) {
          const f = i / 100
          const r = rate(f, w)
          expect(r).toBeGreaterThanOrEqual(r1 - 1e-3)
          if (f >= 0.55) expect(r).toBeGreaterThan(r1 + 1e-3)
        }
      }
    })
    it('has no jolt at the knots (continuous log-rate)', () => {
      const h = 1e-5
      for (const { w } of cases) {
        for (const k of [SLOW_FRACTION, MID_FRACTION]) {
          const left = (ln(k, w) - ln(k - h, w)) / h
          const right = (ln(k + h, w) - ln(k, w)) / h
          expect(left).toBeCloseTo(right, 3)
        }
      }
    })
  })
  it('nests: a later view is inside every earlier view', () => {
    for (const { w } of finals) {
      for (let i = 0; i < 40; i++) {
        const t1 = i / 40
        const t2 = (i + 1) / 40
        expect(inside(viewAt(t2, w), viewAt(t1, w))).toBe(true)
      }
    }
  })
  it('always keeps the target tile visible', () => {
    for (const { t, w } of finals) {
      for (let i = 0; i <= 100; i++) {
        const v = viewAt(i / 100, w)
        expect(containsTile(v, t)).toBe(true)
        expect(inside(v, FULL)).toBe(true)
      }
    }
  })
})

describe('revealView', () => {
  it('stays inside the board and contains the target', () => {
    for (let t = 0; t < TILE_COUNT; t++) {
      const v = revealView(t)
      expect(v.size).toBe(FINAL_SIZE)
      expect(inside(v, FULL)).toBe(true)
      expect(containsTile(v, t)).toBe(true)
    }
  })
  it('is centred on the target when away from the edges', () => {
    const t = 3 * COLS + 4
    const r = tileRect(t)
    const v = revealView(t)
    expect(v.x + v.size / 2).toBeCloseTo(r.x + r.w / 2, 9)
    expect(v.y + v.size / 2).toBeCloseTo(r.y + r.h / 2, 9)
  })
})

describe('cameraTransform', () => {
  const VP = 320
  const boardPx = (VP * BOARD) / FINAL_SIZE // board element is laid out at its zoomed-in size

  it('fits the whole board in the viewport for the full view', () => {
    const c = cameraTransform(FULL, VP)
    expect(c.scale * boardPx).toBeCloseTo(VP, 6)
    expect(c.tx).toBeCloseTo(0, 6)
    expect(c.ty).toBeCloseTo(0, 6)
  })
  it('has scale 1 on the final-size view', () => {
    expect(cameraTransform({ x: 14, y: 10, size: FINAL_SIZE }, VP).scale).toBeCloseTo(1, 9)
  })
  it('round-trips with tileAt (tx, ty are positive board-pixel offsets, applied as translate(-tx, -ty) after scale)', () => {
    const views = [FULL, { x: 14, y: 10, size: 21 }, { x: 8.75, y: 4.4, size: 35 }, revealView(31)]
    const unitPx = boardPx / BOARD
    for (const view of views) {
      const { scale, tx, ty } = cameraTransform(view, VP)
      for (let px = 3; px < VP; px += 37) {
        for (let py = 5; py < VP; py += 41) {
          // screen -> board px (inverse of scale(s) translate(-tx,-ty), origin 0 0) -> board units
          const ux = (px / scale + tx) / unitPx
          const uy = (py / scale + ty) / unitPx
          const col = Math.min(COLS - 1, Math.floor(ux / TILE_W))
          const row = Math.min(ROWS - 1, Math.floor(uy / TILE_H))
          expect(tileAt(px, py, view, VP)).toBe(row * COLS + col)
        }
      }
    }
  })
})

describe('visibleTiles', () => {
  it('returns all 70 tiles for the full view', () => {
    const v = visibleTiles(FULL)
    expect(v).toHaveLength(TILE_COUNT)
    expect([...v].sort((a, b) => a - b)).toEqual(Array.from({ length: TILE_COUNT }, (_, i) => i))
  })
  it('returns exactly the tiles of a tile-aligned window', () => {
    // x 14..34 = cols 2,3,4 ; y 10..30 = rows 1,2
    const v = visibleTiles({ x: 14, y: 10, size: 20 })
    expect([...v].sort((a, b) => a - b)).toEqual([12, 13, 14, 22, 23, 24])
  })
  it('includes partly visible tiles and excludes merely touching ones', () => {
    const v = visibleTiles({ x: 15, y: 10, size: 20 }) // x 15..35: col 2 (14..21) is partly visible
    expect(v).toContain(12)
    expect(v).toContain(14)
    expect(v).not.toContain(11) // col 1 ends at 14 < 15
  })
  it('always includes the target for a final window', () => {
    for (let t = 0; t < TILE_COUNT; t++) {
      const w = finalWindow(t, seeded(t + 3))
      expect(visibleTiles(w)).toContain(t)
    }
  })
})

describe('moveSelection', () => {
  it('moves one cell in each direction', () => {
    const i = 2 * COLS + 3
    expect(moveSelection(i, 'ArrowRight')).toBe(i + 1)
    expect(moveSelection(i, 'ArrowLeft')).toBe(i - 1)
    expect(moveSelection(i, 'ArrowDown')).toBe(i + COLS)
    expect(moveSelection(i, 'ArrowUp')).toBe(i - COLS)
  })
  it('clamps at the four edges', () => {
    expect(moveSelection(0, 'ArrowLeft')).toBe(0)
    expect(moveSelection(0, 'ArrowUp')).toBe(0)
    expect(moveSelection(COLS - 1, 'ArrowRight')).toBe(COLS - 1)
    expect(moveSelection(COLS - 1, 'ArrowUp')).toBe(COLS - 1)
    expect(moveSelection(TILE_COUNT - COLS, 'ArrowLeft')).toBe(TILE_COUNT - COLS)
    expect(moveSelection(TILE_COUNT - COLS, 'ArrowDown')).toBe(TILE_COUNT - COLS)
    expect(moveSelection(TILE_COUNT - 1, 'ArrowRight')).toBe(TILE_COUNT - 1)
    expect(moveSelection(TILE_COUNT - 1, 'ArrowDown')).toBe(TILE_COUNT - 1)
  })
  it('does not wrap across rows', () => {
    expect(moveSelection(COLS, 'ArrowLeft')).toBe(COLS)
    expect(moveSelection(2 * COLS - 1, 'ArrowRight')).toBe(2 * COLS - 1)
  })
})

describe('glide helpers', () => {
  const full = { x: 0, y: 0, size: BOARD }
  const end = revealView(34)
  it('blendView goes from one view to the other, clamped', () => {
    expect(blendView(full, end, 0)).toEqual(full)
    expect(blendView(full, end, 1)).toEqual(end)
    expect(blendView(full, end, -1)).toEqual(full)
    expect(blendView(full, end, 2)).toEqual(end)
    const half = blendView(full, end, 0.5)
    expect(half.size).toBeCloseTo((BOARD + FINAL_SIZE) / 2)
    expect(half.x).toBeCloseTo(end.x / 2)
  })
  it('blendView between nested views stays nested (the answer stays in view while zooming in)', () => {
    for (let p = 0; p <= 1; p += 0.1) {
      const v = blendView(full, end, p)
      expect(v.x).toBeLessThanOrEqual(end.x + 1e-9)
      expect(v.y).toBeLessThanOrEqual(end.y + 1e-9)
      expect(v.x + v.size).toBeGreaterThanOrEqual(end.x + end.size - 1e-9)
      expect(v.y + v.size).toBeGreaterThanOrEqual(end.y + end.size - 1e-9)
    }
  })
  it('easeCss matches CSS ease: 0 and 1 at the ends, monotone, known midpoints', () => {
    expect(easeCss(0)).toBe(0)
    expect(easeCss(1)).toBe(1)
    expect(easeCss(-3)).toBe(0)
    expect(easeCss(5)).toBe(1)
    // cubic-bezier(0.25, 0.1, 0.25, 1) at t = 0.5 is about 0.8024
    expect(easeCss(0.5)).toBeCloseTo(0.8024, 3)
    let prev = 0
    for (let t = 0.01; t <= 1; t += 0.01) {
      const v = easeCss(t)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})
