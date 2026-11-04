<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import ContentPicker from '../components/ContentPicker.svelte'
  import Poster from '../components/Poster.svelte'
  import Progress from '../components/Progress.svelte'
  import { shuffle } from '../lib/db/seed'
  import type { Title } from '../lib/providers/types'
  import { settings } from '../lib/settings.svelte'
  import { dataStore } from '../lib/store.svelte'
  import { sources, type PosterHandle } from '../lib/sources'
  import { isCorrectGuess } from '../lib/text/match'
  import { maskVowels } from '../lib/text/mask'
  import { startCountdown } from '../lib/timer'

  type Phase = 'idle' | 'playing' | 'found' | 'timeout'

  let current = $state<Title | null>(null)
  let phase = $state<Phase>('idle')
  let guess = $state('')
  let remaining = $state(0)
  let duration = $state(1)
  let poster: PosterHandle | null = null
  let posterUrl = $state<string | null>(null)
  let wrong = $state(false)
  let score = $state({ found: 0, played: 0 })
  let inputEl = $state<HTMLInputElement>()
  let nextEl = $state<HTMLButtonElement>()

  let queue: Title[] = []
  let seenVersion = -1
  let seenSource = settings.source
  let seenContent = settings.content
  let started = false
  /** false = start screen (what to guess); true = playing. */
  let ready = $state(false)
  let stopTimer: (() => void) | null = null
  let wrongTimeout: ReturnType<typeof setTimeout> | undefined

  const masked = $derived(current ? maskVowels(current.title) : '')
  const pct = $derived(Math.round((remaining / duration) * 100))

  const available = $derived(settings.source === 'imdb' ? dataStore.imdbCount : dataStore.count)

  // Start once titles are available (first load may still be downloading).
  $effect(() => {
    if (ready && !started && available > 0) {
      started = true
      nextRound()
    }
  })

  // Keep the keyboard on the guess box: whenever a round is running (new title, box enabled).
  $effect(() => {
    if (phase === 'playing' && current && inputEl) inputEl.focus()
  })

  function clearPoster() {
    poster?.release()
    poster = null
    posterUrl = null
  }

  async function nextRound() {
    stopTimer?.()
    clearPoster()
    // Refill when exhausted, or when a "Fetch new titles" replaced the set.
    if (queue.length === 0 || seenVersion !== dataStore.version || seenSource !== settings.source || seenContent !== settings.content) {
      const all = await sources[settings.source].getTitles()
      if (all.length === 0) return
      queue = shuffle(all)
      seenVersion = dataStore.version
      seenSource = settings.source
      seenContent = settings.content
    }
    current = queue.pop()!
    guess = ''
    wrong = false
    duration = settings.timerSeconds * 1000
    remaining = duration
    phase = 'playing'
    stopTimer = startCountdown(
      duration,
      (left) => (remaining = left),
      () => reveal('timeout'),
    )
    await tick()
    inputEl?.focus()
  }

  async function reveal(result: 'found' | 'timeout') {
    if (phase !== 'playing' || !current) return
    stopTimer?.()
    phase = result
    score.played++
    if (result === 'found') score.found++
    const id = current.id
    const handle = await sources[settings.source].getPoster(id)
    if (handle && current?.id === id) {
      poster = handle
      posterUrl = handle.url
    } else {
      handle?.release()
    }
    await tick()
    nextEl?.focus()
  }

  function submit() {
    if (phase !== 'playing' || !current || !guess.trim()) return
    if (isCorrectGuess(guess, current.title)) {
      reveal('found')
    } else {
      wrong = true
      clearTimeout(wrongTimeout)
      wrongTimeout = setTimeout(() => (wrong = false), 450)
      inputEl?.select()
    }
  }

  onDestroy(() => {
    stopTimer?.()
    clearTimeout(wrongTimeout)
    clearPoster()
  })
</script>

<h1>Guess the title</h1>

