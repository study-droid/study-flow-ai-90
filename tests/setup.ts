import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.VITE_DEEPSEEK_API_KEY = 'test-api-key';
process.env.VITE_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock global objects
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
});

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset localStorage mock
  (window.localStorage.getItem as any).mockReturnValue(null);
  (window.localStorage.setItem as any).mockImplementation(() => {});
  (window.localStorage.removeItem as any).mockImplementation(() => {});
  (window.localStorage.clear as any).mockImplementation(() => {});
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});