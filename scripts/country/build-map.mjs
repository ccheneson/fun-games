#!/usr/bin/env node
// Builds the map of a country (outline + river courses) for the "places" game.
//
//   node scripts/country/build-map.mjs --country "France" [--lang fr] [--id france] [--rivers 30]
//        [--keep-radius 8] [--min-length 25] [--include "Loire,Seine"]  (exact list of rivers to use) [--exclude "Sarre"]
//        [--alias "Rhne=Rhône,Rhein=Rhine"]
//
// Writes src/lib/countries/<id>/map.ts (generated, do not edit by hand) and, in .cache/countries/<id>/,
// a preview.svg and an info.json. Prints the rivers it found so they can be checked.
// Data: Natural Earth 1:10m (public domain), simplified.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  bbox,
  distToRing,
  douglasPeucker,
  lineLength,
  midpoint,
  naturalEarth,
  norm,
  parseArgs,
  pointInRing,
  ringArea,
  slug,
} from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
const query = args.country
if (!query || query === true) {
  console.error('Usage: node scripts/country/build-map.mjs --country "France" [--lang fr] [--id france] [--rivers 30]')
  process.exit(1)
}

const SIZE = 620 // the longer side of the map is this many map units
const RIVER_COUNT = Number(args.rivers ?? 30)
const KEEP_RADIUS = Number(args['keep-radius'] ?? 8) // degrees: keep islands/parts within this distance of the main landmass
const MIN_RIVER_LENGTH = Number(args['min-length'] ?? 25) // map units
const BORDER_TOLERANCE = 0.06 // degrees: river points this close to the border still count as inside
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])
const include = new Set(list(args.include).map(norm))
const exclude = new Set(list(args.exclude).map(norm))
const alias = new Map(list(args.alias).map((p) => p.split('=').map((s) => s.trim())).filter((p) => p.length === 2).map(([a, b]) => [norm(a), b]))

// ---- find the country -------------------------------------------------------
const countries = (await naturalEarth('ne_10m_admin_0_countries')).features
const q = norm(query)
const nameKeys = (f) => Object.entries(f.properties).filter(([k, v]) => /^(NAME|ADMIN)/.test(k) && typeof v === 'string').map(([, v]) => norm(v))
let matches = countries.filter((f) => nameKeys(f).includes(q))
if (matches.length === 0) matches = countries.filter((f) => [f.properties.ADM0_A3, f.properties.ISO_A3_EH, f.properties.ISO_A2_EH].some((c) => c && norm(c) === q))
if (matches.length === 0) {
  const distance = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
    for (let j = 1; j <= b.length; j++) d[0][j] = j
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    return d[a.length][b.length]
  }
  const near = countries
    .filter((f) => nameKeys(f).some((n) => n.includes(q) || distance(n, q) <= Math.max(2, Math.floor(q.length / 4))))
    .slice(0, 6)
    .map((f) => f.properties.NAME_EN ?? f.properties.NAME)
  console.error(`No country called "${query}" in Natural Earth.` + (near.length ? ` Did you mean: ${[...new Set(near)].join(', ')}?` : ''))
  process.exit(2)
}
if (new Set(matches.map((f) => f.properties.ADM0_A3)).size > 1) {
  console.error(`"${query}" is ambiguous: ${matches.map((f) => `${f.properties.NAME_EN} (${f.properties.ADM0_A3})`).join(', ')}. Pass the ISO 3-letter code.`)
  process.exit(2)
}
const country = matches[0]
const props = country.properties
const id = typeof args.id === 'string' ? args.id : slug(props.NAME_EN ?? props.NAME)
const lang = typeof args.lang === 'string' ? args.lang : 'fr'
const localName = props['NAME_' + lang.toUpperCase()] ?? props.NAME_EN

