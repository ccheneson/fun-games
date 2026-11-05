<script lang="ts">
  import { onDestroy } from 'svelte'
  import { shuffle } from '../lib/db/seed'
  import { FRANCE_PATH, MAP } from '../lib/france/outline'
  import { nearestBy, type Line, type Point } from '../lib/france/geo'
  import { applyPoints, distanceTo, pickRound, toRoundPlaces, ROUND_SIZE, type RoundPlace } from '../lib/games/places'

  /** How close (in map units) a drop must be to a marker or a river to count as aimed at it. */
  const DROP_RADIUS = 34
  /** Pointer travel (px) before a press becomes a drag instead of a click. */
  const DRAG_THRESHOLD = 6

  const seen = new Set<string>()
  const first = toRoundPlaces(pickRound(seen))
  let round = $state<RoundPlace[]>(first)
  let ids = $state(shuffle(first.map((c) => c.id)))
  let score = $state(0)
  let roundNo = $state(1)
  let selected = $state<string | null>(null)
  let wrongId = $state<string | null>(null)
  let wrongTarget = $state<string | null>(null)
  let hoverTarget = $state<string | null>(null)
  let lastFact = $state<{ name: string; fact: string } | null>(null)
  let drag = $state<{ id: string; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null)
  let svgEl = $state<SVGSVGElement>()
  let justDragged = false
  let wrongTimeout: ReturnType<typeof setTimeout> | undefined

  /** Placed labels flip to the left of their marker when they would run off the right edge of the map. */
  const LABEL_CHAR_WIDTH = 11
  const flips = (place: RoundPlace, gap: number) => place.x + gap + place.name.length * LABEL_CHAR_WIDTH > MAP.width - 4

  const done = $derived(round.every((c) => c.placed))
  const byId = (id: string) => round.find((c) => c.id === id)!
  const pathOf = (lines: Line[]) => lines.map((l) => 'M' + l.map(([x, y]) => `${x} ${y}`).join('L')).join('')

  function newRound() {
    round = toRoundPlaces(pickRound(seen))
    ids = shuffle(round.map((c) => c.id))
    selected = null
    lastFact = null
    roundNo++
  }

  function toMapPoint(clientX: number, clientY: number): Point | null {
    const ctm = svgEl?.getScreenCTM()
    if (!svgEl || !ctm) return null
    const pt = svgEl.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function targetAt(clientX: number, clientY: number): RoundPlace | null {
    const p = toMapPoint(clientX, clientY)
    if (!p) return null
    return nearestBy(round.filter((c) => !c.placed), (c) => distanceTo(c, p), DROP_RADIUS)
  }

  /** Try to put the name of place `id` on the marker / river `target`. */
  function attempt(id: string, target: RoundPlace) {
    const place = byId(id)
    if (place.placed || target.placed) return
    if (place.id === target.id) {
      place.placed = true
      score = applyPoints(score, true)
      lastFact = { name: place.name, fact: place.fact }
      selected = null
    } else {
      place.mistakes++
      score = applyPoints(score, false)
      wrongId = id
      wrongTarget = target.id
      clearTimeout(wrongTimeout)
      wrongTimeout = setTimeout(() => {
        wrongId = null
        wrongTarget = null
      }, 450)
    }
  }

  function onPointerDown(e: PointerEvent, id: string) {
    if (byId(id).placed || e.button > 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag = { id, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false }
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag) return
    drag.x = e.clientX
    drag.y = e.clientY
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD) drag.moved = true
    hoverTarget = drag.moved ? (targetAt(e.clientX, e.clientY)?.id ?? null) : null
  }

  function onPointerUp(e: PointerEvent) {
    if (!drag) return
    const { id, moved } = drag
    drag = null
    hoverTarget = null
    if (!moved) return // a plain click: handled by onclick (selection)
    justDragged = true
    const target = targetAt(e.clientX, e.clientY)
    if (target) attempt(id, target)
  }

  function onChipClick(id: string) {
    if (justDragged) {
      justDragged = false
      return
    }
    if (byId(id).placed) return
    selected = selected === id ? null : id
  }

  function onTargetActivate(target: RoundPlace) {
    if (selected) attempt(selected, target)
  }

  onDestroy(() => clearTimeout(wrongTimeout))
</script>

