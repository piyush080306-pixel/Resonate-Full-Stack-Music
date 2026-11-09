import { useEffect } from 'react';
import { useSettings } from './SettingsContext';

export function useTheme() {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    root.style.setProperty('--accent', settings.accentColor);
  }, [settings.theme, settings.accentColor]);

  return { theme: settings.theme, accent: settings.accentColor };
}
