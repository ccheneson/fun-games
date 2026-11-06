import { describe, expect, it } from 'vitest'
import {
  THEME_KEY,
  applyTheme,
  loadThemePref,
  parseThemePref,
  resolveTheme,
  saveThemePref,
  toggledPref,
} from '../src/lib/theme'

type FakeStorage = {
  data: Map<string, string>
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

function fakeStorage(): FakeStorage {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const throwing = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('blocked')
  },
  removeItem() {
    throw new Error('blocked')
  },
}

describe('THEME_KEY', () => {
  it('is the documented key', () => {
    expect(THEME_KEY).toBe('fun-games:theme')
  })
})

describe('parseThemePref', () => {
  it('keeps light and dark', () => {
    expect(parseThemePref('light')).toBe('light')
    expect(parseThemePref('dark')).toBe('dark')
  })
  it('keeps system', () => {
    expect(parseThemePref('system')).toBe('system')
  })
  it.each([null, undefined, '', 'System', 'LIGHT', 'blue', 123, {}, [], true])(
    'falls back to system for %j',
    (raw) => {
      expect(parseThemePref(raw)).toBe('system')
    },
  )
})

describe('resolveTheme', () => {
  it('follows the system when pref is system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
  it('explicit pref wins over the system', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('light', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('dark', true)).toBe('dark')
  })
})

describe('toggledPref', () => {
  it('flips dark to light and light to dark', () => {
    expect(toggledPref('dark')).toBe('light')
    expect(toggledPref('light')).toBe('dark')
  })
})

describe('loadThemePref / saveThemePref', () => {
  it('returns system when nothing is stored or storage is undefined', () => {
    expect(loadThemePref(fakeStorage())).toBe('system')
    expect(loadThemePref(undefined)).toBe('system')
  })
  it('round-trips light and dark under THEME_KEY', () => {
    const s = fakeStorage()
    saveThemePref(s, 'dark')
    expect(s.data.get(THEME_KEY)).toBe('dark')
    expect(loadThemePref(s)).toBe('dark')
    saveThemePref(s, 'light')
    expect(s.data.get(THEME_KEY)).toBe('light')
    expect(loadThemePref(s)).toBe('light')
  })
  it('saving system removes the key', () => {
    const s = fakeStorage()
    saveThemePref(s, 'dark')
    saveThemePref(s, 'system')
    expect(s.data.has(THEME_KEY)).toBe(false)
    expect(loadThemePref(s)).toBe('system')
  })
  it('treats garbage stored values as system', () => {
    const s = fakeStorage()
    s.data.set(THEME_KEY, 'purple')
    expect(loadThemePref(s)).toBe('system')
  })
  it('does not throw when storage throws', () => {
    expect(loadThemePref(throwing)).toBe('system')
    expect(() => saveThemePref(throwing, 'dark')).not.toThrow()
    expect(() => saveThemePref(throwing, 'system')).not.toThrow()
  })
  it('does not throw when saving with undefined storage', () => {
    expect(() => saveThemePref(undefined, 'dark')).not.toThrow()
  })
})

describe('applyTheme', () => {
  function fakeRoot() {
    return { dataset: {} as Record<string, string>, style: {} as Record<string, string> }
  }
  it('sets data-theme and color-scheme', () => {
    const root = fakeRoot()
    applyTheme(root as unknown as HTMLElement, 'dark')
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
    applyTheme(root as unknown as HTMLElement, 'light')
    expect(root.dataset.theme).toBe('light')
    expect(root.style.colorScheme).toBe('light')
  })
})
