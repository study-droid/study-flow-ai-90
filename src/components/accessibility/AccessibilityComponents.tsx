import React from 'react';
import { cn } from '@/lib/utils';

interface AccessibilityWrapperProps {
  children: React.ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export const AccessibilityWrapper: React.FC<AccessibilityWrapperProps> = ({
  children,
  className,
  role,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  return (
    <div
      className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      {children}
    </div>
  );
};

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4",
        "bg-primary text-primary-foreground px-4 py-2 rounded-md z-50",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
    >
      {children}
    </a>
  );
};

interface FocusManagementProps {
  children: React.ReactNode;
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

export const FocusManagement: React.FC<FocusManagementProps> = ({
  children,
  autoFocus = false,
  restoreFocus = true
}) => {
  const elementRef = React.useRef<HTMLDivElement>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (autoFocus && elementRef.current) {
      previousFocus.current = document.activeElement as HTMLElement;
      elementRef.current.focus();
    }

    return () => {
      if (restoreFocus && previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [autoFocus, restoreFocus]);

  return (
    <div ref={elementRef} tabIndex={autoFocus ? -1 : undefined}>
      {children}
    </div>
  );
};

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Loading...',
  className,
  children,
  disabled,
  ...props
}) => {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium ring-offset-background",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "min-h-[44px] min-w-[44px]", // Accessibility minimum touch target
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={isLoading ? loadingText : props['aria-label']}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

interface LiveRegionProps {
  children: React.ReactNode;
  level?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  level = 'polite',
  atomic = true
}) => {
  return (
    <div
      aria-live={level}
      aria-atomic={atomic}
      role="status"
      className="sr-only"
    >
      {children}
    </div>
  );
};

interface ProgressIndicatorProps {
  value: number;
  max: number;
  label: string;
  className?: string;
  showPercentage?: boolean;
}

export const AccessibleProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max,
  label,
  className,
  showPercentage = true
}) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <label htmlFor="progress-bar">{label}</label>
        {showPercentage && (
          <span aria-label={`${percentage} percent complete`}>
            {percentage}%
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${value} of ${max}`}
        className="w-full bg-secondary rounded-full h-2"
      >
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface KeyboardNavigationProps {
  children: React.ReactNode;
  onEscape?: () => void;
  onEnter?: () => void;
  trapFocus?: boolean;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  children,
  onEscape,
  onEnter,
  trapFocus = false
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case 'Enter':
          if (onEnter && event.target === containerRef.current) {
            event.preventDefault();
            onEnter();
          }
          break;
        case 'Tab':
          if (trapFocus) {
            handleTabKeyPress(event);
          }
          break;
      }
    };

    const handleTabKeyPress = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onEnter, trapFocus]);

  return (
    <div ref={containerRef} role="region">
      {children}
    </div>
  );
};

interface HighContrastModeProps {
  children: React.ReactNode;
}

export const HighContrastMode: React.FC<HighContrastModeProps> = ({ children }) => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className={cn(isHighContrast && "high-contrast-mode")}>
      {children}
    </div>
  );
};

interface ReducedMotionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ReducedMotion: React.FC<ReducedMotionProps> = ({ 
  children, 
  fallback 
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn(prefersReducedMotion && "motion-reduce")}>
      {children}
    </div>
  );
};

// Screen reader only content
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
};

// Visually hidden but accessible
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return (
    <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
      {children}
    </span>
  );
};