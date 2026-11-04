<script lang="ts">
  let { src, alt }: { src: string | null; alt: string } = $props()
  let failed = $state(false)
  $effect(() => {
    src
    failed = false
  })
</script>

<div class="poster">
  {#if src && !failed}
    <img {src} {alt} width="250" height="370" onerror={() => (failed = true)} />
  {:else}
    <div class="placeholder" role="img" aria-label="No poster available">🎬</div>
  {/if}
</div>

<style>
  .poster {
    width: min(100%, 220px);
    aspect-ratio: 2 / 3;
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface-2);
    margin-inline: auto;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .placeholder {
    display: grid;
    place-items: center;
    height: 100%;
    font-size: 3rem;
    opacity: 0.5;
  }
</style>