// ---- landmass: main polygon + nearby islands -------------------------------
const geom = country.geometry
const rings = (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates).map((p) => p[0])
const areas = rings.map(ringArea)
const main = areas.indexOf(Math.max(...areas))
const mb = bbox(rings[main])
// A landmass is kept when its centre lies within KEEP_RADIUS degrees of the main landmass' bounding box
// (overseas territories and far-away parts, like Alaska or French Guiana, are left out).
const near = (b) => {
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  return cx >= mb.minX - KEEP_RADIUS && cx <= mb.maxX + KEEP_RADIUS && cy >= mb.minY - KEEP_RADIUS && cy <= mb.maxY + KEEP_RADIUS
}
const kept = rings.filter((r, i) => i === main || (near(bbox(r)) && areas[i] >= areas[main] * 1e-4))
const all = bbox(kept.flat())
if (all.maxX - all.minX > 120 || all.maxY - all.minY > 60) {
  console.error(
    `${props.NAME_EN} spans ${(all.maxX - all.minX).toFixed(0)}° x ${(all.maxY - all.minY).toFixed(0)}° after dropping far-away parts: too big or too stretched for a flat map. ` +
      `Try a smaller --keep-radius (now ${KEEP_RADIUS}).`,
  )
  process.exit(3)
}

// ---- projection (equirectangular, longitudes scaled by cos of the middle latitude) ----
const padX = (all.maxX - all.minX) * 0.04
const padY = (all.maxY - all.minY) * 0.04
const lon0 = all.minX - padX
const latMax = all.maxY + padY
const latMin = all.minY - padY
const lonMax = all.maxX + padX
const k = Math.cos((((latMax + latMin) / 2) * Math.PI) / 180)
const scale = SIZE / Math.max((lonMax - lon0) * k, latMax - latMin)
const width = +((lonMax - lon0) * k * scale).toFixed(1)
const height = +((latMax - latMin) * scale).toFixed(1)
const project = ([lon, lat]) => [(lon - lon0) * k * scale, (latMax - lat) * scale]
const kmPerUnit = 111.2 / scale
const f1 = (n) => n.toFixed(1)
const toPath = (pts) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'Z'

const outlineRings = kept.map((r) => douglasPeucker(project0(r), 0.3)).filter((r) => r.length >= 4)
function project0(r) {
  const pts = r.map(project)
  return pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1] ? pts.slice(0, -1) : pts
}
const outline = outlineRings.map(toPath).join('')

// ---- rivers ------------------------------------------------------------------
const ex = { minX: all.minX - BORDER_TOLERANCE, maxX: all.maxX + BORDER_TOLERANCE, minY: all.minY - BORDER_TOLERANCE, maxY: all.maxY + BORDER_TOLERANCE }
const keptBoxes = kept.map((r) => ({ r, b: bbox(r) }))
function inside([x, y]) {
  if (x < ex.minX || x > ex.maxX || y < ex.minY || y > ex.maxY) return false
  for (const { r, b } of keptBoxes) {
    if (x < b.minX - BORDER_TOLERANCE || x > b.maxX + BORDER_TOLERANCE || y < b.minY - BORDER_TOLERANCE || y > b.maxY + BORDER_TOLERANCE) continue
    if (pointInRing(x, y, r) || distToRing(x, y, r) <= BORDER_TOLERANCE) return true
  }
  return false
}

const rivers = new Map() // normalised key -> { name, seenAs:Set, lines }
for (const file of ['ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_europe']) {
  for (const ft of (await naturalEarth(file)).features) {
    const p = ft.properties
    const raw = p.name_en ?? p.name
    if (!raw || !ft.geometry) continue
    const key0 = norm(raw)
    const display = alias.get(key0) ?? raw
    const key = norm(display)
    const lines = ft.geometry.type === 'MultiLineString' ? ft.geometry.coordinates : [ft.geometry.coordinates]
    if (!lines.some((l) => l.some(([x, y]) => x >= ex.minX && x <= ex.maxX && y >= ex.minY && y <= ex.maxY))) continue
    for (const line of lines) {
      let run = []
      const flush = () => {
        if (run.length > 1) {
          const projected = douglasPeucker(run.map(project), 0.3)
          if (lineLength(projected) >= 5) {
            if (!rivers.has(key)) rivers.set(key, { name: display, seenAs: new Set(), lines: [] })
            const r = rivers.get(key)
            r.seenAs.add(p.name ?? raw)
            r.lines.push(projected)
          }
        }
        run = []
      }
      for (const c of line) (inside(c) ? run.push(c) : flush())
      flush()
    }
  }
}

const ranked = [...rivers.entries()]
  .map(([key, r]) => ({ key, ...r, length: r.lines.reduce((s, l) => s + lineLength(l), 0) }))
  .filter((r) => !exclude.has(r.key))
  .sort((a, b) => b.length - a.length)
