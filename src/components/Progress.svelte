<script lang="ts">
  import type { Progress } from '../lib/db/seed'
  let { progress }: { progress: Progress } = $props()
  const pct = $derived(progress.total ? Math.round((progress.done / progress.total) * 100) : 0)
</script>

<div class="progress">
  <p>{progress.label || 'Loading…'}{progress.total ? ` ${progress.done}/${progress.total}` : ''}</p>
  <div class="bar"><div class="fill" class:indeterminate={!progress.total} style:width={progress.total ? pct + '%' : '40%'}></div></div>
</div>

<style>
  .progress { width: min(100%, 360px); margin-inline: auto; text-align: center; }
  .bar { height: 8px; border-radius: 4px; background: var(--surface-2); overflow: hidden; }
  .fill { height: 100%; background: var(--accent); transition: width 0.2s; }
  .indeterminate { animation: slide 1.2s ease-in-out infinite alternate; }
  @keyframes slide { from { margin-left: 0 } to { margin-left: 60% } }
</style>
