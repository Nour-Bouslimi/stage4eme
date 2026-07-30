import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'frontendstage-theme';
  private readonly themeSubject = new BehaviorSubject<ThemeMode>('light');

  readonly theme$ = this.themeSubject.asObservable();

  initializeTheme(): ThemeMode {
    const storedTheme = this.getStoredTheme();
    const preferredTheme = this.getPreferredTheme();
    const theme = storedTheme ?? preferredTheme;

    this.applyTheme(theme);
    return theme;
  }

  getTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  setTheme(theme: ThemeMode): void {
    this.applyTheme(theme);
  }

  toggleTheme(): ThemeMode {
    const nextTheme: ThemeMode = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    return nextTheme;
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, theme);
    }

    this.themeSubject.next(theme);
  }

  private getStoredTheme(): ThemeMode | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const value = localStorage.getItem(this.storageKey);
    return value === 'dark' || value === 'light' ? value : null;
  }

  private getPreferredTheme(): ThemeMode {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  }
}
