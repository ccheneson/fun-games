<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import ContentPicker from '../components/ContentPicker.svelte'
  import { shuffle } from '../lib/db/seed'
  import { BANDS, bandAt, blurAt, blurPx, pointsAt, pointsForBand } from '../lib/games/points'
  import type { Title } from '../lib/providers/types'
  import { settings } from '../lib/settings.svelte'
  import { sources } from '../lib/sources'
  import { dataStore } from '../lib/store.svelte'
  import { isCorrectGuess } from '../lib/text/match'
  import { startCountdown } from '../lib/timer'

  type Phase = 'idle' | 'loading' | 'playing' | 'found' | 'timeout'

  let current = $state<Title | null>(null)
  let phase = $state<Phase>('idle')
  let guess = $state('')
  let fraction = $state(0)
  /** 'down' = revealed from the top, 'up' = from the bottom (random each round). */
  let direction = $state<'down' | 'up'>('down')
  let wonBand = $state(-1)
  let wonBy = $state<number | null>(null)
  let roundPoints = $state(0)
  let score = $state({ points: 0, found: 0, played: 0 })
  let wrong = $state(false)
  /** 1 = solo (as before); 2 = two players who pick themselves before guessing. */
  let players = $state<1 | 2>(1)
  /** false = number-of-players screen; true = a game is running. */
  let ready = $state(false)
  let names = $state(['', ''])
  let tally = $state([{ points: 0, found: 0 }, { points: 0, found: 0 }])
  /** Who is guessing right now (two-player mode only). */
  let active = $state<number | null>(null)
  let inputEl = $state<HTMLInputElement>()
  let nextEl = $state<HTMLButtonElement>()

  let queue: Title[] = []
  let started = false
  let seenContent = settings.content
  let round = 0
  let stopTimer: (() => void) | null = null
  let wrongTimeout: ReturnType<typeof setTimeout> | undefined

  // Band 0 (100 points) is always where the reveal starts, so the list flips with the direction.
  const bands = $derived.by(() => {
    const list = Array.from({ length: BANDS }, (_, i) => ({ i, points: pointsForBand(i) }))
    return direction === 'up' ? list.reverse() : list
  })
  const playing = $derived(phase === 'playing')
  const canGuess = $derived(playing && (players === 1 || active !== null))
  const nameOf = (i: number) => names[i].trim() || `Player ${i + 1}`
  const sameNames = $derived(nameOf(0).toLowerCase() === nameOf(1).toLowerCase())
  const revealPct = $derived(phase === 'playing' ? fraction * 100 : phase === 'loading' ? 0 : 100)
  // Blurry (100) to clear (10) over the round; the finished poster is shown sharp.
  const blur = $derived(phase === 'playing' ? blurPx(blurAt(fraction)) : 0)
  const activeBand = $derived(phase === 'playing' ? bandAt(fraction) : phase === 'found' ? wonBand : -1)
  const available = $derived(dataStore.imdbCount)

  // Start once the titles are in the database.
  $effect(() => {
    if (ready && !started && available > 0) {
      started = true
      nextRound()
    }
  })

  // Keep the keyboard on the guess box: whenever a round is running (new title, box enabled).
  $effect(() => {
    if (canGuess && current && inputEl) inputEl.focus()
  })

  function preload(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }

  async function nextRound() {
    stopTimer?.()
    const mine = ++round
    if (queue.length === 0 || seenContent !== settings.content) {
      const all = await sources.imdb.getTitles()
      if (mine !== round || all.length === 0) return
      queue = shuffle(all)
      seenContent = settings.content
    }
    current = queue.pop()!
    guess = ''
    wrong = false
    active = null
    fraction = 0
    direction = Math.random() < 0.5 ? 'down' : 'up'
    wonBand = -1
    wonBy = null
    roundPoints = 0
    phase = 'loading'
    // Wait for the image so the reveal doesn't start on an empty poster.
    const ok = current.posterUrl ? await preload(current.posterUrl) : false
    if (mine !== round) return
    if (!ok) return nextRound() // broken link: take another title
    const duration = settings.movieTimerSeconds * 1000
    phase = 'playing'
    stopTimer = startCountdown(
      duration,
      (left) => (fraction = 1 - left / duration),
      () => finish('timeout'),
    )
    await tick()
    inputEl?.focus()
  }

  async function finish(result: 'found' | 'timeout') {
    if (phase !== 'playing') return
    stopTimer?.()
    phase = result
    score.played++
    if (result === 'found') {
      wonBand = bandAt(fraction)
      wonBy = active
      roundPoints = pointsAt(fraction)
      score.points += roundPoints
      score.found++
      if (players === 2 && active !== null) {
        tally[active].points += roundPoints
        tally[active].found++
      }
    }
    await tick()
    nextEl?.focus()
  }

  function buzz(i: number) {
    if (!playing) return
    if (active === i) return
    active = i
    guess = ''
    tick().then(() => inputEl?.focus())
  }

  function startGame(n: 1 | 2) {
    if (n === 2 && sameNames) return
    players = n
    score = { points: 0, found: 0, played: 0 }
    tally = [{ points: 0, found: 0 }, { points: 0, found: 0 }]
    ready = true
  }

  function backToSetup() {
    round++ // cancels any round still loading
    stopTimer?.()
    started = false
    ready = false
    current = null
    phase = 'idle'
    active = null
  }

  function submit() {
    if (!canGuess || !current || !guess.trim()) return
    if (isCorrectGuess(guess, current.title)) {
      finish('found')
    } else {
      wrong = true
      clearTimeout(wrongTimeout)
      wrongTimeout = setTimeout(() => (wrong = false), 450)
      inputEl?.select()
      if (players === 2) active = null // wrong: someone has to pick again
    }
  }

  onDestroy(() => {
    round++
    stopTimer?.()
    clearTimeout(wrongTimeout)
  })
