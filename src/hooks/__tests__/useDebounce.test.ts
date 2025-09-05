/**
 * Unit Tests for useDebounce Hook
 * Tests debouncing functionality with various data types and scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

// Mock timers for controlled testing
vi.useFakeTimers();

describe('useDebounce', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce string values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    expect(result.current).toBe('initial');

    // Update the value
    rerender({ value: 'updated', delay: 500 });
    
    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 250ms (not enough)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe('initial');

    // Fast-forward by another 250ms (total 500ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe('updated');
  });

  it('should debounce number values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 300 }
      }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42, delay: 300 });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(42);
  });

  it('should debounce boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: false, delay: 200 }
      }
    );

    expect(result.current).toBe(false);

    rerender({ value: true, delay: 200 });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);
  });

  it('should debounce object values', () => {
    const initialObj = { name: 'John', age: 25 };
    const updatedObj = { name: 'Jane', age: 30 };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 400 }
      }
    );

    expect(result.current).toBe(initialObj);

    rerender({ value: updatedObj, delay: 400 });
    expect(result.current).toBe(initialObj);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe(updatedObj);
  });

  it('should debounce array values', () => {
    const initialArray = [1, 2, 3];
    const updatedArray = [4, 5, 6];

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialArray, delay: 350 }
      }
    );

    expect(result.current).toBe(initialArray);

    rerender({ value: updatedArray, delay: 350 });
    expect(result.current).toBe(initialArray);

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe(updatedArray);
  });

  it('should handle rapid value changes correctly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // Rapid changes
    rerender({ value: 'change1', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'change2', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'change3', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'final', delay: 500 });

    // Should still be initial value
    expect(result.current).toBe('initial');

    // Fast-forward past the delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should only show the final value
    expect(result.current).toBe('final');
  });

  it('should reset timer when value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 }
      }
    );

    rerender({ value: 'first', delay: 1000 });
    
    // Wait 800ms (not enough for first change)
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current).toBe('initial');

    // Change value again (should reset timer)
    rerender({ value: 'second', delay: 1000 });
    
    // Wait another 800ms (still not enough because timer was reset)
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current).toBe('initial');

    // Wait final 200ms to complete the new delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('second');
  });

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    rerender({ value: 'updated', delay: 1000 }); // Change both value and delay

    // Wait original delay time
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial'); // Should still be initial

    // Wait for new delay time
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated'); // Now should be updated
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 }
      }
    );

    rerender({ value: 'immediate', delay: 0 });
    
    // With zero delay, should update on next tick
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe('immediate');
  });

  it('should handle undefined and null values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: null as any, delay: 300 }
      }
    );

    expect(result.current).toBe(null);

    rerender({ value: undefined as any, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(undefined);

    rerender({ value: 'defined', delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('defined');
  });

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    rerender({ value: 'updated', delay: 500 });
    
    // Unmount before delay completes
    unmount();
    
    // Verify clearTimeout was called
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });

  it('should work with search-like scenario', () => {
    // Simulate search input debouncing
    const { result, rerender } = renderHook(
      ({ query, delay }) => useDebounce(query, delay),
      {
        initialProps: { query: '', delay: 300 }
      }
    );

    const searchTerms = ['h', 'he', 'hel', 'hell', 'hello'];
    
    // Simulate rapid typing
    searchTerms.forEach((term, index) => {
      rerender({ query: term, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(50); // Fast typing
      });
    });

    // Should still be empty string
    expect(result.current).toBe('');

    // Complete the debounce delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should show final search term
    expect(result.current).toBe('hello');
  });
});