<h1>Villes, rivières et monuments</h1>
<p class="lead">Fais glisser chaque nom sur la carte : sur son point rond (ville), son losange (monument) ou son cours d'eau en surbrillance (rivière). Tu peux aussi toucher un nom, puis sa cible.</p>
<p class="score" aria-live="polite">Manche {roundNo} · Score : {score}</p>

<div class="board">
  <svg
    bind:this={svgEl}
    class="map"
    viewBox={`0 0 ${MAP.width} ${MAP.height}`}
    role="group"
    aria-label="Carte de la France avec {ROUND_SIZE} cibles : villes, monuments et rivières"
  >
    <path d={FRANCE_PATH} class="land" />
    {#each round as place, i (place.id)}
      <g
        class="target"
        class:river={place.kind === 'river'}
        class:site={place.kind === 'site'}
        class:placed={place.placed}
        class:hover={hoverTarget === place.id}
        class:wrong={wrongTarget === place.id}
        role="button"
        tabindex={place.placed ? -1 : 0}
        aria-label={place.placed ? place.name : `${place.kind === 'river' ? "Cours d'eau" : place.kind === 'site' ? 'Monument' : 'Ville'} ${i + 1}`}
        onclick={() => onTargetActivate(place)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTargetActivate(place))}
      >
        {#if place.lines}
          <path d={pathOf(place.lines)} class="river-hit" />
          <path d={pathOf(place.lines)} class="river-line" />
          <circle cx={place.x} cy={place.y} r="11" class="badge" />
          {#if place.placed}
            <text x={flips(place, 16) ? place.x - 16 : place.x + 16} y={place.y + 6} class="label" text-anchor={flips(place, 16) ? 'end' : 'start'}>{place.name}</text>
          {:else}
            <text x={place.x} y={place.y + 6} class="badge-num">{i + 1}</text>
          {/if}
        {:else}
          <circle cx={place.x} cy={place.y} r="20" class="hit" />
          {#if place.kind === 'site'}
            <rect x={place.x - 7} y={place.y - 7} width="14" height="14" transform={`rotate(45 ${place.x} ${place.y})`} class="dot diamond" />
          {:else}
            <circle cx={place.x} cy={place.y} r="8" class="dot" />
          {/if}
          {@const flip = place.placed && flips(place, 13)}
          <text x={flip ? place.x - 13 : place.x + 13} y={place.y + 6} class="label" class:num={!place.placed} class:site-num={!place.placed && place.kind === 'site'} text-anchor={flip ? 'end' : 'start'}>{place.placed ? place.name : i + 1}</text>
        {/if}
      </g>
    {/each}
  </svg>

  <div class="side">
    <ul class="names" aria-label="Noms à placer">
      {#each ids as id (id)}
        {@const place = byId(id)}
        <li>
          <button
            type="button"
            class="chip"
            class:placed={place.placed}
            class:selected={selected === id}
            class:dragging={drag?.moved && drag.id === id}
            class:shake={wrongId === id}
            disabled={place.placed}
            onpointerdown={(e) => onPointerDown(e, id)}
            onpointermove={onPointerMove}
            onpointerup={onPointerUp}
            onpointercancel={() => ((drag = null), (hoverTarget = null))}
            onclick={() => onChipClick(id)}
          >
            {place.name}
          </button>
        </li>
      {/each}
    </ul>

    <div class="fact" role="status" aria-live="polite">
      {#if lastFact}
        <strong>{lastFact.name}</strong>
        <p>{lastFact.fact}</p>
      {:else}
        <p class="hint">Place bien un nom pour découvrir une anecdote à son sujet. +1 pour une bonne réponse, −1 pour une mauvaise.</p>
      {/if}
    </div>

    {#if done}
      <button type="button" class="next" onclick={newRound}>{ROUND_SIZE} nouvelles cibles</button>
    {/if}
  </div>
</div>

<details class="about">
  <summary>À propos des données</summary>
  <p>
    La carte, les cours d'eau et les emplacements des villes et des monuments sont simplifiés et approximatifs : ils servent à jouer,
    pas à se repérer ni à naviguer. Le tracé des rivières est généralisé, les distances et les frontières ne sont pas exactes, et un
    repère peut se trouver à quelques kilomètres du lieu réel. Les anecdotes, chiffres (hauteurs, longueurs, dates) et noms ont été
    rédigés de bonne foi mais sans vérification systématique : ils peuvent contenir des erreurs ou des simplifications. Si vous en
    repérez une, merci de la signaler.
  </p>
  <p>
    Fond de carte et cours d'eau : <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>
    (domaine public), simplifiés.
  </p>
</details>

{#if drag?.moved}
  {@const dragged = byId(drag.id)}
  <div class="ghost" style:left={drag.x + 'px'} style:top={drag.y + 'px'}>{dragged.name}</div>
{/if}

<style>
  .lead { color: var(--muted); margin-top: 0; }
  .score { color: var(--muted); margin: 0 0 0.75rem; }
  /* Wider than the 640px page column so the map and its markers are big enough to aim at. */
  .board {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
    align-items: start;
    width: min(960px, calc(100vw - 2rem));
    margin-left: 50%;
    transform: translateX(-50%);
  }
  @media (min-width: 720px) {
    .board { grid-template-columns: minmax(0, 1fr) 260px; }
  }
  .map { width: 100%; max-height: 75vh; height: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; touch-action: manipulation; }
  .land { fill: var(--surface-2); stroke: var(--border); stroke-width: 1; stroke-linejoin: round; }
  .target { cursor: pointer; outline: none; }
  .target.placed { cursor: default; }
  .hit { fill: transparent; }
  .board { --site: #d98e04; }
  @media (prefers-color-scheme: dark) { .board { --site: #f0b429; } }
  .dot.diamond { fill: var(--site); }
  .label.num.site-num { fill: var(--site); }
  .dot { fill: var(--accent); stroke: var(--surface); stroke-width: 2; transition: r 0.1s; }
  .target.hover .dot { fill: var(--success); r: 12; }
  .target:focus-visible .dot { stroke: var(--text); }
  .target.placed .dot { fill: var(--success); }
  .target.wrong .dot { fill: var(--danger); r: 12; }
  .label { font-size: 18px; font-weight: 700; fill: var(--text); paint-order: stroke; stroke: var(--surface); stroke-width: 4px; stroke-linejoin: round; pointer-events: none; }
  .label.num { fill: var(--accent); }
  .river-hit { fill: none; stroke: transparent; stroke-width: 28; stroke-linecap: round; stroke-linejoin: round; }
  .river-line { fill: none; stroke: var(--accent); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9; transition: stroke-width 0.1s; }
  .badge { fill: var(--accent); stroke: var(--surface); stroke-width: 2; }
  .badge-num { font-size: 15px; font-weight: 700; fill: #fff; text-anchor: middle; pointer-events: none; }
  .target.river.hover .river-line { stroke: var(--success); stroke-width: 10; }
  .target.river.wrong .river-line { stroke: var(--danger); stroke-width: 10; }
  .target.river.placed .river-line, .target.river.placed .badge { stroke: var(--success); }
  .target.river.placed .badge { fill: var(--success); stroke: var(--surface); }
  .side { display: grid; gap: 1rem; }
  .names { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
  @media (min-width: 720px) {
    .names { grid-template-columns: 1fr; }
  }
  .chip {
    width: 100%;
    background: var(--surface);
    color: var(--text);
    border: 3px solid var(--border);
    cursor: grab;
    touch-action: none; /* let the finger drag the name instead of scrolling the page */
    user-select: none;
    -webkit-user-select: none;
  }
  .chip.selected { border-color: var(--accent); }
  .chip.placed { opacity: 0.5; border-color: var(--success); cursor: default; text-decoration: line-through; }
  .chip.dragging { opacity: 0.35; }
  .chip.shake { animation: shake 0.4s; border-color: var(--danger); }
  .ghost {
    position: fixed;
    z-index: 10;
    transform: translate(-50%, -140%);
    padding: 0.6rem 1rem;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    font-weight: 700;
    pointer-events: none;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  }
  .fact { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0.75rem 1rem; min-height: 5.5rem; }
  .fact p { margin: 0.25rem 0 0; }
  .fact .hint { color: var(--muted); margin: 0; }
  .next { justify-self: stretch; }
  .about {
    margin-top: 1.5rem;
    color: var(--muted);
    font-size: 0.85rem;
    width: min(960px, calc(100vw - 2rem));
    margin-left: 50%;
    transform: translateX(-50%);
  }
  .about summary { cursor: pointer; }
  .about p { margin: 0.5rem 0 0; max-width: 70ch; }
  .about a { color: inherit; }
  @keyframes shake {
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
</style>
