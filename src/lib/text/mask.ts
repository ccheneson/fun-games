import { foldChar } from './normalize'

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

/** Accented vowels count as their base vowel; `y` is a consonant. */
export function isVowel(ch: string): boolean {
  const base = foldChar(ch)
  return base === 'oe' || base === 'ae' || (base.length === 1 && VOWELS.has(base))
}

export function maskVowels(title: string): string {
  let out = ''
  for (const ch of title) out += isVowel(ch) ? '_' : ch
  return out
}
