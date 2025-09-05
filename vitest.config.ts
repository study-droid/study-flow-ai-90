import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
        '*.config.js',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/components/ui/', // UI components will have dedicated tests
        'dist/',
        'build/',
        'coverage/',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/types/**',
        '**/*.d.ts'
      ],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      thresholds: {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Higher thresholds for critical modules
        'src/hooks/**': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/services/**': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/lib/**': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'coverage',
      'build'
    ],
    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
    // Parallel execution settings
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/html/index.html'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});