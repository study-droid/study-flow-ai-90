import React, { useEffect, useCallback, useRef } from 'react';
import { usePerformanceMetrics } from '@/services/monitoring/performance-metrics';

interface UsePerformanceMonitoringOptions {
  trackPageViews?: boolean;
  trackUserInteractions?: boolean;
  trackErrors?: boolean;
  trackAPICallsAutomatically?: boolean;
}

export const usePerformanceMonitoring = (
  options: UsePerformanceMonitoringOptions = {}
) => {
  const {
    trackPageViews = true,
    trackUserInteractions = true,
    trackErrors = true,
    trackAPICallsAutomatically = true
  } = options;

  const {
    trackAPICall,
    trackUserInteraction,
    trackPageLoad,
    trackError,
    setUserId
  } = usePerformanceMetrics();

  const pageLoadStartTime = useRef<number>(Date.now());
  const interactionObserver = useRef<MutationObserver | null>(null);

  // Track page load performance
  useEffect(() => {
    if (!trackPageViews) return;

    const handleLoad = () => {
      const loadTime = Date.now() - pageLoadStartTime.current;
      const pageName = window.location.pathname;
      trackPageLoad(pageName, loadTime);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [trackPageViews, trackPageLoad]);

  // Track user interactions
  useEffect(() => {
    if (!trackUserInteractions) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const className = target.className;
      const id = target.id;
      
      trackUserInteraction('click', tagName, {
        className,
        id,
        text: target.textContent?.slice(0, 50)
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const target = event.target as HTMLElement;
        trackUserInteraction('keyboard', target.tagName.toLowerCase(), {
          key: event.key,
          id: target.id
        });
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [trackUserInteractions, trackUserInteraction]);

  // Track JavaScript errors
  useEffect(() => {
    if (!trackErrors) return;

    const handleError = (event: ErrorEvent) => {
      trackError(
        new Error(event.message),
        'global_error_handler',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      trackError(error, 'unhandled_promise_rejection');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackErrors, trackError]);

  // Enhanced API call tracking with automatic wrapping
  const trackAPICallEnhanced = useCallback(
    async <T>(
      apiName: string,
      apiCall: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      return trackAPICall(apiName, apiCall, metadata);
    },
    [trackAPICall]
  );

  // Track AI-specific metrics
  const trackAIInteraction = useCallback((
    action: 'message_sent' | 'response_received' | 'thinking_started' | 'thinking_ended',
    metadata?: Record<string, any>
  ) => {
    trackUserInteraction(`ai_${action}`, 'ai_tutor', metadata);
  }, [trackUserInteraction]);

  // Track AI service health
  const trackAIServiceHealth = useCallback((
    provider: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime?: number,
    metadata?: Record<string, any>
  ) => {
    trackUserInteraction('ai_service_health', provider, {
      status,
      responseTime,
      ...metadata
    });
  }, [trackUserInteraction]);

  // Track feature usage
  const trackFeatureUsage = useCallback((
    feature: string,
    action: string,
    metadata?: Record<string, any>
  ) => {
    trackUserInteraction(`feature_${action}`, feature, metadata);
  }, [trackUserInteraction]);

  // Track performance bottlenecks
  const trackPerformanceBottleneck = useCallback((
    bottleneck: string,
    duration: number,
    metadata?: Record<string, any>
  ) => {
    trackUserInteraction('performance_bottleneck', bottleneck, {
      duration,
      severity: duration > 1000 ? 'high' : duration > 500 ? 'medium' : 'low',
      ...metadata
    });
  }, [trackUserInteraction]);

  // Set user ID for tracking
  const setUserIdForTracking = useCallback((userId: string) => {
    setUserId(userId);
  }, [setUserId]);

  return {
    // Core tracking functions
    trackAPICall: trackAPICallEnhanced,
    trackUserInteraction,
    trackPageLoad,
    trackError,
    
    // AI-specific tracking
    trackAIInteraction,
    trackAIServiceHealth,
    
    // Feature tracking
    trackFeatureUsage,
    trackPerformanceBottleneck,
    
    // User management
    setUserIdForTracking
  };
};

// Higher-order component for automatic performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { trackFeatureUsage } = usePerformanceMonitoring();
    const renderStartTime = useRef<number>(Date.now());

    useEffect(() => {
      const renderTime = Date.now() - renderStartTime.current;
      trackFeatureUsage(
        componentName || Component.displayName || Component.name || 'UnknownComponent',
        'render',
        { renderTime }
      );
    }, [trackFeatureUsage]);

    return React.createElement(Component, { ...props, ref });
  });
};