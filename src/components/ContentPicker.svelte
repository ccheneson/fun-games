<script lang="ts">
  import { settings, type Content } from '../lib/settings.svelte'

  const contents: { id: Content; label: string }[] = [
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV shows' },
    { id: 'both', label: 'Both' },
  ]
</script>

<p class="ask">What to guess?</p>
<div class="choices" role="group" aria-label="What to guess">
  {#each contents as c (c.id)}
    <button type="button" class="toggle" aria-pressed={settings.content === c.id} onclick={() => settings.setContent(c.id)}>{c.label}</button>
  {/each}
</div>

<style>
  .ask { margin: 0; font-weight: 600; font-size: 1.2rem; }
  .choices { display: flex; gap: 0.5rem; }
</style>
