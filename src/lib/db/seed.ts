import { wikidataProvider } from '../providers/wikidata'
import type { Candidate, TitleProvider } from '../providers/types'
import { countTitles, getMeta, getTitles, replaceAll, setMeta } from './db'

export const TARGET = 80
export const MIN_SET = 40
const CONCURRENCY = 6
const CANDIDATES_TTL_MS = 30 * 24 * 3600 * 1000

export interface Progress {
  label: string
  done: number
  total: number
}
export type OnProgress = (p: Progress) => void

interface CachedCandidates {
  at: number
  items: Candidate[]
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function loadCandidates(provider: TitleProvider, onProgress: OnProgress, force: boolean) {
  if (!force) {
    const cached = await getMeta<CachedCandidates>('candidates')
    if (cached && Date.now() - cached.at < CANDIDATES_TTL_MS && cached.items.length >= TARGET) {
      return cached.items
    }
  }
  onProgress({ label: 'Searching titles…', done: 0, total: 0 })
  const items = await provider.fetchCandidates()
  if (items.length < MIN_SET) throw new Error('Not enough titles found')
  await setMeta('candidates', { at: Date.now(), items } satisfies CachedCandidates)
  return items
}

/** Download posters for a random selection; nothing is written to the DB here. */
export async function buildSet(
  candidates: Candidate[],
  excludeIds: Set<string>,
  provider: TitleProvider,
  onProgress: OnProgress,
  target = TARGET,
) {
  // Fresh titles first, previously used ones only as a fallback.
  const queue = [
    ...shuffle(candidates.filter((c) => !excludeIds.has(c.id))),
    ...shuffle(candidates.filter((c) => excludeIds.has(c.id))),
  ]
  const results: { title: { id: string; type: Candidate['type']; title: string }; poster: Blob }[] = []
  let next = 0
  const worker = async () => {
    while (results.length < target && next < queue.length) {
      const c = queue[next++]
      try {
        const poster = await provider.fetchPoster(c)
        if (results.length < target) {
          results.push({ title: { id: c.id, type: c.type, title: c.title }, poster })
          onProgress({ label: 'Downloading posters…', done: results.length, total: target })
        }
      } catch {
        // skip this title, the next candidate takes its place
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (results.length < MIN_SET) {
    throw new Error(`Only ${results.length} posters could be downloaded`)
  }
  return results
}

/** First run: fetch a set only if nothing is stored yet. */
export async function ensureSeeded(
  onProgress: OnProgress = () => {},
  provider: TitleProvider = wikidataProvider,
): Promise<number> {
  if ((await countTitles()) > 0) return countTitles()
  const candidates = await loadCandidates(provider, onProgress, false)
  const set = await buildSet(candidates, new Set(), provider, onProgress)
  await replaceAll(set)
  return set.length
}

/** Replace the stored set with a different one. Old data is kept on failure. */
export async function refreshTitles(
  onProgress: OnProgress = () => {},
  provider: TitleProvider = wikidataProvider,
): Promise<number> {
  const current = new Set((await getTitles()).map((t) => t.id))
  const candidates = await loadCandidates(provider, onProgress, false)
  const set = await buildSet(candidates, current, provider, onProgress)
  await replaceAll(set)
  return set.length
}
