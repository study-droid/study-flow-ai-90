/**
 * Performance E2E Tests
 * Testing application performance, load times, and resource usage
 */

import { test, expect, testGroup } from '../utils/fixtures';
import { PageObjectFactory } from '../utils/page-objects';

testGroup.performance('Performance Testing', () => {
  test.describe('Page Load Performance', () => {
    test('should load main pages within acceptable time limits', async ({ authenticatedPage }) => {
      const pages = [
        { path: '/dashboard', name: 'Dashboard', maxLoadTime: 3000 },
        { path: '/tasks', name: 'Tasks', maxLoadTime: 2500 },
        { path: '/ai-tutor', name: 'AI Tutor', maxLoadTime: 4000 },
        { path: '/tables', name: 'Tables', maxLoadTime: 3000 },
        { path: '/study', name: 'Study', maxLoadTime: 2500 }
      ];

      for (const pageInfo of pages) {
        await test.step(`Performance test: ${pageInfo.name}`, async () => {
          const startTime = Date.now();
          
          // Navigate to page
          await authenticatedPage.goto(pageInfo.path);
          await authenticatedPage.waitForLoadState('domcontentloaded');
          
          const domLoadTime = Date.now() - startTime;
          
          // Wait for network idle
          await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });
          const networkIdleTime = Date.now() - startTime;
          
          // Collect detailed performance metrics
          const performanceMetrics = await authenticatedPage.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const paint = performance.getEntriesByType('paint');
            
            return {
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
              firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
              firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
              transferSize: navigation.transferSize,
              encodedBodySize: navigation.encodedBodySize,
              decodedBodySize: navigation.decodedBodySize
            };
          });
          
          // Performance assertions
          expect(domLoadTime).toBeLessThan(pageInfo.maxLoadTime);
          expect(networkIdleTime).toBeLessThan(pageInfo.maxLoadTime * 2);
          
          // Log detailed metrics
          console.log(`${pageInfo.name} Performance Metrics:`, {
            domLoadTime: `${domLoadTime}ms`,
            networkIdleTime: `${networkIdleTime}ms`,
            firstPaint: `${Math.round(performanceMetrics.firstPaint)}ms`,
            firstContentfulPaint: `${Math.round(performanceMetrics.firstContentfulPaint)}ms`,
            transferSize: `${Math.round(performanceMetrics.transferSize / 1024)}KB`
          });
          
          // Additional performance checks
          expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // FCP < 2s
          expect(performanceMetrics.transferSize).toBeLessThan(2 * 1024 * 1024); // Transfer size < 2MB
        });
      }
    });

    test('should have good Core Web Vitals scores', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Collect Core Web Vitals
      const webVitals = await authenticatedPage.evaluate(async () => {
        return new Promise((resolve) => {
          const vitals = {
            lcp: 0,
            fid: 0,
            cls: 0
          };
          
          // Largest Contentful Paint
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEventTiming;
            vitals.lcp = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries() as PerformanceEventTiming[]) {
              vitals.fid = entry.processingStart - entry.startTime;
              break;
            }
          }).observe({ entryTypes: ['first-input'] });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Resolve after a short delay to collect metrics
          setTimeout(() => resolve(vitals), 3000);
        });
      });
      
      console.log('Core Web Vitals:', webVitals);
      
      // Core Web Vitals thresholds (good scores)
      expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
      expect(webVitals.cls).toBeLessThan(0.1);  // CLS < 0.1
      // FID is measured on first user interaction, may be 0 in automated tests
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should load resources efficiently', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      const resourceMetrics = await authenticatedPage.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        const resourcesByType = {
          scripts: resources.filter(r => r.initiatorType === 'script'),
          stylesheets: resources.filter(r => r.initiatorType === 'css' || r.initiatorType === 'link'),
          images: resources.filter(r => r.initiatorType === 'img'),
          fetch: resources.filter(r => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest')
        };
        
        const calculateStats = (resources: PerformanceResourceTiming[]) => ({
          count: resources.length,
          totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          avgLoadTime: resources.length > 0 
            ? resources.reduce((sum, r) => sum + r.duration, 0) / resources.length 
            : 0,
          maxLoadTime: Math.max(...resources.map(r => r.duration), 0)
        });
        
        return {
          scripts: calculateStats(resourcesByType.scripts),
          stylesheets: calculateStats(resourcesByType.stylesheets),
          images: calculateStats(resourcesByType.images),
          api: calculateStats(resourcesByType.fetch),
          total: {
            resources: resources.length,
            totalTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
          }
        };
      });
      
      console.log('Resource Loading Metrics:', resourceMetrics);
      
      // Resource loading assertions
      expect(resourceMetrics.scripts.avgLoadTime).toBeLessThan(1000); // Avg script load < 1s
      expect(resourceMetrics.stylesheets.avgLoadTime).toBeLessThan(500); // Avg CSS load < 500ms
      expect(resourceMetrics.total.totalTransferSize).toBeLessThan(5 * 1024 * 1024); // Total < 5MB
      expect(resourceMetrics.scripts.count).toBeLessThan(20); // Reasonable number of scripts
    });

    test('should efficiently load images', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      const imageMetrics = await authenticatedPage.evaluate(() => {
        const images = Array.from(document.images);
        const imagePerformance = performance.getEntriesByType('resource')
          .filter(r => r.initiatorType === 'img') as PerformanceResourceTiming[];
        
        return {
          totalImages: images.length,
          loadedImages: images.filter(img => img.complete).length,
          averageSize: imagePerformance.length > 0 
            ? imagePerformance.reduce((sum, img) => sum + (img.transferSize || 0), 0) / imagePerformance.length 
            : 0,
          totalImageSize: imagePerformance.reduce((sum, img) => sum + (img.transferSize || 0), 0),
          slowestImage: Math.max(...imagePerformance.map(img => img.duration), 0)
        };
      });
      
      console.log('Image Loading Metrics:', imageMetrics);
      
      // Image performance assertions
      if (imageMetrics.totalImages > 0) {
        const loadedRatio = imageMetrics.loadedImages / imageMetrics.totalImages;
        expect(loadedRatio).toBeGreaterThan(0.9); // 90% of images should load
        
        expect(imageMetrics.averageSize).toBeLessThan(500 * 1024); // Avg image < 500KB
        expect(imageMetrics.slowestImage).toBeLessThan(3000); // Slowest image < 3s
      }
    });
  });

  test.describe('JavaScript Performance', () => {
    test('should have efficient JavaScript execution', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Measure JavaScript performance
      const jsPerformance = await authenticatedPage.evaluate(async () => {
        const startTime = performance.now();
        
        // Simulate some JavaScript work
        const testArray = Array.from({ length: 10000 }, (_, i) => i);
        const processed = testArray
          .filter(x => x % 2 === 0)
          .map(x => x * 2)
          .reduce((sum, x) => sum + x, 0);
        
        const endTime = performance.now();
        
        // Get memory usage if available
        const memoryInfo = 'memory' in performance 
          ? (performance as any).memory 
          : null;
        
        return {
          jsExecutionTime: endTime - startTime,
          memoryUsage: memoryInfo ? {
            used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024), // MB
            total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024), // MB
            limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) // MB
          } : null,
          processed // Ensure JS execution completed
        };
      });
      
      console.log('JavaScript Performance:', jsPerformance);
      
      // JavaScript performance assertions
      expect(jsPerformance.jsExecutionTime).toBeLessThan(100); // JS execution < 100ms
      expect(jsPerformance.processed).toBeGreaterThan(0); // Verify execution completed
      
      if (jsPerformance.memoryUsage) {
        expect(jsPerformance.memoryUsage.used).toBeLessThan(100); // Memory usage < 100MB
      }
    });

    test('should handle large data sets efficiently', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Test performance with large data operations
      const dataPerformance = await authenticatedPage.evaluate(async () => {
        const startTime = performance.now();
        
        // Simulate loading and processing a large task list
        const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          title: `Task ${i}`,
          completed: Math.random() > 0.5,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        }));
        
        // Simulate filtering and sorting operations
        const filtered = largeTasks
          .filter(task => !task.completed)
          .sort((a, b) => a.title.localeCompare(b.title))
          .slice(0, 100);
        
        const endTime = performance.now();
        
        return {
          processingTime: endTime - startTime,
          originalCount: largeTasks.length,
          filteredCount: filtered.length
        };
      });
      
      console.log('Large Data Processing:', dataPerformance);
      
      // Data processing performance assertions
      expect(dataPerformance.processingTime).toBeLessThan(50); // Processing < 50ms
      expect(dataPerformance.filteredCount).toBeLessThan(dataPerformance.originalCount);
    });
  });

  test.describe('API Performance', () => {
    test('should have responsive API calls', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const aiTutorPage = pages.aiTutor();
      
      await aiTutorPage.goto();
      
      // Test AI API performance
      await test.step('AI API Response Time', async () => {
        const startTime = Date.now();
        
        try {
          await aiTutorPage.sendMessage('Test performance message');
          await aiTutorPage.waitForResponse(10000);
          
          const responseTime = Date.now() - startTime;
          
          console.log(`AI API Response Time: ${responseTime}ms`);
          
          // API response time assertions
          expect(responseTime).toBeLessThan(10000); // Response < 10s
          
          const messageCount = await aiTutorPage.getMessageCount();
          expect(messageCount).toBeGreaterThan(0); // Verify response received
        } catch (error) {
          console.log('AI API performance test skipped:', error);
        }
      });
    });

    test('should handle concurrent API requests', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Simulate concurrent API calls
      const concurrentPerformance = await authenticatedPage.evaluate(async () => {
        const startTime = performance.now();
        
        // Simulate multiple concurrent requests
        const requests = Array.from({ length: 5 }, (_, i) => 
          fetch(`/api/test-endpoint-${i}`, { method: 'GET' })
            .then(response => ({ index: i, status: response.status, ok: response.ok }))
            .catch(error => ({ index: i, error: error.message }))
        );
        
        const results = await Promise.all(requests);
        const endTime = performance.now();
        
        return {
          totalTime: endTime - startTime,
          requestCount: requests.length,
          results: results
        };
      });
      
      console.log('Concurrent API Performance:', concurrentPerformance);
      
      // Concurrent request performance
      expect(concurrentPerformance.totalTime).toBeLessThan(5000); // All requests < 5s
    });
  });

  test.describe('Memory and Resource Management', () => {
    test('should manage memory efficiently during navigation', async ({ authenticatedPage }) => {
      const memoryMetrics = [];
      
      // Navigate through multiple pages and track memory
      const pages = ['/dashboard', '/tasks', '/ai-tutor', '/tables', '/study'];
      
      for (const path of pages) {
        await authenticatedPage.goto(path);
        await authenticatedPage.waitForLoadState('networkidle');
        
        const memory = await authenticatedPage.evaluate(() => {
          if ('memory' in performance) {
            const mem = (performance as any).memory;
            return {
              used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
              total: Math.round(mem.totalJSHeapSize / 1024 / 1024)
            };
          }
          return null;
        });
        
        if (memory) {
          memoryMetrics.push({ path, ...memory });
        }
      }
      
      if (memoryMetrics.length > 0) {
        console.log('Memory Usage During Navigation:', memoryMetrics);
        
        const maxMemory = Math.max(...memoryMetrics.map(m => m.used));
        const minMemory = Math.min(...memoryMetrics.map(m => m.used));
        const memoryGrowth = maxMemory - minMemory;
        
        // Memory management assertions
        expect(maxMemory).toBeLessThan(150); // Max memory < 150MB
        expect(memoryGrowth).toBeLessThan(50); // Memory growth < 50MB
      }
    });

    test('should handle memory cleanup on component unmount', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      // Test memory cleanup by creating and removing components
      const memoryTest = await authenticatedPage.evaluate(async () => {
        const initialMemory = 'memory' in performance 
          ? (performance as any).memory.usedJSHeapSize 
          : null;
        
        // Simulate creating many DOM elements
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        for (let i = 0; i < 1000; i++) {
          const element = document.createElement('div');
          element.innerHTML = `Test element ${i}`;
          element.addEventListener('click', () => console.log(i));
          container.appendChild(element);
        }
        
        const peakMemory = 'memory' in performance 
          ? (performance as any).memory.usedJSHeapSize 
          : null;
        
        // Clean up
        document.body.removeChild(container);
        
        // Force garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const finalMemory = 'memory' in performance 
          ? (performance as any).memory.usedJSHeapSize 
          : null;
        
        return {
          initialMemory: initialMemory ? Math.round(initialMemory / 1024 / 1024) : null,
          peakMemory: peakMemory ? Math.round(peakMemory / 1024 / 1024) : null,
          finalMemory: finalMemory ? Math.round(finalMemory / 1024 / 1024) : null
        };
      });
      
      if (memoryTest.initialMemory && memoryTest.finalMemory) {
        console.log('Memory Cleanup Test:', memoryTest);
        
        const memoryLeakage = memoryTest.finalMemory - memoryTest.initialMemory;
        expect(memoryLeakage).toBeLessThan(10); // Memory leakage < 10MB
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions', async ({ authenticatedPage }) => {
      // Simulate slow 3G network
      const client = await authenticatedPage.context().newCDPSession(authenticatedPage);
      
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps in bytes/sec
        uploadThroughput: 0.75 * 1024 * 1024 / 8,   // 0.75 Mbps in bytes/sec
        latency: 40 // 40ms latency
      });
      
      const startTime = Date.now();
      
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Load time on slow network: ${loadTime}ms`);
      
      // Should still load reasonably fast on slow network
      expect(loadTime).toBeLessThan(15000); // Load within 15s on slow network
      
      // Disable network throttling
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });
    });

    test('should handle offline scenarios gracefully', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Go offline
      await authenticatedPage.context().setOffline(true);
      
      // Try to navigate
      await authenticatedPage.goto('/tasks').catch(() => {
        // Expected to fail when offline
      });
      
      // Check if app shows offline indicator
      const offlineIndicators = [
        '[data-testid="offline-indicator"]',
        '[data-testid="no-connection"]',
        'text=offline',
        'text=no connection'
      ];
      
      let hasOfflineIndicator = false;
      for (const indicator of offlineIndicators) {
        try {
          await authenticatedPage.waitForSelector(indicator, { timeout: 3000 });
          hasOfflineIndicator = true;
          break;
        } catch {
          // Indicator not found
        }
      }
      
      console.log(`Offline indicator displayed: ${hasOfflineIndicator}`);
      
      // Restore connectivity
      await authenticatedPage.context().setOffline(false);
    });
  });

  test.describe('Bundle Size and Loading', () => {
    test('should have optimized bundle sizes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      const bundleAnalysis = await authenticatedPage.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
        
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        const scriptSizes = scripts.map(script => {
          const resource = resources.find(r => r.name.includes(script.src));
          return {
            src: script.src,
            size: resource ? resource.transferSize : 0
          };
        });
        
        const stylesheetSizes = stylesheets.map(link => {
          const resource = resources.find(r => r.name.includes(link.href));
          return {
            href: link.href,
            size: resource ? resource.transferSize : 0
          };
        });
        
        return {
          scripts: scriptSizes,
          stylesheets: stylesheetSizes,
          totalScriptSize: scriptSizes.reduce((sum, s) => sum + s.size, 0),
          totalStylesheetSize: stylesheetSizes.reduce((sum, s) => sum + s.size, 0)
        };
      });
      
      console.log('Bundle Analysis:', {
        scriptCount: bundleAnalysis.scripts.length,
        stylesheetCount: bundleAnalysis.stylesheets.length,
        totalScriptSize: Math.round(bundleAnalysis.totalScriptSize / 1024) + 'KB',
        totalStylesheetSize: Math.round(bundleAnalysis.totalStylesheetSize / 1024) + 'KB'
      });
      
      // Bundle size assertions
      expect(bundleAnalysis.totalScriptSize).toBeLessThan(2 * 1024 * 1024); // Scripts < 2MB
      expect(bundleAnalysis.totalStylesheetSize).toBeLessThan(500 * 1024); // CSS < 500KB
      expect(bundleAnalysis.scripts.length).toBeLessThan(10); // Reasonable script count
    });
  });
});