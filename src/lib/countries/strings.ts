import type { Strings } from './types'

/** Replaces `{key}` placeholders. */
export function fmt(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}

const FR: Strings = {
  title: '{country} : villes, rivières et monuments',
  lead: "Fais glisser chaque nom sur la carte : sur son point rond (ville), son losange (monument) ou son cours d'eau en surbrillance (rivière). Tu peux aussi toucher un nom, puis sa cible.",
  scoreLine: 'Manche {round} · Score : {score}',
  hint: 'Place bien un nom pour découvrir une anecdote à son sujet. +1 pour une bonne réponse, −1 pour une mauvaise.',
  nextRound: '{n} nouvelles cibles',
  mapLabel: 'Carte : {country}, {n} cibles à placer (villes, monuments et rivières)',
  namesLabel: 'Noms à placer',
  kindLabels: { city: 'Ville', site: 'Monument', river: "Cours d'eau" },
  aboutTitle: 'À propos des données',
  aboutText:
    "La carte, les cours d'eau et les emplacements des villes et des monuments sont simplifiés et approximatifs : ils servent à jouer, pas à se repérer ni à naviguer. Le tracé des rivières est généralisé, les distances et les frontières ne sont pas exactes, et un repère peut se trouver à quelques kilomètres du lieu réel. Les anecdotes, chiffres (hauteurs, longueurs, dates) et noms ont été rédigés de bonne foi mais sans vérification systématique : ils peuvent contenir des erreurs ou des simplifications. Si vous en repérez une, merci de la signaler.",
  aboutSource: "Fond de carte et cours d'eau : {link} (domaine public), simplifiés.",
}

const EN: Strings = {
  title: '{country}: cities, rivers and landmarks',
  lead: 'Drag each name onto the map: onto its round dot (city), its diamond (landmark) or its highlighted course (river). You can also tap a name, then its target.',
  scoreLine: 'Round {round} · Score: {score}',
  hint: 'Place a name correctly to learn a fun fact about it. +1 for a right answer, −1 for a wrong one.',
  nextRound: 'Next {n} targets',
  mapLabel: 'Map: {country}, {n} targets to place (cities, landmarks and rivers)',
  namesLabel: 'Names to place',
  kindLabels: { city: 'City', site: 'Landmark', river: 'River' },
  aboutTitle: 'About the data',
  aboutText:
    'The map, the rivers and the locations of cities and landmarks are simplified and approximate: they are meant for playing, not for finding your way or navigating. River courses are generalised, distances and borders are not exact, and a marker can be a few kilometres away from the real place. The fun facts, figures (heights, lengths, dates) and names were written in good faith but not systematically verified: they may contain errors or simplifications. If you spot one, please report it.',
  aboutSource: 'Base map and rivers: {link} (public domain), simplified.',
}

export const BUILT_IN_LANGUAGES = ['fr', 'en'] as const
export type BuiltInLanguage = (typeof BUILT_IN_LANGUAGES)[number]

/** Ready-made texts for French and English; for any other language, write a full `Strings` object. */
export function makeStrings(lang: BuiltInLanguage, country: string): Strings {
  const base = lang === 'fr' ? FR : EN
  return { ...base, title: fmt(base.title, { country }), mapLabel: fmt(base.mapLabel, { country }) }
}
