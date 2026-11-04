import { INTERNET_ENABLED } from './config'

const KEY = 'fun-games:settings'
const DEFAULT_TIMER = 10
export const MIN_TIMER = 3
export const MAX_TIMER = 60

export type SourceId = 'internet' | 'imdb'
export type Content = 'movie' | 'tv' | 'both'

function clampTimer(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_TIMER
  return Math.min(MAX_TIMER, Math.max(MIN_TIMER, Math.round(n)))
}

function load(): { timerSeconds: number; movieTimerSeconds: number; source: SourceId; content: Content } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    // Stored data is untrusted: anything that isn't a plain object is ignored.
    const raw: Record<string, unknown> =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    return {
      timerSeconds: clampTimer(Number(raw.timerSeconds ?? DEFAULT_TIMER)),
      movieTimerSeconds: clampTimer(Number(raw.movieTimerSeconds ?? DEFAULT_TIMER)),
      source: INTERNET_ENABLED && raw.source === 'internet' ? 'internet' : 'imdb',
      content: raw.content === 'movie' || raw.content === 'tv' ? raw.content : 'both',
    }
  } catch {
    return { timerSeconds: DEFAULT_TIMER, movieTimerSeconds: DEFAULT_TIMER, source: 'imdb', content: 'both' }
  }
}

class Settings {
  private initial = load()
  timerSeconds = $state(this.initial.timerSeconds)
  /** Time to fully reveal the poster in "Guess the poster". */
  movieTimerSeconds = $state(this.initial.movieTimerSeconds)
  source = $state<SourceId>(this.initial.source)
  /** What to guess: movies, TV shows or both (IMDb source). */
  content = $state<Content>(this.initial.content)

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
          timerSeconds: this.timerSeconds,
          movieTimerSeconds: this.movieTimerSeconds,
          source: this.source,
          content: this.content,
        }))
    } catch {
      // ignore
    }
  }

  setTimer(value: number) {
    this.timerSeconds = clampTimer(value)
    this.save()
  }

  setMovieTimer(value: number) {
    this.movieTimerSeconds = clampTimer(value)
    this.save()
  }

  setContent(value: Content) {
    this.content = value
    this.save()
  }

  setSource(value: SourceId) {
    this.source = value === 'internet' && !INTERNET_ENABLED ? 'imdb' : value
    this.save()
  }
}

export const settings = new Settings()
