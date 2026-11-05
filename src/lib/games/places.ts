import { distanceToLine, projector, type Line, type Point } from '../countries/geo'
import type { CountryData } from '../countries/types'
import { shuffle } from '../db/seed'

export const ROUND_SIZE = 5

export type PlaceKind = 'city' | 'site' | 'river'

/** Something to place on the map: a city or a famous site (a marker), or a river (a highlighted course). */
export interface PlaceDef extends Point {
  id: string
  kind: PlaceKind
  name: string
  fact: string
  /** Rivers only: the course, in map units. `x`/`y` is then where the label goes. */
  lines?: Line[]
}

export interface RoundPlace extends PlaceDef {
  mistakes: number
  placed: boolean
}

/** Every city, site and river of a country, ready to be placed on its map. */
export function buildPlaces(country: CountryData): PlaceDef[] {
  const project = projector(country.map)
  const rivers = country.map.rivers.flatMap((shape): PlaceDef[] => {
    const info = country.rivers[shape.id]
    return info ? [{ id: 'river:' + shape.id, kind: 'river', name: info.name, fact: info.fact, x: shape.label[0], y: shape.label[1], lines: shape.lines }] : []
  })
  return [
    ...country.cities.map((c): PlaceDef => ({ id: 'city:' + c.name, kind: 'city', name: c.name, fact: c.fact, ...project(c.lat, c.lon) })),
    ...country.sites.map((s): PlaceDef => ({ id: 'site:' + s.name, kind: 'site', name: s.name, fact: s.fact, ...project(s.lat, s.lon) })),
    ...rivers,
  ]
}

/** Distance (map units) from a point to the place: to the marker, or to the nearest bit of river. */
export function distanceTo(place: PlaceDef, p: Point): number {
  if (place.lines) return Math.min(...place.lines.map((l) => distanceToLine(p, l)))
  return Math.hypot(place.x - p.x, place.y - p.y)
}

/** Points: +1 for a correct drop, -1 for a wrong one (the total never goes below 0). */
export function applyPoints(score: number, correct: boolean): number {
  return Math.max(0, score + (correct ? 1 : -1))
}

/** Two markers closer than this (map units, 1 unit is about 1.85 km) would be hard to tell apart. */
export const MARKER_GAP = 30
/** A marker closer than this to a river drawn in the same round would be ambiguous. */
export const RIVER_GAP = 14

/** Would these two places be confusing on the same map? (Two rivers never are: the drop goes to the nearest.) */
export function conflicts(a: PlaceDef, b: PlaceDef): boolean {
  if (a.lines && b.lines) return false
  if (a.lines) return distanceTo(a, b) < RIVER_GAP
  if (b.lines) return distanceTo(b, a) < RIVER_GAP
  return Math.hypot(a.x - b.x, a.y - b.y) < MARKER_GAP
}

/**
 * How many rivers and famous sites a round has; the rest are cities (always at least one).
 * Rivers and sites come in 2s or 3s, never alone, and not every round has them.
 */
export interface RoundMix {
  rivers: number
  sites: number
}

export const ROUND_MIXES: readonly RoundMix[] = [
  { rivers: 0, sites: 0 },
  { rivers: 2, sites: 0 },
  { rivers: 3, sites: 0 },
  { rivers: 0, sites: 2 },
  { rivers: 0, sites: 3 },
  { rivers: 2, sites: 2 },
]

/** The mixes a pool can serve (a small country may have too few rivers or sites for some of them). */
export function availableMixes(pool: PlaceDef[], n = ROUND_SIZE): readonly RoundMix[] {
  const rivers = pool.filter((p) => p.kind === 'river').length
  const sites = pool.filter((p) => p.kind === 'site').length
  return ROUND_MIXES.filter((m) => m.rivers <= rivers && m.sites <= sites && m.rivers + m.sites < n)
}

export function pickMix(random: () => number = Math.random, mixes: readonly RoundMix[] = ROUND_MIXES): RoundMix {
  return mixes[Math.floor(random() * mixes.length)]
}

/**
 * Picks `n` places for a round following `mix` (cities for the rest), shuffled together.
 * Places in `seen` are avoided until a kind has been used up, then that kind starts over;
 * places that would be confusing next to one already picked are skipped.
 */
export function pickRound(seen: Set<string>, pool: PlaceDef[], n = ROUND_SIZE, mix: RoundMix = pickMix(Math.random, availableMixes(pool, n))): PlaceDef[] {
  const chosen: PlaceDef[] = []

  function pickOne(kind: PlaceKind): boolean {
    const candidates = () => pool.filter((p) => p.kind === kind && !seen.has(p.id) && !chosen.some((c) => conflicts(c, p)))
    let options = candidates()
    if (options.length === 0) {
      for (const p of pool) if (p.kind === kind) seen.delete(p.id)
      options = candidates()
    }
    if (options.length === 0) return false
    const pick = options[Math.floor(Math.random() * options.length)]
    seen.add(pick.id)
    chosen.push(pick)
    return true
  }

  const rivers = Math.min(mix.rivers, n)
  const sites = Math.min(mix.sites, n - rivers)
  const wanted: PlaceKind[] = [
    ...Array<PlaceKind>(rivers).fill('river'),
    ...Array<PlaceKind>(sites).fill('site'),
    ...Array<PlaceKind>(n - rivers - sites).fill('city'),
  ]
  for (const kind of wanted) pickOne(kind)
  // Last resort (tiny pools only): fill up with whatever is left, conflicts or not.
  for (const p of shuffle(pool)) {
    if (chosen.length >= n) break
    if (!chosen.includes(p)) chosen.push(p)
  }
  return shuffle(chosen)
}

export function toRoundPlaces(places: PlaceDef[]): RoundPlace[] {
  return places.map((p) => ({ ...p, mistakes: 0, placed: false }))
}
