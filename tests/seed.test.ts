import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { countTitles, getTitles } from '../src/lib/db/db'
import { ensureSeeded, refreshTitles } from '../src/lib/db/seed'
import type { Candidate, TitleProvider } from '../src/lib/providers/types'

const candidates: Candidate[] = Array.from({ length: 200 }, (_, i) => ({
  id: 'Q' + i,
  type: 'movie',
  title: 'Film ' + i,
  posterUrl: 'https://example.test/' + i,
}))

function provider(opts: { failPosters?: boolean } = {}): TitleProvider {
  return {
    fetchCandidates: async () => candidates,
    fetchPoster: async () => {
      if (opts.failPosters) throw new Error('offline')
      return new Blob(['x'], { type: 'image/jpeg' })
    },
  }
}

beforeEach(async () => {
  const { getDb } = await import('../src/lib/db/db')
  const db = await getDb()
  await Promise.all([db.clear('titles'), db.clear('posters'), db.clear('meta')])
})

describe('seeding', () => {
  it('stores ~80 titles on first run and does nothing on the second', async () => {
    expect(await ensureSeeded(() => {}, provider())).toBe(80)
    expect(await countTitles()).toBe(80)
    const before = (await getTitles()).map((t) => t.id).sort()
    await ensureSeeded(() => {}, provider({ failPosters: true })) // would throw if it fetched
    expect((await getTitles()).map((t) => t.id).sort()).toEqual(before)
  })

  it('refresh swaps to a mostly different set without duplicates', async () => {
    await ensureSeeded(() => {}, provider())
    const old = new Set((await getTitles()).map((t) => t.id))
    await refreshTitles(() => {}, provider())
    const fresh = await getTitles()
    expect(fresh).toHaveLength(80)
    expect(new Set(fresh.map((t) => t.id)).size).toBe(80)
    expect(fresh.filter((t) => old.has(t.id))).toHaveLength(0) // 120 unused candidates available
  })

  it('keeps the old set when the refresh fails', async () => {
    await ensureSeeded(() => {}, provider())
    const before = (await getTitles()).map((t) => t.id).sort()
    await expect(refreshTitles(() => {}, provider({ failPosters: true }))).rejects.toThrow()
    expect((await getTitles()).map((t) => t.id).sort()).toEqual(before)
  })
})
