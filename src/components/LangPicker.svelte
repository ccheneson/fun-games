<script lang="ts">
  import { settings, type LangFilter } from '../lib/settings.svelte'

  const langs: { id: LangFilter; label: string }[] = [
    { id: 'fr', label: 'French titles' },
    { id: 'other', label: 'Non-French titles' },
    { id: 'both', label: 'Both' },
  ]
</script>

<p class="ask">Which titles?</p>
<div class="choices" role="group" aria-label="Which titles">
  {#each langs as l (l.id)}
    <button type="button" class="toggle" aria-pressed={settings.titleLang === l.id} onclick={() => settings.setTitleLang(l.id)}>{l.label}</button>
  {/each}
</div>

<style>
  .ask { margin: 0; font-weight: 600; font-size: 1.2rem; }
  .choices { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
</style>
