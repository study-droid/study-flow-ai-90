/**
 * Service Status Hook
 * Manages service health monitoring and status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedAIService, type ServiceHealthStatus } from '@/services/ai/unified-ai-service';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';
import { logger } from '@/services/logging/logger';

export interface ServiceStatusState {
  health: ServiceHealthStatus | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isResetting: boolean;
}

export interface ServiceStatusOptions {
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Whether to start monitoring immediately */
  autoStart?: boolean;
  /** Callback when service health changes */
  onHealthChange?: (health: ServiceHealthStatus) => void;
  /** Callback when service reset completes */
  onServiceReset?: () => void;
  /** Callback when errors occur */
  onError?: (error: string) => void;
}

export interface ServiceStatusActions {
  /** Manually refresh service health */
  refresh: () => Promise<void>;
  /** Reset all services */
  resetServices: () => Promise<void>;
  /** Start monitoring */
  startMonitoring: () => void;
  /** Stop monitoring */
  stopMonitoring: () => void;
  /** Clear error state */
  clearError: () => void;
}

export function useServiceStatus(options: ServiceStatusOptions = {}) {
  const {
    refreshInterval = 5000,
    autoStart = true,
    onHealthChange,
    onServiceReset,
    onError
  } = options;

  const [state, setState] = useState<ServiceStatusState>({
    health: null,
    isLoading: false,
    error: null,
    lastUpdate: null,
    isResetting: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMonitoringRef = useRef(false);

  /**
   * Fetch current service health status
   */
  const fetchServiceHealth = useCallback(async (): Promise<ServiceHealthStatus | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const health = unifiedAIService.getServiceHealth();
      
      setState(prev => ({
        ...prev,
        health,
        isLoading: false,
        lastUpdate: new Date()
      }));

      // Call health change callback
      if (health && onHealthChange) {
        onHealthChange(health);
      }

      logger.info('Service health status updated', 'ServiceStatus', {
        overall: health.overall,
        providersCount: health.providers.length,
        onlineProviders: health.providers.filter(p => p.status === 'online').length
      });

      return health;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch service health';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      logger.error('Failed to fetch service health', 'ServiceStatus', { error: errorMessage });
      
      if (onError) {
        onError(errorMessage);
      }

      return null;
    }
  }, [onHealthChange, onError]);

  /**
   * Reset all services (unified AI service and circuit breakers)
   */
  const resetServices = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isResetting: true, error: null }));

      logger.info('Starting service reset', 'ServiceStatus');

      // Reset unified AI service
      unifiedAIService.resetServices();

      // Reset circuit breakers
      circuitBreakerManager.resetFailingCircuits();

      // Wait a moment for services to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh health status
      await fetchServiceHealth();

      setState(prev => ({ ...prev, isResetting: false }));

      logger.info('Service reset completed successfully', 'ServiceStatus');

      if (onServiceReset) {
        onServiceReset();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset services';
      
      setState(prev => ({
        ...prev,
        isResetting: false,
        error: errorMessage
      }));

      logger.error('Service reset failed', 'ServiceStatus', { error: errorMessage });

      if (onError) {
        onError(errorMessage);
      }

      throw error;
    }
  }, [fetchServiceHealth, onServiceReset, onError]);

  /**
   * Start monitoring service health
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoringRef.current) {
      return;
    }

    isMonitoringRef.current = true;
    
    // Initial fetch
    fetchServiceHealth();

    // Set up interval
    intervalRef.current = setInterval(() => {
      if (isMonitoringRef.current) {
        fetchServiceHealth();
      }
    }, refreshInterval);

    logger.info('Service status monitoring started', 'ServiceStatus', {
      refreshInterval
    });
  }, [fetchServiceHealth, refreshInterval]);

  /**
   * Stop monitoring service health
   */
  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    logger.info('Service status monitoring stopped', 'ServiceStatus');
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchServiceHealth();
  }, [fetchServiceHealth]);

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [autoStart, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Computed values
  const isHealthy = state.health?.overall === 'healthy';
  const isDegraded = state.health?.overall === 'degraded';
  const isUnhealthy = state.health?.overall === 'unhealthy';
  const hasError = !!state.error;
  const isMonitoring = isMonitoringRef.current;

  const onlineProviders = state.health?.providers.filter(p => p.status === 'online').length || 0;
  const totalProviders = state.health?.providers.length || 0;

  const successRate = state.health?.metrics.totalRequests 
    ? (state.health.metrics.successfulRequests / state.health.metrics.totalRequests) * 100
    : 0;

  const averageResponseTime = state.health?.metrics.averageResponseTime || 0;

  const actions: ServiceStatusActions = {
    refresh,
    resetServices,
    startMonitoring,
    stopMonitoring,
    clearError
  };

  return {
    // State
    ...state,
    
    // Actions
    ...actions,
    
    // Computed values
    isHealthy,
    isDegraded,
    isUnhealthy,
    hasError,
    isMonitoring,
    onlineProviders,
    totalProviders,
    successRate,
    averageResponseTime,
    
    // Utilities
    getProviderStatus: (providerId: string) => {
      return state.health?.providers.find(p => p.id === providerId) || null;
    },
    
    getCircuitBreakerSummary: () => {
      return circuitBreakerManager.getHealthSummary();
    },
    
    isProviderOnline: (providerId: string) => {
      const provider = state.health?.providers.find(p => p.id === providerId);
      return provider?.status === 'online';
    },
    
    getOverallStatusText: () => {
      if (!state.health) return 'Unknown';
      return state.health.overall.charAt(0).toUpperCase() + state.health.overall.slice(1);
    }
  };
}

export default useServiceStatus;