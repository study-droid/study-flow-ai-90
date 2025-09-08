/**
 * useServiceStatus Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useServiceStatus } from '../useServiceStatus';
import { unifiedAIService } from '@/services/ai/unified-ai-service';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';

// Mock the services
vi.mock('@/services/ai/unified-ai-service', () => ({
  unifiedAIService: {
    getServiceHealth: vi.fn(),
    resetServices: vi.fn()
  }
}));

vi.mock('@/services/reliability/circuit-breaker', () => ({
  circuitBreakerManager: {
    resetFailingCircuits: vi.fn(),
    getHealthSummary: vi.fn()
  }
}));

vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('useServiceStatus', () => {
  const mockHealthyStatus = {
    overall: 'healthy' as const,
    providers: [
      {
        id: 'deepseek',
        status: 'online' as const,
        responseTime: 150,
        errorRate: 0.5,
        lastSuccess: new Date('2024-01-01T12:00:00Z'),
        circuitBreakerState: 'closed' as const
      },
      {
        id: 'edge-function-professional',
        status: 'online' as const,
        responseTime: 200,
        errorRate: 1.2,
        lastSuccess: new Date('2024-01-01T11:55:00Z'),
        circuitBreakerState: 'closed' as const
      }
    ],
    lastCheck: new Date('2024-01-01T12:00:00Z'),
    metrics: {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 175
    }
  };

  const mockDegradedStatus = {
    ...mockHealthyStatus,
    overall: 'degraded' as const,
    providers: [
      {
        ...mockHealthyStatus.providers[0],
        status: 'degraded' as const,
        errorRate: 5.5,
        circuitBreakerState: 'half-open' as const
      },
      mockHealthyStatus.providers[1]
    ]
  };

  const mockCircuitBreakerSummary = {
    total: 3,
    healthy: 2,
    degraded: 1,
    failed: 0,
    overallHealth: 'degraded' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(unifiedAIService.getServiceHealth).mockReturnValue(mockHealthyStatus);
    vi.mocked(circuitBreakerManager.getHealthSummary).mockReturnValue(mockCircuitBreakerSummary);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      expect(result.current.health).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdate).toBeNull();
      expect(result.current.isResetting).toBe(false);
    });

    it('auto-starts monitoring by default', async () => {
      renderHook(() => useServiceStatus());

      await waitFor(() => {
        expect(unifiedAIService.getServiceHealth).toHaveBeenCalled();
      });
    });

    it('does not auto-start when autoStart is false', () => {
      renderHook(() => useServiceStatus({ autoStart: false }));

      expect(unifiedAIService.getServiceHealth).not.toHaveBeenCalled();
    });
  });

  describe('Service Health Fetching', () => {
    it('fetches service health successfully', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.health).toEqual(mockHealthyStatus);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdate).toBeInstanceOf(Date);
    });

    it('handles service health fetch errors', async () => {
      const error = new Error('Service unavailable');
      vi.mocked(unifiedAIService.getServiceHealth).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.health).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Service unavailable');
    });

    it('calls onHealthChange callback when health changes', async () => {
      const onHealthChange = vi.fn();
      const { result } = renderHook(() => 
        useServiceStatus({ autoStart: false, onHealthChange })
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(onHealthChange).toHaveBeenCalledWith(mockHealthyStatus);
    });

    it('calls onError callback when error occurs', async () => {
      const onError = vi.fn();
      const error = new Error('Service unavailable');
      vi.mocked(unifiedAIService.getServiceHealth).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => 
        useServiceStatus({ autoStart: false, onError })
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(onError).toHaveBeenCalledWith('Service unavailable');
    });
  });

  describe('Service Reset', () => {
    it('resets services successfully', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.resetServices();
      });

      expect(unifiedAIService.resetServices).toHaveBeenCalled();
      expect(circuitBreakerManager.resetFailingCircuits).toHaveBeenCalled();
      expect(result.current.isResetting).toBe(false);
    });

    it('handles reset service errors', async () => {
      const error = new Error('Reset failed');
      vi.mocked(unifiedAIService.resetServices).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await expect(act(async () => {
        await result.current.resetServices();
      })).rejects.toThrow('Reset failed');

      expect(result.current.isResetting).toBe(false);
      expect(result.current.error).toBe('Reset failed');
    });

    it('calls onServiceReset callback after successful reset', async () => {
      const onServiceReset = vi.fn();
      const { result } = renderHook(() => 
        useServiceStatus({ autoStart: false, onServiceReset })
      );

      await act(async () => {
        await result.current.resetServices();
      });

      expect(onServiceReset).toHaveBeenCalled();
    });

    it('sets isResetting state during reset operation', async () => {
      let resolveReset: () => void;
      const resetPromise = new Promise<void>(resolve => {
        resolveReset = resolve;
      });

      vi.mocked(unifiedAIService.resetServices).mockImplementation(() => resetPromise);

      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      // Start reset
      act(() => {
        result.current.resetServices();
      });

      expect(result.current.isResetting).toBe(true);

      // Complete reset
      await act(async () => {
        resolveReset();
        await resetPromise;
      });

      expect(result.current.isResetting).toBe(false);
    });
  });

  describe('Monitoring', () => {
    it('starts monitoring manually', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.isMonitoring).toBe(true);
      await waitFor(() => {
        expect(unifiedAIService.getServiceHealth).toHaveBeenCalled();
      });
    });

    it('stops monitoring manually', () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.isMonitoring).toBe(true);

      act(() => {
        result.current.stopMonitoring();
      });

      expect(result.current.isMonitoring).toBe(false);
    });

    it('refreshes at specified intervals', async () => {
      renderHook(() => useServiceStatus({ refreshInterval: 1000 }));

      // Initial call
      await waitFor(() => {
        expect(unifiedAIService.getServiceHealth).toHaveBeenCalledTimes(1);
      });

      // Advance timer
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(unifiedAIService.getServiceHealth).toHaveBeenCalledTimes(2);
      });

      // Advance timer again
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(unifiedAIService.getServiceHealth).toHaveBeenCalledTimes(3);
      });
    });

    it('stops monitoring on unmount', () => {
      const { unmount } = renderHook(() => useServiceStatus());

      unmount();

      // Timer should be cleared, so advancing time shouldn't trigger more calls
      const initialCallCount = vi.mocked(unifiedAIService.getServiceHealth).mock.calls.length;
      
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(vi.mocked(unifiedAIService.getServiceHealth).mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Computed Values', () => {
    it('computes health status correctly', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isHealthy).toBe(true);
      expect(result.current.isDegraded).toBe(false);
      expect(result.current.isUnhealthy).toBe(false);
    });

    it('computes degraded status correctly', async () => {
      vi.mocked(unifiedAIService.getServiceHealth).mockReturnValue(mockDegradedStatus);

      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isHealthy).toBe(false);
      expect(result.current.isDegraded).toBe(true);
      expect(result.current.isUnhealthy).toBe(false);
    });

    it('computes provider counts correctly', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.onlineProviders).toBe(2);
      expect(result.current.totalProviders).toBe(2);
    });

    it('computes success rate correctly', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.successRate).toBe(95); // 95/100 * 100
    });

    it('computes average response time correctly', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.averageResponseTime).toBe(175);
    });

    it('handles zero requests correctly', async () => {
      const zeroRequestsStatus = {
        ...mockHealthyStatus,
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        }
      };

      vi.mocked(unifiedAIService.getServiceHealth).mockReturnValue(zeroRequestsStatus);

      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.successRate).toBe(0);
      expect(result.current.averageResponseTime).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('gets provider status by ID', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      const deepseekStatus = result.current.getProviderStatus('deepseek');
      expect(deepseekStatus).toEqual(mockHealthyStatus.providers[0]);

      const nonExistentStatus = result.current.getProviderStatus('non-existent');
      expect(nonExistentStatus).toBeNull();
    });

    it('checks if provider is online', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isProviderOnline('deepseek')).toBe(true);
      expect(result.current.isProviderOnline('non-existent')).toBe(false);
    });

    it('gets overall status text', async () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.getOverallStatusText()).toBe('Healthy');
    });

    it('gets circuit breaker summary', () => {
      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      const summary = result.current.getCircuitBreakerSummary();
      expect(summary).toEqual(mockCircuitBreakerSummary);
      expect(circuitBreakerManager.getHealthSummary).toHaveBeenCalled();
    });
  });

  describe('Error Management', () => {
    it('clears error state', async () => {
      const error = new Error('Service unavailable');
      vi.mocked(unifiedAIService.getServiceHealth).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useServiceStatus({ autoStart: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Service unavailable');
      expect(result.current.hasError).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
    });
  });
});