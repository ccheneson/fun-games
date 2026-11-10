<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import ContentPicker from '../components/ContentPicker.svelte'
  import LangPicker from '../components/LangPicker.svelte'
  import Poster from '../components/Poster.svelte'
  import { getImdbTitles } from '../lib/db/db'
  import { focusGuess } from '../lib/focus'
  import { buildRounds, isOppositeGuess, makeQueue, refKey, type OppositeRound } from '../lib/games/opposites'
  import { OPPOSITES } from '../lib/games/opposites/data'
  import { pointsLeft } from '../lib/games/points'
  import { settings } from '../lib/settings.svelte'
  import { dataStore } from '../lib/store.svelte'
  import { startCountdown } from '../lib/timer'

  type Phase = 'idle' | 'playing' | 'found' | 'timeout'

  let current = $state<OppositeRound | null>(null)
  let phase = $state<Phase>('idle')
  let guess = $state('')
  let duration = $state(10000)
  let remaining = $state(10000)
  let wonBy = $state<number | null>(null)
  let roundPoints = $state(0)
  let score = $state({ points: 0, found: 0, played: 0 })
  let wrong = $state(false)
  /** The filters leave no title to play. */
  let empty = $state(false)
  /** 1 = solo; 2 = two players who pick themselves before guessing. */
  let players = $state<1 | 2>(1)
  /** false = setup screen; true = a game is running. */
  let ready = $state(false)
  let names = $state(['', ''])
  let tally = $state([{ points: 0, found: 0 }, { points: 0, found: 0 }])
  /** Who is guessing right now (two-player mode only). */
  let active = $state<number | null>(null)
  let inputEl = $state<HTMLInputElement>()
  let titleEl = $state<HTMLElement>()
  let nextEl = $state<HTMLButtonElement>()

  let queue: OppositeRound[] = []
  let started = false
  let seenFilters = ''
  let round = 0
  let stopTimer: (() => void) | null = null
  let wrongTimeout: ReturnType<typeof setTimeout> | undefined

  const playing = $derived(phase === 'playing')
  const canGuess = $derived(playing && (players === 1 || active !== null))
  const nameOf = (i: number) => names[i].trim() || `Player ${i + 1}`
  const sameNames = $derived(nameOf(0).toLowerCase() === nameOf(1).toLowerCase())
  const available = $derived(dataStore.imdbCount)
  const pct = $derived(duration > 0 ? (remaining / duration) * 100 : 0)
  const points = $derived(pointsLeft(remaining, duration))

  // Start once the titles are in the database.
  $effect(() => {
    if (ready && !started && available > 0) {
      started = true
      nextRound()
    }
  })

  // Focus the guess box on desktop (on mobile the title, so the keyboard stays closed): whenever a round is running.
  $effect(() => {
    if (canGuess && current && inputEl) focusGuess(inputEl, titleEl)
  })

  const sameRef = (a: OppositeRound, b: OppositeRound) =>
    refKey(a.entry.ref.type, a.entry.ref.title, a.entry.ref.year) === refKey(b.entry.ref.type, b.entry.ref.title, b.entry.ref.year)

  async function nextRound() {
    stopTimer?.()
    // The old round must not stay guessable while the next one loads.
    phase = 'idle'
    const mine = ++round
    const filters = settings.content + '|' + settings.titleLang
    if (queue.length === 0 || seenFilters !== filters) {
      const all = await getImdbTitles()
      if (mine !== round) return
      queue = makeQueue(buildRounds(OPPOSITES, all, settings.content, settings.titleLang))
      seenFilters = filters
      // A rebuilt queue must not start with the title just played (pop() takes the last one).
      const last = queue.length - 1
      if (current && last > 0 && sameRef(queue[last], current)) [queue[0], queue[last]] = [queue[last], queue[0]]
      if (queue.length === 0) {
        empty = true
        current = null
        phase = 'idle'
        return
      }
    }
    empty = false
    current = queue.pop()!
    guess = ''
    wrong = false
    active = null
    wonBy = null
    roundPoints = 0
    // Not needed until the end: load it in the background so the reveal is instant.
    if (current.title.posterUrl) new Image().src = current.title.posterUrl
    duration = settings.oppositeTimerSeconds * 1000
    remaining = duration
    phase = 'playing'
    stopTimer = startCountdown(
      duration,
      (left) => (remaining = left),
      () => finish('timeout'),
    )
    await tick()
    focusGuess(inputEl, titleEl)
  }

  async function finish(result: 'found' | 'timeout') {
    if (phase !== 'playing') return
    stopTimer?.()
    phase = result
    score.played++
    if (result === 'found') {
      wonBy = active
      roundPoints = pointsLeft(remaining, duration)
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
    empty = false
    current = null
    phase = 'idle'
    active = null
  }

  function submit() {
    if (!canGuess || !current || !guess.trim()) return
    if (isOppositeGuess(guess, current)) {
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

<h1>Opposite title</h1>

{#if !ready}
  <form class="setup" onsubmit={(e) => { e.preventDefault(); startGame(players) }}>
    <p class="ask">How many players?</p>
    <div class="choices" role="group" aria-label="Number of players">
      <button type="button" class="toggle" aria-pressed={players === 1} onclick={() => (players = 1)}>1 player</button>
      <button type="button" class="toggle" aria-pressed={players === 2} onclick={() => (players = 2)}>2 players</button>
    </div>
    <ContentPicker />
    <LangPicker />
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
{:else if empty}
  <div class="center">
    <p role="status">No titles for these choices.</p>
    <button onclick={backToSetup}>Change choices</button>
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

  <div class="bar" role="timer" aria-label="Points left">
    <div class="fill" class:low={playing && pct < 30} style:width={(playing ? pct : 0) + '%'}></div>
    <span>{playing ? `${points} pts · ${Math.ceil(remaining / 1000)} s` : phase === 'found' ? `+${roundPoints} pts` : '0 pts'}</span>
  </div>

  <div class="question" tabindex="-1" bind:this={titleEl}>
    <p class="label">Opposite title:</p>
    <p class="title">{current.entry.opposite}</p>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); submit() }}>
    <input
      bind:this={inputEl}
      bind:value={guess}
      class:shake={wrong}
      disabled={!canGuess}
      placeholder={players === 2 && active === null ? 'Pick a player first' : 'The real title'}
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
      <p class="answer">{current.entry.opposite} → <strong>{current.entry.title}</strong></p>
      <div class="reveal">
        <Poster src={current.title.posterUrl ?? null} alt={'Poster of ' + current.entry.title} />
        {#if current.title.year || current.title.stars?.length}
          <div class="cast">
            {#if current.title.year}
              <h2>Released</h2>
              <p class="year">{current.title.year}</p>
            {/if}
            {#if current.title.stars?.length}
              <h2>Starring</h2>
              <ul>
                {#each current.title.stars as name}
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
  .bar {
    position: relative;
    height: 28px;
    border-radius: 14px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill { position: absolute; inset: 0 auto 0 0; background: var(--accent); }
  .fill.low { background: var(--danger); }
  .bar span { position: relative; display: block; text-align: center; line-height: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .question { text-align: center; margin: 1.5rem 0; }
  .question:focus { outline: none; }
  .question p { margin: 0; }
  .label { color: var(--muted); font-size: 0.9rem; }
  .title {
    font-size: clamp(1.5rem, 6vw, 2.4rem);
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  form { display: flex; gap: 0.5rem; max-width: 420px; margin: 0 auto; }
  input { flex: 1; min-width: 0; }
  .result { display: grid; gap: 0.75rem; justify-items: center; text-align: center; margin-top: 1.25rem; }
  .result p { margin: 0; }
  .verdict { font-weight: 700; font-size: 1.3rem; }
  .answer { font-size: 1.1rem; overflow-wrap: anywhere; }
  .reveal { display: flex; gap: 1.25rem; align-items: center; justify-content: center; width: 100%; }
  .reveal :global(.poster) { flex: 0 0 min(45%, 220px); margin-inline: 0; }
  .cast { text-align: left; }
  .cast h2 { font-size: 0.9rem; margin: 0 0 0.4rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .cast .year { margin: 0 0 1rem; font-size: 1.2rem; font-weight: 700; }
  .cast ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .cast li { font-weight: 600; }
  .error { color: var(--danger); }
  .shake { animation: shake 0.4s; border-color: var(--danger); }
  @keyframes shake {
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
</style>
