/**
 * Master switch for the internet title source (Wikidata + Wikimedia Commons).
 * While false: nothing is fetched, the internet source can't be selected and
 * only the IMDb list (src/library/imdb_top_1000.csv) is used. Set to true to re-enable.
 */
export const INTERNET_ENABLED = false
