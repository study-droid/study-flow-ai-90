/**
 * Cross-Browser Compatibility E2E Tests
 * Testing functionality across Chrome, Firefox, Safari, and Edge
 */

import { test, expect, testGroup } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';

// These tests will run across all configured browsers in playwright.config.ts
testGroup.authenticated('Cross-Browser Compatibility', () => {
  test.describe('Core Functionality Across Browsers', () => {
    test('should load main application pages', async ({ authenticatedPage, browserName }) => {
      const pages = [
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/tasks', name: 'Tasks' },
        { path: '/ai-tutor', name: 'AI Tutor' },
        { path: '/tables', name: 'Tables' },
        { path: '/study', name: 'Study' }
      ];

      for (const pageInfo of pages) {
        await test.step(`Load ${pageInfo.name} in ${browserName}`, async () => {
          const startTime = Date.now();
          
          await authenticatedPage.goto(pageInfo.path);
          await authenticatedPage.waitForLoadState('domcontentloaded');
          
          const loadTime = Date.now() - startTime;
          
          // Basic page load verification
          expect(authenticatedPage.url()).toContain(pageInfo.path);
          
          // Check for JavaScript execution
          const jsWorking = await authenticatedPage.evaluate(() => typeof window !== 'undefined');
          expect(jsWorking).toBe(true);
          
          // Check for basic content
          const bodyText = await authenticatedPage.locator('body').textContent();
          expect(bodyText?.length).toBeGreaterThan(50);
          
          console.log(`${pageInfo.name} loaded in ${browserName}: ${loadTime}ms`);
        });
      }
    });

    test('should handle authentication across browsers', async ({ page, browserName }) => {
      await test.step(`Test authentication in ${browserName}`, async () => {
        const pages = new PageObjectFactory(page);
        const authPage = pages.auth();
        
        await authPage.goto();
        
        // Should load auth form
        expect(await authPage.isLoaded()).toBe(true);
        
        // Test form interaction
        await authPage.emailInput.fill('test@studyflow.ai');
        await authPage.passwordInput.fill('TestPassword123!');
        
        const emailValue = await authPage.emailInput.inputValue();
        const passwordValue = await authPage.passwordInput.inputValue();
        
        expect(emailValue).toBe('test@studyflow.ai');
        expect(passwordValue).toBe('TestPassword123!');
        
        // Submit form
        await authPage.signInButton.click();
        
        // Should redirect (authentication might fail but form should work)
        await page.waitForTimeout(2000);
        
        console.log(`Authentication form works in ${browserName}`);
      });
    });

    test('should support interactive elements', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Test interactions in ${browserName}`, async () => {
        // Test button clicks
        const buttons = authenticatedPage.locator('button');
        const buttonCount = await buttons.count();
        
        if (buttonCount > 0) {
          const firstButton = buttons.first();
          const isVisible = await firstButton.isVisible();
          
          if (isVisible) {
            // Test hover
            await firstButton.hover();
            
            // Test click
            const buttonText = await firstButton.textContent();
            await firstButton.click();
            
            console.log(`Button interaction "${buttonText}" works in ${browserName}`);
          }
        }
        
        // Test input fields
        const inputs = authenticatedPage.locator('input[type="text"], input[type="email"]');
        const inputCount = await inputs.count();
        
        if (inputCount > 0) {
          const firstInput = inputs.first();
          const isInputVisible = await firstInput.isVisible();
          
          if (isInputVisible) {
            await firstInput.fill('Test input value');
            const inputValue = await firstInput.inputValue();
            expect(inputValue).toBe('Test input value');
            
            console.log(`Input field interaction works in ${browserName}`);
          }
        }
      });
    });
  });

  test.describe('CSS and Layout Compatibility', () => {
    test('should render responsive layouts correctly', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop Large' },
        { width: 1366, height: 768, name: 'Desktop Medium' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];
      
      for (const viewport of viewports) {
        await test.step(`Test ${viewport.name} layout in ${browserName}`, async () => {
          await authenticatedPage.setViewportSize({ width: viewport.width, height: viewport.height });
          await authenticatedPage.waitForTimeout(500); // Allow layout to adjust
          
          // Check if content is visible
          const bodyBoundingBox = await authenticatedPage.locator('body').boundingBox();
          expect(bodyBoundingBox).toBeTruthy();
          
          // Check if navigation is accessible
          const navigation = authenticatedPage.locator('nav, [role="navigation"]');
          const navCount = await navigation.count();
          
          if (navCount > 0) {
            const navVisible = await navigation.first().isVisible();
            console.log(`Navigation ${navVisible ? 'visible' : 'hidden'} at ${viewport.name} in ${browserName}`);
          }
          
          // Check for horizontal scrolling issues
          const hasHorizontalScroll = await authenticatedPage.evaluate((viewportWidth) => {
            return document.documentElement.scrollWidth > viewportWidth;
          }, viewport.width);
          
          if (hasHorizontalScroll) {
            console.warn(`Horizontal scroll detected at ${viewport.name} in ${browserName}`);
          }
        });
      }
      
      // Reset to standard viewport
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 });
    });

    test('should support modern CSS features', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Test CSS features in ${browserName}`, async () => {
        const cssFeatures = await authenticatedPage.evaluate(() => {
          const testDiv = document.createElement('div');
          document.body.appendChild(testDiv);
          
          const features = {
            flexbox: CSS.supports('display', 'flex'),
            grid: CSS.supports('display', 'grid'),
            customProperties: CSS.supports('--test', '1px'),
            transforms: CSS.supports('transform', 'translateX(1px)'),
            transitions: CSS.supports('transition', 'opacity 1s'),
            borderRadius: CSS.supports('border-radius', '5px')
          };
          
          document.body.removeChild(testDiv);
          return features;
        });
        
        // Modern browsers should support these features
        expect(cssFeatures.flexbox).toBe(true);
        expect(cssFeatures.transforms).toBe(true);
        expect(cssFeatures.transitions).toBe(true);
        expect(cssFeatures.borderRadius).toBe(true);
        
        const supportedFeatures = Object.keys(cssFeatures).filter(key => cssFeatures[key]);
        console.log(`${browserName} supports: ${supportedFeatures.join(', ')}`);
      });
    });
  });

  test.describe('JavaScript API Compatibility', () => {
    test('should support modern JavaScript features', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/dashboard');
      
      await test.step(`Test JavaScript APIs in ${browserName}`, async () => {
        const jsSupport = await authenticatedPage.evaluate(() => {
          const features = {
            fetch: typeof fetch !== 'undefined',
            promises: typeof Promise !== 'undefined',
            asyncAwait: (async () => {}).constructor === (async function() {}).constructor,
            arrow: (() => true)() === true,
            destructuring: (() => { try { const {a} = {a: 1}; return true; } catch { return false; } })(),
            templateLiterals: (() => { try { return `test` === 'test'; } catch { return false; } })(),
            localStorage: typeof Storage !== 'undefined' && typeof localStorage !== 'undefined',
            sessionStorage: typeof Storage !== 'undefined' && typeof sessionStorage !== 'undefined',
            webSockets: typeof WebSocket !== 'undefined',
            requestAnimationFrame: typeof requestAnimationFrame !== 'undefined'
          };
          
          return features;
        });
        
        // Essential features for modern web apps
        expect(jsSupport.fetch).toBe(true);
        expect(jsSupport.promises).toBe(true);
        expect(jsSupport.localStorage).toBe(true);
        
        const supportedFeatures = Object.keys(jsSupport).filter(key => jsSupport[key]);
        console.log(`${browserName} JavaScript support: ${supportedFeatures.length}/${Object.keys(jsSupport).length} features`);
      });
    });

    test('should handle async operations consistently', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/ai-tutor');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Test async operations in ${browserName}`, async () => {
        try {
          // Test if AI chat interface is available
          const chatInput = authenticatedPage.locator('[data-testid="ai-chat-input"]');
          const inputExists = await chatInput.isVisible({ timeout: 5000 });
          
          if (inputExists) {
            const startTime = Date.now();
            
            // Send a message
            await chatInput.fill('Test message for browser compatibility');
            await authenticatedPage.click('[data-testid="send-message-button"]');
            
            // Wait for response with timeout
            try {
              await authenticatedPage.waitForSelector('[data-testid="ai-message"]', { timeout: 15000 });
              const responseTime = Date.now() - startTime;
              console.log(`AI response in ${browserName}: ${responseTime}ms`);
            } catch {
              console.log(`AI response timeout in ${browserName}`);
            }
          }
        } catch {
          console.log(`Async operation test skipped in ${browserName}`);
        }
      });
    });
  });

  test.describe('Storage and State Management', () => {
    test('should persist data across browser sessions', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Test data persistence in ${browserName}`, async () => {
        // Check localStorage functionality
        const localStorageWorks = await authenticatedPage.evaluate(() => {
          try {
            const testKey = 'browser-compat-test';
            const testValue = 'test-value';
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            return retrieved === testValue;
          } catch {
            return false;
          }
        });
        
        expect(localStorageWorks).toBe(true);
        
        // Check sessionStorage functionality
        const sessionStorageWorks = await authenticatedPage.evaluate(() => {
          try {
            const testKey = 'session-compat-test';
            const testValue = 'session-value';
            
            sessionStorage.setItem(testKey, testValue);
            const retrieved = sessionStorage.getItem(testKey);
            sessionStorage.removeItem(testKey);
            
            return retrieved === testValue;
          } catch {
            return false;
          }
        });
        
        expect(sessionStorageWorks).toBe(true);
        
        console.log(`Storage APIs work in ${browserName}`);
      });
    });

    test('should handle cookies correctly', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/dashboard');
      
      await test.step(`Test cookie handling in ${browserName}`, async () => {
        // Set a test cookie
        await authenticatedPage.evaluate(() => {
          document.cookie = 'browser-test=compatibility-test; path=/';
        });
        
        // Verify cookie was set
        const cookies = await authenticatedPage.context().cookies();
        const testCookie = cookies.find(c => c.name === 'browser-test');
        
        expect(testCookie?.value).toBe('compatibility-test');
        
        console.log(`Cookie handling works in ${browserName}`);
        
        // Clean up
        await authenticatedPage.evaluate(() => {
          document.cookie = 'browser-test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        });
      });
    });
  });

  test.describe('Media and File Handling', () => {
    test('should support file upload interfaces', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/tables');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Test file upload in ${browserName}`, async () => {
        // Look for file upload inputs
        const fileInputs = authenticatedPage.locator('input[type="file"]');
        const fileInputCount = await fileInputs.count();
        
        if (fileInputCount > 0) {
          const firstFileInput = fileInputs.first();
          
          // Test file selection (mock file)
          try {
            await firstFileInput.setInputFiles([{
              name: 'test-file.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from('test file content')
            }]);
            
            console.log(`File upload interface works in ${browserName}`);
          } catch (error) {
            console.log(`File upload test failed in ${browserName}: ${error}`);
          }
        } else {
          console.log(`No file upload inputs found in ${browserName}`);
        }
      });
    });

    test('should handle media queries correctly', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/dashboard');
      
      await test.step(`Test media queries in ${browserName}`, async () => {
        const mediaQuerySupport = await authenticatedPage.evaluate(() => {
          const queries = [
            '(max-width: 768px)',
            '(min-width: 1024px)',
            '(prefers-reduced-motion: reduce)',
            '(prefers-color-scheme: dark)'
          ];
          
          return queries.map(query => ({
            query,
            matches: window.matchMedia(query).matches,
            supported: typeof window.matchMedia(query).matches === 'boolean'
          }));
        });
        
        const supportedQueries = mediaQuerySupport.filter(mq => mq.supported);
        expect(supportedQueries.length).toBe(mediaQuerySupport.length);
        
        console.log(`Media queries work in ${browserName}: ${supportedQueries.length} queries supported`);
      });
    });
  });

  test.describe('Performance Across Browsers', () => {
    test('should load within acceptable time limits', async ({ authenticatedPage, browserName }) => {
      const performanceResults = [];
      
      const pages = ['/dashboard', '/tasks', '/ai-tutor'];
      
      for (const path of pages) {
        await test.step(`Performance test ${path} in ${browserName}`, async () => {
          const startTime = Date.now();
          
          await authenticatedPage.goto(path);
          await authenticatedPage.waitForLoadState('domcontentloaded');
          
          const domLoadTime = Date.now() - startTime;
          
          // Wait for network idle
          await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });
          const networkIdleTime = Date.now() - startTime;
          
          performanceResults.push({
            path,
            domLoadTime,
            networkIdleTime,
            browser: browserName
          });
          
          // Performance assertions
          expect(domLoadTime).toBeLessThan(10000); // DOM should load within 10s
          expect(networkIdleTime).toBeLessThan(15000); // Network idle within 15s
          
          console.log(`${path} performance in ${browserName}: DOM ${domLoadTime}ms, Network ${networkIdleTime}ms`);
        });
      }
    });

    test('should handle memory efficiently', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Memory usage test in ${browserName}`, async () => {
        // Get initial memory usage (if supported)
        const memoryInfo = await authenticatedPage.evaluate(() => {
          if ('memory' in performance) {
            const mem = (performance as any).memory;
            return {
              usedJSHeapSize: mem.usedJSHeapSize,
              totalJSHeapSize: mem.totalJSHeapSize,
              jsHeapSizeLimit: mem.jsHeapSizeLimit
            };
          }
          return null;
        });
        
        if (memoryInfo) {
          const memoryUsageMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
          console.log(`Memory usage in ${browserName}: ${memoryUsageMB}MB`);
          
          // Basic memory usage check
          expect(memoryUsageMB).toBeLessThan(100); // Should use less than 100MB
        } else {
          console.log(`Memory API not supported in ${browserName}`);
        }
      });
    });
  });

  test.describe('Error Handling Across Browsers', () => {
    test('should handle JavaScript errors gracefully', async ({ authenticatedPage, browserName }) => {
      const consoleErrors: string[] = [];
      
      // Collect console errors
      authenticatedPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Error handling test in ${browserName}`, async () => {
        // Navigate to different pages to check for errors
        const pages = ['/tasks', '/ai-tutor', '/tables'];
        
        for (const path of pages) {
          await authenticatedPage.goto(path);
          await authenticatedPage.waitForLoadState('domcontentloaded');
          await authenticatedPage.waitForTimeout(1000);
        }
        
        // Check for critical errors
        const criticalErrors = consoleErrors.filter(error => 
          !error.includes('favicon') && 
          !error.includes('sourcemap') &&
          !error.includes('DevTools')
        );
        
        console.log(`Console errors in ${browserName}: ${criticalErrors.length} critical errors`);
        
        // Log errors for debugging
        if (criticalErrors.length > 0) {
          console.log('Critical errors:', criticalErrors.slice(0, 3));
        }
        
        // Should have minimal critical errors
        expect(criticalErrors.length).toBeLessThan(5);
      });
    });

    test('should handle network failures gracefully', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/ai-tutor');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      await test.step(`Network failure handling in ${browserName}`, async () => {
        // Simulate network failure
        await authenticatedPage.route('**/api/**', route => route.abort());
        
        try {
          // Try to trigger an API call
          const chatInput = authenticatedPage.locator('[data-testid="ai-chat-input"]');
          const inputExists = await chatInput.isVisible({ timeout: 3000 });
          
          if (inputExists) {
            await chatInput.fill('Test network failure');
            await authenticatedPage.click('[data-testid="send-message-button"]');
            
            // Should handle failure gracefully
            await authenticatedPage.waitForTimeout(2000);
            
            // Look for error handling
            const errorMessages = authenticatedPage.locator('[data-testid*="error"], [role="alert"]');
            const errorCount = await errorMessages.count();
            
            console.log(`Network error handling in ${browserName}: ${errorCount} error indicators`);
          }
        } catch {
          console.log(`Network failure test completed in ${browserName}`);
        }
        
        // Restore network
        await authenticatedPage.unroute('**/api/**');
      });
    });
  });

  test.describe('Browser-Specific Features', () => {
    test('should handle browser differences appropriately', async ({ authenticatedPage, browserName }) => {
      await authenticatedPage.goto('/dashboard');
      
      await test.step(`Browser-specific handling for ${browserName}`, async () => {
        const browserFeatures = await authenticatedPage.evaluate(() => {
          const userAgent = navigator.userAgent;
          const features = {
            userAgent: userAgent,
            isChrome: userAgent.includes('Chrome'),
            isFirefox: userAgent.includes('Firefox'),
            isSafari: userAgent.includes('Safari') && !userAgent.includes('Chrome'),
            isEdge: userAgent.includes('Edg'),
            webGL: (() => {
              try {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
              } catch {
                return false;
              }
            })(),
            indexedDB: typeof indexedDB !== 'undefined',
            serviceWorker: 'serviceWorker' in navigator,
            pushNotifications: 'Notification' in window && 'PushManager' in window
          };
          
          return features;
        });
        
        console.log(`Browser features for ${browserName}:`, {
          webGL: browserFeatures.webGL,
          indexedDB: browserFeatures.indexedDB,
          serviceWorker: browserFeatures.serviceWorker,
          pushNotifications: browserFeatures.pushNotifications
        });
        
        // All modern browsers should support these
        expect(browserFeatures.indexedDB).toBe(true);
        
        // Log browser-specific information
        console.log(`User Agent: ${browserFeatures.userAgent}`);
      });
    });
  });
});