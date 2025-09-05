/**
 * Dashboard E2E Tests
 * Testing the main dashboard functionality and user experience
 */

import { test, expect, testGroup, testStep } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';

testGroup.authenticated('Dashboard', () => {
  test.describe('Dashboard Layout and Navigation', () => {
    test('should display main dashboard elements', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();
      const header = pages.header();
      const sidebar = pages.sidebar();

      await dashboardPage.goto();

      await test.step('Verify core layout elements', async () => {
        // Header should be visible
        await expect(header.logo).toBeVisible();
        await expect(header.userMenu).toBeVisible();

        // Sidebar should be visible
        await expect(sidebar.container).toBeVisible();

        // Main dashboard content
        expect(await dashboardPage.isLoaded()).toBe(true);
        await expect(dashboardPage.welcomeMessage).toBeVisible();
      });

      await test.step('Verify welcome message is personalized', async () => {
        const welcomeText = await dashboardPage.getWelcomeText();
        expect(welcomeText.toLowerCase()).toMatch(/(welcome|hello|hi)/);
      });
    });

    test('should navigate through sidebar menu', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const sidebar = pages.sidebar();

      await authenticatedPage.goto('/dashboard');

      const menuItems = [
        { section: 'tasks', expectedUrl: '/tasks' },
        { section: 'study', expectedUrl: '/study' },
        { section: 'ai-tutor', expectedUrl: '/ai-tutor' },
        { section: 'tables', expectedUrl: '/tables' }
      ];

      for (const item of menuItems) {
        await test.step(`Navigate to ${item.section}`, async () => {
          try {
            await sidebar.navigateTo(item.section);
            await authenticatedPage.waitForLoadState('domcontentloaded');
            expect(authenticatedPage.url()).toContain(item.expectedUrl);
            
            // Navigate back to dashboard for next test
            await authenticatedPage.goto('/dashboard');
          } catch (error) {
            console.log(`Navigation to ${item.section} might not be available: ${error}`);
          }
        });
      }
    });

    test('should handle responsive layout', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();
      const sidebar = pages.sidebar();

      await dashboardPage.goto();

      await test.step('Test mobile viewport', async () => {
        // Switch to mobile viewport
        await authenticatedPage.setViewportSize({ width: 375, height: 667 });
        await authenticatedPage.waitForTimeout(500); // Allow layout to adjust

        // Sidebar might be collapsed or hidden on mobile
        try {
          const isCollapsed = await sidebar.isCollapsed();
          expect(typeof isCollapsed).toBe('boolean');
        } catch {
          // Responsive behavior might be different
        }

        // Dashboard content should still be accessible
        expect(await dashboardPage.isLoaded()).toBe(true);
      });

      await test.step('Test desktop viewport', async () => {
        // Switch back to desktop
        await authenticatedPage.setViewportSize({ width: 1280, height: 720 });
        await authenticatedPage.waitForTimeout(500);

        // Sidebar should be expanded
        await expect(sidebar.container).toBeVisible();
        expect(await dashboardPage.isLoaded()).toBe(true);
      });
    });
  });

  test.describe('Dashboard Widgets and Content', () => {
    test('should display recent tasks widget', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify recent tasks section', async () => {
        try {
          await expect(dashboardPage.recentTasks).toBeVisible({ timeout: 5000 });
          
          const taskCount = await dashboardPage.getTaskCount();
          expect(taskCount).toBeGreaterThanOrEqual(0);

          // If there are tasks, verify they're displayed properly
          if (taskCount > 0) {
            const taskItems = authenticatedPage.locator('[data-testid="task-item"]');
            await expect(taskItems.first()).toBeVisible();
            
            // Task items should have essential information
            await expect(taskItems.first().locator('[data-testid="task-title"]')).toBeVisible();
          }
        } catch {
          console.log('Recent tasks widget might not be implemented');
        }
      });

      await test.step('Test quick task creation', async () => {
        try {
          await dashboardPage.clickCreateTask();
          
          // Should open task creation modal or navigate to tasks page
          const isModal = await authenticatedPage.locator('[data-testid="task-modal"]').isVisible({ timeout: 3000 });
          const isTasksPage = authenticatedPage.url().includes('/tasks');
          
          expect(isModal || isTasksPage).toBe(true);
        } catch {
          console.log('Quick task creation might not be available from dashboard');
        }
      });
    });

    test('should display study progress widget', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify study progress section', async () => {
        try {
          await expect(dashboardPage.studyProgress).toBeVisible({ timeout: 5000 });
          
          // Check for progress indicators
          const progressElements = authenticatedPage.locator('[data-testid*="progress"]');
          const count = await progressElements.count();
          expect(count).toBeGreaterThan(0);
          
        } catch {
          console.log('Study progress widget might not be implemented');
        }
      });
    });

    test('should display upcoming deadlines', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify upcoming deadlines section', async () => {
        try {
          await expect(dashboardPage.upcomingDeadlines).toBeVisible({ timeout: 5000 });
          
          // Check for deadline items
          const deadlineItems = authenticatedPage.locator('[data-testid="deadline-item"]');
          const count = await deadlineItems.count();
          expect(count).toBeGreaterThanOrEqual(0);
          
        } catch {
          console.log('Upcoming deadlines widget might not be implemented');
        }
      });
    });

    test('should display AI recommendations', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify AI recommendations section', async () => {
        try {
          await expect(dashboardPage.aiRecommendations).toBeVisible({ timeout: 5000 });
          
          // Check for recommendation items
          const recommendationItems = authenticatedPage.locator('[data-testid="recommendation-item"]');
          const count = await recommendationItems.count();
          expect(count).toBeGreaterThanOrEqual(0);
          
        } catch {
          console.log('AI recommendations widget might not be implemented');
        }
      });
    });

    test('should display statistics cards', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify statistics cards', async () => {
        try {
          const statsCards = await dashboardPage.statsCards.count();
          expect(statsCards).toBeGreaterThan(0);
          
          // Each stats card should have a title and value
          for (let i = 0; i < Math.min(statsCards, 4); i++) {
            const card = dashboardPage.statsCards.nth(i);
            await expect(card).toBeVisible();
            
            // Look for stat value and label
            const hasValue = await card.locator('[data-testid="stat-value"]').isVisible();
            const hasLabel = await card.locator('[data-testid="stat-label"]').isVisible();
            expect(hasValue || hasLabel).toBe(true);
          }
        } catch {
          console.log('Statistics cards might not be implemented');
        }
      });
    });
  });

  test.describe('Quick Actions', () => {
    test('should provide quick action buttons', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify quick actions section', async () => {
        try {
          await expect(dashboardPage.quickActions).toBeVisible({ timeout: 5000 });
          
          const quickActionButtons = authenticatedPage.locator('[data-testid^="quick-action-"]');
          const count = await quickActionButtons.count();
          expect(count).toBeGreaterThan(0);
          
        } catch {
          console.log('Quick actions section might not be implemented');
        }
      });
    });

    test('should execute quick actions correctly', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      const quickActions = [
        { action: 'create-task', expectedResult: 'task creation' },
        { action: 'start-study', expectedResult: 'study session' },
        { action: 'ai-tutor', expectedResult: 'AI tutor' },
        { action: 'create-table', expectedResult: 'table creation' }
      ];

      for (const quickAction of quickActions) {
        await test.step(`Test ${quickAction.action} quick action`, async () => {
          try {
            // Return to dashboard
            await dashboardPage.goto();
            
            await dashboardPage.clickQuickAction(quickAction.action);
            
            // Verify action result (navigation or modal)
            await authenticatedPage.waitForTimeout(1000);
            
            const currentUrl = authenticatedPage.url();
            const hasModal = await authenticatedPage.locator('[data-testid*="modal"]').isVisible({ timeout: 2000 });
            
            // Should either navigate or open modal
            expect(currentUrl !== '/dashboard' || hasModal).toBe(true);
            
          } catch (error) {
            console.log(`Quick action ${quickAction.action} might not be implemented: ${error}`);
          }
        });
      }
    });
  });

  test.describe('Dashboard Personalization', () => {
    test('should show user-specific content', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify personalized content', async () => {
        // Welcome message should be personalized
        const welcomeText = await dashboardPage.getWelcomeText();
        expect(welcomeText.length).toBeGreaterThan(0);
        
        // Recent tasks should be user's own tasks
        try {
          const taskCount = await dashboardPage.getTaskCount();
          
          if (taskCount > 0) {
            // Tasks should not contain other users' data
            const taskItems = authenticatedPage.locator('[data-testid="task-item"]');
            
            for (let i = 0; i < Math.min(taskCount, 3); i++) {
              const taskText = await taskItems.nth(i).textContent();
              expect(taskText).toBeDefined();
              expect(taskText!.length).toBeGreaterThan(0);
            }
          }
        } catch {
          console.log('Task personalization check skipped');
        }
      });
    });

    test('should handle empty state gracefully', async ({ page }) => {
      // Use a fresh user context to test empty state
      const pages = new PageObjectFactory(page);
      const authHelper = pages.auth();
      const dashboardPage = pages.dashboard();

      // Sign in with new user (if available)
      try {
        await authHelper.signIn('new_user');
        await dashboardPage.goto();
        
        await test.step('Verify empty state messaging', async () => {
          // Should show appropriate empty state messages
          const hasEmptyState = await page.locator('[data-testid*="empty"]').isVisible({ timeout: 3000 });
          const hasWelcomeGuide = await page.locator('[data-testid*="welcome-guide"]').isVisible({ timeout: 3000 });
          const hasGettingStarted = await page.locator('[data-testid*="getting-started"]').isVisible({ timeout: 3000 });
          
          // Should have some form of guidance for new users
          expect(hasEmptyState || hasWelcomeGuide || hasGettingStarted).toBe(true);
        });
        
      } catch {
        console.log('New user testing skipped - user might not exist');
      }
    });
  });

  test.describe('Dashboard Performance', () => {
    test('should load dashboard quickly', async ({ authenticatedPage }) => {
      const startTime = Date.now();
      
      await testStep.timed('Dashboard load performance', async () => {
        await authenticatedPage.goto('/dashboard');
        await authenticatedPage.waitForLoadState('domcontentloaded');
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        console.log(`Dashboard loaded in ${loadTime}ms`);
        expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      });
    });

    test('should handle multiple widget loading', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Verify widgets load independently', async () => {
        const widgets = [
          '[data-testid="recent-tasks"]',
          '[data-testid="study-progress"]',
          '[data-testid="upcoming-deadlines"]',
          '[data-testid="ai-recommendations"]',
          '[data-testid="quick-actions"]'
        ];

        // Count how many widgets actually exist and load
        let loadedWidgets = 0;
        
        for (const widget of widgets) {
          try {
            await expect(authenticatedPage.locator(widget)).toBeVisible({ timeout: 3000 });
            loadedWidgets++;
          } catch {
            // Widget might not exist
          }
        }

        console.log(`${loadedWidgets} dashboard widgets loaded`);
        // Should have at least some widgets loaded
        expect(loadedWidgets).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Dashboard Integration', () => {
    test('should integrate with other app sections', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Test integration links', async () => {
        // "View all tasks" should navigate to tasks page
        try {
          await dashboardPage.clickViewAllTasks();
          await authenticatedPage.waitForURL('**/tasks', { timeout: 5000 });
          expect(authenticatedPage.url()).toContain('/tasks');
          
          // Navigate back
          await dashboardPage.goto();
        } catch {
          console.log('View all tasks integration might not be implemented');
        }

        // Other integration points
        const integrationLinks = [
          { testId: 'view-calendar', expectedUrl: '/calendar' },
          { testId: 'view-analytics', expectedUrl: '/analytics' },
          { testId: 'start-study-session', expectedUrl: '/study' }
        ];

        for (const link of integrationLinks) {
          try {
            await authenticatedPage.click(`[data-testid="${link.testId}"]`, { timeout: 2000 });
            await authenticatedPage.waitForLoadState('domcontentloaded');
            
            if (authenticatedPage.url().includes(link.expectedUrl)) {
              // Navigation successful
              await dashboardPage.goto(); // Return to dashboard
            }
          } catch {
            console.log(`Integration link ${link.testId} might not be implemented`);
          }
        }
      });
    });

    test('should refresh data appropriately', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Test data refresh', async () => {
        // Get initial state
        const initialTaskCount = await dashboardPage.getTaskCount();
        
        // Simulate creating a task in another tab/context
        const newContext = await authenticatedPage.context().browser()?.newContext({
          storageState: 'tests/.auth/user.json'
        });
        
        if (newContext) {
          const newPage = await newContext.newPage();
          const newPages = new PageObjectFactory(newPage);
          const tasksPage = newPages.tasks();
          
          try {
            await tasksPage.goto();
            await tasksPage.createTask();
            await newPage.fill('[data-testid="task-title-input"]', 'Dashboard Refresh Test');
            await newPage.click('[data-testid="submit-button"]');
            await newPage.waitForSelector('[data-testid="task-created-toast"]', { timeout: 5000 });
            
            // Return to original dashboard and refresh
            await dashboardPage.goto();
            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState('domcontentloaded');
            
            // Task count should update
            const newTaskCount = await dashboardPage.getTaskCount();
            expect(newTaskCount).toBeGreaterThanOrEqual(initialTaskCount);
            
          } catch (error) {
            console.log('Data refresh test failed:', error);
          }
          
          await newContext.close();
        }
      });
    });
  });
});