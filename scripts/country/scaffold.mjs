#!/usr/bin/env node
// Creates the written part of a country and registers it, after build-map.mjs has generated its map:
//
//   node scripts/country/scaffold.mjs --id italy [--name "Italie"] [--lang fr] [--force]
//
// Writes src/lib/countries/<id>/{content.ts,index.ts,meta.ts} (content.ts is a skeleton to fill in:
// cities, sites, a name and a fact for every river) and adds the country to src/lib/countries/registry.ts.
// Nothing is overwritten without --force. `npm test` fails until the skeleton is complete.
import { readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
const id = args.id
if (!id || id === true) {
  console.error('Usage: node scripts/country/scaffold.mjs --id italy [--name "Italie"] [--lang fr] [--force]')
  process.exit(1)
}
const infoFile = path.resolve('.cache/countries', id, 'info.json')
let info
try {
  info = JSON.parse(await readFile(infoFile, 'utf8'))
} catch {
  console.error(`No ${infoFile}: run scripts/country/build-map.mjs --country ... --id ${id} first.`)
  process.exit(2)
}
const lang = typeof args.lang === 'string' ? args.lang : (info.lang ?? 'fr')
const name = typeof args.name === 'string' ? args.name : info.nameLocal
const dir = path.resolve('src/lib/countries', id)
const exists = (f) => access(f).then(() => true, () => false)
const q = (v) => JSON.stringify(v)
const builtIn = lang === 'fr' || lang === 'en'

const flag = info.iso2 && /^[A-Z]{2}$/.test(info.iso2) ? String.fromCodePoint(...[...info.iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🗺️'

// ---- meta.ts ---------------------------------------------------------------------
const menuName = { fr: `${name} : villes, rivières et monuments`, en: `${name}: cities, rivers and landmarks` }[lang] ?? `TODO (${lang}) ${name}: cities, rivers and landmarks`
const menuDescription =
  {
    fr: 'Fais glisser les noms de 5 villes, rivières ou monuments sur leur emplacement sur la carte, et découvre une anecdote sur chacun.',
    en: 'Drag the names of 5 cities, rivers or landmarks onto their place on the map and learn a fun fact about each.',
  }[lang] ?? `TODO (${lang}) Drag the names of 5 cities, rivers or landmarks onto their place on the map and learn a fun fact about each.`

// ---- content.ts ------------------------------------------------------------------
const stringsBlock = builtIn
  ? `makeStrings('${lang}', ${q(name)})`
  : `// TODO: translate every text below into "${lang}" (keep the {placeholders}); the tests reject leftover TODOs.
  {
    title: ${q(`TODO (${lang}) ${name}: cities, rivers and landmarks`)},
    lead: 'TODO Drag each name onto the map: onto its round dot (city), its diamond (landmark) or its highlighted course (river). You can also tap a name, then its target.',
    scoreLine: 'TODO Round {round} · Score: {score}',
    hint: 'TODO Place a name correctly to learn a fun fact about it. +1 for a right answer, −1 for a wrong one.',
    nextRound: 'TODO Next {n} targets',
    mapLabel: ${q(`TODO Map: ${name}, {n} targets to place (cities, landmarks and rivers)`)},
    namesLabel: 'TODO Names to place',
    kindLabels: { city: 'TODO City', site: 'TODO Landmark', river: 'TODO River' },
    aboutTitle: 'TODO About the data',
    aboutText: 'TODO The map, the rivers and the locations of cities and landmarks are simplified and approximate: they are meant for playing, not for finding your way or navigating. River courses are generalised, distances and borders are not exact, and a marker can be a few kilometres away from the real place. The fun facts, figures (heights, lengths, dates) and names were written in good faith but not systematically verified: they may contain errors or simplifications. If you spot one, please report it.',
    aboutSource: 'TODO Base map and rivers: {link} (public domain), simplified.',
  }`
const riversBlock = info.rivers.map((r) => `    ${/^[a-z]+$/.test(r.id) ? r.id : q(r.id)}: { name: ${q(r.name)}, fact: '' }, // TODO name in "${lang}" + fact (~${r.km} km in the country)`).join('\n')
const content = `${builtIn ? "import { makeStrings } from '../strings'\n" : ''}import type { CountryContent } from '../types'

/** Written part of ${info.nameEn}: cities, sites and rivers, each with a fun fact (in "${lang}"). Fill in every TODO. */
export const content: CountryContent = {
  id: ${q(id)},
  name: ${q(name)},
  lang: ${q(lang)},
  // ~30 largest cities: { name, lat, lon, fact }
  cities: [],
  // ~50 famous sites, at most one per commune: { name, city, lat, lon, fact }
  sites: [],
  rivers: {
${riversBlock}
  },
  strings: ${stringsBlock},
}
`
const index = `import type { CountryData } from '../types'
import { content } from './content'
import { map } from './map'

const country: CountryData = { ...content, map }
export default country
`
const meta = `import type { CountryMeta } from '../types'

export const meta: CountryMeta = {
  id: ${q(id)},
  emoji: ${q(flag)},
  name: ${q(menuName)},
  description: ${q(menuDescription)},
}
`
for (const [file, text] of [['content.ts', content], ['index.ts', index], ['meta.ts', meta]]) {
  const target = path.join(dir, file)
  if ((await exists(target)) && !args.force) {
    console.log(`kept existing ${path.relative('.', target)} (use --force to overwrite)`)
    continue
  }
  await writeFile(target, text)
  console.log(`wrote ${path.relative('.', target)}`)
}

// ---- registry --------------------------------------------------------------------
const regFile = path.resolve('src/lib/countries/registry.ts')
let reg = await readFile(regFile, 'utf8')
const ident = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '')
if (reg.includes(`from './${id}/meta'`)) console.log('already registered')
else {
  const impMarker = '// <countries:imports>'
  const entMarker = '// <countries:entries>'
  if (!reg.includes(impMarker) || !reg.includes(entMarker)) throw new Error('registry.ts markers not found')
  reg = reg.replace(impMarker, `import { meta as ${ident} } from './${id}/meta'\n${impMarker}`)
  reg = reg.replace(entMarker, `{ meta: ${ident}, load: () => import('./${id}') },\n  ${entMarker}`)
  await writeFile(regFile, reg)
  console.log(`registered "${id}" in src/lib/countries/registry.ts`)
}
console.log(`Next: fill in src/lib/countries/${id}/content.ts, then run npm test.`)
