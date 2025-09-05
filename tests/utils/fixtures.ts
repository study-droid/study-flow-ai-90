/**
 * Playwright Fixtures
 * Custom fixtures for test setup and teardown
 */

import { test as base, Page } from '@playwright/test';
import { TestContext } from './test-helpers';
import { initializeMockServer, stopMockServer, resetMockServer } from '../config/mock-server';

/**
 * Extended test type with custom fixtures
 */
export type TestFixtures = {
  testContext: TestContext;
  authenticatedPage: Page;
  adminPage: Page;
  mockServer: any;
};

/**
 * Worker-scoped fixtures (shared across all tests in a worker)
 */
export type WorkerFixtures = {
  globalMockServer: any;
};

/**
 * Extend Playwright test with custom fixtures
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker-scoped mock server (runs once per worker)
  globalMockServer: [
    async ({}, use) => {
      console.log('🔧 Setting up worker-scoped mock server...');
      const server = await initializeMockServer();
      await use(server);
      console.log('🔧 Cleaning up worker-scoped mock server...');
      await stopMockServer();
    },
    { scope: 'worker' }
  ],

  // Test-scoped mock server reset
  mockServer: [
    async ({ globalMockServer }, use) => {
      // Reset handlers before each test
      resetMockServer();
      await use(globalMockServer);
      // Server cleanup is handled by the global fixture
    },
    { auto: true }
  ],

  // Enhanced test context with all helpers
  testContext: async ({ page }, use) => {
    const testContext = new TestContext(page);
    
    // Setup error logging
    testContext.debug.logConsoleErrors();
    
    await use(testContext);
  },

  // Pre-authenticated page for regular user
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/.auth/user.json',
    });
    
    const page = await context.newPage();
    
    // Verify authentication
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    // Ensure we're authenticated
    try {
      await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 10000 });
    } catch (error) {
      console.warn('⚠️  Authentication verification failed, tests may fail');
    }
    
    await use(page);
    await context.close();
  },

  // Pre-authenticated admin page
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as admin
    const authHelper = new TestContext(page).auth;
    await authHelper.signIn('admin');
    
    await use(page);
    await context.close();
  },
});

/**
 * Custom test describe blocks with setup/teardown
 */
export const testGroup = {
  /**
   * Test group for features requiring authentication
   */
  authenticated: (title: string, callback: () => void) => {
    test.describe(title, () => {
      test.beforeEach(async ({ testContext }) => {
        // Ensure we start from dashboard
        await testContext.navigation.goToDashboard();
        
        // Verify authentication state
        const isSignedIn = await testContext.auth.isSignedIn();
        if (!isSignedIn) {
          console.warn('⚠️  User not authenticated, signing in...');
          await testContext.auth.signIn();
        }
      });

      callback();
    });
  },

  /**
   * Test group for AI features with mock server validation
   */
  aiFeatures: (title: string, callback: () => void) => {
    test.describe(title, () => {
      test.beforeEach(async ({ testContext, mockServer }) => {
        // Ensure mock server is ready
        expect(mockServer).toBeDefined();
        
        // Navigate to AI feature
        await testContext.navigation.goToAITutor();
      });

      callback();
    });
  },

  /**
   * Test group for database-dependent features
   */
  withDatabase: (title: string, callback: () => void) => {
    test.describe(title, () => {
      test.beforeEach(async ({ testContext }) => {
        // Could add database state validation here
        console.log('🗄️  Running test with database dependency');
      });

      test.afterEach(async () => {
        // Could add test data cleanup here
        console.log('🧹 Cleaning up test data...');
      });

      callback();
    });
  },

  /**
   * Test group for performance-sensitive tests
   */
  performance: (title: string, callback: () => void) => {
    test.describe(title, () => {
      test.beforeEach(async ({ testContext }) => {
        // Setup performance monitoring
        await testContext.page.addInitScript(() => {
          (window as any).performanceMarks = [];
          (window as any).markPerformance = (name: string) => {
            (window as any).performanceMarks.push({
              name,
              timestamp: Date.now(),
            });
          };
        });
      });

      test.afterEach(async ({ testContext }) => {
        // Log performance metrics
        const marks = await testContext.page.evaluate(() => (window as any).performanceMarks);
        console.log('📊 Performance marks:', marks);
      });

      callback();
    });
  },

  /**
   * Test group for mobile viewport tests
   */
  mobile: (title: string, callback: () => void) => {
    test.describe(title, () => {
      test.beforeEach(async ({ testContext }) => {
        await testContext.page.setViewportSize({ width: 375, height: 667 });
      });

      callback();
    });
  },

  /**
   * Test group for accessibility tests
   */
  accessibility: (title: string, callback: () => void) => {
    test.describe(title, () => {
      test.beforeEach(async ({ testContext }) => {
        // Could inject axe-core or other a11y tools here
        console.log('♿ Running accessibility test group');
      });

      callback();
    });
  },
};

/**
 * Test step utilities
 */
export const testStep = {
  /**
   * Retry a step with exponential backoff
   */
  retry: async (stepName: string, operation: () => Promise<void>, maxRetries: number = 3) => {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        await test.step(`${stepName} (attempt ${attempts + 1})`, operation);
        return;
      } catch (error) {
        attempts++;
        if (attempts === maxRetries) {
          throw error;
        }
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  /**
   * Time a test step
   */
  timed: async (stepName: string, operation: () => Promise<void>) => {
    const startTime = Date.now();
    await test.step(stepName, operation);
    const endTime = Date.now();
    console.log(`⏱️  Step "${stepName}" took ${endTime - startTime}ms`);
  },

  /**
   * Step with screenshot on failure
   */
  withScreenshot: async (testContext: TestContext, stepName: string, operation: () => Promise<void>) => {
    try {
      await test.step(stepName, operation);
    } catch (error) {
      await testContext.debug.takeScreenshot(`${stepName}-failure`);
      throw error;
    }
  },
};

/**
 * Common test data generators
 */
export const testData = {
  /**
   * Generate unique test ID
   */
  uniqueId: () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,

  /**
   * Generate test email
   */
  email: (prefix: string = 'test') => `${prefix}-${testData.uniqueId()}@studyflow.test`,

  /**
   * Generate random string
   */
  randomString: (length: number = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  /**
   * Generate future date
   */
  futureDate: (daysFromNow: number = 7) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },

  /**
   * Generate past date
   */
  pastDate: (daysAgo: number = 7) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  },
};

// Re-export expect for convenience
export { expect } from '@playwright/test';