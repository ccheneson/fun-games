import { describe, expect, it } from 'vitest'
import france from '../src/lib/countries/france'
import { distanceToLine, nearestBy, projector } from '../src/lib/countries/geo'
import {
  applyPoints,
  availableMixes,
  buildPlaces,
  conflicts,
  distanceTo,
  MARKER_GAP,
  pickMix,
  pickRound,
  ROUND_MIXES,
  ROUND_SIZE,
  toRoundPlaces,
} from '../src/lib/games/places'

const PLACES = buildPlaces(france)
const project = projector(france.map)
const inMap = (x: number, y: number) => x > 0 && x < france.map.width && y > 0 && y < france.map.height
const CITIES = france.cities
const SITES = france.sites
const RIVER_SHAPES = france.map.rivers

describe('geometry', () => {
  const line = [[0, 0], [100, 0]] as const
  it('measures the distance to a polyline, including past its ends', () => {
    expect(distanceToLine({ x: 50, y: 30 }, line)).toBe(30)
    expect(distanceToLine({ x: 130, y: 40 }, line)).toBe(50)
  })

  it('nearestBy returns the closest item inside the radius, else null', () => {
    const items = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    const d = (p: { x: number; y: number }) => (i: { x: number; y: number }) => Math.hypot(i.x - p.x, i.y - p.y)
    expect(nearestBy(items, d({ x: 90, y: 5 }), 30)).toBe(items[1])
    expect(nearestBy(items, d({ x: 50, y: 50 }), 30)).toBeNull()
  })

  it('a point on a river is nearest to that river among all rivers', () => {
    const places = PLACES.filter((p) => p.kind === 'river')
    for (const r of places) {
      const [x, y] = r.lines![0][Math.floor(r.lines![0].length / 2)]
      const hit = nearestBy(places, (p) => distanceTo(p, { x, y }), 34)
      expect(hit?.id, r.id).toBe(r.id)
    }
  })
})

