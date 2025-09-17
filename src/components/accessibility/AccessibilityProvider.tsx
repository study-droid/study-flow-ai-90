/**
 * Accessibility Provider - Manages accessibility settings and context
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface AccessibilitySettings {
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  keyboardNavigation: boolean;
  screenReaderOptimized: boolean;
  focusIndicators: 'default' | 'enhanced' | 'high-contrast';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  toggleHighContrast: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrastMode: false,
  reducedMotion: false,
  fontSize: 'medium',
  keyboardNavigation: true,
  screenReaderOptimized: false,
  focusIndicators: 'default',
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useLocalStorage<AccessibilitySettings>(
    'accessibility-settings',
    defaultSettings
  );
  
  const [announcer, setAnnouncer] = useState<HTMLDivElement | null>(null);

  // Initialize screen reader announcer
  useEffect(() => {
    const announcerElement = document.createElement('div');
    announcerElement.setAttribute('aria-live', 'polite');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.setAttribute('aria-relevant', 'text');
    announcerElement.className = 'sr-only';
    announcerElement.id = 'accessibility-announcer';
    document.body.appendChild(announcerElement);
    setAnnouncer(announcerElement);

    return () => {
      if (document.body.contains(announcerElement)) {
        document.body.removeChild(announcerElement);
      }
    };
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrastMode) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${settings.fontSize}`);

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Focus indicators
    root.classList.remove('focus-default', 'focus-enhanced', 'focus-high-contrast');
    root.classList.add(`focus-${settings.focusIndicators}`);

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }

    // Screen reader optimization
    if (settings.screenReaderOptimized) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }
  }, [settings]);

  // Detect user preferences
  useEffect(() => {
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setSettings(prev => ({ ...prev, reducedMotion: true }));
      }
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setSettings(prev => ({ ...prev, highContrastMode: true }));
      }
    };

    mediaQueries.reducedMotion.addEventListener('change', handleMotionChange);
    mediaQueries.highContrast.addEventListener('change', handleContrastChange);

    // Initial check
    if (mediaQueries.reducedMotion.matches) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }
    if (mediaQueries.highContrast.matches) {
      setSettings(prev => ({ ...prev, highContrastMode: true }));
    }

    return () => {
      mediaQueries.reducedMotion.removeEventListener('change', handleMotionChange);
      mediaQueries.highContrast.removeEventListener('change', handleContrastChange);
    };
  }, [setSettings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrastMode: !prev.highContrastMode }));
  };

  const fontSizes: AccessibilitySettings['fontSize'][] = ['small', 'medium', 'large', 'extra-large'];

  const increaseFontSize = () => {
    const currentIndex = fontSizes.indexOf(settings.fontSize);
    if (currentIndex < fontSizes.length - 1) {
      setSettings(prev => ({ ...prev, fontSize: fontSizes[currentIndex + 1] }));
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = fontSizes.indexOf(settings.fontSize);
    if (currentIndex > 0) {
      setSettings(prev => ({ ...prev, fontSize: fontSizes[currentIndex - 1] }));
    }
  };

  const resetFontSize = () => {
    setSettings(prev => ({ ...prev, fontSize: 'medium' }));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcer) {
      announcer.setAttribute('aria-live', priority);
      announcer.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    announceToScreenReader,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}