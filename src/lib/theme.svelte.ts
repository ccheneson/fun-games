import { applyTheme, loadThemePref, resolveTheme, saveThemePref, toggledPref, type ThemePref } from './theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function darkMedia(): MediaQueryList | undefined {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : undefined
}

class ThemeStore {
  pref = $state<ThemePref>(loadThemePref(storage()))
  systemDark = $state(darkMedia()?.matches ?? false)
  resolved = $derived(resolveTheme(this.pref, this.systemDark))

  /** Follows device changes (used while pref is 'system') and applies the theme to <html>. */
  init() {
    darkMedia()?.addEventListener('change', (e) => {
      this.systemDark = e.matches
      this.apply()
    })
    this.apply()
  }

  set(pref: ThemePref) {
    this.pref = pref
    saveThemePref(storage(), pref)
    this.apply()
  }

  toggle() {
    this.set(toggledPref(this.resolved))
  }

  private apply() {
    if (typeof document !== 'undefined') applyTheme(document.documentElement, this.resolved)
  }
}

export const theme = new ThemeStore()
