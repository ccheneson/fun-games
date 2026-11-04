# fun-games

A small backend-less SPA (Svelte 5 + Vite + TypeScript) with a menu of games.

## Games
- **Guess the poster**: the poster of a movie or TV show is revealed line by line, from blurry to
  clear; the sooner you guess, the more points. 1 or 2 players; choose movies, TV shows or both.
- **Guess the title**: a French movie title is shown with its vowels replaced by `_`
  (accented vowels count as their base vowel). Type your guess before the timer
  (default 10 s, configurable in Settings) hits 0. Then the full title and poster are shown.

## Data
No API key. On first load the app fetches ~80 French movie titles from **Wikidata** and
their posters (250 px thumbnails) from **Wikimedia Commons**, and stores them in
**IndexedDB** (`fun-games` database). Later runs work offline.
Settings → **Fetch new titles** replaces the set with a different one (the old set is
kept if the fetch fails).

## Scripts
```
npm install
npm run dev      # dev server
npm test         # unit tests (Vitest)
npm run check    # svelte-check + tsc
npm run build    # static build in dist/
```

## Adding a game
Create `src/routes/MyGame.svelte` and add an entry in `src/lib/games/registry.ts`.
