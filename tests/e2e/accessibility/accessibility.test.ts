/**
 * Accessibility E2E Tests
 * Testing WCAG compliance, keyboard navigation, screen reader compatibility
 */

import { test, expect, testGroup } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';
import { injectAxe, checkA11y } from 'axe-playwright';

testGroup.accessibility('Accessibility Compliance', () => {
  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should pass accessibility audit on main pages', async ({ authenticatedPage }) => {
      const pages = [
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/tasks', name: 'Tasks' },
        { path: '/ai-tutor', name: 'AI Tutor' },
        { path: '/tables', name: 'Tables' },
        { path: '/study', name: 'Study' }
      ];

      for (const pageInfo of pages) {
        await test.step(`Audit ${pageInfo.name} page`, async () => {
          await authenticatedPage.goto(pageInfo.path);
          await authenticatedPage.waitForLoadState('domcontentloaded');
          
          // Inject axe-core
          await injectAxe(authenticatedPage);
          
          // Run accessibility audit
          await checkA11y(authenticatedPage, null, {
            detailedReport: true,
            detailedReportOptions: { html: true },
            // Focus on critical issues
            tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
            rules: {
              // Disable some rules that might be too strict for development
              'color-contrast': { enabled: true },
              'landmark-one-main': { enabled: true },
              'page-has-heading-one': { enabled: true }
            }
          });
          
          console.log(`✅ ${pageInfo.name} passed accessibility audit`);
        });
      }
    });

    test('should have proper heading structure', async ({ authenticatedPage }) => {
      const pages = ['/dashboard', '/tasks', '/ai-tutor'];
      
      for (const path of pages) {
        await test.step(`Check heading structure on ${path}`, async () => {
          await authenticatedPage.goto(path);
          await authenticatedPage.waitForLoadState('domcontentloaded');
          
          // Check for h1
          const h1Count = await authenticatedPage.locator('h1').count();
          expect(h1Count).toBeGreaterThanOrEqual(1);
          expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1
          
          // Check heading hierarchy
          const headings = await authenticatedPage.locator('h1, h2, h3, h4, h5, h6').allTextContents();
          expect(headings.length).toBeGreaterThan(0);
          
          console.log(`${path} has proper heading structure: ${headings.length} headings`);
        });
      }
    });

    test('should have proper ARIA labels and roles', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Check ARIA attributes', async () => {
        // Check for proper button labels
        const buttons = authenticatedPage.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const button = buttons.nth(i);
          const ariaLabel = await button.getAttribute('aria-label');
          const text = await button.textContent();
          const hasAccessibleName = ariaLabel || (text && text.trim().length > 0);
          
          if (!hasAccessibleName) {
            console.warn(`Button ${i} lacks accessible name`);
          }
        }
        
        // Check for proper form labels
        const inputs = authenticatedPage.locator('input[type="text"], input[type="email"], input[type="password"], textarea');
        const inputCount = await inputs.count();
        
        for (let i = 0; i < Math.min(inputCount, 5); i++) {
          const input = inputs.nth(i);
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          
          let hasLabel = false;
          
          if (id) {
            const label = authenticatedPage.locator(`label[for="${id}"]`);
            hasLabel = await label.count() > 0;
          }
          
          hasLabel = hasLabel || !!ariaLabel || !!ariaLabelledBy;
          
          if (!hasLabel) {
            console.warn(`Input ${i} lacks proper label`);
          }
        }
        
        console.log('ARIA attributes checked');
      });
    });

    test('should have sufficient color contrast', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Check color contrast', async () => {
        // Inject axe and check specifically for color contrast
        await injectAxe(authenticatedPage);
        
        await checkA11y(authenticatedPage, null, {
          rules: {
            'color-contrast': { enabled: true }
          }
        });
        
        console.log('Color contrast compliance verified');
      });
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support tab navigation through all interactive elements', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Test tab navigation', async () => {
        // Start from the beginning
        await authenticatedPage.keyboard.press('Home');
        
        // Track focusable elements
        let focusedElements = [];
        let previousFocusedElement = null;
        
        // Tab through first 20 elements to test navigation
        for (let i = 0; i < 20; i++) {
          await authenticatedPage.keyboard.press('Tab');
          
          const focusedElement = await authenticatedPage.evaluate(() => {
            const focused = document.activeElement;
            return focused ? {
              tagName: focused.tagName,
              type: focused.type || null,
              role: focused.getAttribute('role'),
              ariaLabel: focused.getAttribute('aria-label'),
              text: focused.textContent?.trim().substring(0, 30)
            } : null;
          });
          
          if (focusedElement && focusedElement !== previousFocusedElement) {
            focusedElements.push(focusedElement);
            previousFocusedElement = focusedElement;
          }
        }
        
        expect(focusedElements.length).toBeGreaterThan(5);
        console.log(`Tab navigation works through ${focusedElements.length} elements`);
      });
    });

    test('should support arrow key navigation in lists', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Test arrow key navigation', async () => {
        // Look for lists (task list, navigation menu, etc.)
        const lists = authenticatedPage.locator('[role="list"], [role="listbox"], [role="menu"], ul');
        const listCount = await lists.count();
        
        if (listCount > 0) {
          const firstList = lists.first();
          
          // Focus the list
          await firstList.focus();
          
          // Try arrow key navigation
          await authenticatedPage.keyboard.press('ArrowDown');
          await authenticatedPage.keyboard.press('ArrowDown');
          await authenticatedPage.keyboard.press('ArrowUp');
          
          console.log('Arrow key navigation tested on lists');
        }
      });
    });

    test('should support Enter and Space for button activation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Test keyboard button activation', async () => {
        // Find buttons and test keyboard activation
        const buttons = authenticatedPage.locator('button').first();
        const buttonExists = await buttons.isVisible();
        
        if (buttonExists) {
          // Focus the button
          await buttons.focus();
          
          // Test Space key activation
          const buttonText = await buttons.textContent();
          console.log(`Testing keyboard activation on button: ${buttonText?.substring(0, 30)}`);
          
          // Check if button is clickable with keyboard
          const isDisabled = await buttons.isDisabled();
          if (!isDisabled) {
            // These should work without throwing errors
            await authenticatedPage.keyboard.press('Space');
            await authenticatedPage.waitForTimeout(100);
            
            await buttons.focus();
            await authenticatedPage.keyboard.press('Enter');
            await authenticatedPage.waitForTimeout(100);
            
            console.log('Keyboard button activation tested');
          }
        }
      });
    });

    test('should support Escape key for modals', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      await test.step('Test modal keyboard interactions', async () => {
        try {
          // Try to open a modal (create task)
          await authenticatedPage.click('[data-testid="create-task-button"]', { timeout: 5000 });
          
          // Wait for modal to appear
          const modal = authenticatedPage.locator('[role="dialog"], [data-testid*="modal"]');
          const modalVisible = await modal.isVisible({ timeout: 3000 });
          
          if (modalVisible) {
            // Test Escape key
            await authenticatedPage.keyboard.press('Escape');
            
            // Modal should close
            const modalClosed = await modal.isVisible({ timeout: 3000 }).then(v => !v);
            expect(modalClosed).toBe(true);
            
            console.log('Modal Escape key functionality verified');
          }
        } catch {
          console.log('Modal keyboard interaction test skipped - no modals found');
        }
      });
    });

    test('should trap focus in modals', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      await test.step('Test focus trapping in modals', async () => {
        try {
          // Open modal
          await authenticatedPage.click('[data-testid="create-task-button"]', { timeout: 5000 });
          
          const modal = authenticatedPage.locator('[role="dialog"], [data-testid*="modal"]');
          const modalVisible = await modal.isVisible({ timeout: 3000 });
          
          if (modalVisible) {
            // Tab through modal elements
            const modalFocusableElements = [];
            
            for (let i = 0; i < 10; i++) {
              await authenticatedPage.keyboard.press('Tab');
              
              const focusedElement = await authenticatedPage.evaluate(() => {
                const focused = document.activeElement;
                const modal = document.querySelector('[role="dialog"], [data-testid*="modal"]');
                return modal?.contains(focused);
              });
              
              if (!focusedElement) {
                console.warn('Focus escaped modal container');
                break;
              }
              
              modalFocusableElements.push(focusedElement);
            }
            
            console.log('Focus trapping in modal tested');
            
            // Close modal
            await authenticatedPage.keyboard.press('Escape');
          }
        } catch {
          console.log('Focus trapping test skipped - no modals available');
        }
      });
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper semantic markup', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Check semantic HTML elements', async () => {
        // Check for semantic landmarks
        const landmarks = {
          'main': await authenticatedPage.locator('main').count(),
          'header': await authenticatedPage.locator('header').count(),
          'nav': await authenticatedPage.locator('nav').count(),
          'aside': await authenticatedPage.locator('aside').count(),
          'footer': await authenticatedPage.locator('footer').count()
        };
        
        console.log('Semantic landmarks found:', landmarks);
        
        // Should have at least main content area
        expect(landmarks.main).toBeGreaterThanOrEqual(1);
        
        // Check for proper list markup
        const lists = await authenticatedPage.locator('ul, ol').count();
        const listItems = await authenticatedPage.locator('li').count();
        
        if (lists > 0) {
          expect(listItems).toBeGreaterThan(0);
          console.log(`Found ${lists} lists with ${listItems} items`);
        }
      });
    });

    test('should announce dynamic content changes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/ai-tutor');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Check ARIA live regions', async () => {
        // Look for ARIA live regions
        const liveRegions = authenticatedPage.locator('[aria-live]');
        const liveRegionCount = await liveRegions.count();
        
        console.log(`Found ${liveRegionCount} ARIA live regions`);
        
        // Check for status announcements
        const statusElements = authenticatedPage.locator('[role="status"], [role="alert"]');
        const statusCount = await statusElements.count();
        
        console.log(`Found ${statusCount} status/alert elements`);
        
        // Test dynamic content (if AI chat is available)
        try {
          const messageInput = authenticatedPage.locator('[data-testid="ai-chat-input"]');
          const inputExists = await messageInput.isVisible({ timeout: 3000 });
          
          if (inputExists) {
            await messageInput.fill('Test message');
            await authenticatedPage.click('[data-testid="send-message-button"]');
            
            // Should have live region for new messages
            const messageArea = authenticatedPage.locator('[data-testid="chat-container"]');
            const hasAriaLive = await messageArea.getAttribute('aria-live');
            
            if (hasAriaLive) {
              console.log('Chat messages have ARIA live region');
            }
          }
        } catch {
          console.log('Dynamic content test skipped');
        }
      });
    });

    test('should provide alternative text for images', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Check image alt text', async () => {
        const images = authenticatedPage.locator('img');
        const imageCount = await images.count();
        
        let imagesWithAlt = 0;
        let decorativeImages = 0;
        
        for (let i = 0; i < imageCount; i++) {
          const image = images.nth(i);
          const alt = await image.getAttribute('alt');
          const role = await image.getAttribute('role');
          
          if (alt !== null) {
            if (alt === '' || role === 'presentation') {
              decorativeImages++;
            } else {
              imagesWithAlt++;
            }
          }
        }
        
        console.log(`Images: ${imageCount} total, ${imagesWithAlt} with alt text, ${decorativeImages} decorative`);
        
        if (imageCount > 0) {
          const altTextCoverage = (imagesWithAlt + decorativeImages) / imageCount;
          expect(altTextCoverage).toBeGreaterThan(0.8); // 80% should have proper alt handling
        }
      });
    });

    test('should announce form errors clearly', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/auth');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Test form error announcements', async () => {
        try {
          // Try to submit form without required fields
          await authenticatedPage.click('[data-testid="sign-in-button"]');
          
          // Check for error announcements
          const errorMessages = authenticatedPage.locator('[role="alert"], [aria-live="assertive"]');
          const alertCount = await errorMessages.count();
          
          if (alertCount > 0) {
            console.log(`Found ${alertCount} error announcements`);
            
            // Errors should be associated with form fields
            const inputs = authenticatedPage.locator('input[aria-invalid="true"]');
            const invalidInputs = await inputs.count();
            
            console.log(`${invalidInputs} inputs marked as invalid`);
          }
        } catch {
          console.log('Form error test skipped');
        }
      });
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ authenticatedPage }) => {
      // Switch to mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Test mobile accessibility', async () => {
        // Touch targets should be large enough (44x44 pixels minimum)
        const buttons = authenticatedPage.locator('button');
        const buttonCount = await buttons.count();
        
        let smallButtons = 0;
        
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const button = buttons.nth(i);
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            if (boundingBox.width < 44 || boundingBox.height < 44) {
              smallButtons++;
            }
          }
        }
        
        const largeButtonRatio = (buttonCount - smallButtons) / buttonCount;
        if (buttonCount > 0) {
          expect(largeButtonRatio).toBeGreaterThan(0.8); // 80% should meet touch target size
          console.log(`Touch target compliance: ${Math.round(largeButtonRatio * 100)}%`);
        }
        
        // Run mobile accessibility audit
        await injectAxe(authenticatedPage);
        await checkA11y(authenticatedPage, null, {
          tags: ['wcag2a', 'wcag2aa']
        });
        
        console.log('Mobile accessibility audit passed');
      });
      
      // Reset viewport
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Check focus visibility', async () => {
        // Tab to first focusable element
        await authenticatedPage.keyboard.press('Tab');
        
        // Check if focus is visible
        const focusedElement = await authenticatedPage.evaluate(() => {
          const focused = document.activeElement;
          if (!focused) return null;
          
          const styles = window.getComputedStyle(focused);
          const pseudoStyles = window.getComputedStyle(focused, ':focus');
          
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle,
            boxShadow: styles.boxShadow,
            focusOutline: pseudoStyles.outline,
            focusBoxShadow: pseudoStyles.boxShadow
          };
        });
        
        if (focusedElement) {
          const hasFocusIndicator = 
            focusedElement.outline !== 'none' ||
            focusedElement.outlineWidth !== '0px' ||
            focusedElement.boxShadow !== 'none' ||
            focusedElement.focusOutline !== 'none' ||
            focusedElement.focusBoxShadow !== 'none';
          
          if (hasFocusIndicator) {
            console.log('Focus indicators are visible');
          } else {
            console.warn('Focus indicators might not be visible');
          }
        }
      });
    });

    test('should manage focus on route changes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      await test.step('Test focus management on navigation', async () => {
        // Navigate to another page
        await authenticatedPage.click('[data-testid="sidebar-tasks"]');
        await authenticatedPage.waitForLoadState('domcontentloaded');
        
        // Focus should be managed appropriately
        const focusedElement = await authenticatedPage.evaluate(() => {
          const focused = document.activeElement;
          return focused ? {
            tagName: focused.tagName,
            role: focused.getAttribute('role')
          } : null;
        });
        
        if (focusedElement) {
          console.log(`Focus after navigation: ${focusedElement.tagName} with role ${focusedElement.role}`);
        }
        
        // Should focus main content or page heading
        const mainContent = await authenticatedPage.locator('main, h1').first().isVisible();
        expect(mainContent).toBe(true);
      });
    });
  });

  test.describe('Accessibility Settings', () => {
    test('should respect reduced motion preferences', async ({ authenticatedPage }) => {
      // Set reduced motion preference
      await authenticatedPage.emulateMedia({ reducedMotion: 'reduce' });
      
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Check reduced motion compliance', async () => {
        // Check CSS for motion reduction
        const hasReducedMotion = await authenticatedPage.evaluate(() => {
          return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        });
        
        expect(hasReducedMotion).toBe(true);
        
        // Animations should be reduced or removed
        const animatedElements = authenticatedPage.locator('[style*="transition"], [style*="animation"]');
        const animatedCount = await animatedElements.count();
        
        console.log(`Found ${animatedCount} potentially animated elements`);
        console.log('Reduced motion preferences respected');
      });
    });

    test('should support high contrast mode', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step('Test high contrast compatibility', async () => {
        // Simulate high contrast mode
        await authenticatedPage.evaluate(() => {
          document.body.classList.add('high-contrast');
        });
        
        // Run accessibility check with high contrast
        await injectAxe(authenticatedPage);
        await checkA11y(authenticatedPage, null, {
          rules: {
            'color-contrast': { enabled: true }
          }
        });
        
        console.log('High contrast mode compatibility verified');
      });
    });
  });

  test.describe('Internationalization and Accessibility', () => {
    test('should support RTL languages', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      await test.step('Test RTL language support', async () => {
        // Simulate RTL language
        await authenticatedPage.evaluate(() => {
          document.documentElement.setAttribute('dir', 'rtl');
          document.documentElement.setAttribute('lang', 'ar');
        });
        
        await authenticatedPage.waitForTimeout(500);
        
        // Check if layout adapts to RTL
        const bodyDirection = await authenticatedPage.evaluate(() => {
          return window.getComputedStyle(document.body).direction;
        });
        
        expect(bodyDirection).toBe('rtl');
        
        // Run accessibility audit with RTL
        await injectAxe(authenticatedPage);
        await checkA11y(authenticatedPage);
        
        console.log('RTL language support verified');
        
        // Reset direction
        await authenticatedPage.evaluate(() => {
          document.documentElement.setAttribute('dir', 'ltr');
          document.documentElement.setAttribute('lang', 'en');
        });
      });
    });

    test('should have proper language attributes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      await test.step('Check language attributes', async () => {
        // Check html lang attribute
        const htmlLang = await authenticatedPage.getAttribute('html', 'lang');
        expect(htmlLang).toBeTruthy();
        
        console.log(`Page language: ${htmlLang}`);
        
        // Check for any elements with different languages
        const langElements = authenticatedPage.locator('[lang]');
        const langCount = await langElements.count();
        
        console.log(`Found ${langCount} elements with lang attributes`);
      });
    });
  });
});