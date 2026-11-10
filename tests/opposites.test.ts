import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { OPPOSITES, type OppositeEntry } from '../src/lib/games/opposites/data'
import { buildRounds, isOppositeGuess, makeQueue, refKey, type OppositeRound } from '../src/lib/games/opposites'
import { rowsToTitles } from '../src/lib/db/imdb'
import type { Title } from '../src/lib/providers/types'
import { parseCsvObjects } from '../src/lib/text/csv'
import { normalize } from '../src/lib/text/normalize'

const all: Title[] = [
  ...rowsToTitles(parseCsvObjects(readFileSync('src/library/imdb_top_1000.csv', 'utf8'))),
  ...rowsToTitles(parseCsvObjects(readFileSync('src/library/tv_top_1000.csv', 'utf8')), 'tv'),
]
const byKey = new Map(all.map((t) => [refKey(t.type, t.title, t.year), t]))
const label = (e: OppositeEntry) => `${e.lang}: ${e.title} (${e.ref.type} ${e.ref.title} ${e.ref.year})`
const roundOf = (e: OppositeEntry): OppositeRound => ({ entry: e, title: byKey.get(refKey(e.ref.type, e.ref.title, e.ref.year))! })
const find = (lang: string, title: string) => OPPOSITES.find((e) => e.lang === lang && e.title === title)

describe('opposites data', () => {
  it('has about 120 entries', () => {
    expect(OPPOSITES.length).toBeGreaterThanOrEqual(100)
  })

  it('every entry resolves to a CSV row', () => {
    const missing = OPPOSITES.filter((e) => !byKey.has(refKey(e.ref.type, e.ref.title, e.ref.year))).map(label)
    expect(missing).toEqual([])
  })

  it('every resolved title has a poster', () => {
    const rounds = buildRounds(OPPOSITES, all, 'both', 'both')
    expect(rounds.length).toBe(OPPOSITES.length)
    expect(rounds.every((r) => !!r.title.posterUrl)).toBe(true)
  })

  it('the opposite differs from the title and never scores as a guess', () => {
    for (const e of OPPOSITES) {
      expect(normalize(e.opposite), label(e)).not.toBe(normalize(e.title))
      expect(isOppositeGuess(e.opposite, roundOf(e)), label(e)).toBe(false)
    }
  })

  it('has no duplicates', () => {
    const a = OPPOSITES.map((e) => `${e.lang}|${normalize(e.title)}`)
    expect(a.filter((k, i) => a.indexOf(k) !== i)).toEqual([])
    const b = OPPOSITES.map((e) => `${e.lang}|${refKey(e.ref.type, e.ref.title, e.ref.year)}`)
    expect(b.filter((k, i) => b.indexOf(k) !== i)).toEqual([])
  })

  it.each([
    ['movie', 'fr'], ['movie', 'other'], ['movie', 'both'],
    ['tv', 'fr'], ['tv', 'other'], ['tv', 'both'],
    ['both', 'fr'], ['both', 'other'], ['both', 'both'],
  ] as const)('filter content=%s lang=%s is playable', (content, lang) => {
    const rounds = buildRounds(OPPOSITES, all, content, lang)
    expect(rounds.length).toBeGreaterThanOrEqual(10)
    for (const r of rounds) {
      if (lang !== 'both') expect(r.entry.lang).toBe(lang)
      if (content !== 'both') expect(r.title.type).toBe(content)
    }
  })
})

