import { getImdbTitles, getPoster, getTitles } from '../db/db'
import type { Title } from '../providers/types'
import { settings, type SourceId } from '../settings.svelte'

export interface PosterHandle {
  url: string
  release: () => void
}

export interface TitleSource {
  id: SourceId
  getTitles(): Promise<Title[]>
  getPoster(id: string): Promise<PosterHandle | null>
}

/** Database 1: built from the internet, stored in IndexedDB (poster Blobs). */
const internet: TitleSource = {
  id: 'internet',
  getTitles,
  async getPoster(id) {
    const blob = await getPoster(id)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    return { url, release: () => URL.revokeObjectURL(url) }
  },
}

/** Database 2: IMDb top 1000 (CSV -> IndexedDB). Posters load straight from their URL. */
const imdb: TitleSource = {
  id: 'imdb',
  async getTitles() {
    const all = await getImdbTitles()
    return settings.content === 'both' ? all : all.filter((t) => t.type === settings.content)
  },
  async getPoster(id) {
    const t = (await getImdbTitles()).find((x) => x.id === id)
    return t?.posterUrl ? { url: t.posterUrl, release: () => {} } : null
  },
}

export const sources: Record<SourceId, TitleSource> = { internet, imdb }
