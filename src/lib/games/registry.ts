import type { Component } from 'svelte'
import { COUNTRIES } from '../countries/registry'

export interface GameDef {
  id: string
  name: string
  description: string
  emoji: string
  route: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: () => Promise<{ default: Component<any> }>
  /** Properties passed to the loaded component (e.g. the country of a map game). */
  props?: () => Promise<Record<string, unknown>>
}

export const games: GameDef[] = [
  {
    id: 'guess-title',
    name: 'Guess the title',
    description: 'Vowels are hidden. Find the movie or TV show before time runs out.',
    emoji: '🎬',
    route: '/guess-title',
    load: () => import('../../routes/GuessTitle.svelte'),
  },
  {
    id: 'guess-movie',
    name: 'Guess the poster',
    description: 'The poster appears line by line or as a mosaic, from blurry or pixelated to clear. The sooner you guess the movie or show, the more points.',
    emoji: '🖼️',
    route: '/guess-movie',
    load: () => import('../../routes/GuessMovie.svelte'),
  },
  // One map game per country (see scripts/country and .claude/skills/country-map-game).
  ...COUNTRIES.map(
    ({ meta, load }): GameDef => ({
      id: 'map-' + meta.id,
      name: meta.name,
      description: meta.description,
      emoji: meta.emoji,
      route: '/map/' + meta.id,
      load: () => import('../../routes/CountryGame.svelte'),
      props: async () => ({ country: (await load()).default }),
    }),
  ),
]
