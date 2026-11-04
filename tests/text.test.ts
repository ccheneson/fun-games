import { describe, expect, it } from 'vitest'
import { maskVowels } from '../src/lib/text/mask'
import { isCorrectGuess } from '../src/lib/text/match'
import { normalize } from '../src/lib/text/normalize'

describe('maskVowels', () => {
  it('masks plain and accented vowels, keeps consonants', () => {
    expect(maskVowels('Amélie Poulain')).toBe('_m_l__ P__l__n')
    expect(maskVowels('Les Misérables')).toBe('L_s M_s_r_bl_s')
    expect(maskVowels('Être et avoir')).toBe('_tr_ _t _v__r')
  })
  it('keeps digits, punctuation and treats y as consonant', () => {
    expect(maskVowels('Ocean’s 11: Yo!')).toBe('_c__n’s 11: Y_!')
  })
  it('masks ligatures once', () => {
    expect(maskVowels('Cœur')).toBe('C_ _r'.replace(' ', ''))
  })
})

describe('normalize', () => {
  it('folds accents, case, punctuation and leading article', () => {
    expect(normalize("L'Été d’Éric!")).toBe('ete d eric')
    expect(normalize('Le Fabuleux Destin')).toBe('fabuleux destin')
  })
  it('keeps a lone article-like title', () => {
    expect(normalize('Les')).toBe('les')
  })
})

describe('isCorrectGuess', () => {
  it('ignores accents, case and articles', () => {
    expect(isCorrectGuess('amelie poulain', 'Amélie Poulain')).toBe(true)
    expect(isCorrectGuess('fabuleux destin d amelie poulain', 'Le Fabuleux Destin d’Amélie Poulain')).toBe(true)
  })
  it('tolerates one typo on medium titles, two on long ones', () => {
    expect(isCorrectGuess('Gladiatr', 'Gladiator')).toBe(true)
    expect(isCorrectGuess('Gladiaxxr', 'Gladiator')).toBe(false)
    expect(isCorrectGuess('Le fabuleux destin d amelie poulan', 'Le Fabuleux Destin d’Amélie Poulain')).toBe(true)
  })
  it('requires exact match for short titles', () => {
    expect(isCorrectGuess('Alien', 'Aliens')).toBe(false)
    expect(isCorrectGuess('Taxi', 'Taxi')).toBe(true)
    expect(isCorrectGuess('Taxe', 'Taxi')).toBe(false)
  })
  it('rejects empty guesses', () => {
    expect(isCorrectGuess('   ', 'Taxi')).toBe(false)
  })
})
