<script lang="ts">
  import { onMount } from 'svelte'
  import { games } from './lib/games/registry'
  import { dataStore } from './lib/store.svelte'
  import { theme } from './lib/theme.svelte'
  import Menu from './routes/Menu.svelte'
  import Settings from './routes/Settings.svelte'

  const currentPath = () => location.hash.replace(/^#/, '') || '/'
  let path = $state(currentPath())

  const game = $derived(games.find((g) => g.route === path))

  onMount(() => {
    // Seed in the background: the menu never waits for data.
    dataStore.loadImdb()
    dataStore.load()
  })
</script>

<svelte:window onhashchange={() => (path = currentPath())} />

<header>
  {#if path !== '/'}
    <a class="back" href="#/">← Games</a>
  {/if}
  <span class="spacer"></span>
  <button
    class="theme"
    type="button"
    onclick={() => theme.toggle()}
    aria-label={theme.resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    title={theme.resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
  >{theme.resolved === 'dark' ? '☀️' : '🌙'}</button>
  {#if path !== '/settings'}
    <a class="gear" href="#/settings" aria-label="Settings">⚙️</a>
  {/if}
</header>

<main>
  {#if path === '/settings'}
    <Settings />
  {:else if game}
    {#await Promise.all([game.load(), game.props?.() ?? {}])}
      <p>Loading…</p>
    {:then [mod, props]}
      <mod.default {...props} />
    {:catch}
      <p class="error">Could not load this game.</p>
    {/await}
  {:else}
    <Menu />
  {/if}
</main>

<style>
  header { display: flex; align-items: center; max-width: 640px; margin: 0 auto; padding: 0.75rem 1rem 0; }
  .spacer { flex: 1; }
  .back, .gear { color: inherit; text-decoration: none; padding: 0.4rem; }
  /* Icon button like the gear: override the global accent-filled button style. */
  .theme { background: transparent; border: none; color: inherit; padding: 0.4rem; min-width: 44px; font-weight: normal; }
  main { max-width: 640px; margin: 0 auto; padding: 0.5rem 1rem 3rem; }
  .error { color: var(--danger); }
</style>
