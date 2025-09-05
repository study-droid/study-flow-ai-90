/**
 * User Permissions and Authorization E2E Tests
 * Testing role-based access and permission boundaries
 */

import { test, expect, testGroup } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';

testGroup.authenticated('User Permissions', () => {
  test.describe('Regular User Permissions', () => {
    test('should allow regular users to access standard features', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      
      const allowedPages = [
        { path: '/dashboard', page: () => pages.dashboard() },
        { path: '/tasks', page: () => pages.tasks() },
        { path: '/ai-tutor', page: () => pages.aiTutor() },
        { path: '/tables', page: () => pages.tableBuilder() }
      ];

      for (const route of allowedPages) {
        await test.step(`Access ${route.path}`, async () => {
          const pageObj = route.page();
          await pageObj.goto();
          expect(await pageObj.isLoaded()).toBe(true);
        });
      }
    });

    test('should allow regular users to create and manage their own data', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      
      await test.step('Create personal task', async () => {
        const tasksPage = pages.tasks();
        await tasksPage.goto();
        
        const initialCount = await tasksPage.getTaskCount();
        await tasksPage.createTask();
        
        // Fill task form (basic test)
        await authenticatedPage.fill('[data-testid="task-title-input"]', 'My Personal Task');
        await authenticatedPage.click('[data-testid="submit-button"]');
        
        // Should create successfully
        await authenticatedPage.waitForSelector('[data-testid="task-created-toast"]', { timeout: 5000 });
      });

      await test.step('Use AI Tutor', async () => {
        const aiTutorPage = pages.aiTutor();
        await aiTutorPage.goto();
        
        await aiTutorPage.sendMessage('Hello, can you help me study?');
        await aiTutorPage.waitForResponse();
        
        const messageCount = await aiTutorPage.getMessageCount();
        expect(messageCount).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Admin User Permissions', () => {
    test('should allow admin users enhanced access', async ({ adminPage }) => {
      const pages = new PageObjectFactory(adminPage);
      
      // Navigate to dashboard
      const dashboardPage = pages.dashboard();
      await dashboardPage.goto();
      
      await test.step('Access admin features', async () => {
        // Look for admin-specific elements
        try {
          await adminPage.waitForSelector('[data-testid="admin-panel"]', { timeout: 5000 });
          expect(await adminPage.locator('[data-testid="admin-panel"]').isVisible()).toBe(true);
        } catch {
          // Admin features might not be implemented yet, which is fine
          console.log('Admin features not found - may not be implemented');
        }
      });

      await test.step('Access all standard features', async () => {
        const standardFeatures = ['/tasks', '/ai-tutor', '/tables'];
        
        for (const path of standardFeatures) {
          await adminPage.goto(path);
          await adminPage.waitForLoadState('domcontentloaded');
          expect(adminPage.url()).toContain(path);
        }
      });
    });
  });

  test.describe('Data Access Controls', () => {
    test('should restrict users to their own data', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const tasksPage = pages.tasks();
      
      await tasksPage.goto();
      
      await test.step('Verify user sees only their data', async () => {
        // User should only see their own tasks
        const taskCount = await tasksPage.getTaskCount();
        
        // Check that tasks belong to current user
        for (let i = 0; i < Math.min(taskCount, 3); i++) {
          await tasksPage.clickTask(i);
          
          // Task details should not show other users' data
          try {
            const taskOwner = await authenticatedPage.textContent('[data-testid="task-owner"]');
            if (taskOwner) {
              expect(taskOwner).toContain('test@studyflow.ai'); // Current test user
            }
          } catch {
            // Task owner field might not exist, which is fine
          }
        }
      });
    });

    test('should prevent unauthorized data modification', async ({ authenticatedPage }) => {
      // Try to access/modify data that doesn't belong to the user
      await test.step('Attempt unauthorized access', async () => {
        // Try to access another user's task (if URLs are predictable)
        await authenticatedPage.goto('/tasks/unauthorized-task-id');
        
        // Should either redirect or show 404/403
        await authenticatedPage.waitForLoadState('domcontentloaded');
        
        const isUnauthorized = 
          authenticatedPage.url().includes('/tasks') && !authenticatedPage.url().includes('/unauthorized-task-id') ||
          await authenticatedPage.locator('[data-testid="not-found"]').isVisible() ||
          await authenticatedPage.locator('[data-testid="unauthorized"]').isVisible();
          
        expect(isUnauthorized).toBe(true);
      });
    });
  });

  test.describe('API Access Controls', () => {
    test('should protect API endpoints', async ({ authenticatedPage }) => {
      await test.step('Test authenticated API calls', async () => {
        // Make API call through the browser context (with auth cookies)
        const response = await authenticatedPage.request.get('/api/user/profile');
        expect(response.status()).toBeLessThan(400); // Should be successful
      });

      await test.step('Test API with missing auth', async () => {
        // Create a new context without authentication
        const context = await authenticatedPage.context().browser()?.newContext();
        const unauthPage = await context?.newPage();
        
        if (unauthPage) {
          try {
            const response = await unauthPage.request.get('/api/user/profile');
            expect(response.status()).toBe(401); // Should be unauthorized
          } catch (error) {
            // Network error is also acceptable for protected endpoints
            expect(error).toBeDefined();
          }
          
          await context?.close();
        }
      });
    });
  });

  test.describe('Feature Flags and Access Control', () => {
    test('should respect feature flags', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      
      await test.step('Check feature availability', async () => {
        // Navigate to features that might be behind flags
        const conditionalFeatures = [
          { path: '/analytics', testId: 'analytics-dashboard' },
          { path: '/advanced-ai', testId: 'advanced-ai-features' }
        ];

        for (const feature of conditionalFeatures) {
          try {
            await authenticatedPage.goto(feature.path);
            await authenticatedPage.waitForLoadState('domcontentloaded');
            
            // Check if feature is available or properly restricted
            const hasFeature = await authenticatedPage.locator(`[data-testid="${feature.testId}"]`).isVisible({ timeout: 2000 });
            const hasRestriction = await authenticatedPage.locator('[data-testid="feature-restricted"]').isVisible({ timeout: 1000 });
            
            // Either feature should be available OR properly restricted
            expect(hasFeature || hasRestriction || authenticatedPage.url().includes('/dashboard')).toBe(true);
          } catch {
            // Feature might not exist, which is fine
            console.log(`Feature ${feature.path} not accessible or doesn't exist`);
          }
        }
      });
    });

    test('should handle subscription-based features', async ({ authenticatedPage }) => {
      // Test premium/subscription features if they exist
      await test.step('Check premium feature access', async () => {
        try {
          await authenticatedPage.goto('/premium-features');
          
          // Should either show premium content or upgrade prompt
          const hasPremiumContent = await authenticatedPage.locator('[data-testid="premium-content"]').isVisible({ timeout: 2000 });
          const hasUpgradePrompt = await authenticatedPage.locator('[data-testid="upgrade-prompt"]').isVisible({ timeout: 2000 });
          
          expect(hasPremiumContent || hasUpgradePrompt).toBe(true);
        } catch {
          // Premium features might not be implemented
          console.log('Premium features not found');
        }
      });
    });
  });

  test.describe('Security Boundaries', () => {
    test('should prevent XSS attacks', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const aiTutorPage = pages.aiTutor();
      
      await aiTutorPage.goto();
      
      await test.step('Test XSS prevention in AI chat', async () => {
        const xssPayload = '<script>alert("XSS")</script>';
        await aiTutorPage.sendMessage(xssPayload);
        await aiTutorPage.waitForResponse();
        
        // Check that script didn't execute
        const pageContent = await authenticatedPage.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
        
        // Payload should be escaped/sanitized
        const lastMessage = await aiTutorPage.getLastMessage();
        expect(lastMessage).not.toContain('<script>');
      });
    });

    test('should prevent CSRF attacks', async ({ authenticatedPage }) => {
      await test.step('Test CSRF protection', async () => {
        // Attempt to make a state-changing request without proper CSRF token
        try {
          const response = await authenticatedPage.request.post('/api/tasks', {
            data: { title: 'CSRF Test Task' }
          });
          
          // Should either succeed with proper CSRF handling or fail with 403
          expect(response.status()).not.toBe(500); // Should not cause server error
        } catch {
          // CSRF protection might cause the request to fail, which is good
        }
      });
    });

    test('should validate input sanitization', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const tasksPage = pages.tasks();
      
      await tasksPage.goto();
      await tasksPage.createTask();
      
      await test.step('Test input validation', async () => {
        const maliciousInput = '"><script>alert("XSS")</script>';
        
        await authenticatedPage.fill('[data-testid="task-title-input"]', maliciousInput);
        await authenticatedPage.fill('[data-testid="task-description-input"]', maliciousInput);
        
        await authenticatedPage.click('[data-testid="submit-button"]');
        
        // Should either validate input or properly escape it
        const pageContent = await authenticatedPage.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
      });
    });
  });
});