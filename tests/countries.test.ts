import { describe, expect, it } from 'vitest'
import { distanceToRing, inRing, pathRings, projector } from '../src/lib/countries/geo'
import { COUNTRIES } from '../src/lib/countries/registry'
import { makeStrings } from '../src/lib/countries/strings'
import type { CountryData } from '../src/lib/countries/types'

// Generic checks, run on every country in the registry (including the ones the
// country-map-game skill generates): this is what a new country has to pass.
// 30 cities, 50 sites and 30 rivers are targets, not requirements: when sources or data fall short the country is
// built with what was found. Only what makes the game playable is enforced (a round has 5 places, so at least 8 cities
// leaves room for markers that must not overlap); anything below the targets is reported, not failed.
const MIN_CITIES = 8
const TARGETS = { cities: 30, sites: 50, rivers: 30 }
// Rivers are optional: the free map data has few rivers for some countries (e.g. Japan), and the game
// then simply offers cities and sites. Any river the map has must come with a name and a fact.
const COASTAL_SLACK = 8 // map units (~15 km): the outline is simplified, coastal places sit on it

describe.each(COUNTRIES.map((c) => [c.meta.id, c] as const))('country %s', (_id, entry) => {
  let country: CountryData
  it('loads', async () => {
    country = (await entry.load()).default
    expect(country.id).toBe(entry.meta.id)
  })

  it('has a name, a language and complete texts', () => {
    expect(country.name.trim()).not.toBe('')
    expect(country.lang).toMatch(/^[a-z]{2,3}$/)
    const s = country.strings
    for (const [key, value] of Object.entries(s)) {
      if (typeof value === 'string') expect(value.trim(), key).not.toBe('')
    }
    for (const [key, value] of Object.entries(s.kindLabels)) expect(value.trim(), key).not.toBe('')
    expect(s.aboutSource).toContain('{link}')
    expect(s.title).not.toContain('{country}')
    expect(s.mapLabel).not.toContain('{country}')
    expect(entry.meta.name.trim()).not.toBe('')
    expect(entry.meta.description.trim()).not.toBe('')
  })

  it('has no leftover TODO from the scaffold, and translated texts when the language is not English', () => {
    expect(JSON.stringify([country.name, country.cities, country.sites, country.rivers, country.strings, entry.meta])).not.toMatch(/TODO/)
    if (country.lang !== 'en') expect(country.strings.lead, 'strings still in English').not.toBe(makeStrings('en', country.name).lead)
  })

  it('reports where it falls short of the targets (a warning, not a failure)', () => {
    const counts = { cities: country.cities.length, sites: country.sites.length, rivers: country.map.rivers.length }
    for (const [kind, target] of Object.entries(TARGETS) as [keyof typeof TARGETS, number][])
      if (counts[kind] < target) console.warn(`[${country.id}] ${counts[kind]} ${kind} (target ${target})`)
  })

  it('has enough distinct cities to play, each with a fact', () => {
    expect(country.cities.length).toBeGreaterThanOrEqual(MIN_CITIES)
    expect(new Set(country.cities.map((c) => c.name)).size).toBe(country.cities.length)
    for (const c of country.cities) expect(c.fact.trim().length, c.name).toBeGreaterThan(20)
  })

  it('has distinct sites, at most one per city, each with a fact (any number, even none)', () => {
    expect(new Set(country.sites.map((s) => s.name)).size).toBe(country.sites.length)
    expect(new Set(country.sites.map((s) => s.city)).size, 'two sites share a city').toBe(country.sites.length)
    for (const s of country.sites) expect(s.fact.trim().length, s.name).toBeGreaterThan(20)
  })

  it('has a name and a fact for every river of the map, and none for rivers it does not have', () => {
    const ids = country.map.rivers.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(country.rivers).sort()).toEqual([...ids].sort())
    for (const [id, r] of Object.entries(country.rivers)) {
      expect(r.name.trim(), id).not.toBe('')
      expect(r.fact.trim().length, id).toBeGreaterThan(20)
    }
  })

  it('puts every city and site on the country (catches swapped or wrong coordinates)', () => {
    const project = projector(country.map)
    const rings = pathRings(country.map.outline)
    const onCountry = (lat: number, lon: number) => {
      const p = project(lat, lon)
      return rings.some((r) => inRing(p, r) || distanceToRing(p, r) <= COASTAL_SLACK)
    }
    for (const c of [...country.cities, ...country.sites]) expect(onCountry(c.lat, c.lon), `${c.name} (${c.lat}, ${c.lon})`).toBe(true)
  })

  it('keeps cities apart from each other so their dots do not overlap', () => {
    const project = projector(country.map)
    const pts = country.cities.map((c) => ({ name: c.name, ...project(c.lat, c.lon) }))
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y), `${pts[i].name} / ${pts[j].name}`).toBeGreaterThan(15)
  })

  it('has river courses inside the map', () => {
    const { width, height } = country.map
    for (const r of country.map.rivers) {
      for (const line of r.lines) for (const [x, y] of line) expect(x >= 0 && x <= width && y >= 0 && y <= height, r.id).toBe(true)
      expect(r.label[0] >= 0 && r.label[0] <= width, r.id).toBe(true)
    }
  })
})
