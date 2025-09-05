/**
 * Barrel file for shared utilities
 */

export * from './cn';
export * from './format';
export * from './validation';
export * from './error';
export * from './storage';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}