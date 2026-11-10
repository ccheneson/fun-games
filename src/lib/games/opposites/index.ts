import { shuffle } from '../../db/seed'
import type { Title, TitleType } from '../../providers/types'
import type { Content, LangFilter } from '../../settings.svelte'
import { isCorrectGuess } from '../../text/match'
import { normalize } from '../../text/normalize'
import type { OppositeEntry } from './data'

export type { LangFilter }

export interface OppositeRound {
  entry: OppositeEntry
  /** Resolved CSV title: posterUrl, year, stars, type. */
  title: Title
}

/** Key for matching an entry ref with a stored Title: type|normalize(title)|year. */
export function refKey(type: TitleType, title: string, year: number | undefined): string {
  return `${type}|${normalize(title)}|${year ?? ''}`
}

/**
 * Entries that pass the filters and whose ref exists in `titles`; unresolved entries are dropped
 * (graceful: a CSV change can never crash the game).
 */
export function buildRounds(entries: OppositeEntry[], titles: Title[], content: Content, lang: LangFilter): OppositeRound[] {
  const byKey = new Map(titles.map((t) => [refKey(t.type, t.title, t.year), t]))
  const rounds: OppositeRound[] = []
  for (const entry of entries) {
    if (lang !== 'both' && entry.lang !== lang) continue
    const title = byKey.get(refKey(entry.ref.type, entry.ref.title, entry.ref.year))
    if (!title || (content !== 'both' && title.type !== content)) continue
    rounds.push({ entry, title })
  }
  return rounds
}

/** Shuffle, then drop later rounds with an already-seen ref (only matters for lang 'both'). */
export function makeQueue(rounds: OppositeRound[], shuffleFn: <T>(items: T[]) => T[] = shuffle): OppositeRound[] {
  const seen = new Set<string>()
  return shuffleFn(rounds).filter(({ entry: { ref } }) => {
    const key = refKey(ref.type, ref.title, ref.year)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** True if the guess matches entry.title, any alias, or the CSV title (isCorrectGuess, typo-tolerant). */
export function isOppositeGuess(guess: string, round: OppositeRound): boolean {
  const answers = [round.entry.title, ...(round.entry.aliases ?? []), round.title.title]
  return answers.some((a) => isCorrectGuess(guess, a))
}
