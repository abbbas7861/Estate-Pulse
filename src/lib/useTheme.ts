import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_THEME_KEY = 'estatepulse_theme';

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore storage access errors
  }
  return 'light';
}

export function useTheme(): [Theme, (theme: Theme) => void, () => void] {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
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

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return [theme, setTheme, toggleTheme];
}
