import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'api_error' | 'csrf_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

interface SecurityMetrics {
  failedLogins: number;
  rateLimitHits: number;
  suspiciousActivities: number;
  apiErrors: number;
  csrfViolations: number;
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private metrics: SecurityMetrics = {
    failedLogins: 0,
    rateLimitHits: 0,
    suspiciousActivities: 0,
    apiErrors: 0,
    csrfViolations: 0
  };
  private alertThresholds = {
    failedLogins: 5,
    rateLimitHits: 10,
    suspiciousActivities: 3,
    apiErrors: 20,
    csrfViolations: 1
  };

  private constructor() {
    this.initializeMonitoring();
  }

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  private initializeMonitoring() {
    // Monitor authentication failures
    this.monitorAuthFailures();
    
    // Monitor rate limiting
    this.monitorRateLimits();
    
    // Monitor API errors
    this.monitorAPIErrors();
    
    // Setup periodic reporting
    this.setupPeriodicReporting();
  }

  private monitorAuthFailures() {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN_FAILED') {
        this.logSecurityEvent({
          type: 'auth_failure',
          severity: 'medium',
          userId: session?.user?.id,
          details: { event },
          timestamp: new Date()
        });
      }
    });
  }

  private monitorRateLimits() {
    // Monitor rate limit headers in responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining && parseInt(remaining) === 0) {
        this.logSecurityEvent({
          type: 'rate_limit',
          severity: 'low',
          details: {
            endpoint: args[0],
            remaining,
            limit: response.headers.get('X-RateLimit-Limit')
          },
          timestamp: new Date()
        });
      }
      
      return response;
    };
  }

  private monitorAPIErrors() {
    // Monitor API errors
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('API') || 
          event.reason?.message?.includes('401') ||
          event.reason?.message?.includes('403')) {
        this.logSecurityEvent({
          type: 'api_error',
          severity: 'medium',
          details: {
            error: event.reason?.message,
            stack: event.reason?.stack
          },
          timestamp: new Date()
        });
      }
    });
  }

  public logSecurityEvent(event: SecurityEvent) {
    // Add to events array
    this.events.push(event);
    
    // Update metrics
    switch (event.type) {
      case 'auth_failure':
        this.metrics.failedLogins++;
        break;
      case 'rate_limit':
        this.metrics.rateLimitHits++;
        break;
      case 'suspicious_activity':
        this.metrics.suspiciousActivities++;
        break;
      case 'api_error':
        this.metrics.apiErrors++;
        break;
      case 'csrf_violation':
        this.metrics.csrfViolations++;
        break;
    }
    
    // Check thresholds and alert if necessary
    this.checkThresholds(event);
    
    // Log to console in development
    if (import.meta.env.DEV) {
      logger.warn('[Security Event]', 'SecurityMonitor', event);
    }
    
    // Send to backend for persistent storage
    this.sendToBackend(event);
  }

  private checkThresholds(event: SecurityEvent) {
    const metricKey = this.getMetricKey(event.type);
    const currentValue = this.metrics[metricKey as keyof SecurityMetrics];
    const threshold = this.alertThresholds[metricKey as keyof SecurityMetrics];
    
    if (currentValue >= threshold) {
      this.triggerAlert(event.type, currentValue, threshold);
    }
  }

  private getMetricKey(eventType: SecurityEvent['type']): string {
    const mapping: Record<SecurityEvent['type'], keyof SecurityMetrics> = {
      'auth_failure': 'failedLogins',
      'rate_limit': 'rateLimitHits',
      'suspicious_activity': 'suspiciousActivities',
      'api_error': 'apiErrors',
      'csrf_violation': 'csrfViolations'
    };
    return mapping[eventType];
  }

  private triggerAlert(type: SecurityEvent['type'], current: number, threshold: number) {
    // In production, this would send to a monitoring service
    logger.error(`[SECURITY ALERT] ${type} threshold exceeded: ${current}/${threshold}`, 'SecurityMonitor');
    
    // Send alert to backend
    this.sendAlert({
      type,
      current,
      threshold,
      timestamp: new Date()
    });
  }

  private async sendToBackend(event: SecurityEvent) {
    try {
      // Send to Supabase Edge Function for logging
      await fetch('/api/security-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      logger.error('Failed to send security event to backend:', 'SecurityMonitor', error);
    }
  }

  private async sendAlert(alert: { type: string; current: number; threshold: number; timestamp: Date }) {
    try {
      // Send alert to backend
      await fetch('/api/security-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      logger.error('Failed to send security alert:', 'SecurityMonitor', error);
    }
  }

  private setupPeriodicReporting() {
    // Send metrics report every hour
    setInterval(() => {
      this.sendMetricsReport();
    }, 60 * 60 * 1000); // 1 hour
  }

  private async sendMetricsReport() {
    const report = {
      metrics: this.metrics,
      eventCount: this.events.length,
      timestamp: new Date(),
      topEvents: this.getTopEvents()
    };
    
    try {
      await fetch('/api/security-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
      
      // Reset metrics after successful send
      this.resetMetrics();
    } catch (error) {
      logger.error('Failed to send metrics report:', 'SecurityMonitor', error);
    }
  }

  private getTopEvents(): SecurityEvent[] {
    // Get top 10 most recent high/critical events
    return this.events
      .filter(e => e.severity === 'high' || e.severity === 'critical')
      .slice(-10);
  }

  private resetMetrics() {
    this.metrics = {
      failedLogins: 0,
      rateLimitHits: 0,
      suspiciousActivities: 0,
      apiErrors: 0,
      csrfViolations: 0
    };
    
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  // Public methods for manual logging
  public logFailedLogin(userId?: string, ip?: string) {
    this.logSecurityEvent({
      type: 'auth_failure',
      severity: 'medium',
      userId,
      ip,
      details: { reason: 'Invalid credentials' },
      timestamp: new Date()
    });
  }

  public logSuspiciousActivity(details: Record<string, unknown>) {
    this.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'high',
      details,
      timestamp: new Date()
    });
  }

  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  public getRecentEvents(count: number = 10): SecurityEvent[] {
    return this.events.slice(-count);
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();