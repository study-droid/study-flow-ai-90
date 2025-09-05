/**
 * Error Monitoring and Reporting Service
 * 
 * Comprehensive error monitoring, logging, and reporting system that integrates
 * with error boundaries, API interceptors, and external monitoring services.
 */

import { AppError } from '@/shared/utils/error';
import { logger } from '@/services/logging/logger';
import { productionMonitor } from '@/services/monitoring/production-monitor';

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: ErrorCategory;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    statusCode?: number;
  };
  context: {
    source: ErrorSource;
    feature?: string;
    userId?: string;
    sessionId?: string;
    url: string;
    userAgent: string;
    viewport: string;
  };
  metadata: {
    retryCount?: number;
    componentStack?: string;
    networkInfo?: any;
    performanceMetrics?: any;
    breadcrumbs?: ErrorBreadcrumb[];
  };
  impact: {
    userFacing: boolean;
    serviceAffected?: string;
    criticalPath: boolean;
    recoverable: boolean;
  };
}

export interface ErrorBreadcrumb {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  data?: any;
}

export type ErrorCategory = 
  | 'network'
  | 'authentication'
  | 'permission'
  | 'validation' 
  | 'rendering'
  | 'api'
  | 'database'
  | 'timeout'
  | 'ratelimit'
  | 'unknown';

export type ErrorSource = 
  | 'react-component'
  | 'api-call'
  | 'async-operation'
  | 'user-interaction'
  | 'background-task'
  | 'external-service'
  | 'browser-compatibility';

export interface MonitoringConfig {
  enableExternalReporting: boolean;
  enableLocalStorage: boolean;
  enableConsoleLogging: boolean;
  maxBreadcrumbs: number;
  maxLocalErrors: number;
  sampleRate: number; // 0-1, for performance sampling
  criticalErrorsOnly: boolean;
}

export interface ErrorPattern {
  signature: string;
  count: number;
  lastOccurrence: string;
  firstOccurrence: string;
  affectedUsers: Set<string>;
  frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
  trend: 'increasing' | 'stable' | 'decreasing';
}

class ErrorMonitoringService {
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private errorPatterns = new Map<string, ErrorPattern>();
  private reportQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;
  private sessionId: string;
  private userId?: string;
  
  private readonly config: MonitoringConfig = {
    enableExternalReporting: !import.meta.env.DEV,
    enableLocalStorage: true,
    enableConsoleLogging: true,
    maxBreadcrumbs: 50,
    maxLocalErrors: 100,
    sampleRate: 1.0,
    criticalErrorsOnly: false
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
    this.setupNetworkMonitoring();
    this.loadPersistedData();
  }

  /**
   * Initialize error monitoring system
   */
  private initializeMonitoring(): void {
    // Set up performance observer for Core Web Vitals
    if ('PerformanceObserver' in window) {
      this.setupPerformanceMonitoring();
    }

    // Set up user interaction tracking
    this.setupUserInteractionTracking();

    // Set up automatic error reporting
    this.setupAutomaticReporting();

    logger.info('Error monitoring service initialized', 'ErrorMonitoring', {
      sessionId: this.sessionId,
      config: this.config
    });
  }