// --include gives the exact list (curated); otherwise the longest rivers inside the country.
const chosen = include.size
  ? ranked.filter((r) => include.has(r.key))
  : ranked.filter((r) => r.length >= MIN_RIVER_LENGTH).slice(0, RIVER_COUNT)
for (const wanted of include) if (!chosen.some((r) => r.key === wanted)) console.error(`warning: --include "${wanted}" matched no river inside ${props.NAME_EN} (check spelling or --alias)`)
const others = ranked.filter((r) => !chosen.includes(r)).slice(0, 25)

const usedIds = new Set()
const riverData = chosen.map((r) => {
  let rid = slug(r.name)
  while (usedIds.has(rid)) rid += '-2'
  usedIds.add(rid)
  const longest = r.lines.reduce((a, b) => (lineLength(b) > lineLength(a) ? b : a))
  return { id: rid, name: r.name, seenAs: [...r.seenAs], km: Math.round(r.length * kmPerUnit), lines: r.lines, label: midpoint(longest) }
})

// ---- output ------------------------------------------------------------------
const dir = path.resolve('src/lib/countries', id)
await mkdir(dir, { recursive: true })
const riverTs = riverData
  .map(
    (r) =>
      `    {\n      id: '${r.id}',\n      label: [${r.label.map(f1).join(', ')}],\n      lines: [\n${r.lines.map((l) => `        [${l.map(([x, y]) => `[${f1(x)}, ${f1(y)}]`).join(', ')}],`).join('\n')}\n      ],\n    },`,
  )
  .join('\n')
await writeFile(
  path.join(dir, 'map.ts'),
  `// Generated by scripts/country/build-map.mjs from Natural Earth 1:10m (public domain), simplified.
// Do not edit by hand: re-run the script. 1 map unit is about ${kmPerUnit.toFixed(2)} km.
import type { MapGeometry } from '../types'

export const map: MapGeometry = {
  lon0: ${lon0.toFixed(4)},
  latMax: ${latMax.toFixed(4)},
  k: ${k.toFixed(6)},
  scale: ${scale.toFixed(4)},
  width: ${width},
  height: ${height},
  outline:
    '${outline}',
  rivers: [
${riverTs}
  ],
}
`,
)

const cacheDir = path.resolve('.cache/countries', id)
await mkdir(cacheDir, { recursive: true })
const palette = (i) => `hsl(${Math.round((i * 360) / Math.max(riverData.length, 1))},70%,40%)`
await writeFile(
  path.join(cacheDir, 'preview.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${Math.round(width * 1.4)}"><rect width="${width}" height="${height}" fill="#fff"/><path d="${outline}" fill="#eee" stroke="#999"/>` +
    riverData
      .map(
        (r, i) =>
          r.lines.map((l) => `<path d="M${l.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}" fill="none" stroke="${palette(i)}" stroke-width="2.5"/>`).join('') +
          `<text x="${f1(r.label[0] + 4)}" y="${f1(r.label[1])}" font-size="12" fill="${palette(i)}">${r.id}</text>`,
      )
      .join('') +
    '</svg>',
)
await writeFile(
  path.join(cacheDir, 'info.json'),
  JSON.stringify({ id, iso: props.ADM0_A3, iso2: props.ISO_A2_EH, population: props.POP_EST, nameEn: props.NAME_EN, nameLocal: localName, lang, bboxDeg: all, kmPerUnit, rivers: riverData.map(({ id, name, seenAs, km }) => ({ id, name, seenAs, km })), otherCandidates: others.map((r) => ({ name: r.name, seenAs: [...r.seenAs], km: Math.round(r.length * kmPerUnit) })) }, null, 2),
)

console.log(`Country: ${props.NAME_EN} (${props.ADM0_A3}) -> id "${id}", name in "${lang}": ${localName}`)
console.log(`Landmasses kept: ${kept.length} of ${rings.length}; map ${width} x ${height} units, 1 unit ≈ ${kmPerUnit.toFixed(2)} km`)
console.log(`Rivers (${riverData.length}):`)
for (const r of riverData) console.log(`  ${r.id.padEnd(22)} ${String(r.km).padStart(5)} km  ${r.seenAs.join(' / ')}`)
if (others.length) console.log(`Other candidates (not used; pass --include to pick your own list): ${others.map((r) => `${r.name} ${Math.round(r.length * kmPerUnit)} km`).join(', ')}`)
console.log(`Wrote src/lib/countries/${id}/map.ts, .cache/countries/${id}/preview.svg and info.json`)
