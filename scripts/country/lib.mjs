// Shared helpers for the country scripts. Plain ESM, no dependencies (Node 18+).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
export const CACHE_DIR = path.resolve('.cache/natural-earth')

/** Natural Earth GeoJSON (public domain), downloaded once into .cache/. */
export async function naturalEarth(name) {
  const file = path.join(CACHE_DIR, name + '.geojson')
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    // not cached yet
  }
  await mkdir(CACHE_DIR, { recursive: true })
  console.error(`Downloading ${name} (cached in .cache/ afterwards)…`)
  const res = await fetch(BASE + name + '.geojson', { signal: AbortSignal.timeout(180_000) })
  if (!res.ok) throw new Error(`Download of ${name} failed: HTTP ${res.status}`)
  const text = await res.text()
  await writeFile(file, text)
  return JSON.parse(text)
}

export function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) {
      out._.push(a)
      continue
    }
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true
    else {
      out[a.slice(2)] = next
      i++
    }
  }
  return out
}

/** Lower-case, accent-free, letters and digits only: for matching names. */
export const norm = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const slug = (s) => norm(s).replace(/ /g, '-')

/** Douglas-Peucker line simplification (iterative). */
export function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [x1, y1] = points[a]
    const [x2, y2] = points[b]
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1e-9
    let idx = -1
    let dmax = 0
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / len
      if (d > dmax) {
        dmax = d
        idx = i
      }
    }
    if (idx > 0 && dmax > tolerance) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

export function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function distToRing(x, y, ring) {
  let best = Infinity
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2))
    best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)))
  }
  return best
}

/** Approximate area of a lon/lat ring (planar, longitudes scaled by cos(latitude)). */
export function ringArea(ring) {
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length
  const k = Math.cos((lat * Math.PI) / 180)
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * k * ring[i][1] - ring[i][0] * k * ring[j][1]
  return Math.abs(a / 2)
}

export function bbox(points) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { minX, maxX, minY, maxY }
}

export const lineLength = (line) => line.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0)

/** Midpoint (by length) of a polyline. */
export function midpoint(line) {
  const half = lineLength(line) / 2
  let acc = 0
  for (let i = 1; i < line.length; i++) {
    const d = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1])
    if (acc + d >= half && d > 0) {
      const t = (half - acc) / d
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t]
    }
    acc += d
  }
  return line[0]
}
