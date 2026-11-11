<script lang="ts">
  import { onDestroy, tick, untrack } from 'svelte'
  import ContentPicker from '../components/ContentPicker.svelte'
  import { isTouchDevice } from '../lib/focus'
  import {
    BOARD,
    COLS,
    blendView,
    easeCss,
    FINAL_SIZE,
    ROWS,
    TILE_COUNT,
    cameraTransform,
    finalWindow,
    moveSelection,
    pickBoard,
    revealView,
    tileRect,
    viewAt,
    visibleTiles,
    type ArrowKey,
    type Rect,
  } from '../lib/games/findposter'
  import { pointsLeft } from '../lib/games/points'
  import type { Title } from '../lib/providers/types'
  import { settings } from '../lib/settings.svelte'
  import { sources } from '../lib/sources'
  import { dataStore } from '../lib/store.svelte'
  import { startCountdown } from '../lib/timer'

  type Phase = 'idle' | 'loading' | 'playing' | 'found' | 'wrong' | 'timeout'
  type Loaded = 'ok' | 'fail' | 'slow'

  const FULL: Rect = { x: 0, y: 0, size: BOARD }
  /** Posters still loading after this are shown as they arrive (the target must be loaded). */
  const PRELOAD_CAP_MS = 6000
  /** Boards tried when none of their posters loads in time, before giving up. */
  const MAX_ATTEMPTS = 3
  /** A tap that moves more than this (px) is a drag, not a pick. */
  const DRAG_PX = 10
  const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

  let tiles = $state<Title[]>([])
  let target = $state(-1)
  let final = $state<Rect>(FULL)
  /** Posters that failed to load: shown as a placeholder. */
  let broken = $state<boolean[]>([])
  let loaded = $state(0)
  let phase = $state<Phase>('idle')
  let error = $state('')
  /** The filters leave too few titles for a board. */
  let empty = $state(false)
  let duration = $state(20000)
  let remaining = $state(20000)
  let roundPoints = $state(0)
  let wonBy = $state<number | null>(null)
  let score = $state({ points: 0, found: 0, played: 0 })
  /** 1 = solo; 2 = two players who pick themselves before tapping a poster. */
  let players = $state<1 | 2>(1)
  /** false = setup screen; true = a game is running. */
  let ready = $state(false)
  let names = $state(['', ''])
  let tally = $state([{ points: 0, found: 0 }, { points: 0, found: 0 }])
  /** Who is picking right now (two-player mode only). */
  let active = $state<number | null>(null)
  /** Two players: a wrong pick locks that player out for the round. */
  let lockedOut = $state([false, false])
  /** Tile with the selection outline (touch: waiting for confirmation). */
  let selected = $state<number | null>(null)
  /** Confirmed wrong picks this round. */
  let wrongPicks = $state<number[]>([])
  /** End of round: zoom back out to the whole wall. */
  let wholeWall = $state(false)
  /** The next change of view (whole-wall toggle, or the timeout reveal) glides instead of jumping. */
  let glideNext = false
  let wrapW = $state(0)
  let wrapEl = $state<HTMLElement>()
  /** Page y of the top of the board (measured: header, scores, bar and title above it vary). */
  let wrapTop = $state(0)
  /** Height of the touch confirm row under the board. */
  let confirmH = $state(0)
  let innerHeight = $state(800)
  let nextEl = $state<HTMLButtonElement>()
  const tileEls: HTMLButtonElement[] = []
  /** On-screen canvas: the current view of the wall, drawn at device-pixel size. */
  let screenEl = $state<HTMLCanvasElement>()
  /** The whole wall, painted once per board, at full and half resolution (off-screen). */
  const wallHi = document.createElement('canvas')
  const wallLo = document.createElement('canvas')
  /** Bumped whenever the wall bitmaps change, to redraw the screen. */
  let wallVersion = $state(0)
  /** Decoded posters of the current board (null: not loaded yet, or failed). */
  let posterImgs: (HTMLImageElement | null)[] = []

  const touch = isTouchDevice()
  let pool: Title[] | null = null
  let seenContent = settings.content
  /** Targets already played this session (not picked as target again while others remain). */
  const played = new Set<string>()
  let started = false
  let round = 0
  let stopTimer: (() => void) | null = null
  let down: { x: number; y: number } | null = null
  let dragged = false

  const playing = $derived(phase === 'playing')
  const ended = $derived(phase === 'found' || phase === 'wrong' || phase === 'timeout')
  const canPick = $derived(playing && (players === 1 || (active !== null && !lockedOut[active])))
  const nameOf = (i: number) => names[i].trim() || `Player ${i + 1}`
  const sameNames = $derived(nameOf(0).toLowerCase() === nameOf(1).toLowerCase())
  const available = $derived(dataStore.imdbCount)
  const pct = $derived(duration > 0 ? (remaining / duration) * 100 : 0)
  const points = $derived(pointsLeft(remaining, duration))
  const answer = $derived(target >= 0 ? tiles[target] : undefined)

  const fraction = $derived(duration > 0 ? (duration - remaining) / duration : 0)
  const view = $derived<Rect>(ended ? (wholeWall ? FULL : revealView(target)) : playing ? viewAt(fraction, final) : FULL)
  // A string, so everything below only reruns when the set of visible tiles changes, not every frame.
  const visibleKey = $derived(visibleTiles(view).join(','))
  const visibleList = $derived(visibleKey ? visibleKey.split(',').map(Number) : [])
  const visible = $derived(new Set(visibleList))
  /** Roving tab stop: the selected tile if visible, else the first visible one. */
  const cursor = $derived(selected !== null && visible.has(selected) ? selected : (visibleList[0] ?? 0))

  // Square viewport: as wide as the page, but short enough to keep the controls on screen.
  const MIN_SIDE = 260
  const side = $derived(
    Math.floor(Math.max(0, Math.min(wrapW, Math.max(MIN_SIDE, innerHeight - wrapTop - (touch ? confirmH + 20 : 8))))),
  )
  /** The board is laid out at its zoomed-in size and scaled down: posters stay sharp at the end. */
  const boardPx = $derived((side * BOARD) / FINAL_SIZE)
  /**
   * Rendering. The posters are painted once into an off-screen bitmap of the whole wall, and every frame
   * the current view is drawn from it into a canvas the size of the square (device pixels, untransformed).
   * Letting the browser scale the posters instead (CSS transform on <img>s or on one big canvas) makes
   * Firefox round each poster, or the whole wall, to whole device pixels as the scale changes every
   * frame: posters wobble against each other and the wall jerks. Here the browser never scales anything:
   * canvas drawImage with a fractional source rect resamples smoothly.
   * The tile <button>s above are transparent hit, focus and highlight targets moved by the transform.
   */
  const GLIDE_MS = 600
  const DIM_MS = 300
  const DIM_ALPHA = 0.65
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  /** rAF clock, ticking only while a glide or the end-of-round dimming is running. */
  let clock = $state(0)
  let glide = $state<{ from: Rect; to: Rect; t0: number } | null>(null)
  let dimStart = $state<number | null>(null)
  /** What is on screen: the view, or a glide between two views. */
  const shown = $derived(glide ? blendView(glide.from, glide.to, easeCss((clock - glide.t0) / GLIDE_MS)) : view)
  const dimAlpha = $derived(dimStart === null ? 0 : DIM_ALPHA * Math.min(1, Math.max(0, (clock - dimStart) / DIM_MS)))
  let lastShown: Rect = FULL
  let ticking = false
  function tickUntilIdle() {
    if (ticking) return
    ticking = true
    const loop = (t: number) => {
      clock = t
      const busy = (glide && t - glide.t0 < GLIDE_MS) || (dimStart !== null && t - dimStart < DIM_MS)
      if (busy) requestAnimationFrame(loop)
      else ticking = false
    }
    requestAnimationFrame(loop)
  }

  // A toggle or the timeout reveal glides from what is on screen to the new view; any other change is immediate.
  $effect(() => {
    const to = view
    untrack(() => {
      if (glideNext && !reducedMotion()) {
        const t0 = performance.now()
        clock = t0
        glide = { from: lastShown, to, t0 }
        tickUntilIdle()
      } else glide = null
      glideNext = false
    })
  })

  // End of round: fade the other posters out.
  $effect(() => {
    if (!ended) {
      dimStart = null
      return
    }
    untrack(() => {
      const now = performance.now()
      clock = now
      dimStart = reducedMotion() ? now - DIM_MS : now
      tickUntilIdle()
    })
  })

  const cam = $derived(cameraTransform(shown, side))
  /** Wall bitmap px per board unit: enough for the final 3-column view to be pixel-sharp, capped in size. */
  const MAX_WALL_PX = 4096
  const wallUnit = $derived(
    Math.max(1, Math.min(Math.floor(MAX_WALL_PX / BOARD), Math.ceil((side * devicePixelRatio) / FINAL_SIZE))),
  )

  /** Paint poster i into its cell of both wall bitmaps (object-fit: cover), or clear it (placeholder shows). */
  function paintTile(i: number) {
    for (const el of [wallHi, wallLo]) {
      const ctx = el.getContext('2d')
      if (!ctx || !el.width) continue
      const u = el.width / BOARD
      const r = tileRect(i)
      const [x, y, w, h] = [r.x * u, r.y * u, r.w * u, r.h * u]
      ctx.clearRect(x, y, w, h)
      const img = posterImgs[i]
      if (!img || !img.naturalWidth) continue
      ctx.imageSmoothingQuality = 'high'
      const k = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const sw = w / k
      const sh = h / k
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
    }
    wallVersion++
  }

  // (Re)size the wall bitmaps when the square or the pixel ratio changes, then repaint every poster.
  $effect(() => {
    const [hiPx, loPx] = [wallUnit * BOARD, Math.ceil(wallUnit / 2) * BOARD]
    untrack(() => {
      if (wallHi.width !== hiPx) wallHi.width = wallHi.height = hiPx
      if (wallLo.width !== loPx) wallLo.width = wallLo.height = loPx
      for (let i = 0; i < TILE_COUNT; i++) paintTile(i)
    })
  })

  // Draw the view on screen (every frame while the camera moves).
  $effect(() => {
    const el = screenEl
    const v = shown
    const alpha = dimAlpha
    const px = Math.round(side * devicePixelRatio)
    void wallVersion
    if (!el || px <= 0) return
    untrack(() => drawScreen(el, v, alpha, px))
  })

  function drawScreen(el: HTMLCanvasElement, v: Rect, alpha: number, px: number) {
    lastShown = v
    if (el.width !== px) el.width = el.height = px
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, px, px)
    // Use the half-resolution wall while the view is shown at or below its resolution: a bitmap is then
    // never shrunk by more than 2x (more makes fine details shimmer as they move).
    const src = px / v.size <= wallLo.width / BOARD ? wallLo : wallHi
    const u = src.width / BOARD
    if (u > 0) {
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(src, v.x * u, v.y * u, v.size * u, v.size * u, 0, 0, px, px)
    }
    if (alpha > 0) {
      // Dim every poster but the answer and the wrong picks, in one path (no seams between cells).
      const k = px / v.size
      ctx.beginPath()
      for (let i = 0; i < TILE_COUNT; i++) {
        if (i === target || wrongPicks.includes(i)) continue
        const r = tileRect(i)
        ctx.rect((r.x - v.x) * k, (r.y - v.y) * k, r.w * k, r.h * k)
      }
      ctx.globalAlpha = alpha
      ctx.fillStyle = getComputedStyle(el.parentElement ?? el).backgroundColor
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  // Re-measure where the board starts when what is above it may have changed (no layout reads per frame).
  $effect(() => {
    void [phase, players, active, innerHeight, wrapW, target]
    if (wrapEl) wrapTop = wrapEl.getBoundingClientRect().top + scrollY
  })

  // Start once the titles are in the database.
  $effect(() => {
    if (ready && !started && available > 0) {
      started = true
      nextRound()
    }
  })

  // The zoom hides tiles: drop a selection that left the view, and keep the focus on a visible tile.
  $effect(() => {
    if (!playing) return
    if (selected !== null && !visible.has(selected)) selected = null
    const el = document.activeElement
    if (el instanceof HTMLElement && el.dataset.tile !== undefined && !visible.has(Number(el.dataset.tile))) {
      tileEls[cursor]?.focus({ preventScroll: true })
    }
  })

  /** Each board attempt has its own token: late posters of an older attempt are not counted. */
  let attemptToken = 0

  /** Loads poster i of the current attempt and paints it on the wall when (and if) it arrives. */
  function preload(url: string, i: number, token: number): Promise<Loaded> {
    return new Promise((resolve) => {
      const img = new Image()
      img.referrerPolicy = 'no-referrer'
      const timer = setTimeout(() => resolve('slow'), PRELOAD_CAP_MS)
      const done = (ok: boolean) => {
        clearTimeout(timer)
        if (token === attemptToken) {
          loaded++
          // A slow poster still shows up when it arrives (or becomes a placeholder if it fails).
          if (ok) {
            posterImgs[i] = img
            paintTile(i)
          } else broken[i] = true
        }
        resolve(ok ? 'ok' : 'fail')
      }
      img.src = url
      img.decode().then(
        () => done(true),
        () => done(false),
      )
    })
  }

  async function nextRound() {
    stopTimer?.()
    const mine = ++round
    phase = 'loading'
    target = -1
    error = ''
    empty = false
    selected = null
    wrongPicks = []
    lockedOut = [false, false]
    active = null
    wonBy = null
    roundPoints = 0
    wholeWall = false
    glideNext = false
    duration = settings.findTimerSeconds * 1000
    remaining = duration
    if (!pool || seenContent !== settings.content) {
      const content = settings.content
      const all = await sources.imdb.getTitles()
      if (mine !== round) return
      seenContent = content
      pool = all
    }
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const board = pickBoard(pool, TILE_COUNT, played)
      if (!board) {
        empty = true
        phase = 'idle'
        return
      }
      tiles = board.tiles
      broken = Array(TILE_COUNT).fill(false)
      loaded = 0
      const token = ++attemptToken
      posterImgs = Array(TILE_COUNT).fill(null)
      for (const el of [wallHi, wallLo]) el.getContext('2d')?.clearRect(0, 0, el.width, el.height)
      wallVersion++
      const results = await Promise.all(board.tiles.map((t, i) => preload(t.posterUrl!, i, token)))
      if (mine !== round) return
      broken = results.map((r) => r === 'fail')
      // The answer's poster must be loaded. If it isn't, keep the board and take another target among
      // the loaded posters (preferring ones not played yet); slow ones keep loading in the background.
      let goal = board.target
      if (results[goal] !== 'ok') {
        const ok = results.flatMap((r, i) => (r === 'ok' ? [i] : []))
        const fresh = ok.filter((i) => !played.has(board.tiles[i].id))
        const from = fresh.length > 0 ? fresh : ok
        if (from.length === 0) continue // nothing usable loaded: try another board
        goal = from[Math.floor(Math.random() * from.length)]
      }
      target = goal
      final = finalWindow(goal)
      played.add(board.tiles[goal].id)
      return start()
    }
    error = 'Could not load the posters. Check your connection.'
    phase = 'idle'
  }

  function start() {
    phase = 'playing'
    stopTimer = startCountdown(
      duration,
      (left) => (remaining = left),
      () => finish('timeout'),
    )
  }

  async function finish(result: 'found' | 'wrong' | 'timeout') {
    if (phase !== 'playing') return
    stopTimer?.()
    selected = null
    // Timeout: glide from the (offset) final window to the centred reveal. A pick jumps.
    if (result === 'timeout') glideNext = true
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
    nextEl?.focus({ preventScroll: true })
  }

  function confirm(i: number | null) {
    if (!canPick || i === null) return
    if (i === target) return finish('found')
    wrongPicks = [...wrongPicks, i]
    selected = null
    if (players === 1 || active === null) return finish('wrong')
    lockedOut[active] = true
    active = null
    if (lockedOut.every(Boolean)) finish('wrong')
  }

  function tileClick(e: MouseEvent, i: number) {
    // A tap that turned into a drag is not a pick (keyboard clicks, detail 0, never are drags).
    if (dragged && e.detail !== 0) return
    if (!canPick) return
    // Touch: the first tap only selects (tiles are small); keyboard (detail 0) and mouse confirm.
    if (touch && e.detail !== 0 && selected !== i) {
      selected = i
      return
    }
    selected = i
    confirm(i)
  }

  function tileKey(e: KeyboardEvent, i: number) {
    if (!ARROWS.has(e.key)) return
    e.preventDefault()
    const n = moveSelection(i, e.key as ArrowKey)
    if (!visible.has(n)) return
    if (playing) selected = n
    tileEls[n]?.focus({ preventScroll: true })
  }

  function pointerDown(e: PointerEvent) {
    down = { x: e.clientX, y: e.clientY }
    dragged = false
  }

  function pointerUp(e: PointerEvent) {
    if (down) dragged = Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_PX
    down = null
    // The click (if any) fires right after pointerup: clear the flag once it has been handled, so a
    // drag that ends off a tile can't swallow a later click or Enter.
    if (dragged) setTimeout(() => (dragged = false), 0)
  }

  function buzz(i: number) {
    if (!playing || active === i || lockedOut[i]) return
    active = i
    selected = null
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
    error = ''
    tiles = []
    target = -1
    phase = 'idle'
    active = null
  }

  onDestroy(() => {
    round++
    stopTimer?.()
  })
