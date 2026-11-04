<script lang="ts">
  import { games } from '../lib/games/registry'
</script>

<h1>Fun games</h1>
<p class="lead">Pick a game</p>

<ul class="grid">
  {#each games as game (game.id)}
    <li>
      <a class="card" href={'#' + game.route}>
        <span class="emoji" aria-hidden="true">{game.emoji}</span>
        <strong>{game.name}</strong>
        <span class="desc">{game.description}</span>
      </a>
    </li>
  {/each}
</ul>

<style>
  .lead { color: var(--muted); margin-top: 0; }
  .grid {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 1.25rem;
    height: 100%;
    box-sizing: border-box;
    border-radius: 16px;
    background: var(--surface);
    color: inherit;
    text-decoration: none;
    border: 1px solid var(--border);
    transition: transform 0.15s, border-color 0.15s;
  }
  .card:hover, .card:focus-visible { transform: translateY(-2px); border-color: var(--accent); }
  .emoji { font-size: 2.2rem; }
  .desc { color: var(--muted); font-size: 0.9rem; }
</style>
