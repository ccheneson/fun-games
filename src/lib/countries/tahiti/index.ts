import type { CountryData } from '../types'
import { content } from './content'
import { map } from './map'

const country: CountryData = { ...content, map }
export default country