{#if !ready}
  <form class="setup" onsubmit={(e) => { e.preventDefault(); ready = true }}>
    {#if settings.source === 'imdb'}<ContentPicker />{/if}
    <button type="submit" class="start">Start</button>
  </form>
{:else if available === 0}
  <div class="center">
    {#if settings.source === 'imdb'}
      {#if dataStore.imdbError}
        <p class="error" role="alert">{dataStore.imdbError}</p>
        <button onclick={() => dataStore.loadImdb()}>Retry</button>
      {:else}
        <p>Loading the IMDb titles…</p>
      {/if}
    {:else if dataStore.busy}
      <p>Getting your first set of movies…</p>
      <Progress progress={dataStore.progress} />
    {:else}
      <p class="error" role="alert">{dataStore.error || 'No titles available yet.'}</p>
      <button onclick={() => dataStore.load()}>Retry</button>
    {/if}
  </div>
{:else if current}
  <p class="score" aria-live="polite">Score: {score.found} / {score.played}</p>

  <div class="timer" role="timer" aria-label="Time left">
    <div class="fill" class:low={pct < 30} style:width={pct + '%'}></div>
    <span>{Math.ceil(remaining / 1000)}s</span>
  </div>

  <p class="title" aria-label="Masked title">
    {phase === 'playing' ? masked : current.title}
  </p>

  <form onsubmit={(e) => { e.preventDefault(); submit() }}>
    <input
      bind:this={inputEl}
      bind:value={guess}
      class:shake={wrong}
      disabled={phase !== 'playing'}
      placeholder="Your guess"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Your guess"
    />
    <button type="submit" disabled={phase !== 'playing'}>Guess</button>
    <button type="button" bind:this={nextEl} onclick={nextRound}>Next</button>
  </form>

  {#if phase !== 'playing'}
    <div class="result" class:ok={phase === 'found'} role="status">
      <p>{phase === 'found' ? '✅ Well done!' : "⏰ Time's up!"}</p>
      <div class="reveal">
        <Poster src={posterUrl} alt={'Poster of ' + current.title} />
        {#if current.year || current.stars?.length}
          <div class="cast">
            {#if current.year}
              <h2>Released</h2>
              <p class="year">{current.year}</p>
            {/if}
            {#if current.stars?.length}
              <h2>Starring</h2>
              <ul>
                {#each current.stars as name}
                  <li>{name}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .setup { display: grid; gap: 1rem; justify-items: center; max-width: 320px; margin: 2rem auto; }
  .start { min-width: 8rem; }
  .center, .result { display: grid; gap: 1rem; justify-items: center; text-align: center; }
  .score { color: var(--muted); margin: 0 0 0.5rem; }
  .timer {
    position: relative;
    height: 28px;
    border-radius: 14px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill { position: absolute; inset: 0 auto 0 0; background: var(--accent); }
  .fill.low { background: var(--danger); }
  .timer span { position: relative; display: block; text-align: center; line-height: 28px; font-weight: 600; }
  .title {
    font-size: clamp(1.6rem, 6vw, 2.6rem);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-align: center;
    margin: 1.5rem 0;
    overflow-wrap: anywhere;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  }
  form { display: flex; gap: 0.5rem; }
  input { flex: 1; min-width: 0; }
  .result { margin-top: 1.5rem; }
  .reveal { display: flex; gap: 1.25rem; align-items: center; justify-content: center; width: 100%; }
  .reveal :global(.poster) { flex: 0 0 min(45%, 220px); margin-inline: 0; }
  .cast { text-align: left; }
  .cast h2 { font-size: 0.9rem; margin: 0 0 0.4rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .cast .year { margin: 0 0 1rem; font-size: 1.2rem; font-weight: 700; }
  .cast ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .cast li { font-weight: 600; }
  .result p { margin: 0; font-weight: 600; font-size: 1.2rem; }
  .error { color: var(--danger); }
  .shake { animation: shake 0.4s; border-color: var(--danger); }
  @keyframes shake {
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
</style>
