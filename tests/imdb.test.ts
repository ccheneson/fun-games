import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { countImdbTitles, getImdbTitles } from '../src/lib/db/db'
import { ensureImdbSeeded, rowsToTitles } from '../src/lib/db/imdb'
import { parseCsv, parseCsvObjects } from '../src/lib/text/csv'

const csv = readFileSync('src/library/imdb_top_1000.csv', 'utf8')
const tvCsv = readFileSync('src/library/tv_top_1000.csv', 'utf8')

describe('csv', () => {
  it('handles quotes, commas, escaped quotes and newlines', () => {
    expect(parseCsv('a,"b,c","d ""e""\nf"\n1,2,3\n')).toEqual([['a', 'b,c', 'd "e"\nf'], ['1', '2', '3']])
  })
})

describe('imdb seeding', () => {
  it('parses the whole file', () => {
    const titles = rowsToTitles(parseCsvObjects(csv))
    expect(titles.length).toBeGreaterThan(0)
    expect(titles.length).toBeLessThan(1000)
    expect(titles.every((t) => t.year! >= 1985)).toBe(true)
    expect(titles[0]).toMatchObject({ title: 'The Shawshank Redemption', year: 1994, rating: 9.3 })
    expect(titles[0].stars).toEqual(['Tim Robbins', 'Morgan Freeman', 'Bob Gunton', 'William Sadler'])
    expect(titles[0].posterUrl).toMatch(/^https:\/\/m\.media-amazon\.com\/.*@\._V1_UX300\.jpg$/)
    expect(new Set(titles.map((t) => t.id)).size).toBe(titles.length)
  })

  it('keeps TV shows from 1990', () => {
    const shows = rowsToTitles(parseCsvObjects(tvCsv), 'tv')
    expect(shows.length).toBeGreaterThan(100)
    expect(shows.every((t) => t.type === 'tv' && t.year! >= 1990 && t.id.startsWith('tv:'))).toBe(true)
    expect(shows[0].posterUrl).toMatch(/^https:\/\/image\.tmdb\.org\//)
  })

  it('fills the database once', async () => {
    const n = rowsToTitles(parseCsvObjects(csv)).length + rowsToTitles(parseCsvObjects(tvCsv), 'tv').length
    expect(await ensureImdbSeeded(async () => csv, async () => tvCsv)).toBe(n)
    expect(await countImdbTitles()).toBe(n)
    await ensureImdbSeeded(async () => { throw new Error('should not reload') }, async () => '')
    expect(await getImdbTitles()).toHaveLength(n)
  })
})
