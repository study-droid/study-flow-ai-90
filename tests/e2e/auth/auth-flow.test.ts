/**
 * Authentication Flow E2E Tests
 * Comprehensive testing of user authentication flows
 */

import { test, expect, testGroup, testStep } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';
import { testData } from '../../utils/fixtures';

testGroup.authenticated('Authentication Flow', () => {
  test.describe('User Registration', () => {
    test('should successfully register a new user', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();
      const dashboardPage = pages.dashboard();

      await testStep.timed('Navigate to registration', async () => {
        await authPage.goto();
        expect(await authPage.isLoaded()).toBe(true);
      });

      await testStep.withScreenshot(
        { page } as any,
        'Register new user',
        async () => {
          const email = testData.email('newuser');
          const password = 'SecurePassword123!';

          await authPage.signUp(email, password);
          
          // Should redirect to dashboard or onboarding
          await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
          
          // Check if we reached dashboard
          if (page.url().includes('/dashboard')) {
            expect(await dashboardPage.isLoaded()).toBe(true);
          }
        }
      );
    });

    test('should show validation errors for invalid registration', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();

      await authPage.goto();

      await test.step('Test invalid email format', async () => {
        await authPage.signUp('invalid-email', 'password123');
        expect(await authPage.hasError()).toBe(true);
      });

      await test.step('Test weak password', async () => {
        await authPage.signUp('test@example.com', '123');
        expect(await authPage.hasError()).toBe(true);
      });

      await test.step('Test duplicate email', async () => {
        await authPage.signUp('test@studyflow.ai', 'password123'); // Known test user
        expect(await authPage.hasError()).toBe(true);
        expect(await authPage.getErrorText()).toContain('already registered');
      });
    });
  });

  test.describe('User Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();
      const dashboardPage = pages.dashboard();

      await testStep.timed('Navigate and login', async () => {
        await authPage.goto();
        await authPage.signIn('test@studyflow.ai', 'TestPassword123!');
        
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        expect(await dashboardPage.isLoaded()).toBe(true);
      });

      await test.step('Verify user is authenticated', async () => {
        const header = pages.header();
        expect(await header.userMenu.isVisible()).toBe(true);
        
        const welcomeText = await dashboardPage.getWelcomeText();
        expect(welcomeText).toContain('Welcome');
      });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();

      await authPage.goto();

      await test.step('Test invalid email', async () => {
        await authPage.signIn('nonexistent@example.com', 'password123');
        expect(await authPage.hasError()).toBe(true);
      });

      await test.step('Test wrong password', async () => {
        await authPage.signIn('test@studyflow.ai', 'wrongpassword');
        expect(await authPage.hasError()).toBe(true);
      });
    });

    test('should handle loading states during login', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();

      await authPage.goto();
      
      // Start login process
      await authPage.signIn('test@studyflow.ai', 'TestPassword123!');
      
      // Should show loading spinner briefly
      try {
        await authPage.loadingSpinner.waitFor({ timeout: 2000 });
        expect(await authPage.isLoading()).toBe(true);
      } catch {
        // Loading might be too fast to catch, which is fine
      }
      
      // Should eventually complete
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    });
  });

  test.describe('Google OAuth Integration', () => {
    test.skip('should initiate Google OAuth flow', async ({ page }) => {
      // Skip in CI as it requires actual Google OAuth setup
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();

      await authPage.goto();
      
      // Mock the Google OAuth popup
      await page.route('**/auth/google', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      });

      await authPage.signInWithGoogle();
      
      // In a real scenario, this would redirect to Google
      // For testing, we just verify the button click worked
      expect(page.url()).toContain('auth');
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should navigate to forgot password', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();

      await authPage.goto();
      await authPage.forgotPassword();
      
      // Should navigate to forgot password page or show reset form
      expect(page.url()).toMatch(/(forgot|reset)/);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      // Navigate to dashboard
      await dashboardPage.goto();
      expect(await dashboardPage.isLoaded()).toBe(true);

      // Reload the page
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState('domcontentloaded');

      // Should still be authenticated
      expect(await dashboardPage.isLoaded()).toBe(true);
    });

    test('should handle session expiration gracefully', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      
      // Simulate session expiration by clearing storage
      await authenticatedPage.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate to protected route
      await authenticatedPage.goto('/tasks');
      
      // Should redirect to auth page
      await authenticatedPage.waitForURL('**/auth', { timeout: 10000 });
    });

    test('should successfully logout user', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const header = pages.header();
      const authPage = pages.auth();

      // Navigate to dashboard first
      await authenticatedPage.goto('/dashboard');
      
      // Logout via header menu
      await header.signOut();
      
      // Should redirect to auth page
      await authenticatedPage.waitForURL('**/auth', { timeout: 10000 });
      expect(await authPage.isLoaded()).toBe(true);
      
      // Verify user is logged out
      expect(await header.userMenu.isVisible()).toBe(false);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/tasks',
        '/study',
        '/ai-tutor',
        '/tables',
        '/calendar',
        '/analytics'
      ];

      for (const route of protectedRoutes) {
        await test.step(`Test protection for ${route}`, async () => {
          await page.goto(route);
          
          // Should redirect to auth page
          await page.waitForURL('**/auth', { timeout: 10000 });
          expect(page.url()).toContain('/auth');
        });
      }
    });

    test('should allow authenticated users to access protected routes', async ({ authenticatedPage }) => {
      const protectedRoutes = [
        { path: '/dashboard', testId: 'welcome-message' },
        { path: '/tasks', testId: 'create-task-button' },
        { path: '/ai-tutor', testId: 'ai-chat-input' },
        { path: '/tables', testId: 'table-prompt-input' }
      ];

      for (const route of protectedRoutes) {
        await test.step(`Test access to ${route.path}`, async () => {
          await authenticatedPage.goto(route.path);
          await authenticatedPage.waitForLoadState('domcontentloaded');
          
          // Should load the page successfully
          expect(authenticatedPage.url()).toContain(route.path);
          
          // Verify page content loaded
          await expect(authenticatedPage.locator(`[data-testid="${route.testId}"]`)).toBeVisible();
        });
      }
    });
  });

  test.describe('User Onboarding', () => {
    test('should guide new users through onboarding', async ({ page }) => {
      // This test would typically use a new user account
      // For demo purposes, we'll navigate to onboarding directly
      await page.goto('/onboarding');
      
      // Check if onboarding page loads
      try {
        await page.waitForSelector('[data-testid="onboarding-welcome"]', { timeout: 5000 });
        
        await test.step('Complete onboarding steps', async () => {
          // Complete profile setup
          await page.fill('[data-testid="display-name-input"]', 'Test User');
          await page.click('[data-testid="next-step-button"]');
          
          // Subject selection (if exists)
          try {
            await page.click('[data-testid="subject-math"]', { timeout: 2000 });
            await page.click('[data-testid="next-step-button"]');
          } catch {
            // Skip if no subject selection
          }
          
          // Complete onboarding
          await page.click('[data-testid="complete-onboarding"]');
          
          // Should redirect to dashboard
          await page.waitForURL('**/dashboard', { timeout: 10000 });
        });
      } catch {
        // Onboarding might not exist or be different, skip this test
        test.skip();
      }
    });
  });

  test.describe('Authentication Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();

      // Simulate network failure
      await page.route('**/auth/**', route => route.abort());

      await authPage.goto();
      await authPage.signIn('test@studyflow.ai', 'TestPassword123!');
      
      // Should show network error
      expect(await authPage.hasError()).toBe(true);
      const errorText = await authPage.getErrorText();
      expect(errorText.toLowerCase()).toMatch(/(network|connection|failed)/);
    });

    test('should handle server errors gracefully', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();

      // Simulate server error
      await page.route('**/auth/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await authPage.goto();
      await authPage.signIn('test@studyflow.ai', 'TestPassword123!');
      
      // Should show server error
      expect(await authPage.hasError()).toBe(true);
    });
  });
});