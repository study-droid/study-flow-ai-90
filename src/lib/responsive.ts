/**
 * Responsive design utilities and breakpoint management
 */

/**
 * Breakpoint values matching Tailwind defaults
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Media query strings
 */
export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  
  // Special queries
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
  
  // Feature queries
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',
  highContrast: '(prefers-contrast: high)',
} as const;

/**
 * Get current breakpoint
 */
export const getCurrentBreakpoint = (): keyof typeof breakpoints | 'xs' => {
  const width = window.innerWidth;
  
  if (width < breakpoints.sm) return 'xs';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  if (width < breakpoints['2xl']) return 'xl';
  return '2xl';
};

/**
 * Check if current viewport matches breakpoint
 */
export const matchesBreakpoint = (breakpoint: keyof typeof breakpoints): boolean => {
  return window.matchMedia(mediaQueries[breakpoint]).matches;
};

/**
 * Check if device is mobile
 */
export const isMobile = (): boolean => {
  return window.matchMedia(mediaQueries.mobile).matches;
};

/**
 * Check if device is tablet
 */
export const isTablet = (): boolean => {
  return window.matchMedia(mediaQueries.tablet).matches;
};

/**
 * Check if device is desktop
 */
export const isDesktop = (): boolean => {
  return window.matchMedia(mediaQueries.desktop).matches;
};

/**
 * Check if device has touch capability
 */
export const isTouchDevice = (): boolean => {
  return window.matchMedia(mediaQueries.touch).matches || 
         'ontouchstart' in window ||
         navigator.maxTouchPoints > 0;
};

/**
 * Get responsive value based on breakpoint
 */
export const getResponsiveValue = <T>(
  values: {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
  },
  defaultValue: T
): T => {
  const breakpoint = getCurrentBreakpoint();
  
  // Find the value for current or smaller breakpoint
  const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'] as const;
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return defaultValue;
};

/**
 * Responsive class names generator
 */
export const responsiveClasses = {
  // Padding
  padding: (values: { mobile?: string; tablet?: string; desktop?: string }) => {
    return [
      values.mobile,
      values.tablet && `md:${values.tablet}`,
      values.desktop && `lg:${values.desktop}`,
    ].filter(Boolean).join(' ');
  },
  
  // Grid columns
  gridCols: (values: { mobile?: number; tablet?: number; desktop?: number }) => {
    return [
      values.mobile && `grid-cols-${values.mobile}`,
      values.tablet && `md:grid-cols-${values.tablet}`,
      values.desktop && `lg:grid-cols-${values.desktop}`,
    ].filter(Boolean).join(' ');
  },
  
  // Flex direction
  flexDirection: (values: { mobile?: string; tablet?: string; desktop?: string }) => {
    return [
      values.mobile && `flex-${values.mobile}`,
      values.tablet && `md:flex-${values.tablet}`,
      values.desktop && `lg:flex-${values.desktop}`,
    ].filter(Boolean).join(' ');
  },
  
  // Text size
  textSize: (values: { mobile?: string; tablet?: string; desktop?: string }) => {
    return [
      values.mobile && `text-${values.mobile}`,
      values.tablet && `md:text-${values.tablet}`,
      values.desktop && `lg:text-${values.desktop}`,
    ].filter(Boolean).join(' ');
  },
  
  // Display
  display: (values: { mobile?: string; tablet?: string; desktop?: string }) => {
    return [
      values.mobile,
      values.tablet && `md:${values.tablet}`,
      values.desktop && `lg:${values.desktop}`,
    ].filter(Boolean).join(' ');
  },
};

/**
 * Viewport dimensions
 */
export const getViewportDimensions = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    ratio: window.innerWidth / window.innerHeight,
    isLandscape: window.innerWidth > window.innerHeight,
    isPortrait: window.innerHeight > window.innerWidth,
  };
};

/**
 * Safe area insets for mobile devices
 */
export const getSafeAreaInsets = () => {
  const styles = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(styles.getPropertyValue('--sat') || '0'),
    right: parseInt(styles.getPropertyValue('--sar') || '0'),
    bottom: parseInt(styles.getPropertyValue('--sab') || '0'),
    left: parseInt(styles.getPropertyValue('--sal') || '0'),
  };
};

/**
 * Responsive image sizes
 */
export const getResponsiveImageSize = (baseSize: number) => {
  const breakpoint = getCurrentBreakpoint();
  
  const multipliers = {
    xs: 0.5,
    sm: 0.75,
    md: 1,
    lg: 1.25,
    xl: 1.5,
    '2xl': 2,
  };
  
  return Math.round(baseSize * multipliers[breakpoint]);
};

/**
 * Touch gesture utilities
 */
export const touchGestures = {
  // Swipe detection
  detectSwipe: (
    element: HTMLElement,
    onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void,
    threshold = 50
  ) => {
    let startX = 0;
    let startY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const diffX = endX - startX;
      const diffY = endY - startY;
      
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (Math.abs(diffX) > threshold) {
          onSwipe(diffX > 0 ? 'right' : 'left');
        }
      } else {
        // Vertical swipe
        if (Math.abs(diffY) > threshold) {
          onSwipe(diffY > 0 ? 'down' : 'up');
        }
      }
    };
    
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  },
};

/**
 * Responsive container classes
 */
export const containerClasses = {
  full: 'w-full px-4 sm:px-6 lg:px-8',
  centered: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  narrow: 'w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8',
  wide: 'w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8',
};

/**
 * Mobile-first utility classes
 */
export const mobileFirst = {
  hideOnMobile: 'hidden sm:block',
  showOnMobile: 'block sm:hidden',
  hideOnTablet: 'hidden md:block',
  showOnTablet: 'block md:hidden',
  hideOnDesktop: 'block lg:hidden',
  showOnDesktop: 'hidden lg:block',
};