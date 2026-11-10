<script lang="ts">
  import Progress from '../components/Progress.svelte'
  import { MAX_TIMER, MIN_TIMER, settings, type Content, type LangFilter } from '../lib/settings.svelte'
  import { INTERNET_ENABLED } from '../lib/config'
  import { dataStore } from '../lib/store.svelte'
  import { theme } from '../lib/theme.svelte'
  import type { ThemePref } from '../lib/theme'

  const contents: { id: Content; label: string }[] = [
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV shows' },
    { id: 'both', label: 'Both' },
  ]

  const langs: { id: LangFilter; label: string }[] = [
    { id: 'fr', label: 'French' },
    { id: 'other', label: 'Non-French' },
    { id: 'both', label: 'Both' },
  ]

  const themes: { id: ThemePref; label: string }[] = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ]
</script>

<h1>Settings</h1>

<section>
  <span class="label" id="content-label">What to guess</span>
  <div class="choices" role="radiogroup" aria-labelledby="content-label">
    {#each contents as c (c.id)}
      <label class="choice">
        <input type="radio" name="content" value={c.id} checked={settings.content === c.id} onchange={() => settings.setContent(c.id)} />
        {c.label}
      </label>
    {/each}
  </div>
  <small>Applies to every movie game, from the next round.</small>
</section>

<section>
  <label for="timer">Guess the title: timer per title (seconds)</label>
  <input
    id="timer"
    type="number"
    min={MIN_TIMER}
    max={MAX_TIMER}
    value={settings.timerSeconds}
    onchange={(e) => settings.setTimer(e.currentTarget.valueAsNumber)}
  />
  <small>Between {MIN_TIMER} and {MAX_TIMER}. Applies from the next round.</small>
</section>

<section>
  <label for="movie-timer">Guess the poster: time to reveal the poster (seconds)</label>
  <input
    id="movie-timer"
    type="number"
    min={MIN_TIMER}
    max={MAX_TIMER}
    value={settings.movieTimerSeconds}
    onchange={(e) => settings.setMovieTimer(e.currentTarget.valueAsNumber)}
  />
  <small>Between {MIN_TIMER} and {MAX_TIMER}. Applies from the next round.</small>
</section>

<section>
  <label for="opposite-timer">Opposite title: timer per title (seconds)</label>
  <input
    id="opposite-timer"
    type="number"
    min={MIN_TIMER}
    max={MAX_TIMER}
    value={settings.oppositeTimerSeconds}
    onchange={(e) => settings.setOppositeTimer(e.currentTarget.valueAsNumber)}
  />
  <small>Between {MIN_TIMER} and {MAX_TIMER}. Applies from the next round.</small>
</section>

<section>
  <span class="label" id="lang-label">Titles (Opposite title)</span>
  <div class="choices" role="radiogroup" aria-labelledby="lang-label">
    {#each langs as l (l.id)}
      <label class="choice">
        <input type="radio" name="title-lang" value={l.id} checked={settings.titleLang === l.id} onchange={() => settings.setTitleLang(l.id)} />
        {l.label}
      </label>
    {/each}
  </div>
  <small>Language of the title to find. Applies from the next round.</small>
</section>

<section>
  <span class="label" id="theme-label">Theme</span>
  <div class="choices" role="radiogroup" aria-labelledby="theme-label">
    {#each themes as t (t.id)}
      <label class="choice">
        <input type="radio" name="theme" value={t.id} checked={theme.pref === t.id} onchange={() => theme.set(t.id)} />
        {t.label}
      </label>
    {/each}
  </div>
  <small>System follows your device setting.</small>
</section>

{#if INTERNET_ENABLED}
<section>
  <h2>Internet titles</h2>
  <button onclick={() => dataStore.refresh()} disabled={dataStore.busy !== null}>
    {dataStore.busy === 'refreshing' ? 'Fetching…' : 'Fetch new titles'}
  </button>
  {#if dataStore.busy}
    <Progress progress={dataStore.progress} />
  {/if}
  {#if dataStore.error}
    <p class="error" role="alert">
      {dataStore.error}.{dataStore.count > 0 ? ' Your current titles were kept.' : ''}
    </p>
  {/if}
</section>
{/if}

<style>
  section { margin-block: 1.5rem; display: grid; gap: 0.6rem; justify-items: start; }
  input[type='number'] { width: 6rem; }
  .label { font-weight: 600; }
  .choices { display: flex; gap: 1rem; flex-wrap: wrap; }
  .choice { display: flex; align-items: center; gap: 0.4rem; }
  small { color: var(--muted); }
  .error { color: var(--danger); }
</style>
