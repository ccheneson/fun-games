import { INTERNET_ENABLED } from './config'
import { countTitles } from './db/db'
import { ensureImdbSeeded } from './db/imdb'
import { ensureSeeded, refreshTitles, type Progress } from './db/seed'

class DataStore {
  count = $state(0)
  busy = $state<'seeding' | 'refreshing' | null>(null)
  progress = $state<Progress>({ label: '', done: 0, total: 0 })
  error = $state('')
  imdbCount = $state(0)
  imdbError = $state('')
  /** Bumped each time the stored set is replaced. */
  version = $state(0)

  private async run(kind: 'seeding' | 'refreshing', job: (cb: (p: Progress) => void) => Promise<number>) {
    if (!INTERNET_ENABLED || this.busy) return
    this.busy = kind
    this.error = ''
    this.progress = { label: '', done: 0, total: 0 }
    try {
      await job((p) => (this.progress = p))
      this.version++
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e)
    } finally {
      this.count = await countTitles().catch(() => 0)
      this.busy = null
    }
  }

  async loadImdb() {
    this.imdbError = ''
    try {
      this.imdbCount = await ensureImdbSeeded()
    } catch (e) {
      this.imdbError = e instanceof Error ? e.message : String(e)
    }
  }

  load() {
    return this.run('seeding', (cb) => ensureSeeded(cb))
  }

  refresh() {
    return this.run('refreshing', (cb) => refreshTitles(cb))
  }
}

export const dataStore = new DataStore()