</script>

<svelte:window bind:innerHeight />

<h1>Find the poster</h1>

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
{:else if empty}
  <div class="center">
    <p role="status">Not enough titles with a poster for these choices.</p>
    <button onclick={backToSetup}>Change choices</button>
  </div>
{:else if error}
  <div class="center">
    <p class="error" role="alert">{error}</p>
    <button onclick={nextRound}>Retry</button>
    <button type="button" class="link" onclick={backToSetup}>Change players</button>
  </div>
{:else}
  {#if players === 1}
    <p class="score" aria-live="polite">
      {nameOf(0)} · Points: {score.points} · Found {score.found} / {score.played}
    </p>
  {:else}
    <div class="duel">
      {#each [0, 1] as i (i)}
        <div class="player" class:active={active === i} class:out={lockedOut[i]}>
          <span class="name">{nameOf(i)}</span>
          <span class="pts" aria-live="polite">{tally[i].points}</span>
          <span class="found">{tally[i].found} found</span>
          <button
            type="button"
            class="pick"
            class:call={playing && active === null && !lockedOut[i]}
            disabled={!playing || active === i || lockedOut[i]}
            onclick={() => buzz(i)}
          >
            {lockedOut[i] ? '✖ Missed' : active === i ? 'Picking…' : active === null ? "I'll pick" : 'Switch to ' + nameOf(i)}
          </button>
        </div>
      {/each}
    </div>
    {#if playing}
      <p class="turn" class:pick={active === null} role="status">
        {active === null ? "👆 Who's picking? Press your player's button first" : `👉 ${nameOf(active)} is picking`}
      </p>
    {/if}
  {/if}

  <div class="bar" role="timer" aria-label="Points left">
    <div class="fill" class:low={playing && pct < 30} style:width={(playing ? pct : 0) + '%'}></div>
    <span>
      {playing ? `${points} pts · ${Math.ceil(remaining / 1000)} s` : phase === 'found' ? `+${roundPoints} pts` : phase === 'loading' ? '…' : '0 pts'}
    </span>
  </div>

  <div class="prompt" role="status">
    {#if phase === 'loading'}
      <p class="label">Loading posters… {loaded} / {TILE_COUNT}</p>
    {:else if answer}
      <p class="label">Find:</p>
      <p class="title">{answer.title}{#if answer.year}<span class="year">&nbsp;({answer.year})</span>{/if}</p>
    {/if}
  </div>

  <div class="stage">
  <div class="main">
  <div class="wrap" bind:this={wrapEl} bind:clientWidth={wrapW}>
    <div
      class="viewport"
      style:width="{side}px"
      style:height="{side}px"
      onscroll={(e) => {
        // Focus must never scroll the clipped board: the camera is the transform only.
        e.currentTarget.scrollLeft = 0
        e.currentTarget.scrollTop = 0
      }}
    >
      <canvas class="screen" class:hidden={phase === 'loading'} bind:this={screenEl} aria-hidden="true"></canvas>
      <div
        class="board"
        class:live={playing}
        class:hidden={phase === 'loading'}
        class:ended
        role="group"
        aria-label="Poster wall"
        onpointerdown={pointerDown}
        onpointerup={pointerUp}
        style:width="{boardPx}px"
        style:height="{boardPx}px"
        style:--inv={1 / cam.scale}
        style:transform="scale({cam.scale}) translate({-cam.tx}px, {-cam.ty}px)"
      >
        {#each tiles as t, i (t.id)}
          {@const miss = wrongPicks.includes(i)}
          <button
            type="button"
            class="tile"
            class:sel={selected === i}
            class:target={ended && i === target}
            class:miss
            data-tile={i}
            bind:this={tileEls[i]}
            style:left="{((i % COLS) * 100) / COLS}%"
            style:top="{(Math.floor(i / COLS) * 100) / ROWS}%"
            style:width="{100 / COLS}%"
            style:height="{100 / ROWS}%"
            tabindex={i === cursor ? 0 : -1}
            aria-hidden={visible.has(i) ? undefined : 'true'}
            aria-label={`Poster ${i + 1}, row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`}
            onclick={(e) => tileClick(e, i)}
            onkeydown={(e) => tileKey(e, i)}
          >
            {#if broken[i]}
              <span class="ph" aria-hidden="true">🎬</span>
            {/if}
            {#if ended && i === target}
              <span class="badge ok" aria-hidden="true">✔</span>
            {:else if miss}
              <span class="badge ko" aria-hidden="true">✖</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#if touch && !ended}
    <div class="confirm" bind:offsetHeight={confirmH}>
      <div class="preview">
        {#if selected !== null && !broken[selected]}
          <img src={tiles[selected]?.posterUrl} alt="" referrerpolicy="no-referrer" />
        {:else}
          <span aria-hidden="true">🎬</span>
        {/if}
      </div>
      <div class="confirm-side">
        <p>{selected === null ? 'Tap a poster to see it here.' : 'Tap it again or:'}</p>
        <button type="button" class="this" disabled={selected === null || !canPick} onclick={() => confirm(selected)}>This one!</button>
      </div>
    </div>
  {/if}

  </div>

  <div class="side">
  {#if ended && answer}
    <div class="result" class:ok={phase === 'found'} role="status">
      <p class="verdict">
        {phase === 'found'
          ? `✅ ${players === 2 && wonBy !== null ? nameOf(wonBy) + ': ' : ''}+${roundPoints} points`
          : phase === 'wrong'
            ? players === 2 ? '❌ Both missed! 0 points' : '❌ Wrong poster! 0 points'
            : "⏰ Time's up! 0 points"}
      </p>
      <p class="answer"><strong>{answer.title}</strong></p>
      <button type="button" class="link" onclick={() => { glideNext = true; wholeWall = !wholeWall }}>
        {wholeWall ? 'Zoom on the answer' : 'See the whole wall'}
      </button>
      <div class="reveal">
        {#if answer.year || answer.stars?.length}
          <div class="cast">
            {#if answer.year}
              <h2>Released</h2>
              <p class="year">{answer.year}</p>
            {/if}
            {#if answer.stars?.length}
              <h2>Starring</h2>
              <ul>
                {#each answer.stars as name}
                  <li>{name}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="actions">
    <button type="button" bind:this={nextEl} onclick={nextRound}>Next</button>
  </div>
  <p class="change"><button type="button" class="link" onclick={backToSetup}>Change players</button></p>
  </div>
  </div>
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
  .player.out { opacity: 0.6; }
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
  .prompt { text-align: center; margin: 0.75rem 0; min-height: 3.6rem; }
  .prompt p { margin: 0; }
  .label { color: var(--muted); font-size: 0.9rem; }
  .title { font-size: clamp(1.2rem, 5vw, 1.8rem); font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
  .title .year { color: var(--muted); font-weight: 600; }

  /* Square on the left; answer, Next and Change players on its right (stacked below on narrow screens). */
  .stage { display: flex; flex-direction: column; gap: 0.5rem; }
  .main { min-width: 0; }
  .side { min-width: 0; }
  @media (min-width: 800px) {
    /* A bit wider than the 640px page column so the square can grow. */
    .stage {
      flex-direction: row; align-items: flex-start; gap: 1.25rem;
      width: min(780px, 100vw - 3rem); position: relative; left: 50%; transform: translateX(-50%);
    }
    .main { flex: 1 1 0; }
    .side { flex: 0 0 240px; }
    .side .result { margin-top: 0; }
    .side .actions { margin-top: 0.75rem; }
    .side .reveal { flex-direction: column; }
    .side .cast { text-align: center; }
  }
  .wrap { width: 100%; display: flex; justify-content: center; }
  .viewport {
    position: relative;
    /* clip: not a scroll container, so focusing a tile can never scroll the board. */
    overflow: hidden;
    overflow: clip;
    border-radius: 8px;
    background: var(--surface-2);
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .board {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
  }
  .board.live { will-change: transform; }
  .board.hidden { visibility: hidden; }
  /* The posters (drawn by script, see drawScreen); the tiles above are transparent targets. */
  .screen { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
  .screen.hidden { visibility: hidden; }
  .tile {
    position: absolute;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    overflow: hidden;
    cursor: pointer;
  }

  /* Highlights: a border drawn over the poster, scaled up as the board is scaled down (--inv). */
  .tile::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 0 solid var(--accent);
    pointer-events: none;
  }
  .ph { display: grid; place-items: center; height: 100%; font-size: calc(1.5rem * var(--inv)); opacity: 0.5; transition: opacity 300ms; }
  /* End of round: placeholders fade with the other posters (those are dimmed in the canvas). */
  .board.ended .tile:not(.target):not(.miss) .ph { opacity: 0.175; }
  .tile:focus-visible { outline: none; z-index: 1; }
  .tile:focus-visible::after { border-width: calc(3px * var(--inv)); border-style: dashed; }
  @media (hover: hover) {
    .board.live .tile:hover::after { border-width: calc(2px * var(--inv)); }
  }
  .tile.sel { z-index: 2; }
  .tile.sel::after { border-width: calc(4px * var(--inv)); border-style: solid; }
  .tile.miss { z-index: 2; }
  .tile.miss::after { border-width: calc(4px * var(--inv)); border-style: solid; border-color: var(--danger); }
  .tile.target {
    box-shadow: 0 0 calc(18px * var(--inv)) calc(6px * var(--inv)) var(--accent);
    z-index: 3;
  }
  .tile.target::after { border-width: calc(5px * var(--inv)); border-style: solid; }
  .board.ended .tile { cursor: default; }
  .badge {
    position: absolute;
    z-index: 1;
    top: calc(6px * var(--inv));
    right: calc(6px * var(--inv));
    display: grid;
    place-items: center;
    width: calc(26px * var(--inv));
    height: calc(26px * var(--inv));
    border-radius: 50%;
    color: #fff;
    font-size: calc(15px * var(--inv));
    font-weight: 700;
    line-height: 1;
  }
  .badge.ok { background: var(--accent); }
  .badge.ko { background: var(--danger); }

  .confirm { display: flex; gap: 1rem; align-items: center; justify-content: center; margin-top: 0.75rem; }
  .preview {
    flex: 0 0 76px;
    aspect-ratio: 2 / 3;
    border-radius: 8px;
    overflow: hidden;
    background: var(--surface-2);
    display: grid;
    place-items: center;
    font-size: 2rem;
  }
  .preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .confirm-side { display: grid; gap: 0.5rem; justify-items: start; }
  .confirm-side p { margin: 0; color: var(--muted); }
  .this { font-size: 1.15rem; min-width: 9rem; min-height: 52px; }

  .actions { display: flex; justify-content: center; margin-top: 1rem; }
  .actions button { min-width: 8rem; }
  .result { display: grid; gap: 0.75rem; justify-items: center; text-align: center; margin-top: 1.25rem; }
  .result p { margin: 0; }
  .verdict { font-weight: 700; font-size: 1.3rem; }
  .answer { font-size: 1.1rem; overflow-wrap: anywhere; }
  .reveal { display: flex; gap: 1.25rem; align-items: center; justify-content: center; width: 100%; }
  .cast { text-align: left; }
  .cast h2 { font-size: 0.9rem; margin: 0 0 0.4rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .cast .year { margin: 0 0 1rem; font-size: 1.2rem; font-weight: 700; }
  .cast ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .cast li { font-weight: 600; }
  .error { color: var(--danger); }
</style>