describe('rounds', () => {
  const count = (round: { kind: string }[], kind: string) => round.filter((p) => p.kind === kind).length

  it('has cities, sites and rivers in the pool', () => {
    expect(PLACES.filter((p) => p.kind === 'city')).toHaveLength(CITIES.length)
    expect(PLACES.filter((p) => p.kind === 'site')).toHaveLength(SITES.length)
    expect(PLACES.filter((p) => p.kind === 'river')).toHaveLength(RIVER_SHAPES.length)
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length)
  })

  it('only offers the mixes a small pool can serve', () => {
    const noRivers = PLACES.filter((p) => p.kind !== 'river')
    expect(availableMixes(noRivers).every((m) => m.rivers === 0)).toBe(true)
    const oneSite = [...PLACES.filter((p) => p.kind !== 'site'), PLACES.find((p) => p.kind === 'site')!]
    expect(availableMixes(oneSite).every((m) => m.sites === 0)).toBe(true)
    expect(availableMixes(PLACES)).toEqual(ROUND_MIXES)
    // a country with no rivers and no sites still plays: all cities
    const round = pickRound(new Set(), PLACES.filter((p) => p.kind === 'city'))
    expect(round.every((p) => p.kind === 'city')).toBe(true)
  })

  it('picks 5 distinct places', () => {
    const picked = pickRound(new Set(), PLACES)
    expect(picked).toHaveLength(ROUND_SIZE)
    expect(new Set(picked.map((c) => c.id)).size).toBe(ROUND_SIZE)
  })

  it('only mixes rivers, sites and foods by 2 or 3, and always keeps at least one city', () => {
    for (const m of ROUND_MIXES) {
      expect([0, 2, 3]).toContain(m.rivers)
      expect([0, 2, 3]).toContain(m.sites)
      expect([0, 2, 3]).toContain(m.foods)
      expect(m.rivers + m.sites + m.foods).toBeLessThan(ROUND_SIZE)
    }
  })

  it('produces every mix over many rounds, and nothing else', () => {
    const seen = new Set<string>()
    const mixes = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const r = pickRound(seen, PLACES)
      expect(r).toHaveLength(ROUND_SIZE)
      mixes.add(`${count(r, 'river')}/${count(r, 'site')}/${count(r, 'food')}`)
    }
    expect([...mixes].sort()).toEqual(['0/0/0', '0/0/2', '0/0/3', '0/2/0', '0/2/2', '0/3/0', '2/0/0', '2/0/2', '2/2/0', '3/0/0'])
  })

  it('picks the mix from the injected random source', () => {
    expect(pickMix(() => 0)).toEqual({ rivers: 0, sites: 0, foods: 0 })
    expect(pickMix(() => 0.99)).toEqual({ rivers: 0, sites: 2, foods: 2 })
  })

  it('fills the round as the mix asks, with cities for the rest', () => {
    for (const mix of ROUND_MIXES) {
      const round = pickRound(new Set(), PLACES, ROUND_SIZE, mix)
      expect(count(round, 'river')).toBe(mix.rivers)
      expect(count(round, 'site')).toBe(mix.sites)
      expect(count(round, 'food')).toBe(mix.foods)
      expect(count(round, 'city')).toBe(ROUND_SIZE - mix.rivers - mix.sites - mix.foods)
    }
  })

  it('never puts two confusing places in the same round', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const round = pickRound(seen, PLACES)
      for (let a = 0; a < round.length; a++)
        for (let b = a + 1; b < round.length; b++) expect(conflicts(round[a], round[b]), `${round[a].name} / ${round[b].name}`).toBe(false)
    }
  })

  it('flags markers that are too close, a marker sitting on a river, but not two rivers', () => {
    const byName = (n: string) => PLACES.find((p) => p.name === n)!
    expect(conflicts(byName('Paris'), byName('La tour Eiffel'))).toBe(true)
    expect(conflicts(byName('Marseille'), byName('Toulon'))).toBe(true)
    expect(conflicts(byName('Paris'), byName('La Seine'))).toBe(true)
    expect(conflicts(byName('La Seine'), byName('La Marne'))).toBe(false)
    expect(conflicts(byName('Brest'), byName('Perpignan'))).toBe(false)
    expect(MARKER_GAP).toBeGreaterThan(20)
  })

  it('does not repeat rivers until all of them have been used', () => {
    const seen = new Set<string>()
    const rivers: string[] = []
    for (let i = 0; i < 10; i++) {
      for (const p of pickRound(seen, PLACES, ROUND_SIZE, { rivers: 3, sites: 0, foods: 0 })) if (p.kind === 'river') rivers.push(p.id)
    }
    expect(new Set(rivers).size).toBe(rivers.length) // 10 rounds x 3 = all 30
  })

  it('starts a kind over when it has been used up', () => {
    const seen = new Set(PLACES.map((p) => p.id))
    const round = pickRound(seen, PLACES, ROUND_SIZE, { rivers: 2, sites: 2, foods: 0 })
    expect(round).toHaveLength(ROUND_SIZE)
    expect(count(round, 'river')).toBe(2)
    expect(count(round, 'site')).toBe(2)
  })

  it('serves specialties as markers, never next to a confusing place, and never without any in the pool', () => {
    const foods = PLACES.filter((p) => p.kind === 'food')
    expect(foods.length).toBeGreaterThanOrEqual(20)
    expect(foods.every((f) => !f.lines && inMap(f.x, f.y))).toBe(true)
    const round = pickRound(new Set(), PLACES, ROUND_SIZE, { rivers: 0, sites: 0, foods: 3 })
    expect(count(round, 'food')).toBe(3)
    expect(availableMixes(PLACES.filter((p) => p.kind !== 'food')).every((m) => m.foods === 0)).toBe(true)
  })

  it('still builds full rounds for a sparse country (few cities, 2 sites, no rivers)', () => {
    const sparse = [
      ...PLACES.filter((p) => p.kind === 'city').slice(0, 8),
      ...PLACES.filter((p) => p.kind === 'site').slice(0, 2),
    ]
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const round = pickRound(seen, sparse)
      expect(round).toHaveLength(ROUND_SIZE)
      expect(new Set(round.map((p) => p.id)).size).toBe(ROUND_SIZE)
      expect(round.some((p) => p.kind === 'river')).toBe(false)
    }
  })

  it('starts each place unplaced with no mistakes', () => {
    for (const c of toRoundPlaces(pickRound(new Set(), PLACES))) {
      expect(c.placed).toBe(false)
      expect(c.mistakes).toBe(0)
    }
  })

  it('scores +1 / -1 and never goes below 0', () => {
    expect(applyPoints(3, true)).toBe(4)
    expect(applyPoints(3, false)).toBe(2)
    expect(applyPoints(0, false)).toBe(0)
  })
})
