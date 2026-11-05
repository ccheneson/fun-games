import { meta as france } from './france/meta'
import { meta as tahiti } from './tahiti/meta'
// <countries:imports> (scripts/country/scaffold.mjs adds new countries above this line)
import type { CountryData, CountryMeta } from './types'

export interface CountryEntry {
  meta: CountryMeta
  /** The whole country (map and content) is only loaded when its game opens. */
  load: () => Promise<{ default: CountryData }>
}

export const COUNTRIES: CountryEntry[] = [
  { meta: france, load: () => import('./france') },
  { meta: tahiti, load: () => import('./tahiti') },
  // <countries:entries> (scripts/country/scaffold.mjs adds new countries above this line)
]
