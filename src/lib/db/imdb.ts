import csvUrl from '../../library/imdb_top_1000.csv?url'
import tvCsvUrl from '../../library/tv_top_1000.csv?url'
import type { Title, TitleType } from '../providers/types'
import { parseCsvObjects } from '../text/csv'
import { countImdbTitles, getMeta, replaceImdbTitles, setMeta } from './db'

/** Bump when the way titles are derived from the CSV changes: forces a reload. */
export const IMDB_SEED_VERSION = 5

/** Only films released this year or later are kept. */
export const MIN_YEAR = 1985
/** Same for TV shows (first air date). */
export const MIN_TV_YEAR = 1990

/** CSV thumbnails are 67x98; asking for 300px wide gives a sharp ~30 KB poster. */
export function bigPoster(url: string): string {
  return url.replace(/(\._V1_)[^/]*\.jpg$/, '$1UX300.jpg')
}

export function rowsToTitles(rows: Record<string, string>[], type: TitleType = 'movie'): Title[] {
  const minYear = type === 'tv' ? MIN_TV_YEAR : MIN_YEAR
  const prefix = type === 'tv' ? 'tv:' : 'imdb:'
  const titles: Title[] = []
  rows.forEach((r, i) => {
    const title = r.Series_Title?.replace(/\s+/g, ' ').trim()
    const rawPoster = r.Poster_Link?.trim()
    const posterUrl = rawPoster && bigPoster(rawPoster)
    if (!title || !posterUrl) return
    const year = Number.parseInt(r.Released_Year, 10)
    if (!Number.isFinite(year) || year < minYear) return
    const rating = Number.parseFloat(r.IMDB_Rating)
    titles.push({
      id: prefix + i,
      type,
      title,
      posterUrl,
      year,
      genre: r.Genre || undefined,
      rating: Number.isFinite(rating) ? rating : undefined,
      director: r.Director || undefined,
      stars: [r.Star1, r.Star2, r.Star3, r.Star4].map((x) => x?.trim()).filter(Boolean),
      overview: r.Overview || undefined,
    })
  })
  return titles
}

/** First run: load src/library/imdb_top_1000.csv into IndexedDB (no-op once filled). */
export async function ensureImdbSeeded(
  load: () => Promise<string> = defaultLoad,
  loadTv: () => Promise<string> = defaultLoadTv,
): Promise<number> {
  const existing = await countImdbTitles()
  if (existing > 0 && (await getMeta<number>('imdbVersion')) === IMDB_SEED_VERSION) return existing
  const titles = [
    ...rowsToTitles(parseCsvObjects(await load()), 'movie'),
    ...rowsToTitles(parseCsvObjects(await loadTv()), 'tv'),
  ]
  if (titles.length === 0) throw new Error('No titles found in the IMDb file')
  await replaceImdbTitles(titles)
  await setMeta('imdbVersion', IMDB_SEED_VERSION)
  return titles.length
}

async function defaultLoadTv() {
  const res = await fetch(tvCsvUrl)
  if (!res.ok) throw new Error('Could not load the TV shows file')
  return res.text()
}

async function defaultLoad() {
  const res = await fetch(csvUrl)
  if (!res.ok) throw new Error('Could not load the IMDb file')
  return res.text()
}
