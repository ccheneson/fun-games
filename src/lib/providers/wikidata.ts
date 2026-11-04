import { normalize } from '../text/normalize'
import type { Candidate, TitleProvider } from './types'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const POSTER_WIDTH = 250
const MAX_TITLE_LENGTH = 40

// Films with a French label, a poster (P3383) and a decent notoriety (sitelinks).
const QUERY = `
SELECT ?film ?label ?poster WHERE {
  ?film wdt:P31 wd:Q11424; wdt:P3383 ?poster; rdfs:label ?label .
  FILTER(LANG(?label) = "fr")
  ?film wikibase:sitelinks ?sl . FILTER(?sl > 20)
}
LIMIT 2000`

const LATIN_TITLE = /^[\p{Script=Latin}\p{N}\s'’.,:;!?&()\-–]+$/u
const IMAGE_FILE = /\.(jpe?g|png|webp)$/i

interface Binding {
  film: { value: string }
  label: { value: string }
  poster: { value: string }
}

export function toCandidates(bindings: Binding[]): Candidate[] {
  const seenIds = new Set<string>()
  const seenTitles = new Set<string>()
  const out: Candidate[] = []
  for (const b of bindings) {
    const id = b.film.value.split('/').pop()!
    const title = b.label.value.trim()
    const file = decodeURIComponent(b.poster.value.split('/').pop() ?? '')
    if (seenIds.has(id)) continue
    if (title.length < 2 || title.length > MAX_TITLE_LENGTH) continue
    if (!LATIN_TITLE.test(title) || !IMAGE_FILE.test(file)) continue
    const key = normalize(title)
    if (!key || seenTitles.has(key)) continue
    seenIds.add(id)
    seenTitles.add(key)
    out.push({
      id,
      type: 'movie',
      title,
      posterUrl: `${b.poster.value.replace(/^http:/, 'https:')}?width=${POSTER_WIDTH}`,
    })
  }
  return out
}

export const wikidataProvider: TitleProvider = {
  async fetchCandidates() {
    const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(QUERY)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`Wikidata answered ${res.status}`)
    const json = await res.json()
    return toCandidates(json.results.bindings as Binding[])
  },

  async fetchPoster(candidate) {
    const res = await fetch(candidate.posterUrl, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`Poster ${candidate.id}: HTTP ${res.status}`)
    const blob = await res.blob()
    if (!blob.type.startsWith('image/') || blob.size === 0) {
      throw new Error(`Poster ${candidate.id}: not an image`)
    }
    return blob
  },
}
