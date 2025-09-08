/**
 * Performance Metrics Tests
 * Comprehensive unit tests for the performance metrics collection system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceMetrics, usePerformanceMetrics } from '../performance-metrics';
import { renderHook, act } from '@testing-library/react';

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

// Mock PerformanceObserver
const mockObserver = {
  observe: vi.fn(),
  disconnect: vi.fn()
};

global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
  return mockObserver;
});

describe('PerformanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset performance mock
    mockPerformance.now.mockReturnValue(Date.now());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Metric Recording', () => {
    it('should record basic metrics', () => {
      performanceMetrics.recordMetric({
        type: 'response_time',
        value: 150,
        metadata: { endpoint: '/api/test' }
      });

      const summary = performanceMetrics.getMetricsSummary();
      expect(summary.totalMetrics).toBe(1);
      expect(summary.averageResponseTime).toBe(150);
    });

    it('should record UX metrics', () => {
      performanceMetrics.recordUXMetric({
        event: 'page_load',
        duration: 2000,
        success: true,
        metadata: { pageName: 'dashboard' }
      });

      const exported = performanceMetrics.exportMetrics();
      expect(exported.userExperience).toHaveLength(1);
      expect(exported.userExperience[0].event).toBe('page_load');
      expect(exported.userExperience[0].duration).toBe(2000);
    });

    it('should generate unique metric IDs', () => {
      performanceMetrics.recordMetric({
        type: 'api_call',
        value: 100
      });

      performanceMetrics.recordMetric({
        type: 'api_call',
        value: 200
      });

      const exported = performanceMetrics.exportMetrics();
      const ids = exported.performance.map(m => m.id);
      expect(new Set(ids).size).toBe(ids.length); // All IDs should be unique
    });

    it('should include session and user IDs', () => {
      performanceMetrics.setUserId('test-user-123');
      
      performanceMetrics.recordMetric({
        type: 'user_action',
        value: 1
      });

      const exported = performanceMetrics.exportMetrics();
      const metric = exported.performance[0];
      
      expect(metric.sessionId).toBeDefined();
      expect(metric.userId).toBe('test-user-123');
    });
  });

  describe('API Call Tracking', () => {
    it('should track successful API calls', async () => {
      const mockApiCall = vi.fn().mockResolvedValue('success');
      
      const result = await performanceMetrics.trackAPICall('test-api', mockApiCall);
      
      expect(result).toBe('success');
      expect(mockApiCall).toHaveBeenCalledOnce();
      
      const summary = performanceMetrics.getMetricsSummary();
      expect(summary.totalMetrics).toBeGreaterThan(0);
    });

    it('should track failed API calls', async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(
        performanceMetrics.trackAPICall('test-api', mockApiCall)
      ).rejects.toThrow('API Error');
      
      const summary = performanceMetrics.getMetricsSummary();
      expect(summary.errorRate).toBeGreaterThan(0);
      expect(summary.topErrors).toHaveLength(1);
      expect(summary.topErrors[0].error).toBe('Error');
    });

    it('should measure API call duration', async () => {
      let resolvePromise: (value: string) => void;
      const mockApiCall = vi.fn().mockImplementation(() => 
        new Promise<string>(resolve => {
          resolvePromise = resolve;
        })
      );

      const callPromise = performanceMetrics.trackAPICall('slow-api', mockApiCall);
      
      // Advance time to simulate slow API
      vi.advanceTimersByTime(500);
      resolvePromise!('success');
      
      await callPromise;
      
      const exported = performanceMetrics.exportMetrics();
      const apiMetric = exported.performance.find(m => m.type === 'api_call');
      
      expect(apiMetric).toBeDefined();
      expect(apiMetric!.value).toBeGreaterThan(0);
    });

    it('should include metadata in API tracking', async () => {
      const mockApiCall = vi.fn().mockResolvedValue('success');
      const metadata = { userId: 'test-user', endpoint: '/api/data' };
      
      await performanceMetrics.trackAPICall('test-api', mockApiCall, metadata);
      
      const exported = performanceMetrics.exportMetrics();
      const apiMetric = exported.performance.find(m => m.type === 'api_call');
      
      expect(apiMetric?.metadata).toMatchObject(metadata);
    });

    it('should clean up performance marks after API calls', async () => {
      const mockApiCall = vi.fn().mockResolvedValue('success');
      
      await performanceMetrics.trackAPICall('test-api', mockApiCall);
      
      expect(mockPerformance.clearMarks).toHaveBeenCalled();
      expect(mockPerformance.clearMeasures).toHaveBeenCalled();
    });
  });

  describe('User Interaction Tracking', () => {
    it('should track user interactions', () => {
      performanceMetrics.trackUserInteraction('click', 'submit-button', {
        formId: 'login-form'
      });

      const exported = performanceMetrics.exportMetrics();
      const interaction = exported.userExperience.find(m => m.event === 'interaction');
      
      expect(interaction).toBeDefined();
      expect(interaction?.metadata?.action).toBe('click');
      expect(interaction?.metadata?.element).toBe('submit-button');
      expect(interaction?.metadata?.formId).toBe('login-form');
    });

    it('should mark interactions as successful by default', () => {
      performanceMetrics.trackUserInteraction('scroll', 'page-content');

      const exported = performanceMetrics.exportMetrics();
      const interaction = exported.userExperience.find(m => m.event === 'interaction');
      
      expect(interaction?.success).toBe(true);
    });
  });

  describe('Page Load Tracking', () => {
    it('should track page loads with performance grades', () => {
      performanceMetrics.trackPageLoad('dashboard', 1500);

      const exported = performanceMetrics.exportMetrics();
      const pageLoad = exported.userExperience.find(m => m.event === 'page_load');
      
      expect(pageLoad).toBeDefined();
      expect(pageLoad?.duration).toBe(1500);
      expect(pageLoad?.success).toBe(true); // Under 3s threshold
      expect(pageLoad?.metadata?.performanceGrade).toBe('good'); // 1-2s range
    });

    it('should assign correct performance grades', () => {
      const testCases = [
        { loadTime: 500, expectedGrade: 'excellent' },
        { loadTime: 1500, expectedGrade: 'good' },
        { loadTime: 2500, expectedGrade: 'fair' },
        { loadTime: 4000, expectedGrade: 'poor' }
      ];

      testCases.forEach(({ loadTime, expectedGrade }, index) => {
        performanceMetrics.trackPageLoad(`page-${index}`, loadTime);
      });

      const exported = performanceMetrics.exportMetrics();
      const pageLoads = exported.userExperience.filter(m => m.event === 'page_load');
      
      testCases.forEach(({ expectedGrade }, index) => {
        expect(pageLoads[index].metadata?.performanceGrade).toBe(expectedGrade);
      });
    });

    it('should mark slow page loads as unsuccessful', () => {
      performanceMetrics.trackPageLoad('slow-page', 4000);

      const exported = performanceMetrics.exportMetrics();
      const pageLoad = exported.userExperience.find(m => m.event === 'page_load');
      
      expect(pageLoad?.success).toBe(false); // Over 3s threshold
    });
  });

  describe('Error Tracking', () => {
    it('should track errors with context', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      
      performanceMetrics.trackError(error, 'api-call', {
        endpoint: '/api/test'
      });

      const exported = performanceMetrics.exportMetrics();
      const errorMetric = exported.performance.find(m => m.type === 'error');
      const errorUX = exported.userExperience.find(m => m.event === 'error_encountered');
      
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.metadata?.errorName).toBe('Error');
      expect(errorMetric?.metadata?.errorMessage).toBe('Test error');
      expect(errorMetric?.metadata?.context).toBe('api-call');
      
      expect(errorUX).toBeDefined();
      expect(errorUX?.success).toBe(false);
      expect(errorUX?.errorType).toBe('Error');
    });

    it('should include error stack traces', () => {
      const error = new Error('Stack trace test');
      
      performanceMetrics.trackError(error);

      const exported = performanceMetrics.exportMetrics();
      const errorMetric = exported.performance.find(m => m.type === 'error');
      
      expect(errorMetric?.metadata?.errorStack).toBeDefined();
    });
  });

  describe('Metrics Summary', () => {
    it('should calculate metrics summary correctly', () => {
      // Add various metrics
      performanceMetrics.recordMetric({ type: 'response_time', value: 100 });
      performanceMetrics.recordMetric({ type: 'response_time', value: 200 });
      performanceMetrics.recordMetric({ type: 'api_call', value: 150 });
      performanceMetrics.recordMetric({ 
        type: 'error', 
        value: 1, 
        metadata: { errorName: 'NetworkError' } 
      });

      const summary = performanceMetrics.getMetricsSummary();
      
      expect(summary.totalMetrics).toBe(4);
      expect(summary.averageResponseTime).toBe(150); // (100 + 200 + 150) / 3
      expect(summary.errorRate).toBe(25); // 1 error out of 4 metrics
      expect(summary.topErrors).toHaveLength(1);
      expect(summary.topErrors[0].error).toBe('NetworkError');
    });

    it('should filter metrics by time range', () => {
      const now = Date.now();
      
      // Record metrics at different times
      vi.setSystemTime(now - 10000);
      performanceMetrics.recordMetric({ type: 'response_time', value: 100 });
      
      vi.setSystemTime(now - 5000);
      performanceMetrics.recordMetric({ type: 'response_time', value: 200 });
      
      vi.setSystemTime(now);
      performanceMetrics.recordMetric({ type: 'response_time', value: 300 });

      const summary = performanceMetrics.getMetricsSummary({
        start: now - 6000,
        end: now
      });
      
      expect(summary.totalMetrics).toBe(2); // Only last 2 metrics
      expect(summary.averageResponseTime).toBe(250); // (200 + 300) / 2
    });

    it('should handle empty metrics gracefully', () => {
      const summary = performanceMetrics.getMetricsSummary();
      
      expect(summary.totalMetrics).toBe(0);
      expect(summary.averageResponseTime).toBe(0);
      expect(summary.errorRate).toBe(0);
      expect(summary.topErrors).toHaveLength(0);
    });
  });

  describe('Performance Grades Tracking', () => {
    it('should track performance grades in summary', () => {
      performanceMetrics.trackPageLoad('page1', 500);   // excellent
      performanceMetrics.trackPageLoad('page2', 1500);  // good
      performanceMetrics.trackPageLoad('page3', 2500);  // fair
      performanceMetrics.trackPageLoad('page4', 4000);  // poor

      const summary = performanceMetrics.getMetricsSummary();
      
      expect(summary.performanceGrades).toEqual({
        excellent: 1,
        good: 1,
        fair: 1,
        poor: 1
      });
    });
  });

  describe('Memory Management', () => {
    it('should trim metrics when limit is exceeded', () => {
      // Record more than 1000 metrics
      for (let i = 0; i < 1100; i++) {
        performanceMetrics.recordMetric({
          type: 'response_time',
          value: i
        });
      }

      const exported = performanceMetrics.exportMetrics();
      expect(exported.performance.length).toBeLessThanOrEqual(1000);
    });

    it('should trim UX metrics when limit is exceeded', () => {
      // Record more than 1000 UX metrics
      for (let i = 0; i < 1100; i++) {
        performanceMetrics.recordUXMetric({
          event: 'interaction',
          success: true
        });
      }

      const exported = performanceMetrics.exportMetrics();
      expect(exported.userExperience.length).toBeLessThanOrEqual(1000);
    });

    it('should keep most recent metrics when trimming', () => {
      // Record metrics with identifiable values
      for (let i = 0; i < 1100; i++) {
        performanceMetrics.recordMetric({
          type: 'response_time',
          value: i,
          metadata: { index: i }
        });
      }

      const exported = performanceMetrics.exportMetrics();
      const lastMetric = exported.performance[exported.performance.length - 1];
      
      // Should keep the most recent metrics
      expect(lastMetric.metadata?.index).toBeGreaterThan(99);
    });
  });

  describe('Performance Observer Integration', () => {
    it('should initialize performance observers', () => {
      expect(global.PerformanceObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalled();
    });

    it('should handle navigation timing entries', () => {
      const mockEntry = {
        entryType: 'navigation',
        name: 'https://example.com',
        loadEventEnd: 1000,
        loadEventStart: 500
      };

      // Simulate observer callback
      const observerCallback = (global.PerformanceObserver as any).mock.calls[0][0];
      observerCallback({
        getEntries: () => [mockEntry]
      });

      const exported = performanceMetrics.exportMetrics();
      const renderMetric = exported.performance.find(m => m.type === 'render_time');
      
      expect(renderMetric).toBeDefined();
      expect(renderMetric?.value).toBe(500); // loadEventEnd - loadEventStart
    });

    it('should handle measure entries', () => {
      const mockEntry = {
        entryType: 'measure',
        name: 'custom-measure',
        duration: 250,
        startTime: 100
      };

      // Simulate measure observer callback
      const observerCallback = (global.PerformanceObserver as any).mock.calls[1][0];
      observerCallback({
        getEntries: () => [mockEntry]
      });

      const exported = performanceMetrics.exportMetrics();
      const responseMetric = exported.performance.find(m => 
        m.type === 'response_time' && m.metadata?.name === 'custom-measure'
      );
      
      expect(responseMetric).toBeDefined();
      expect(responseMetric?.value).toBe(250);
    });
  });

  describe('Cleanup', () => {
    it('should disconnect observers on destroy', () => {
      performanceMetrics.destroy();
      
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });
});

describe('usePerformanceMetrics Hook', () => {
  it('should provide performance metrics methods', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.trackAPICall).toBeDefined();
    expect(result.current.trackUserInteraction).toBeDefined();
    expect(result.current.trackPageLoad).toBeDefined();
    expect(result.current.trackError).toBeDefined();
    expect(result.current.getMetricsSummary).toBeDefined();
    expect(result.current.exportMetrics).toBeDefined();
    expect(result.current.setUserId).toBeDefined();
  });

  it('should track API calls through hook', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    const mockApiCall = vi.fn().mockResolvedValue('success');
    
    await act(async () => {
      const response = await result.current.trackAPICall('test-api', mockApiCall);
      expect(response).toBe('success');
    });
    
    expect(mockApiCall).toHaveBeenCalledOnce();
  });

  it('should track user interactions through hook', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.trackUserInteraction('click', 'button');
    });
    
    const summary = result.current.getMetricsSummary();
    expect(summary.totalMetrics).toBeGreaterThan(0);
  });
});