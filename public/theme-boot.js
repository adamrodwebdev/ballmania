// Applies the saved theme and language before the first paint (no flash of the wrong
// theme). Must stay in sync with SettingsService: same storage key, same values.
(function () {
  var root = document.documentElement;
  var saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('ballmania:settings') || '{}') || {};
  } catch {
    saved = {};
  }
  var theme =
    saved.theme === 'light' || saved.theme === 'dark' || saved.theme === 'system'
      ? saved.theme
      : 'dark';
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.dataset.theme = theme;
  // The browser's bar in the theme's background, not the system's (tokens.css: --bg).
  var bar = document.querySelector('meta[name="theme-color"]');
  if (bar) bar.setAttribute('content', theme === 'light' ? '#f4f2fb' : '#05030d');
  if (['fr', 'en', 'id', 'ru'].indexOf(saved.locale) !== -1) {
    root.lang = saved.locale;
  }
})();
