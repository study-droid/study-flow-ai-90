/**
 * Performance Metrics Collection System
 * Tracks various performance indicators and user experience metrics
 */

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'response_time' | 'render_time' | 'api_call' | 'error' | 'user_action';
  value: number;
  metadata?: Record<string, any>;
  sessionId: string;
  userId?: string;
}

export interface UserExperienceMetric {
  id: string;
  timestamp: number;
  event: 'page_load' | 'interaction' | 'error_encountered' | 'feature_used';
  duration?: number;
  success: boolean;
  errorType?: string;
  metadata?: Record<string, any>;
  sessionId: string;
  userId?: string;
}

export interface SystemHealthMetric {
  timestamp: number;
  cpuUsage?: number;
  memoryUsage?: number;
  networkLatency?: number;
  errorRate: number;
  activeUsers: number;
  apiResponseTimes: Record<string, number>;
}

class PerformanceMetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private uxMetrics: UserExperienceMetric[] = [];
  private sessionId: string;
  private userId?: string;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeObservers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeObservers(): void {
    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordMetric({
              type: 'render_time',
              value: entry.loadEventEnd - entry.loadEventStart,
              metadata: {
                entryType: entry.entryType,
                name: entry.name
              }
            });
          }
        }
      });

      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Measure observer for custom metrics
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.recordMetric({
              type: 'response_time',
              value: entry.duration,
              metadata: {
                name: entry.name,
                startTime: entry.startTime
              }
            });
          }
        }
      });

      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(measureObserver);
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp' | 'sessionId' | 'userId'>): void {
    const fullMetric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      ...metric
    };

    this.metrics.push(fullMetric);
    this.trimMetricsIfNeeded();
  }

  recordUXMetric(metric: Omit<UserExperienceMetric, 'id' | 'timestamp' | 'sessionId' | 'userId'>): void {
    const fullMetric: UserExperienceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      ...metric
    };

    this.uxMetrics.push(fullMetric);
    this.trimUXMetricsIfNeeded();
  }

  // API Response Time Tracking
  async trackAPICall<T>(
    apiName: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const markStart = `api-${apiName}-start`;
    const markEnd = `api-${apiName}-end`;
    const measureName = `api-${apiName}-duration`;

    performance.mark(markStart);

    try {
      const result = await apiCall();
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);

      const duration = performance.now() - startTime;
      
      this.recordMetric({
        type: 'api_call',
        value: duration,
        metadata: {
          apiName,
          success: true,
          ...metadata
        }
      });

      this.recordUXMetric({
        event: 'feature_used',
        duration,
        success: true,
        metadata: {
          feature: `api_${apiName}`,
          ...metadata
        }
      });

      return result;
    } catch (error) {
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);

      const duration = performance.now() - startTime;
      
      this.recordMetric({
        type: 'error',
        value: duration,
        metadata: {
          apiName,
          error: error instanceof Error ? error.message : 'Unknown error',
          ...metadata
        }
      });

      this.recordUXMetric({
        event: 'error_encountered',
        duration,
        success: false,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        metadata: {
          feature: `api_${apiName}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          ...metadata
        }
      });

      throw error;
    } finally {
      // Clean up performance marks
      performance.clearMarks(markStart);
      performance.clearMarks(markEnd);
      performance.clearMeasures(measureName);
    }
  }

  // User Interaction Tracking
  trackUserInteraction(
    action: string,
    element?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordUXMetric({
      event: 'interaction',
      success: true,
      metadata: {
        action,
        element,
        ...metadata
      }
    });
  }

  // Page Load Performance
  trackPageLoad(pageName: string, loadTime: number): void {
    this.recordUXMetric({
      event: 'page_load',
      duration: loadTime,
      success: loadTime < 3000, // Consider loads under 3s as successful
      metadata: {
        pageName,
        performanceGrade: this.getPerformanceGrade(loadTime)
      }
    });
  }

  private getPerformanceGrade(loadTime: number): string {
    if (loadTime < 1000) return 'excellent';
    if (loadTime < 2000) return 'good';
    if (loadTime < 3000) return 'fair';
    return 'poor';
  }

  // Error Tracking
  trackError(
    error: Error,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      type: 'error',
      value: 1,
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        ...metadata
      }
    });

    this.recordUXMetric({
      event: 'error_encountered',
      success: false,
      errorType: error.name,
      metadata: {
        context,
        errorMessage: error.message,
        ...metadata
      }
    });
  }

  // Get aggregated metrics
  getMetricsSummary(timeRange?: { start: number; end: number }): {
    totalMetrics: number;
    averageResponseTime: number;
    errorRate: number;
    topErrors: Array<{ error: string; count: number }>;
    performanceGrades: Record<string, number>;
  } {
    const filteredMetrics = timeRange
      ? this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
      : this.metrics;

    const filteredUXMetrics = timeRange
      ? this.uxMetrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
      : this.uxMetrics;

    const responseTimes = filteredMetrics
      .filter(m => m.type === 'response_time' || m.type === 'api_call')
      .map(m => m.value);

    const errors = filteredMetrics.filter(m => m.type === 'error');
    const errorCounts = errors.reduce((acc, error) => {
      const errorType = error.metadata?.errorName || 'Unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pageLoads = filteredUXMetrics.filter(m => m.event === 'page_load');
    const performanceGrades = pageLoads.reduce((acc, load) => {
      const grade = load.metadata?.performanceGrade || 'unknown';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMetrics: filteredMetrics.length,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      errorRate: filteredMetrics.length > 0 
        ? (errors.length / filteredMetrics.length) * 100 
        : 0,
      topErrors: Object.entries(errorCounts)
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      performanceGrades
    };
  }

  // Export metrics for analysis
  exportMetrics(): {
    performance: PerformanceMetric[];
    userExperience: UserExperienceMetric[];
    summary: ReturnType<typeof this.getMetricsSummary>;
  } {
    return {
      performance: [...this.metrics],
      userExperience: [...this.uxMetrics],
      summary: this.getMetricsSummary()
    };
  }

  // Clear old metrics to prevent memory issues
  private trimMetricsIfNeeded(): void {
    const maxMetrics = 1000;
    if (this.metrics.length > maxMetrics) {
      this.metrics = this.metrics.slice(-maxMetrics);
    }
  }

  private trimUXMetricsIfNeeded(): void {
    const maxMetrics = 1000;
    if (this.uxMetrics.length > maxMetrics) {
      this.uxMetrics = this.uxMetrics.slice(-maxMetrics);
    }
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup observers
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMetrics = new PerformanceMetricsCollector();

// React hook for easy integration
export const usePerformanceMetrics = () => {
  return {
    trackAPICall: performanceMetrics.trackAPICall.bind(performanceMetrics),
    trackUserInteraction: performanceMetrics.trackUserInteraction.bind(performanceMetrics),
    trackPageLoad: performanceMetrics.trackPageLoad.bind(performanceMetrics),
    trackError: performanceMetrics.trackError.bind(performanceMetrics),
    getMetricsSummary: performanceMetrics.getMetricsSummary.bind(performanceMetrics),
    exportMetrics: performanceMetrics.exportMetrics.bind(performanceMetrics),
    setUserId: performanceMetrics.setUserId.bind(performanceMetrics)
  };
};