</script>

<h1>Guess the poster</h1>

{#if !ready}
  <form class="setup" onsubmit={(e) => { e.preventDefault(); startGame(players) }}>
    <p class="ask">How many players?</p>
    <div class="choices" role="group" aria-label="Number of players">
      <button type="button" class="toggle" aria-pressed={players === 1} onclick={() => (players = 1)}>1 player</button>
      <button type="button" class="toggle" aria-pressed={players === 2} onclick={() => (players = 2)}>2 players</button>
    </div>
    <ContentPicker />
    <div class="names">
      {#each players === 2 ? [0, 1] : [0] as i (i)}
        <input
          bind:value={names[i]}
          class:bad={players === 2 && sameNames}
          placeholder={`Player ${i + 1}`}
          maxlength="16"
          autocomplete="off"
          aria-label={`Name of player ${i + 1}`}
          aria-invalid={players === 2 && sameNames}
        />
      {/each}
    </div>
    {#if players === 2 && sameNames}
      <p class="error" role="alert">The two players need different names.</p>
    {/if}
    <button type="submit" class="start" disabled={players === 2 && sameNames}>Start</button>
  </form>
{:else if available === 0}
  <div class="center">
    {#if dataStore.imdbError}
      <p class="error" role="alert">{dataStore.imdbError}</p>
      <button onclick={() => dataStore.loadImdb()}>Retry</button>
    {:else}
      <p>Loading the IMDb titles…</p>
    {/if}
  </div>
{:else if current}
  {#if players === 1}
    <p class="score" aria-live="polite">
      {nameOf(0)} · Points: {score.points} · Found {score.found} / {score.played}
    </p>
  {:else}
    <div class="duel">
      {#each [0, 1] as i (i)}
        <div class="player" class:active={active === i}>
          <span class="name">{nameOf(i)}</span>
          <span class="pts" aria-live="polite">{tally[i].points}</span>
          <span class="found">{tally[i].found} found</span>
          <button type="button" class="pick" class:call={playing && active === null} disabled={!playing || active === i} onclick={() => buzz(i)}>
            {active === i ? 'Guessing…' : active === null ? "I'll guess" : 'Switch to ' + nameOf(i)}
          </button>
        </div>
      {/each}
    </div>
    {#if playing}
      <p class="turn" class:pick={active === null} role="status">
        {active === null ? "👆 Who's guessing? Press your player's button first" : `✍️ ${nameOf(active)} is guessing`}
      </p>
    {/if}
  {/if}

  <div class="stage">
    <div class="poster" role="img" aria-label={phase === 'playing' || phase === 'loading' ? 'Poster being revealed' : 'Poster of ' + current.title}>
      {#if current.posterUrl && phase !== 'loading'}
        <img
          src={current.posterUrl}
          alt=""
          referrerpolicy="no-referrer"
          style:filter={blur > 0 ? `blur(${blur}px)` : 'none'}
          style:clip-path={direction === 'down'
            ? `inset(0 0 ${100 - revealPct}% 0)`
            : `inset(${100 - revealPct}% 0 0 0)`}
        />
      {/if}
      {#if phase === 'loading'}<span class="wait">…</span>{/if}
    </div>

    <ol class="bands" class:up={direction === 'up'} data-direction={direction} aria-label="Points by position">
      {#each bands as band, row (row)}
        <li class:active={band.i === activeBand} class:past={playing && band.i < activeBand}>
          {band.points}
        </li>
      {/each}
    </ol>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); submit() }}>
    <input
      bind:this={inputEl}
      bind:value={guess}
      class:shake={wrong}
      disabled={!canGuess}
      placeholder={players === 2 && active === null ? 'Pick a player first' : 'Your guess'}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Your guess"
    />
    <button type="submit" disabled={!canGuess}>Guess</button>
    <button type="button" bind:this={nextEl} onclick={nextRound}>Next</button>
  </form>
  <p class="change"><button type="button" class="link" onclick={backToSetup}>Change players</button></p>

  {#if phase === 'found' || phase === 'timeout'}
    <div class="result" class:ok={phase === 'found'} role="status">
      <p class="verdict">
        {phase === 'found'
          ? `✅ ${players === 2 && wonBy !== null ? nameOf(wonBy) + ': ' : ''}+${roundPoints} points`
          : "⏰ Time's up! 0 points"}
      </p>
      <p class="movie-title">{current.title}</p>
      {#if current.year}<p class="meta">Released {current.year}</p>{/if}
      {#if current.stars?.length}
        <p class="meta">Starring {current.stars.join(', ')}</p>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .center { display: grid; gap: 1rem; justify-items: center; text-align: center; }
  .setup { display: grid; gap: 1rem; justify-items: center; max-width: 320px; margin: 2rem auto; }
  .ask { margin: 0; font-weight: 600; font-size: 1.2rem; }
  .choices { display: flex; gap: 0.5rem; }
  .names { display: grid; gap: 0.5rem; width: 100%; }
  .bad { border-color: var(--danger); }
  .setup .error { margin: 0; }
  .start { min-width: 8rem; }
  .change { text-align: center; margin: 1rem 0 0; }
  .link { background: none; border: 0; color: var(--muted); text-decoration: underline; cursor: pointer; }
  .duel { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; max-width: 420px; margin: 0 auto 0.75rem; }
  .player {
    display: grid; gap: 0.35rem; justify-items: center; padding: 0.6rem;
    border: 2px solid var(--border); border-radius: 12px; background: var(--surface);
  }
  .player.active { border-color: var(--accent); }
  .player .name { font-weight: 600; overflow-wrap: anywhere; }
  .pts { font-size: 1.8rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .found { color: var(--muted); font-size: 0.85rem; }
  .pick { width: 100%; }
  .pick.call { background: var(--accent); color: #fff; animation: pulse 1s ease-in-out infinite; }
  .turn { text-align: center; font-weight: 700; margin: 0 0 0.75rem; }
  .turn.pick { color: var(--accent); animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.55; } }
  .score { color: var(--muted); margin: 0 0 0.75rem; }
  .stage {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
    gap: 0.75rem;
    max-width: 420px;
    margin: 0 auto 1rem;
    align-items: stretch;
  }
  .poster {
    position: relative;
    aspect-ratio: 2 / 3;
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface-2);
  }
  .poster img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .wait { position: absolute; inset: 0; display: grid; place-items: center; font-size: 2rem; opacity: 0.5; }
  .bands {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface);
  }
  .bands li {
    flex: 1;
    display: grid;
    place-items: center;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
  }
  .bands li:last-child { border-bottom: 0; }
  .bands li.past { opacity: 0.35; }
  .bands li.active { background: var(--accent); color: #fff; }
  form { display: flex; gap: 0.5rem; max-width: 420px; margin: 0 auto; }
  input { flex: 1; min-width: 0; }
  .result { display: grid; gap: 0.25rem; justify-items: center; text-align: center; margin-top: 1.25rem; }
  .result p { margin: 0; }
  .verdict { font-weight: 700; font-size: 1.3rem; }
  .movie-title { font-weight: 700; font-size: 1.1rem; }
  .meta { color: var(--muted); }
  .error { color: var(--danger); }
  .shake { animation: shake 0.4s; border-color: var(--danger); }
  @keyframes shake {
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
</style>
