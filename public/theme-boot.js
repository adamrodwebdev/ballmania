// Applies the saved theme and language before the first paint (no flash of the wrong
// theme). Must stay in sync with SettingsService: same storage key, same values, and the
// same size limit (SAVE_LIMITS.settings in src/rules/limits.ts, checked by a test).
(function () {
  var root = document.documentElement;
  var saved = null;
  try {
    var text = localStorage.getItem('ballmania:settings');
    // A longer text is not read: it holds no settings the game saved.
    if (typeof text === 'string' && text.length <= 4096) saved = JSON.parse(text);
  } catch {
    saved = null;
  }
  // The saved object's own fields only, never one it inherits.
  var field = function (name) {
    return saved !== null &&
      typeof saved === 'object' &&
      Object.prototype.hasOwnProperty.call(saved, name)
      ? saved[name]
      : undefined;
  };
  var chosen = field('theme');
  var theme = chosen === 'light' || chosen === 'dark' || chosen === 'system' ? chosen : 'dark';
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.dataset.theme = theme;
  // The browser's bar in the theme's background, not the system's (tokens.css: --bg).
  var bar = document.querySelector('meta[name="theme-color"]');
  if (bar) bar.setAttribute('content', theme === 'light' ? '#f4f2fb' : '#05030d');
  var locale = field('locale');
  if (['fr', 'en', 'id', 'ru'].indexOf(locale) !== -1) {
    root.lang = locale;
  }
})();
