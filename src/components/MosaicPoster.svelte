<script lang="ts">
  import { coverCrop, mosaicCells, mosaicRows } from '../lib/games/mosaic'

  /**
   * Pixelated poster for an obscuring `level` (100 = big tiles; tiles shrink slowly and the poster
   * is only almost clear in the last points band, the same at any devicePixelRatio; 10 = one tile
   * per device pixel, i.e. fully sharp). Draws nothing until the image is loaded.
   */
  let { src, level }: { src: string; level: number } = $props()

  let canvas = $state<HTMLCanvasElement>()
  let width = $state(0)
  let height = $state(0)
  let image = $state<HTMLImageElement | null>(null)
  let dpr = $state(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
  const small = document.createElement('canvas')
  const W = $derived(Math.max(1, Math.round(width * dpr)))
  const H = $derived(Math.max(1, Math.round(height * dpr)))
  // Integer, so the canvas is only redrawn when the tile count actually changes (not every frame).
  const cells = $derived(mosaicCells(level, W))

  // Load the poster (cached by the round's preload). No crossOrigin: hosts may lack CORS, and a
  // tainted canvas still displays fine as long as pixels are never read back.
  $effect(() => {
    const url = src
    let stale = false
    image = null
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.onload = () => {
      if (!stale) image = img
    }
    img.src = url
    return () => {
      stale = true
      img.onload = null
    }
  })

  // Redraw when the image, the tile count or the box size changes.
  $effect(() => {
    if (!canvas || !image || width <= 0 || height <= 0) return
    const cols = cells
    const rows = Math.min(H, mosaicRows(cols, W, H))
    small.width = cols
    small.height = rows
    const sctx = small.getContext('2d')
    if (sctx) {
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'
      const { sx, sy, sw, sh } = coverCrop(image.naturalWidth, image.naturalHeight, W, H)
      sctx.clearRect(0, 0, cols, rows)
      sctx.drawImage(image, sx, sy, sw, sh, 0, 0, cols, rows)
    }
    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== H) canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(small, 0, 0, W, H)
  })
</script>

<svelte:window onresize={() => (dpr = window.devicePixelRatio || 1)} />

<div class="mosaic" bind:clientWidth={width} bind:clientHeight={height}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
  .mosaic { position: absolute; inset: 0; }
  canvas { width: 100%; height: 100%; display: block; }
</style>