  /**
   * Report an error with comprehensive context
   */
  public async reportError(
    error: Error | AppError,
    source: ErrorSource,
    additionalContext?: Partial<ErrorReport>
  ): Promise<string> {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level: this.determineErrorLevel(error, source),
      category: this.categorizeError(error),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error instanceof AppError ? error.code : undefined,
        statusCode: error instanceof AppError ? error.statusCode : undefined
      },
      context: {
        source,
        feature: additionalContext?.context?.feature,
        userId: this.userId || additionalContext?.context?.userId,
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      },
      metadata: {
        retryCount: additionalContext?.metadata?.retryCount,
        componentStack: additionalContext?.metadata?.componentStack,
        networkInfo: this.getNetworkInfo(),
        performanceMetrics: await this.getPerformanceMetrics(),
        breadcrumbs: [...this.breadcrumbs].slice(-10) // Last 10 breadcrumbs
      },
      impact: {
        userFacing: this.isUserFacingError(source),
        serviceAffected: this.getAffectedService(error, source),
        criticalPath: this.isCriticalPath(source, additionalContext?.context?.feature),
        recoverable: this.isRecoverableError(error, source),
        ...additionalContext?.impact
      }
    };

    // Track error patterns
    this.trackErrorPattern(errorReport);

    // Add to report queue
    this.reportQueue.push(errorReport);

    // Process report immediately for critical errors
    if (errorReport.level === 'critical' || errorReport.level === 'high') {
      await this.processErrorReport(errorReport);
    } else {
      // Batch process for non-critical errors
      this.scheduleQueueProcessing();
    }

    // Log locally
    if (this.config.enableConsoleLogging) {
      logger.error(`Error reported: ${errorReport.category}`, 'ErrorMonitoring', {
        id: errorReport.id,
        level: errorReport.level,
        source,
        message: error.message
      });
    }

    // Persist to local storage
    if (this.config.enableLocalStorage) {
      this.persistErrorReport(errorReport);
    }

    return errorReport.id;
  }

  /**
   * Add breadcrumb for error context tracking
   */
  public addBreadcrumb(message: string, level: 'info' | 'warn' | 'error' = 'info', data?: any): void {
    const breadcrumb: ErrorBreadcrumb = {
      timestamp: new Date().toISOString(),
      message,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Set current user ID for error tracking
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    this.addBreadcrumb(`User authenticated: ${userId}`, 'info');
  }

  /**
   * Clear user context (on logout)
   */
  public clearUser(): void {
    this.userId = undefined;
    this.addBreadcrumb('User signed out', 'info');
  }

  /**
   * Get error statistics and patterns
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsByLevel: Record<string, number>;
    topErrorPatterns: ErrorPattern[];
    sessionErrors: number;
    criticalErrors: number;
  } {
    const totalErrors = this.reportQueue.length;
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsByLevel = {} as Record<string, number>;
    const sessionErrors = this.reportQueue.filter(r => r.context.sessionId === this.sessionId).length;
    const criticalErrors = this.reportQueue.filter(r => r.level === 'critical').length;

    // Count by category and level
    for (const report of this.reportQueue) {
      errorsByCategory[report.category] = (errorsByCategory[report.category] || 0) + 1;
      errorsByLevel[report.level] = (errorsByLevel[report.level] || 0) + 1;
    }

    // Get top error patterns
    const topErrorPatterns = Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByCategory,
      errorsByLevel,
      topErrorPatterns,
      sessionErrors,
      criticalErrors
    };
  }

  /**
   * Process error report (send to external services)
   */
  private async processErrorReport(report: ErrorReport): Promise<void> {
    if (!this.config.enableExternalReporting) {
      return;
    }

    // Skip processing if sampling rate doesn't match
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    // Skip non-critical errors if configured
    if (this.config.criticalErrorsOnly && report.level !== 'critical' && report.level !== 'high') {
      return;
    }

    try {
      // Send to multiple monitoring services
      await Promise.allSettled([
        this.sendToInternalAPI(report),
        this.sendToExternalMonitoring(report),
        this.updateHealthMetrics(report)
      ]);

      logger.info(`Error report processed: ${report.id}`, 'ErrorMonitoring');
    } catch (processingError) {
      logger.error('Failed to process error report', 'ErrorMonitoring', {
        reportId: report.id,
        processingError: processingError instanceof Error ? processingError.message : 'Unknown error'
      });
    }
  }

  /**
   * Send error to internal API for storage and analysis
   */
  private async sendToInternalAPI(report: ErrorReport): Promise<void> {
    if (!this.isOnline) {
      return; // Will retry when online
    }

    try {
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        throw new Error(`Failed to send error report: ${response.status}`);
      }

      logger.info(`Error report sent to internal API: ${report.id}`, 'ErrorMonitoring');
    } catch (apiError) {
      // Store for retry when online
      this.storeForRetry(report);
      logger.warn('Failed to send error to internal API', 'ErrorMonitoring', apiError);
    }
  }

  /**
   * Send to external monitoring services (Sentry, LogRocket, etc.)
   */
  private async sendToExternalMonitoring(report: ErrorReport): Promise<void> {
    // In a real implementation, you would integrate with:
    
    // Sentry
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(report.error.message), {
    //     tags: {
    //       category: report.category,
    //       source: report.context.source,
    //       level: report.level
    //     },
    //     extra: report
    //   });
    // }

    // LogRocket
    // if (window.LogRocket) {
    //   window.LogRocket.captureException(new Error(report.error.message));
    // }

    // Bugsnag
    // if (window.Bugsnag) {
    //   window.Bugsnag.notify(new Error(report.error.message), {
    //     context: report.context.feature,
    //     metaData: report.metadata
    //   });
    // }

    // For now, just log that external monitoring would be called
    logger.info(`External monitoring called for error: ${report.id}`, 'ErrorMonitoring', {
      category: report.category,
      level: report.level
    });
  }

  /**
   * Update health metrics based on error patterns
   */
  private async updateHealthMetrics(report: ErrorReport): Promise<void> {
    try {
      // Notify production monitor of error
      const healthCheck = await productionMonitor.getCurrentHealth();
      
      if (report.impact.serviceAffected && healthCheck) {
        logger.warn(`Service health impacted by error: ${report.impact.serviceAffected}`, 'ErrorMonitoring', {
          errorId: report.id,
          service: report.impact.serviceAffected
        });
      }
    } catch (metricsError) {
      logger.warn('Failed to update health metrics', 'ErrorMonitoring', metricsError);
    }
  }

  /**
   * Categorize error based on type and context
   */
  private categorizeError(error: Error | AppError): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (error instanceof AppError) {
      if (error.code.includes('NETWORK') || error.code.includes('TIMEOUT')) return 'network';
      if (error.code.includes('AUTH')) return 'authentication';
      if (error.code.includes('PERMISSION')) return 'permission';
      if (error.code.includes('VALIDATION')) return 'validation';
      if (error.code.includes('RATE_LIMIT')) return 'ratelimit';
    }

    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('auth') || message.includes('unauthorized')) return 'authentication';
    if (message.includes('permission') || message.includes('forbidden')) return 'permission';
    if (name.includes('validation') || message.includes('invalid')) return 'validation';
    if (message.includes('render') || name.includes('render')) return 'rendering';
    if (message.includes('database') || message.includes('sql')) return 'database';

    return 'unknown';
  }

  /**
   * Determine error severity level
   */
  private determineErrorLevel(error: Error | AppError, source: ErrorSource): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors - app-breaking
    if (source === 'react-component' && error.message.includes('memory')) return 'critical';
    if (error instanceof AppError && error.statusCode >= 500) return 'critical';
    
    // High errors - major feature breaking
    if (source === 'api-call' && error instanceof AppError && error.statusCode >= 400) return 'high';
    if (error.name === 'ChunkLoadError') return 'high';
    
    // Medium errors - minor feature issues
    if (source === 'user-interaction') return 'medium';
    if (error instanceof AppError && error.statusCode < 500) return 'medium';
    
    // Low errors - non-critical issues
    return 'low';
  }

  /**
   * Track error patterns and frequency
   */
  private trackErrorPattern(report: ErrorReport): void {
    const signature = `${report.category}_${report.error.name}_${report.context.source}`;
    
    if (this.errorPatterns.has(signature)) {
      const pattern = this.errorPatterns.get(signature)!;
      pattern.count++;
      pattern.lastOccurrence = report.timestamp;
      if (report.context.userId) {
        pattern.affectedUsers.add(report.context.userId);
      }
    } else {
      this.errorPatterns.set(signature, {
        signature,
        count: 1,
        firstOccurrence: report.timestamp,
        lastOccurrence: report.timestamp,
        affectedUsers: new Set(report.context.userId ? [report.context.userId] : []),
        frequency: 'rare',
        trend: 'stable'
      });
    }
  }

  /**
   * Helper methods for error classification
   */
  private isUserFacingError(source: ErrorSource): boolean {
    return ['react-component', 'user-interaction', 'api-call'].includes(source);
  }

  private getAffectedService(error: Error | AppError, source: ErrorSource): string | undefined {
    if (error instanceof AppError && error.context?.url) {
      const url = error.context.url as string;
      if (url.includes('deepseek')) return 'AI Service';
      if (url.includes('supabase')) return 'Database';
      if (url.includes('functions')) return 'Edge Functions';
    }
    
    if (source === 'api-call') return 'API';
    if (source === 'database') return 'Database';
    
    return undefined;
  }

  private isCriticalPath(source: ErrorSource, feature?: string): boolean {
    const criticalFeatures = ['auth', 'ai-tutor', 'dashboard'];
    return source === 'react-component' || 
           (feature && criticalFeatures.includes(feature));
  }

  private isRecoverableError(error: Error | AppError, source: ErrorSource): boolean {
    if (error instanceof AppError) {
      return error.isOperational && error.statusCode < 500;
    }
    return source !== 'react-component';
  }

  // Additional helper methods...
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNetworkInfo(): any {
    return {
      online: navigator.onLine,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null
    };
  }

  private async getPerformanceMetrics(): Promise<any> {
    if (!('performance' in window)) return null;

    return {
      navigation: performance.timing,
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null
    };
  }

  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.addBreadcrumb('Network connection restored', 'info');
      this.retryQueuedReports();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.addBreadcrumb('Network connection lost', 'warn');
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor Core Web Vitals and performance issues
    // Implementation would go here
  }

  private setupUserInteractionTracking(): void {
    // Track user interactions that lead to errors
    // Implementation would go here
  }

  private setupAutomaticReporting(): void {
    // Process error queue periodically
    setInterval(() => {
      if (this.reportQueue.length > 0) {
        this.scheduleQueueProcessing();
      }
    }, 30000); // Every 30 seconds
  }

  private scheduleQueueProcessing(): void {
    // Batch process queued reports
    // Implementation would go here
  }

  private persistErrorReport(report: ErrorReport): void {
    // Save to localStorage for offline persistence
    // Implementation would go here
  }

  private loadPersistedData(): void {
    // Load error data from localStorage on initialization
    // Implementation would go here
  }

  private storeForRetry(report: ErrorReport): void {
    // Store failed reports for retry when online
    // Implementation would go here
  }

  private retryQueuedReports(): void {
    // Retry sending failed reports when back online
    // Implementation would go here
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService();

// Export convenience functions
export const reportError = (error: Error | AppError, source: ErrorSource, context?: any) => 
  errorMonitoring.reportError(error, source, context);

export const addBreadcrumb = (message: string, level?: 'info' | 'warn' | 'error', data?: any) =>
  errorMonitoring.addBreadcrumb(message, level, data);

export const setUserId = (userId: string) => errorMonitoring.setUserId(userId);

export const clearUser = () => errorMonitoring.clearUser();

export default errorMonitoring;