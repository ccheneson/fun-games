const LIGATURES: Record<string, string> = { œ: 'oe', æ: 'ae', ß: 'ss' }
const ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'the', 'a', 'an'])

/** Lowercase a single character and strip its diacritics (é -> e, œ -> oe). */
export function foldChar(ch: string): string {
  const lower = ch.toLowerCase()
  if (lower in LIGATURES) return LIGATURES[lower]
  return lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function fold(text: string): string {
  let out = ''
  for (const ch of text) out += foldChar(ch)
  return out
}

/** Canonical form used to compare a guess with a title. */
export function normalize(text: string): string {
  const words = fold(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  if (words.length > 1 && ARTICLES.has(words[0])) words.shift()
  return words.join(' ')
}
