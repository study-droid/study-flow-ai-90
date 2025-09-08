/**
 * Keyboard Navigation Hook and Components
 */

import React, { useEffect, useRef, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KeyboardNavigationProps {
  children: ReactNode;
  className?: string;
  onEscape?: () => void;
  onEnter?: () => void;
  trapFocus?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

export function KeyboardNavigationContainer({
  children,
  className,
  onEscape,
  onEnter,
  trapFocus = false,
  autoFocus = false,
  restoreFocus = false,
}: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Store the previously focused element
  useEffect(() => {
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement;
    }

    return () => {
      if (restoreFocus && previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus?.();
      }
    };
  }, [restoreFocus]);

  // Auto focus first focusable element
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const firstFocusable = getFocusableElements(containerRef.current)[0];
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [autoFocus]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    if (event.key === 'Enter' && onEnter) {
      event.preventDefault();
      onEnter();
      return;
    }

    if (trapFocus && event.key === 'Tab') {
      handleTabNavigation(event, containerRef.current);
    }
  }, [onEscape, onEnter, trapFocus]);

  return (
    <div
      ref={containerRef}
      className={cn('focus-within:outline-none', className)}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

// Focus management utilities
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'iframe',
    'object',
    'embed',
    'area[href]',
    'summary',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors)).filter(
    (element) => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.offsetWidth > 0 &&
        htmlElement.offsetHeight > 0 &&
        !htmlElement.hidden &&
        window.getComputedStyle(htmlElement).visibility !== 'hidden'
      );
    }
  ) as HTMLElement[];
}

function handleTabNavigation(event: React.KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const currentElement = document.activeElement as HTMLElement;

  if (event.shiftKey) {
    // Shift + Tab (backward)
    if (currentElement === firstElement || !focusableElements.includes(currentElement)) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab (forward)
    if (currentElement === lastElement || !focusableElements.includes(currentElement)) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

// Custom hook for keyboard navigation
export function useKeyboardNavigation(options: {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  enabled?: boolean;
}) {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onSpace,
    onHome,
    onEnd,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onArrowRight?.();
          break;
        case 'Enter':
          event.preventDefault();
          onEnter?.();
          break;
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
        case ' ':
          event.preventDefault();
          onSpace?.();
          break;
        case 'Home':
          event.preventDefault();
          onHome?.();
          break;
        case 'End':
          event.preventDefault();
          onEnd?.();
          break;
      }
    },
    [enabled, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onEnter, onEscape, onSpace, onHome, onEnd]
  );

  return { handleKeyDown };
}

// Focus management hook
export function useFocusManagement() {
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  }, []);

  const focusFirstElement = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, []);

  const focusLastElement = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, []);

  const moveFocus = useCallback((direction: 'next' | 'previous', container?: HTMLElement) => {
    const activeElement = document.activeElement as HTMLElement;
    const searchContainer = container || document.body;
    const focusableElements = getFocusableElements(searchContainer);
    
    const currentIndex = focusableElements.indexOf(activeElement);
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % focusableElements.length;
    } else {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    }

    focusableElements[nextIndex].focus();
  }, []);

  return {
    focusElement,
    focusFirstElement,
    focusLastElement,
    moveFocus,
  };
}

// Skip link component for keyboard navigation
export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
    >
      {children}
    </a>
  );
}