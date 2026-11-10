# fun-games

A small backend-less SPA (Svelte 5 + Vite + TypeScript) with a menu of games.

## Games
- **Guess the poster**: the poster of a movie or TV show is revealed from blurry or pixelated to
  clear; the sooner you guess, the more points. Each round picks one of three transitions at random:
  line by line from the top, line by line from the bottom (both with a blur), or **mosaic** (the
  whole poster in big square tiles that shrink slowly; it is only nearly sharp in the last points
  band). 1 or 2 players; choose movies, TV shows or both.
- **Guess the title**: a French movie title is shown with its vowels replaced by `_`
  (accented vowels count as their base vowel). Type your guess before the timer
  (default 10 s, configurable in Settings) hits 0. Then the full title and poster are shown.
- **Opposite title**: a movie or TV-show title is shown with its main words turned into their
  opposite ("Le Roi Lion" → "Le Valet Agneau", "Breaking Bad" → "Fixing Good"); type the real title.
  The points bar drops from 100 to 10 over the timer (default 10 s, configurable in Settings); the
  poster is shown at the end. 1 or 2 players; movies, TV shows or both; French titles, non-French
  titles or both. The opposites are hand-curated in `src/lib/games/opposites/data.ts` (each entry
  points to a row of the IMDb / TV CSVs for its poster).

Light and dark mode: the header button (🌙 / ☀️) switches theme; Settings → **Theme** also offers
System (follows the device); Light is the default. The choice is stored in `localStorage` (`fun-games:theme`).

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
