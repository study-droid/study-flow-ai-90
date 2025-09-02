/**
 * Accessibility utilities and ARIA helpers
 */

/**
 * Generate appropriate ARIA labels for interactive elements
 */
export const ariaLabels = {
  // Navigation
  navigation: {
    main: 'Main navigation',
    sidebar: 'Sidebar navigation',
    breadcrumb: 'Breadcrumb navigation',
    pagination: 'Pagination navigation',
  },
  
  // Buttons
  button: {
    close: 'Close',
    menu: 'Open menu',
    settings: 'Open settings',
    search: 'Search',
    filter: 'Filter options',
    sort: 'Sort options',
    add: 'Add new item',
    edit: 'Edit item',
    delete: 'Delete item',
    save: 'Save changes',
    cancel: 'Cancel',
    submit: 'Submit form',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    next: 'Next',
    previous: 'Previous',
    refresh: 'Refresh',
    expand: 'Expand',
    collapse: 'Collapse',
    maximize: 'Maximize',
    minimize: 'Minimize',
  },
  
  // Form elements
  form: {
    required: 'Required field',
    optional: 'Optional field',
    error: 'Error in field',
    success: 'Field validated successfully',
    info: 'Additional information',
    search: 'Search input',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    username: 'Username',
    phone: 'Phone number',
  },
  
  // Study-specific
  study: {
    startSession: 'Start study session',
    endSession: 'End study session',
    pauseTimer: 'Pause timer',
    resumeTimer: 'Resume timer',
    resetTimer: 'Reset timer',
    flipCard: 'Flip flashcard',
    nextCard: 'Next flashcard',
    previousCard: 'Previous flashcard',
    markCorrect: 'Mark as correct',
    markIncorrect: 'Mark as incorrect',
    playAmbient: 'Play ambient sound',
    stopAmbient: 'Stop ambient sound',
    adjustVolume: 'Adjust volume',
  },
  
  // Status and alerts
  status: {
    loading: 'Loading content',
    success: 'Operation successful',
    error: 'Error occurred',
    warning: 'Warning message',
    info: 'Information message',
    notification: 'Notification',
  },
  
  // Regions
  region: {
    header: 'Page header',
    main: 'Main content',
    footer: 'Page footer',
    sidebar: 'Sidebar',
    modal: 'Modal dialog',
    alert: 'Alert message',
    search: 'Search region',
  },
};

/**
 * Generate ARIA live region announcement
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Generate descriptive label for time
 */
export const getTimeLabel = (minutes: number, seconds: number): string => {
  if (minutes === 0) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  if (seconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
};

/**
 * Generate progress description
 */
export const getProgressLabel = (current: number, total: number, item: string = 'item'): string => {
  return `${current} of ${total} ${item}${total !== 1 ? 's' : ''} completed`;
};

/**
 * Get keyboard shortcut description
 */
export const getKeyboardShortcutLabel = (key: string, action: string): string => {
  return `Press ${key} to ${action}`;
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  // Trap focus within an element
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
    
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },
  
  // Restore focus to previous element
  restoreFocus: (previousElement: HTMLElement | null) => {
    if (previousElement && previousElement.focus) {
      previousElement.focus();
    }
  },
  
  // Get first focusable element
  getFirstFocusable: (container: HTMLElement): HTMLElement | null => {
    return container.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  },
};

/**
 * Skip link utilities
 */
export const skipLinks = {
  create: (target: string, text: string = 'Skip to main content') => {
    const link = document.createElement('a');
    link.href = `#${target}`;
    link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50';
    link.textContent = text;
    link.setAttribute('aria-label', text);
    
    return link;
  },
};

/**
 * Generate semantic heading level
 */
export const getHeadingLevel = (depth: number): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' => {
  const level = Math.min(Math.max(1, depth), 6);
  return `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

/**
 * Screen reader only CSS class
 */
export const srOnly = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

/**
 * Generate ID for form field association
 */
export const generateFieldId = (name: string): string => {
  return `field-${name}-${Math.random().toString(36).substr(2, 9)}`;
};