describe('isOppositeGuess', () => {
  it('accepts the entry title', () => {
    for (const e of OPPOSITES) expect(isOppositeGuess(e.title, roundOf(e)), label(e)).toBe(true)
  })

  it('is case and accent insensitive', () => {
    const e = find('fr', 'Le Roi Lion')!
    expect(e, 'entry "Le Roi Lion" (fr) must exist').toBeTruthy()
    expect(isOppositeGuess('le roi lion', roundOf(e))).toBe(true)
    const d = find('fr', 'Le dîner de cons')!
    expect(d, 'entry "Le dîner de cons" (fr) must exist').toBeTruthy()
    expect(isOppositeGuess('LE DINER DE CONS', roundOf(d))).toBe(true)
  })

  it('tolerates a typo on a long title', () => {
    const e = find('fr', 'Retour vers le futur')!
    expect(e, 'entry "Retour vers le futur" (fr) must exist').toBeTruthy()
    expect(isOppositeGuess('Retour vers le futr', roundOf(e))).toBe(true)
  })

  it('accepts the CSV title for a French entry', () => {
    const e = find('fr', 'Le Roi Lion')!
    expect(e).toBeTruthy()
    expect(isOppositeGuess('The Lion King', roundOf(e))).toBe(true)
  })

  it('accepts aliases', () => {
    const e = OPPOSITES.find((x) => x.aliases?.length)
    if (!e) return
    for (const a of e.aliases!) expect(isOppositeGuess(a, roundOf(e))).toBe(true)
    const fake: OppositeEntry = { ...OPPOSITES[0], aliases: ['Totally Other Name'] }
    expect(isOppositeGuess('Totally Other Name', roundOf(fake))).toBe(true)
  })

  it('rejects a wrong or empty guess', () => {
    const r = roundOf(OPPOSITES[0])
    expect(isOppositeGuess('Toy Story', r)).toBe(false)
    expect(isOppositeGuess('', r)).toBe(false)
    expect(isOppositeGuess('   ', r)).toBe(false)
  })
})

describe('buildRounds', () => {
  it('skips unresolved refs without throwing', () => {
    const fake: OppositeEntry = { title: 'Nope', opposite: 'Yep', lang: 'other', ref: { type: 'movie', title: 'Nope', year: 1900 } }
    const rounds = buildRounds([...OPPOSITES.slice(0, 3), fake], all, 'both', 'both')
    expect(rounds.length).toBe(3)
  })
  it('returns [] when there are no titles', () => {
    expect(buildRounds(OPPOSITES, [], 'both', 'both')).toEqual([])
  })
})

describe('refKey', () => {
  it('separates type and year', () => {
    expect(refKey('movie', 'The Office', 2001)).not.toBe(refKey('tv', 'The Office', 2001))
    expect(refKey('tv', 'The Office', 2001)).not.toBe(refKey('tv', 'The Office', 2005))
  })
  it('is case and accent insensitive', () => {
    expect(refKey('movie', 'Le dîner de cons', 1998)).toBe(refKey('movie', 'le diner de cons', 1998))
  })
})

describe('makeQueue', () => {
  const mk = (title: string, ref: string, lang: 'fr' | 'other' = 'other'): OppositeRound => ({
    entry: { title, opposite: 'x' + title, lang, ref: { type: 'movie', title: ref, year: 2000 } },
    title: { id: ref, type: 'movie', title: ref, year: 2000 } as Title,
  })
  const rounds = [mk('Le Roi Lion', 'The Lion King', 'fr'), mk('The Lion King', 'The Lion King'), mk('A', 'A'), mk('B', 'B')]
  const identity = <T,>(a: T[]) => [...a]

  it('never keeps two rounds with the same ref', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeQueue(rounds)
      expect(q.length).toBe(3)
      const keys = q.map((r) => refKey(r.entry.ref.type, r.entry.ref.title, r.entry.ref.year))
      expect(new Set(keys).size).toBe(3)
    }
  })
  it('keeps the first occurrence with an identity shuffle', () => {
    const q = makeQueue(rounds, identity)
    expect(q.map((r) => r.entry.title)).toEqual(['Le Roi Lion', 'A', 'B'])
  })
  it('does not mutate its input', () => {
    const copy = [...rounds]
    makeQueue(rounds)
    expect(rounds).toEqual(copy)
  })
})
