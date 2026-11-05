export interface LabelItem {
  id: string
  /** The marker (or river badge) the label belongs to, in map units. */
  x: number
  y: number
  name: string
  /** Distance between the marker centre and the text start. */
  gap: number
}

export interface LabelSpot {
  /** Where the text goes (`y` is the middle of the line, not the baseline). */
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}

interface Rect {
  x0: number
  x1: number
  y0: number
  y1: number
}

const HALF_HEIGHT = 11
const MARKER_HALF = 12
const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))

/**
 * Chooses a side for every label so that names neither cover each other nor another marker.
 * Tries right, left, then diagonals above/below, then centred above/below; stays inside the map.
 * Deterministic and based on every name of the round (placed or not), so labels never jump around.
 */
export function layoutLabels(items: LabelItem[], width: number, height: number, charWidth: number): Record<string, LabelSpot> {
  const markers: Rect[] = items.map((i) => ({ x0: i.x - MARKER_HALF, x1: i.x + MARKER_HALF, y0: i.y - MARKER_HALF, y1: i.y + MARKER_HALF }))
  const taken: Rect[] = []
  const result: Record<string, LabelSpot> = {}
  const rise = 22

  items.forEach((item, index) => {
    const w = item.name.length * charWidth
    const g = item.gap
    const candidates: LabelSpot[] = [
      { x: item.x + g, y: item.y, anchor: 'start' },
      { x: item.x - g, y: item.y, anchor: 'end' },
      { x: item.x + g, y: item.y - rise, anchor: 'start' },
      { x: item.x + g, y: item.y + rise, anchor: 'start' },
      { x: item.x - g, y: item.y - rise, anchor: 'end' },
      { x: item.x - g, y: item.y + rise, anchor: 'end' },
      { x: item.x, y: item.y - g - 8, anchor: 'middle' },
      { x: item.x, y: item.y + g + 12, anchor: 'middle' },
    ]
    const rectOf = (s: LabelSpot): Rect => {
      const x0 = s.anchor === 'start' ? s.x : s.anchor === 'end' ? s.x - w : s.x - w / 2
      return { x0, x1: x0 + w, y0: s.y - HALF_HEIGHT, y1: s.y + HALF_HEIGHT }
    }
    const inside = (r: Rect) => r.x0 >= 2 && r.x1 <= width - 2 && r.y0 >= 2 && r.y1 <= height - 2
    const cost = (r: Rect) => taken.reduce((n, t) => n + overlap(r, t), 0) + markers.reduce((n, m, k) => (k === index ? n : n + overlap(r, m)), 0)

    let best = candidates[0]
    let bestCost = Infinity
    for (const c of candidates) {
      const r = rectOf(c)
      const total = cost(r) + (inside(r) ? 0 : 1e6)
      if (total < bestCost) {
        best = c
        bestCost = total
        if (total === 0) break
      }
    }
    result[item.id] = best
    taken.push(rectOf(best))
  })
  return result
}
