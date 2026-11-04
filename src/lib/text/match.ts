import { normalize } from './normalize'

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[b.length]
}

/** Typos tolerated for a normalized title of the given length. */
export function allowedTypos(length: number): number {
  if (length >= 15) return 2
  if (length >= 8) return 1
  return 0
}

export function isCorrectGuess(guess: string, title: string): boolean {
  const g = normalize(guess)
  const t = normalize(title)
  if (!g || !t) return false
  return levenshtein(g, t) <= allowedTypos(t.length)
}
