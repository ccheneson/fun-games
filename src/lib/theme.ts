// Light/dark theme: pure logic, no Svelte runes (unit-tested in tests/theme.test.ts).
// public/theme-init.js duplicates loadThemePref + resolveTheme + applyTheme to apply the
// theme before first paint: keep both in sync.

export const THEME_KEY = 'fun-games:theme'

/** What the user chose: follow the device, or force light/dark. */
export type ThemePref = 'system' | 'light' | 'dark'
/** The theme actually shown. */
export type Theme = 'light' | 'dark'

/** Stored data is untrusted: anything other than 'light' or 'dark' means 'system'. */
export function parseThemePref(raw: unknown): ThemePref {
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

/** Header button: switch to the opposite of the theme currently shown. */
export function toggledPref(current: Theme): ThemePref {
  return current === 'dark' ? 'light' : 'dark'
}

export function loadThemePref(storage: Pick<Storage, 'getItem'> | undefined): ThemePref {
  try {
    return parseThemePref(storage?.getItem(THEME_KEY))
  } catch {
    // Private mode / blocked storage.
    return 'system'
  }
}

/** 'system' is the default, so it removes the key instead of storing it. */
export function saveThemePref(storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined, pref: ThemePref): void {
  try {
    if (pref === 'system') storage?.removeItem(THEME_KEY)
    else storage?.setItem(THEME_KEY, pref)
  } catch {
    // ignore
  }
}

export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.dataset.theme = theme
  root.style.colorScheme = theme
}
