import { describe, expect, it } from 'vitest'
import { CITIES } from '../src/lib/france/cities'
import { MAP } from '../src/lib/france/outline'
import { RIVER_SHAPES } from '../src/lib/france/rivers'
import { RIVER_FACTS } from '../src/lib/france/riverFacts'
import { distanceToLine, nearestBy, project } from '../src/lib/france/geo'
import { SITES } from '../src/lib/france/sites'
import { applyPoints, conflicts, distanceTo, MARKER_GAP, pickMix, pickRound, PLACES, ROUND_MIXES, ROUND_SIZE, toRoundPlaces } from '../src/lib/games/places'

const inMap = (x: number, y: number) => x > 0 && x < MAP.width && y > 0 && y < MAP.height

describe('city data', () => {
  it('has unique names and a fact for every city', () => {
    expect(new Set(CITIES.map((c) => c.name)).size).toBe(CITIES.length)
    for (const c of CITIES) expect(c.fact.length).toBeGreaterThan(20)
  })

  it('projects every city inside the map', () => {
    for (const c of CITIES) {
      const p = project(c.lat, c.lon)
      expect(inMap(p.x, p.y), c.name).toBe(true)
    }
  })

  it('keeps every pair of markers apart (dots must not overlap)', () => {
    const pts = CITIES.map((c) => ({ name: c.name, ...project(c.lat, c.lon) }))
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y), `${pts[i].name}/${pts[j].name}`).toBeGreaterThan(20)
  })

  it('puts Paris north of Marseille and west of Strasbourg', () => {
    const [paris, marseille, strasbourg] = ['Paris', 'Marseille', 'Strasbourg'].map((n) => {
      const c = CITIES.find((x) => x.name === n)!
      return project(c.lat, c.lon)
    })
    expect(paris.y).toBeLessThan(marseille.y)
    expect(paris.x).toBeLessThan(strasbourg.x)
  })
})

describe('site data', () => {
  it('has exactly 50 sites, each with a fact', () => {
    expect(SITES).toHaveLength(50)
    expect(new Set(SITES.map((x) => x.name)).size).toBe(50)
    for (const x of SITES) expect(x.fact.length, x.name).toBeGreaterThan(20)
  })

  it('has at most one site per city', () => {
    expect(new Set(SITES.map((x) => x.city)).size).toBe(SITES.length)
  })

  it('projects every site inside the map', () => {
    for (const x of SITES) {
      const p = project(x.lat, x.lon)
      expect(inMap(p.x, p.y), x.name).toBe(true)
    }
  })
})

describe('river data', () => {
  it('has exactly 30 rivers', () => {
    expect(RIVER_SHAPES).toHaveLength(30)
  })

  it('has a fact and a course inside the map for every river', () => {
    expect(new Set(RIVER_SHAPES.map((r) => r.id)).size).toBe(RIVER_SHAPES.length)
    for (const r of RIVER_SHAPES) {
      expect(RIVER_FACTS[r.id]?.length, r.id).toBeGreaterThan(20)
      expect(r.lines.length).toBeGreaterThan(0)
      for (const line of r.lines) for (const [x, y] of line) expect(inMap(x, y), r.id).toBe(true)
      expect(inMap(r.label[0], r.label[1])).toBe(true)
    }
  })

  it('lies where the real rivers are (spot checks)', () => {
    const paris = project(48.8566, 2.3522)
    const seine = RIVER_SHAPES.find((r) => r.id === 'seine')!
    expect(Math.min(...seine.lines.map((l) => distanceToLine(paris, l)))).toBeLessThan(10)
    const lyon = project(45.764, 4.8357)
    for (const id of ['rhone', 'saone']) {
      const r = RIVER_SHAPES.find((x) => x.id === id)!
      expect(Math.min(...r.lines.map((l) => distanceToLine(lyon, l))), id).toBeLessThan(10)
    }
    const nantes = project(47.2184, -1.5536)
    const loire = RIVER_SHAPES.find((r) => r.id === 'loire')!
    expect(Math.min(...loire.lines.map((l) => distanceToLine(nantes, l)))).toBeLessThan(10)
  })
})

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
    expect(PLACES.filter((p) => p.kind === 'site')).toHaveLength(50)
    expect(PLACES.filter((p) => p.kind === 'river')).toHaveLength(30)
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length)
  })

  it('picks 5 distinct places', () => {
    const picked = pickRound(new Set())
    expect(picked).toHaveLength(ROUND_SIZE)
    expect(new Set(picked.map((c) => c.id)).size).toBe(ROUND_SIZE)
  })

  it('only mixes rivers and sites by 2 or 3, and always keeps at least one city', () => {
    for (const m of ROUND_MIXES) {
      expect([0, 2, 3]).toContain(m.rivers)
      expect([0, 2, 3]).toContain(m.sites)
      expect(m.rivers + m.sites).toBeLessThan(ROUND_SIZE)
    }
  })

  it('produces every mix over many rounds, and nothing else', () => {
    const seen = new Set<string>()
    const mixes = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const r = pickRound(seen)
      expect(r).toHaveLength(ROUND_SIZE)
      mixes.add(`${count(r, 'river')}/${count(r, 'site')}`)
    }
    expect([...mixes].sort()).toEqual(['0/0', '0/2', '0/3', '2/0', '2/2', '3/0'])
  })

  it('picks the mix from the injected random source', () => {
    expect(pickMix(() => 0)).toEqual({ rivers: 0, sites: 0 })
    expect(pickMix(() => 0.99)).toEqual({ rivers: 2, sites: 2 })
  })

  it('fills the round as the mix asks, with cities for the rest', () => {
    for (const mix of ROUND_MIXES) {
      const round = pickRound(new Set(), ROUND_SIZE, PLACES, mix)
      expect(count(round, 'river')).toBe(mix.rivers)
      expect(count(round, 'site')).toBe(mix.sites)
      expect(count(round, 'city')).toBe(ROUND_SIZE - mix.rivers - mix.sites)
    }
  })

  it('never puts two confusing places in the same round', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const round = pickRound(seen)
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
      for (const p of pickRound(seen, ROUND_SIZE, PLACES, { rivers: 3, sites: 0 })) if (p.kind === 'river') rivers.push(p.id)
    }
    expect(new Set(rivers).size).toBe(rivers.length) // 10 rounds x 3 = all 30
  })

  it('starts a kind over when it has been used up', () => {
    const seen = new Set(PLACES.map((p) => p.id))
    const round = pickRound(seen, ROUND_SIZE, PLACES, { rivers: 2, sites: 2 })
    expect(round).toHaveLength(ROUND_SIZE)
    expect(count(round, 'river')).toBe(2)
    expect(count(round, 'site')).toBe(2)
  })

  it('starts each place unplaced with no mistakes', () => {
    for (const c of toRoundPlaces(pickRound(new Set()))) {
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
