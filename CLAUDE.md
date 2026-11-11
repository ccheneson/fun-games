# fun-games

Backend-less SPA (Svelte 5 + Vite + TypeScript, tests with Vitest) with a menu of games, deployed to
GitHub Pages from `main` (`.github/workflows/deploy.yml`). See `README.md` for the user-facing overview.

## Commands
```
npm run dev      # dev server
npm test         # unit tests (Vitest), in tests/
npm run check    # svelte-check + tsc (the lint step)
npm run build    # static build in dist/
```

## Layout
- `src/routes/`: one screen per game (`GuessTitle`, `GuessMovie`, `CountryGame`, `GuessOpposite`, `FindPoster`), plus `Menu` and `Settings`.
- `src/lib/games/registry.ts`: the menu. A new game = a route component + an entry here (+ a timer in `settings.svelte.ts` if it has its own).
- `src/lib/games/`: pure, unit-tested game logic (`points.ts` shared scoring, `places.ts`, `mosaic.ts`, `opposites/`, `findposter.ts`, `labels.ts`).
- `src/lib/countries/`: one folder per country of the map game (`map.ts` generated, `content.ts`, `meta.ts`, `index.ts`) + `registry.ts`.
- `src/lib/db/`, `src/lib/sources/`, `src/lib/providers/`: title data (IndexedDB, Wikidata/Wikimedia, bundled IMDb / TV CSVs in `src/library/`).
- `src/lib/timer.ts`: deadline-based countdown shared by the timed games. `src/lib/settings.svelte.ts`: settings stored in `localStorage`.
- `plan/` is gitignored (working plans of the feature flow); never commit it.

## Conventions
- Pure logic goes in `src/lib/` with tests in `tests/`; components stay thin.
- Scoring is shared: points drop from 100 to 10 in 10 bands over the round (`pointsLeft` in `points.ts`).
- UI text is written inline in English (the map games have their own legend translations in `src/lib/countries/strings.ts`).
- New dependencies go in `package.json` (avoid them when possible: the app is small and static).

## The games
- **Guess the title** (`GuessTitle.svelte`): a French movie title is shown with its vowels replaced by `_`
   (accented vowels count as their base vowel). Type the title before the timer (default 10 s, Settings) hits 0;
   then the full title and the poster are shown. Text helpers in `src/lib/text/`.
- **Guess the poster** (`GuessMovie.svelte`): the poster of a movie or TV show is revealed from blurry or
   pixelated to clear and the sooner you guess, the more points. Each round picks one of three transitions at
   random: line by line from the top, from the bottom (both with a blur), or **mosaic** (big square tiles that
   shrink slowly, `mosaic.ts`). 1 or 2 players; movies, TV shows or both.
- **Country map game** (`CountryGame.svelte`, one menu entry per country, e.g. France, Tahiti): drag the names
   of 5 cities, monuments, culinary specialties or rivers onto their place on the map; each placement shows a fun
   fact. A country is only data (`src/lib/countries/<id>/`); add one with the `country-map-game` skill
   (`.claude/skills/country-map-game/`). Logic in `src/lib/games/places.ts` (`ROUND_SIZE` = 5, distance check, scoring).
- **Opposite title** (`GuessOpposite.svelte`): the main words of a movie or TV-show title are turned into their
   opposites ("Le Roi Lion" -> "Le Valet Agneau"); type the real title. Points drop from 100 to 10 over the timer
   (default 10 s); the poster is shown at the end. 1 or 2 players; movies, TV shows or both; French titles,
   non-French or both. Opposites are hand-curated in `src/lib/games/opposites/data.ts`.
- **Find the poster** (`FindPoster.svelte`, logic in `findposter.ts`): a square wall of 70 posters (10 x 7) and
   one title; pick its poster. As the timer runs down (default 20 s) the view zooms towards the answer (6 posters
   wide at 40 points, 3 whole columns wide at the end, the answer in a random one of them and a bit higher or lower
   (`finalWindow`); on timeout the view then glides to centre on it); points drop from 100 to 10. One pick per round
   (with 2 players a wrong pick locks that player out). Touch: first tap selects and previews, second tap or
   "This one!" confirms; desktop: a click; arrow keys + Enter work. A pick jumps straight to the answer, which is
   highlighted (others dimmed). The wall is drawn into a canvas (not 70 scaled `<img>`s) so posters do not jitter
   in Firefox; the tile buttons on top are transparent hit/focus targets.
