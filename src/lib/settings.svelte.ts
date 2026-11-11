import { INTERNET_ENABLED } from './config'

const KEY = 'fun-games:settings'
const DEFAULT_TIMER = 10
/** "Find the poster": scanning 70 posters needs more time than the other games. */
const DEFAULT_FIND_TIMER = 20
export const MIN_TIMER = 3
export const MAX_TIMER = 60

export type SourceId = 'internet' | 'imdb'
export type Content = 'movie' | 'tv' | 'both'
/** Language of the titles in "Opposite title": French titles, non-French titles or both. */
export type LangFilter = 'fr' | 'other' | 'both'

function clampTimer(n: number, fallback = DEFAULT_TIMER): number {
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_TIMER, Math.max(MIN_TIMER, Math.round(n)))
}

interface Stored {
  timerSeconds: number
  movieTimerSeconds: number
  oppositeTimerSeconds: number
  findTimerSeconds: number
  source: SourceId
  content: Content
  titleLang: LangFilter
}

function load(): Stored {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    // Stored data is untrusted: anything that isn't a plain object is ignored.
    const raw: Record<string, unknown> =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    return {
      timerSeconds: clampTimer(Number(raw.timerSeconds ?? DEFAULT_TIMER)),
      movieTimerSeconds: clampTimer(Number(raw.movieTimerSeconds ?? DEFAULT_TIMER)),
      oppositeTimerSeconds: clampTimer(Number(raw.oppositeTimerSeconds ?? DEFAULT_TIMER)),
      findTimerSeconds: clampTimer(Number(raw.findTimerSeconds ?? DEFAULT_FIND_TIMER), DEFAULT_FIND_TIMER),
      source: INTERNET_ENABLED && raw.source === 'internet' ? 'internet' : 'imdb',
      content: raw.content === 'movie' || raw.content === 'tv' ? raw.content : 'both',
      titleLang: raw.titleLang === 'fr' || raw.titleLang === 'other' ? raw.titleLang : 'both',
    }
  } catch {
    return {
      timerSeconds: DEFAULT_TIMER,
      movieTimerSeconds: DEFAULT_TIMER,
      oppositeTimerSeconds: DEFAULT_TIMER,
      findTimerSeconds: DEFAULT_FIND_TIMER,
      source: 'imdb',
      content: 'both',
      titleLang: 'both',
    }
  }
}

class Settings {
  private initial = load()
  timerSeconds = $state(this.initial.timerSeconds)
  /** Time to fully reveal the poster in "Guess the poster". */
  movieTimerSeconds = $state(this.initial.movieTimerSeconds)
  /** Time per title in "Opposite title". */
  oppositeTimerSeconds = $state(this.initial.oppositeTimerSeconds)
  /** Time per round in "Find the poster". */
  findTimerSeconds = $state(this.initial.findTimerSeconds)
  source = $state<SourceId>(this.initial.source)
  /** What to guess: movies, TV shows or both (IMDb source). */
  content = $state<Content>(this.initial.content)
  /** Which titles in "Opposite title": French, non-French or both. */
  titleLang = $state<LangFilter>(this.initial.titleLang)

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
          timerSeconds: this.timerSeconds,
          movieTimerSeconds: this.movieTimerSeconds,
          oppositeTimerSeconds: this.oppositeTimerSeconds,
          findTimerSeconds: this.findTimerSeconds,
          source: this.source,
          content: this.content,
          titleLang: this.titleLang,
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

  setOppositeTimer(value: number) {
    this.oppositeTimerSeconds = clampTimer(value)
    this.save()
  }

  setFindTimer(value: number) {
    this.findTimerSeconds = clampTimer(value, DEFAULT_FIND_TIMER)
    this.save()
  }

  setTitleLang(value: LangFilter) {
    this.titleLang = value === 'fr' || value === 'other' ? value : 'both'
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
