import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

const storageKey = 'frontendstage-theme';

if (typeof document !== 'undefined') {
  const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
  const theme = storedTheme === 'dark' || storedTheme === 'light'
    ? storedTheme
    : prefersDark
      ? 'dark'
      : 'light';

  document.body.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true
})
  .catch(err => console.error(err));
