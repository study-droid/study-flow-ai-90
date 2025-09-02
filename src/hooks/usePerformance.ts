/**
 * Performance Monitoring Hook
 * Tracks and optimizes application performance
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/services/logging/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
  memoryUsage?: number;
  fps?: number;
}

interface PerformanceOptions {
  trackRenders?: boolean;
  trackMemory?: boolean;
  trackFPS?: boolean;
  reportThreshold?: number; // ms
  onSlowRender?: (metrics: PerformanceMetrics) => void;
}

/**
 * Custom hook for performance monitoring
 */
export function usePerformance(
  componentName: string,
  options: PerformanceOptions = {}
) {
  const {
    trackRenders = true,
    trackMemory = false,
    trackFPS = false,
    reportThreshold = 16, // 60fps = ~16ms per frame
    onSlowRender,
  } = options;

  const renderStartTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const [fps, setFps] = useState<number>(60);

  // Track render time
  useEffect(() => {
    if (trackRenders) {
      renderStartTime.current = performance.now();
      
      // Use requestAnimationFrame to measure after paint
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStartTime.current;
        
        if (renderTime > reportThreshold) {
          const metrics: PerformanceMetrics = {
            renderTime,
            componentName,
            timestamp: Date.now(),
          };

          if (trackMemory && 'memory' in performance) {
            metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
          }

          if (trackFPS) {
            metrics.fps = fps;
          }

          logger.warn(`Slow render detected`, 'Performance', metrics);
          onSlowRender?.(metrics);
        }
      });
    }
  });

  // Track FPS
  useEffect(() => {
    if (!trackFPS) return;

    let animationFrameId: number;
    
    const measureFPS = (currentTime: number) => {
      if (lastFrameTime.current > 0) {
        const delta = currentTime - lastFrameTime.current;
        const currentFps = Math.round(1000 / delta);
        
        // Use moving average for smoother FPS
        frameCount.current++;
        if (frameCount.current % 10 === 0) {
          setFps(currentFps);
          frameCount.current = 0;
        }
      }
      
      lastFrameTime.current = currentTime;
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trackFPS]);

  // Measure function execution time
  const measureTime = useCallback(
    async <T,>(
      fn: () => T | Promise<T>,
      label: string = 'Operation'
    ): Promise<T> => {
      const startTime = performance.now();
      
      try {
        const result = await fn();
        const duration = performance.now() - startTime;
        
        logger.debug(`${label} completed`, 'Performance', {
          duration: `${duration.toFixed(2)}ms`,
          component: componentName,
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error(`${label} failed`, 'Performance', {
          duration: `${duration.toFixed(2)}ms`,
          component: componentName,
          error,
        });
        throw error;
      }
    },
    [componentName]
  );

  // Mark performance events
  const mark = useCallback((label: string) => {
    if ('mark' in performance) {
      performance.mark(`${componentName}-${label}`);
    }
  }, [componentName]);

  // Measure between marks
  const measure = useCallback((label: string, startMark: string, endMark?: string) => {
    if ('measure' in performance) {
      const start = `${componentName}-${startMark}`;
      const end = endMark ? `${componentName}-${endMark}` : undefined;
      
      try {
        performance.measure(`${componentName}-${label}`, start, end);
        
        const entries = performance.getEntriesByName(`${componentName}-${label}`);
        if (entries.length > 0) {
          const duration = entries[entries.length - 1].duration;
          logger.debug(`Performance measure: ${label}`, 'Performance', {
            duration: `${duration.toFixed(2)}ms`,
            component: componentName,
          });
          return duration;
        }
      } catch (error) {
        logger.error('Performance measure failed', 'Performance', error);
      }
    }
    return 0;
  }, [componentName]);

  return {
    measureTime,
    mark,
    measure,
    fps,
  };
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  const observer = useRef<IntersectionObserver | null>(null);

  const observe = useCallback((element: Element | null) => {
    if (observer.current) {
      observer.current.disconnect();
    }

    if (!element) return;

    observer.current = new IntersectionObserver(callback, options);
    observer.current.observe(element);
  }, [callback, options]);

  useEffect(() => {
    return () => {
      observer.current?.disconnect();
    };
  }, []);

  return observe;
}

/**
 * Hook for debouncing expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling expensive operations
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    
    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timeoutId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook for virtual scrolling (large lists)
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
}

/**
 * Hook for preloading images
 */
export function useImagePreloader(imageUrls: string[]) {
  const [loaded, setLoaded] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setLoading(false);
      return;
    }

    const loadedStates = new Array(imageUrls.length).fill(false);
    let loadedCount = 0;

    const preloadImage = (url: string, index: number) => {
      const img = new Image();
      
      img.onload = () => {
        loadedStates[index] = true;
        loadedCount++;
        setLoaded([...loadedStates]);
        
        if (loadedCount === imageUrls.length) {
          setLoading(false);
        }
      };

      img.onerror = () => {
        setError(`Failed to load image: ${url}`);
        loadedCount++;
        
        if (loadedCount === imageUrls.length) {
          setLoading(false);
        }
      };

      img.src = url;
    };

    imageUrls.forEach((url, index) => {
      preloadImage(url, index);
    });
  }, [imageUrls]);

  return { loaded, loading, error };
}