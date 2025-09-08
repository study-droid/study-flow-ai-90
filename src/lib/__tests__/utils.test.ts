/**
 * Unit Tests for Core Utility Functions
 * Tests the className merging utility function
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('should merge className strings correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const condition = false;
      expect(cn('class1', condition && 'class2', 'class3')).toBe('class1 class3');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('p-2 p-4')).toBe('p-4');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle arrays of classes', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
    });

    it('should handle objects with boolean values', () => {
      expect(cn({
        'class1': true,
        'class2': false,
        'class3': true
      })).toBe('class1 class3');
    });

    it('should handle mixed input types', () => {
      const showHidden = false;
      expect(cn(
        'base-class',
        { 'conditional-class': true },
        ['array-class-1', 'array-class-2'],
        showHidden && 'hidden-class',
        'final-class'
      )).toBe('base-class conditional-class array-class-1 array-class-2 final-class');
    });

    it('should return empty string for no arguments', () => {
      expect(cn()).toBe('');
    });

    it('should handle undefined and null values', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
    });

    it('should prioritize later Tailwind classes over earlier ones', () => {
      expect(cn('text-sm text-lg text-xl')).toBe('text-xl');
      expect(cn('bg-red-500 bg-blue-500 bg-green-500')).toBe('bg-green-500');
      // Note: mx-2 and my-3 don't conflict with m-1 as they are more specific
      expect(cn('m-1 mx-2 my-3')).toBe('m-1 mx-2 my-3');
    });

    it('should preserve non-conflicting Tailwind classes', () => {
      expect(cn('text-red-500 bg-blue-500 p-4 m-2')).toBe('text-red-500 bg-blue-500 p-4 m-2');
    });

    it('should handle Tailwind class conflicts correctly', () => {
      // Test actual conflicts that tailwind-merge handles
      expect(cn('text-sm', 'text-lg')).toBe('text-lg');
      expect(cn('bg-red-500', 'bg-blue-600')).toBe('bg-blue-600');
      expect(cn('p-2', 'p-4')).toBe('p-4');
      
      // Complex example with multiple conflicts
      const result = cn(
        'text-sm text-lg',
        'bg-red-500 bg-blue-600',
        'p-2 p-4'
      );
      expect(result).toBe('text-lg bg-blue-600 p-4');
    });
  });
});