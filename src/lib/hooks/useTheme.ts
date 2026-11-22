import { useState, useEffect } from 'react';

export type Theme = 'emerald' | 'ocean' | 'royal' | 'dark';

const STORAGE_THEME_KEY = 'estatepulse_theme';

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'emerald' || saved === 'ocean' || saved === 'royal' || saved === 'dark') {
      return saved as Theme;
    }
  } catch {
    // ignore storage access errors
  }
  return 'emerald';
}

export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
} & [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const result = [theme, setTheme] as unknown as [Theme, (theme: Theme) => void] & {
    theme: Theme;
    setTheme: (theme: Theme) => void;
  };
  result.theme = theme;
  result.setTheme = setTheme;
  return result;
}
