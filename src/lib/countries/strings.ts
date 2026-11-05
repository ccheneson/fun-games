import type { CountryData, Strings } from './types'

/** Replaces `{key}` placeholders. */
export function fmt(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}

const FR: Strings = {
  title: '{country} : {kinds}',
  lead: 'Glisse chaque nom sur sa cible.',
  scoreLine: 'Manche {round} · Score : {score}',
  hint: '+1 si c\'est juste, −1 sinon, et une anecdote à la clé. Tu peux aussi toucher un nom, puis sa cible.',
  originLabel: 'Spécialité de {place}',
  siteOriginLabel: 'Monument · {place}',
  nextRound: 'Suivant',
  mapLabel: 'Carte : {country}, {n} cibles à placer ({kinds})',
  namesLabel: 'Noms à placer',
  kindLabels: { city: 'Ville', site: 'Monument', river: "Cours d'eau", food: 'Spécialité' },
  kindNames: { city: 'villes', site: 'monuments', river: 'rivières', food: 'spécialités' },
  legend: { city: '● ville', site: '◆ monument', river: '▬ rivière', food: '■ spécialité' },
  listAnd: 'et',
  aboutTitle: 'À propos des données',
  aboutText:
    "La carte, les cours d'eau et les emplacements des villes, des monuments et des spécialités sont simplifiés et approximatifs : ils servent à jouer, pas à se repérer ni à naviguer. Le tracé des rivières est généralisé, les distances et les frontières ne sont pas exactes, et un repère peut se trouver à quelques kilomètres du lieu réel. Les anecdotes, chiffres (hauteurs, longueurs, dates) et noms ont été rédigés de bonne foi mais sans vérification systématique : ils peuvent contenir des erreurs ou des simplifications. Si vous en repérez une, merci de la signaler.",
  aboutSource: "Fond de carte et cours d'eau : {link} (domaine public), simplifiés.",
}

const EN: Strings = {
  title: '{country}: {kinds}',
  lead: 'Drag each name onto its target.',
  scoreLine: 'Round {round} · Score: {score}',
  hint: '+1 if right, −1 if wrong, plus a fun fact. You can also tap a name, then its target.',
  originLabel: 'Specialty of {place}',
  siteOriginLabel: 'Landmark · {place}',
  nextRound: 'Next',
  mapLabel: 'Map: {country}, {n} targets to place ({kinds})',
  namesLabel: 'Names to place',
  kindLabels: { city: 'City', site: 'Landmark', river: 'River', food: 'Specialty' },
  kindNames: { city: 'cities', site: 'landmarks', river: 'rivers', food: 'specialties' },
  legend: { city: '● city', site: '◆ landmark', river: '▬ river', food: '■ specialty' },
  listAnd: 'and',
  aboutTitle: 'About the data',
  aboutText:
    'The map, the rivers and the locations of cities, landmarks and food specialties are simplified and approximate: they are meant for playing, not for finding your way or navigating. River courses are generalised, distances and borders are not exact, and a marker can be a few kilometres away from the real place. The fun facts, figures (heights, lengths, dates) and names were written in good faith but not systematically verified: they may contain errors or simplifications. If you spot one, please report it.',
  aboutSource: 'Base map and rivers: {link} (public domain), simplified.',
}

export const BUILT_IN_LANGUAGES = ['fr', 'en'] as const
export type BuiltInLanguage = (typeof BUILT_IN_LANGUAGES)[number]

/** Ready-made texts for French and English; for any other language, write a full `Strings` object. */
export function makeStrings(lang: BuiltInLanguage, country: string): Strings {
  const base = lang === 'fr' ? FR : EN
  return { ...base, title: fmt(base.title, { country }), mapLabel: fmt(base.mapLabel, { country }) }
}

export type Kind = 'city' | 'site' | 'river' | 'food'

/** The kinds of places a country actually has (cities always), in display order. */
export function kindsOf(country: CountryData): Kind[] {
  const kinds: Kind[] = ['city']
  if (country.sites.length) kinds.push('site')
  if (country.map.rivers.some((r) => country.rivers[r.id])) kinds.push('river')
  if ((country.foods ?? []).length) kinds.push('food')
  return kinds
}

/** "villes, monuments et spécialités" (names) or "● ville · ◆ monument" (legend): the phrase of each kind, joined. */
export function listKinds(t: Strings, kinds: Kind[], field: 'kindNames' | 'legend'): string {
  const items = kinds.map((k) => t[field][k])
  if (field === 'legend') return items.join(' · ')
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${t.listAnd} ${items[items.length - 1]}`
}
