import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme, colorTheme, setTheme, setColorTheme } = useUIStore();

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark', 'teddy-orange', 'ocean-blue', 'forest-green');
    
    // Apply color theme
    root.classList.add(colorTheme);
    
    // Apply light/dark theme
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.add(theme);
    }
  }, [theme, colorTheme]);

  // Load theme preferences on mount
  useEffect(() => {
    loadUserThemePreferences();
  }, []);

  // Save theme preferences when they change
  useEffect(() => {
    saveUserThemePreferences();
  }, [theme, colorTheme]);

  const loadUserThemePreferences = async () => {
    try {
      // For now, use localStorage until we have theme_preferences column
      const savedTheme = localStorage.getItem('studyTeddy-theme');
      const savedColorTheme = localStorage.getItem('studyTeddy-colorTheme');
      
      if (savedTheme) setTheme(savedTheme as any);
      if (savedColorTheme) setColorTheme(savedColorTheme as any);
    } catch (error) {
      console.log('No theme preferences found, using defaults');
    }
  };

  const saveUserThemePreferences = async () => {
    try {
      // Save to localStorage for now
      localStorage.setItem('studyTeddy-theme', theme);
      localStorage.setItem('studyTeddy-colorTheme', colorTheme);
    } catch (error) {
      console.log('Failed to save theme preferences');
    }
  };

  return <>{children}</>;
};