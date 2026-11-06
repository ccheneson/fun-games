// Applies the saved light/dark theme to <html> before first paint, so there is no flash of the
// other theme. Classic script loaded from index.html (the CSP forbids inline scripts).
// Mirrors loadThemePref + resolveTheme + applyTheme in src/lib/theme.ts: keep both in sync.
;(function () {
  var pref = 'light'
  try {
    pref = localStorage.getItem('fun-games:theme')
  } catch (e) {
    // Private mode / blocked storage: default to light.
  }
  var systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  var theme = pref === 'dark' ? 'dark' : pref === 'system' && systemDark ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
})()
