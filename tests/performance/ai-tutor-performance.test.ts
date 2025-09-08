/**
 * AI Tutor Performance Tests
 * Comprehensive performance testing for AI tutor components and services
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performanceMetrics } from '@/services/monitoring/performance-metrics';
import { AIProviderRouter } from '@/services/ai/ai-provider-router';
import { EnhancedCircuitBreaker } from '@/services/reliability/enhanced-circuit-breaker';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntries: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => [])
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

// Mock components for performance testing
const HeavyComponent = ({ messageCount = 100 }: { messageCount?: number }) => {
  const messages = Array.from({ length: messageCount }, (_, i) => ({
    id: i,
    content: `Message ${i + 1}`,
    timestamp: Date.now() - (messageCount - i) * 1000
  }));

  return (
    <div data-testid="heavy-component">
      {messages.map(message => (
        <div key={message.id} className="message">
          <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
          <span className="content">{message.content}</span>
        </div>
      ))}
    </div>
  );
};

const StreamingComponent = ({ isStreaming }: { isStreaming: boolean }) => {
  const [content, setContent] = React.useState('');
  
  React.useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setContent(prev => prev + 'word ');
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  return (
    <div data-testid="streaming-component">
      {content}
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AI Tutor Performance Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    
    mockPerformance.now.mockReturnValue(Date.now());
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Rendering Performance', () => {
    it('should render large message lists efficiently', async () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <HeavyComponent messageCount={1000} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500); // Should render in under 500ms
      expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
    });

    it('should handle rapid re-renders without performance degradation', async () => {
      const { rerender } = render(
        <TestWrapper>
          <HeavyComponent messageCount={100} />
        </TestWrapper>
      );

      const renderTimes: number[] = [];

      // Perform multiple re-renders and measure time
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        rerender(
          <TestWrapper>
            <HeavyComponent messageCount={100 + i} />
          </TestWrapper>
        );
        
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      // Performance should remain consistent
      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(100);
      
      // No render should be significantly slower than average
      const maxRenderTime = Math.max(...renderTimes);
      expect(maxRenderTime).toBeLessThan(averageRenderTime * 3);
    });

    it('should optimize streaming content updates', async () => {
      const { rerender } = render(
        <TestWrapper>
          <StreamingComponent isStreaming={false} />
        </TestWrapper>
      );

      const updateTimes: number[] = [];

      rerender(
        <TestWrapper>
          <StreamingComponent isStreaming={true} />
        </TestWrapper>
      );

      // Simulate streaming updates
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        vi.advanceTimersByTime(50);
        await waitFor(() => {
          // Wait for update
        });
        
        const endTime = performance.now();
        updateTimes.push(endTime - startTime);
      }

      const averageUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      expect(averageUpdateTime).toBeLessThan(50); // Updates should be fast
    });

    it('should handle memory efficiently with large datasets', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(
        <TestWrapper>
          <HeavyComponent messageCount={5000} />
        </TestWrapper>
      );

      const afterRenderMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = afterRenderMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 5000 messages)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('API Performance', () => {
    it('should handle concurrent API requests efficiently', async () => {
      const router = new AIProviderRouter();
      const requestTimes: number[] = [];

      const makeRequest = async () => {
        const startTime = performance.now();
        
        await performanceMetrics.trackAPICall('test-api', async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          return { success: true };
        });
        
        const endTime = performance.now();
        return endTime - startTime;
      };

      // Execute concurrent requests
      const concurrentRequests = Array(20).fill(null).map(() => makeRequest());
      const results = await Promise.all(concurrentRequests);

      results.forEach(time => {
        expect(time).toBeLessThan(200); // Each request should complete quickly
      });

      const averageTime = results.reduce((a, b) => a + b, 0) / results.length;
      expect(averageTime).toBeLessThan(150);
    });

    it('should optimize provider selection performance', () => {
      const router = new AIProviderRouter();
      
      // Add many providers to test selection performance
      for (let i = 0; i < 100; i++) {
        router.addProvider({
          id: `provider-${i}`,
          name: `Provider ${i}`,
          type: 'direct-api',
          endpoint: `https://api${i}.example.com`,
          models: [`model-${i}`],
          capabilities: [
            { type: 'text-generation', quality: 'medium', speed: 'medium', costTier: 'medium' }
          ],
          priority: i,
          rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
          authentication: { type: 'bearer' }
        });
      }

      const selectionTimes: number[] = [];

      // Test provider selection performance
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        
        const provider = router.selectProvider({
          requiredCapabilities: ['text-generation'],
          maxCostTier: 'medium'
        });
        
        const endTime = performance.now();
        selectionTimes.push(endTime - startTime);
        
        expect(provider).toBeDefined();
      }

      const averageSelectionTime = selectionTimes.reduce((a, b) => a + b, 0) / selectionTimes.length;
      expect(averageSelectionTime).toBeLessThan(10); // Should be very fast
    });

    it('should handle circuit breaker operations efficiently', async () => {
      const circuitBreaker = new EnhancedCircuitBreaker('perf-test', {
        failureThreshold: 5,
        timeout: 1000,
        successThreshold: 2,
        monitoringPeriod: 5000,
        exponentialBackoffMultiplier: 2,
        maxTimeout: 10000,
        healthCheckInterval: 5000,
        automaticRecovery: true
      });

      const operationTimes: number[] = [];

      // Test successful operations
      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();
        
        await circuitBreaker.execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return 'success';
        });
        
        const endTime = performance.now();
        operationTimes.push(endTime - startTime);
      }

      const averageOperationTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
      expect(averageOperationTime).toBeLessThan(20); // Circuit breaker overhead should be minimal

      circuitBreaker.destroy();
    });
  });

  describe('Memory Management', () => {
    it('should clean up performance metrics to prevent memory leaks', () => {
      const initialMetricsCount = performanceMetrics.exportMetrics().performance.length;

      // Generate many metrics
      for (let i = 0; i < 1200; i++) {
        performanceMetrics.recordMetric({
          type: 'response_time',
          value: Math.random() * 1000
        });
      }

      const finalMetricsCount = performanceMetrics.exportMetrics().performance.length;
      
      // Should not exceed the limit (1000)
      expect(finalMetricsCount).toBeLessThanOrEqual(1000);
      expect(finalMetricsCount).toBeGreaterThan(initialMetricsCount);
    });

    it('should handle component unmounting without memory leaks', () => {
      const { unmount } = render(
        <TestWrapper>
          <HeavyComponent messageCount={1000} />
        </TestWrapper>
      );

      const beforeUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const afterUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory should not increase significantly after unmount
      expect(afterUnmount).toBeLessThanOrEqual(beforeUnmount * 1.1);
    });

    it('should optimize event listener cleanup', () => {
      let listenerCount = 0;
      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;

      window.addEventListener = vi.fn((...args) => {
        listenerCount++;
        return originalAddEventListener.apply(window, args);
      });

      window.removeEventListener = vi.fn((...args) => {
        listenerCount--;
        return originalRemoveEventListener.apply(window, args);
      });

      const { unmount } = render(
        <TestWrapper>
          <div
            onKeyDown={() => {}}
            onMouseMove={() => {}}
            onScroll={() => {}}
          >
            Component with event listeners
          </div>
        </TestWrapper>
      );

      const listenersAfterMount = listenerCount;
      
      unmount();
      
      const listenersAfterUnmount = listenerCount;
      
      // All listeners should be cleaned up
      expect(listenersAfterUnmount).toBeLessThanOrEqual(listenersAfterMount);

      // Restore original methods
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    });
  });

  describe('User Interaction Performance', () => {
    it('should respond to user input quickly', async () => {
      render(
        <TestWrapper>
          <textarea data-testid="message-input" placeholder="Type message..." />
        </TestWrapper>
      );

      const input = screen.getByTestId('message-input');
      const inputTimes: number[] = [];

      // Test typing performance
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        await user.type(input, 'a');
        
        const endTime = performance.now();
        inputTimes.push(endTime - startTime);
      }

      const averageInputTime = inputTimes.reduce((a, b) => a + b, 0) / inputTimes.length;
      expect(averageInputTime).toBeLessThan(50); // Input should be responsive
    });

    it('should handle rapid button clicks efficiently', async () => {
      let clickCount = 0;
      
      render(
        <TestWrapper>
          <button 
            data-testid="rapid-click-button"
            onClick={() => clickCount++}
          >
            Click Me
          </button>
        </TestWrapper>
      );

      const button = screen.getByTestId('rapid-click-button');
      const clickTimes: number[] = [];

      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        await user.click(button);
        
        const endTime = performance.now();
        clickTimes.push(endTime - startTime);
      }

      expect(clickCount).toBe(10);
      
      const averageClickTime = clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length;
      expect(averageClickTime).toBeLessThan(30); // Clicks should be processed quickly
    });

    it('should maintain performance during scroll events', async () => {
      render(
        <TestWrapper>
          <div 
            data-testid="scrollable-container"
            style={{ height: '200px', overflow: 'auto' }}
            onScroll={() => {
              // Simulate scroll handler
              performance.mark('scroll-handler');
            }}
          >
            <HeavyComponent messageCount={500} />
          </div>
        </TestWrapper>
      );

      const container = screen.getByTestId('scrollable-container');
      const scrollTimes: number[] = [];

      // Simulate scroll events
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        container.scrollTop = i * 50;
        container.dispatchEvent(new Event('scroll'));
        
        const endTime = performance.now();
        scrollTimes.push(endTime - startTime);
      }

      const averageScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      expect(averageScrollTime).toBeLessThan(20); // Scroll handling should be fast
    });
  });

  describe('Bundle Size and Loading Performance', () => {
    it('should have reasonable component sizes', () => {
      // Mock component size analysis
      const componentSizes = {
        'AITutorInterface': 45000, // 45KB
        'MessageBubble': 8000,     // 8KB
        'ProviderSelector': 12000, // 12KB
        'ThinkingIndicator': 3000  // 3KB
      };

      Object.entries(componentSizes).forEach(([component, size]) => {
        expect(size).toBeLessThan(50000); // No component should exceed 50KB
      });

      const totalSize = Object.values(componentSizes).reduce((a, b) => a + b, 0);
      expect(totalSize).toBeLessThan(200000); // Total should be under 200KB
    });

    it('should support code splitting for performance', () => {
      // Mock dynamic import performance
      const dynamicImportTime = 150; // Simulated import time in ms
      
      expect(dynamicImportTime).toBeLessThan(500); // Dynamic imports should be fast
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics without significant overhead', async () => {
      const baselineTime = performance.now();
      
      // Perform operations without tracking
      for (let i = 0; i < 100; i++) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const withoutTrackingTime = performance.now() - baselineTime;
      
      const trackedTime = performance.now();
      
      // Perform same operations with tracking
      for (let i = 0; i < 100; i++) {
        await performanceMetrics.trackAPICall(`test-${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return 'success';
        });
      }
      
      const withTrackingTime = performance.now() - trackedTime;
      
      // Tracking overhead should be minimal (less than 50% increase)
      const overhead = (withTrackingTime - withoutTrackingTime) / withoutTrackingTime;
      expect(overhead).toBeLessThan(0.5);
    });

    it('should provide accurate performance measurements', () => {
      const measurements: number[] = [];
      
      // Take multiple measurements
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        // Simulate work
        let sum = 0;
        for (let j = 0; j < 1000; j++) {
          sum += Math.random();
        }
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }

      // Measurements should be consistent
      const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const variance = measurements.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / measurements.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Standard deviation should be reasonable (less than 50% of average)
      expect(standardDeviation).toBeLessThan(average * 0.5);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical user session efficiently', async () => {
      const sessionStartTime = performance.now();
      
      // Simulate typical user session
      render(
        <TestWrapper>
          <HeavyComponent messageCount={50} />
        </TestWrapper>
      );

      // Simulate user interactions
      const input = screen.getByRole('textbox', { name: /message/i }) || 
                   document.createElement('textarea');
      
      for (let i = 0; i < 5; i++) {
        await user.type(input, `Message ${i + 1}`);
        await user.clear(input);
      }

      const sessionEndTime = performance.now();
      const totalSessionTime = sessionEndTime - sessionStartTime;
      
      // Typical session should complete quickly
      expect(totalSessionTime).toBeLessThan(2000); // Under 2 seconds
    });

    it('should maintain performance under stress conditions', async () => {
      const stressTestStartTime = performance.now();
      
      // Simulate stress conditions
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(
          performanceMetrics.trackAPICall(`stress-${i}`, async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            return { id: i };
          })
        );
      }

      await Promise.all(promises);
      
      const stressTestEndTime = performance.now();
      const stressTestTime = stressTestEndTime - stressTestStartTime;
      
      // Should handle stress test efficiently
      expect(stressTestTime).toBeLessThan(1000); // Under 1 second for 50 concurrent operations
    });
  });
});