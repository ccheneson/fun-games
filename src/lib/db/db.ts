import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Title } from '../providers/types'

interface FunGamesDB extends DBSchema {
  titles: { key: string; value: Title }
  posters: { key: string; value: Blob }
  meta: { key: string; value: unknown }
  imdb: { key: string; value: Title }
}

let dbPromise: Promise<IDBPDatabase<FunGamesDB>> | null = null

export function getDb() {
  dbPromise ??= openDB<FunGamesDB>('fun-games', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('titles', { keyPath: 'id' })
        db.createObjectStore('posters')
        db.createObjectStore('meta')
      }
      if (oldVersion < 2) db.createObjectStore('imdb', { keyPath: 'id' })
    },
  })
  return dbPromise
}

export async function getTitles(): Promise<Title[]> {
  return (await getDb()).getAll('titles')
}

export async function countTitles(): Promise<number> {
  return (await getDb()).count('titles')
}

export async function getPoster(id: string): Promise<Blob | undefined> {
  return (await getDb()).get('posters', id)
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await getDb()).get('meta', key)) as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDb()).put('meta', value, key)
}

/** Replace the whole stored set in ONE transaction: all-or-nothing. */
export async function replaceAll(items: { title: Title; poster: Blob }[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['titles', 'posters', 'meta'], 'readwrite')
  await Promise.all([tx.objectStore('titles').clear(), tx.objectStore('posters').clear()])
  for (const { title, poster } of items) {
    tx.objectStore('titles').put(title)
    tx.objectStore('posters').put(poster, title.id)
  }
  tx.objectStore('meta').put(Date.now(), 'seededAt')
  await tx.done
}

export async function getImdbTitles(): Promise<Title[]> {
  return (await getDb()).getAll('imdb')
}

export async function countImdbTitles(): Promise<number> {
  return (await getDb()).count('imdb')
}

/** Replace the whole IMDb set in ONE transaction: all-or-nothing. */
export async function replaceImdbTitles(items: Title[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('imdb', 'readwrite')
  await tx.store.clear()
  for (const t of items) tx.store.put(t)
  await tx.done
}
