import { MAP } from './outline'

export interface Point {
  x: number
  y: number
}

/** Latitude/longitude to map (SVG viewBox) coordinates. */
export function project(lat: number, lon: number): Point {
  return {
    x: (lon - MAP.lon0) * MAP.k * MAP.scale,
    y: (MAP.latMax - lat) * MAP.scale,
  }
}

export type Line = readonly (readonly [number, number])[]

/** Shortest distance from `p` to a polyline (the river course). */
export function distanceToLine(p: Point, line: Line): number {
  let best = Infinity
  for (let i = 0; i < line.length - 1; i++) {
    const [x1, y1] = line[i]
    const [x2, y2] = line[i + 1]
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / len2))
    best = Math.min(best, Math.hypot(p.x - (x1 + t * dx), p.y - (y1 + t * dy)))
  }
  return best
}

/**
 * The item with the smallest `distance`, if it is within `radius` map units.
 * Generous radius: dropping near a marker or a river (not exactly on it) must count.
 */
export function nearestBy<T>(items: T[], distance: (item: T) => number, radius: number): T | null {
  let best: T | null = null
  let bestDist = radius
  for (const item of items) {
    const d = distance(item)
    if (d <= bestDist) {
      best = item
      bestDist = d
    }
  }
  return best
}
