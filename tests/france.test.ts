import { describe, expect, it } from 'vitest'
import france from '../src/lib/countries/france'
import { distanceToLine, projector } from '../src/lib/countries/geo'

// France-specific spot checks (the generic ones are in countries.test.ts).
const project = projector(france.map)
const course = (id: string) => france.map.rivers.find((r) => r.id === id)!.lines
const distanceTo = (id: string, lat: number, lon: number) => Math.min(...course(id).map((l) => distanceToLine(project(lat, lon), l)))

describe('France', () => {
  it('has 30 cities, 50 sites and 30 rivers', () => {
    expect(france.cities).toHaveLength(30)
    expect(france.sites).toHaveLength(50)
    expect(france.map.rivers).toHaveLength(30)
  })

  it('puts Paris north of Marseille and west of Strasbourg', () => {
    const [paris, marseille, strasbourg] = ['Paris', 'Marseille', 'Strasbourg'].map((n) => {
      const c = france.cities.find((x) => x.name === n)!
      return project(c.lat, c.lon)
    })
    expect(paris.y).toBeLessThan(marseille.y)
    expect(paris.x).toBeLessThan(strasbourg.x)
  })

  it('draws the rivers where the real ones are', () => {
    expect(distanceTo('seine', 48.8566, 2.3522)).toBeLessThan(10) // through Paris
    expect(distanceTo('rhone', 45.764, 4.8357)).toBeLessThan(10) // and Lyon
    expect(distanceTo('saone', 45.764, 4.8357)).toBeLessThan(10)
    expect(distanceTo('loire', 47.2184, -1.5536)).toBeLessThan(10) // Nantes
    expect(distanceTo('garonne', 44.8378, -0.5792)).toBeLessThan(10) // Bordeaux
  })
})
