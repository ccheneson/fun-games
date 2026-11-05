import type { MapGeometry } from './types'

export interface Point {
  x: number
  y: number
}

export type Line = readonly (readonly [number, number])[]

/** Latitude/longitude to map (SVG viewBox) coordinates. */
export function projector(map: Pick<MapGeometry, 'lon0' | 'latMax' | 'k' | 'scale'>): (lat: number, lon: number) => Point {
  return (lat, lon) => ({ x: (lon - map.lon0) * map.k * map.scale, y: (map.latMax - lat) * map.scale })
}

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

/** The rings of an SVG path made only of `M x y L x y … Z` pieces, as the generator writes them. */
export function pathRings(path: string): [number, number][][] {
  return path
    .split('M')
    .filter(Boolean)
    .map((piece) =>
      piece
        .replace('Z', '')
        .split('L')
        .map((pt) => pt.trim().split(/\s+/).map(Number) as [number, number]),
    )
}

/** Is the point inside the ring (ray casting)? */
export function inRing(p: Point, ring: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Distance from `p` to the border of a ring. */
export function distanceToRing(p: Point, ring: readonly (readonly [number, number])[]): number {
  return distanceToLine(p, [...ring, ring[0]])
}
