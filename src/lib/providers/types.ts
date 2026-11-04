export type TitleType = 'movie' | 'tv'

/** A title as stored locally. The poster Blob lives in its own store. */
export interface Title {
  id: string
  type: TitleType
  title: string
  /** Remote poster image, displayed directly from this URL (IMDb source). */
  posterUrl?: string
  year?: number
  genre?: string
  rating?: number
  director?: string
  /** Main cast, billing order. */
  stars?: string[]
  overview?: string
}

/** A title found by a provider, before its poster is downloaded. */
export interface Candidate {
  id: string
  type: TitleType
  title: string
  posterUrl: string
}

export interface TitleProvider {
  fetchCandidates(): Promise<Candidate[]>
  fetchPoster(candidate: Candidate): Promise<Blob>
}
