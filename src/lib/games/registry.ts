import type { Component } from 'svelte'

export interface GameDef {
  id: string
  name: string
  description: string
  emoji: string
  route: string
  load: () => Promise<{ default: Component }>
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
    description: 'The poster appears line by line, from blurry to clear. The sooner you guess the movie or show, the more points.',
    emoji: '🖼️',
    route: '/guess-movie',
    load: () => import('../../routes/GuessMovie.svelte'),
  },
  {
    id: 'place-cities',
    name: 'Villes, rivières et monuments',
    description: 'Fais glisser les noms de 5 villes, rivières ou monuments de France sur leur emplacement sur la carte, et découvre une anecdote sur chacun.',
    emoji: '🗺️',
    route: '/place-cities',
    load: () => import('../../routes/PlaceCities.svelte'),
  },
]
