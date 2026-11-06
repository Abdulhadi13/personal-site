const themeButton = document.querySelector<HTMLButtonElement>('.theme-toggle');
const languageLink = document.querySelector<HTMLAnchorElement>('.language-switch');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

let manualTheme: string | null = null;
try {
  const savedTheme = localStorage.getItem('af-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') manualTheme = savedTheme;
} catch {
  // Preferences still work for the current page when storage is unavailable.
}

function updateThemeButton() {
  if (!themeButton) return;
  const label = document.documentElement.dataset.theme === 'dark'
    ? themeButton.dataset.lightLabel
    : themeButton.dataset.darkLabel;
  if (label) {
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
  }
}

if (themeButton) {
  updateThemeButton();
  themeButton.hidden = false;
  themeButton.addEventListener('click', () => {
    manualTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = manualTheme;
    try {
      localStorage.setItem('af-theme', manualTheme);
    } catch {}
    updateThemeButton();
  });
}

systemTheme.addEventListener('change', ({ matches }) => {
  if (manualTheme) return;
  document.documentElement.dataset.theme = matches ? 'dark' : 'light';
  updateThemeButton();
});

languageLink?.addEventListener('click', () => {
  const language = languageLink.dataset.language;
  if (language === 'en' || language === 'ar') {
    try {
      localStorage.setItem('af-language', language);
    } catch {}
  }
});
