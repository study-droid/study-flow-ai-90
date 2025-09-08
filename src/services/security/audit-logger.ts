/**
 * Security Audit Logger
 * Comprehensive audit logging for security events and compliance
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

export interface SecurityEvent {
  type: SecurityEventType;
  action: string;
  context?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
}

export type SecurityEventType = 
  | 'authentication'
  | 'authorization'
  | 'input_validation'
  | 'content_sanitization'
  | 'api_key_management'
  | 'data_access'
  | 'file_upload'
  | 'url_validation'
  | 'rate_limiting'
  | 'encryption'
  | 'vault_access'
  | 'session_management'
  | 'error_handling'
  | 'suspicious_activity';

export interface AuditLogEntry {
  id?: string;
  event_type: SecurityEventType;
  action: string;
  context?: string;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  created_at?: string;
}

export interface AuditQuery {
  eventType?: SecurityEventType;
  userId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private logQueue: SecurityEvent[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  constructor() {
    // Start periodic flush
    setInterval(() => {
      this.flushLogs();
    }, this.FLUSH_INTERVAL);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushLogs();
      });
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Enrich event with additional context
      const enrichedEvent: SecurityEvent = {
        ...event,
        timestamp: event.timestamp || new Date(),
        severity: event.severity || this.determineSeverity(event),
        userId: event.userId || await this.getCurrentUserId(),
        sessionId: event.sessionId || this.getSessionId(),
        ipAddress: event.ipAddress || await this.getClientIP(),
        userAgent: event.userAgent || this.getUserAgent()
      };

      // Add to queue for batch processing
      this.logQueue.push(enrichedEvent);

      // Log to console for development
      if (import.meta.env.DEV) {
        logger.info(`Security Event: ${event.type}/${event.action}`, 'AuditLogger', {
          context: event.context,
          severity: enrichedEvent.severity,
          metadata: event.metadata
        });
      }

      // Flush immediately for critical events
      if (enrichedEvent.severity === 'critical') {
        await this.flushLogs();
      }

      // Flush if queue is full
      if (this.logQueue.length >= this.BATCH_SIZE) {
        await this.flushLogs();
      }

    } catch (error) {
      logger.error('Failed to log security event', 'AuditLogger', error);
    }
  }

  /**
   * Flush queued logs to database
   */
  private async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToProcess = [...this.logQueue];
    this.logQueue = [];

    try {
      // Convert to database format
      const auditEntries: Omit<AuditLogEntry, 'id' | 'created_at'>[] = logsToProcess.map(event => ({
        event_type: event.type,
        action: event.action,
        context: event.context,
        user_id: event.userId,
        session_id: event.sessionId,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        metadata: event.metadata ? this.sanitizeMetadata(event.metadata) : null,
        severity: event.severity!,
        timestamp: event.timestamp!.toISOString()
      }));

      // Insert into database
      const { error } = await supabase
        .from('security_audit_logs')
        .insert(auditEntries);

      if (error) {
        throw error;
      }

      // Log successful batch
      logger.debug(`Flushed ${auditEntries.length} audit logs`, 'AuditLogger');

    } catch (error) {
      logger.error('Failed to flush audit logs', 'AuditLogger', error);
      
      // Re-queue failed logs (with limit to prevent infinite growth)
      if (this.logQueue.length < 100) {
        this.logQueue.unshift(...logsToProcess);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditQuery = {}): Promise<AuditLogEntry[]> {
    try {
      let dbQuery = supabase
        .from('security_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (query.eventType) {
        dbQuery = dbQuery.eq('event_type', query.eventType);
      }

      if (query.userId) {
        dbQuery = dbQuery.eq('user_id', query.userId);
      }

      if (query.severity) {
        dbQuery = dbQuery.eq('severity', query.severity);
      }

      if (query.startDate) {
        dbQuery = dbQuery.gte('timestamp', query.startDate.toISOString());
      }

      if (query.endDate) {
        dbQuery = dbQuery.lte('timestamp', query.endDate.toISOString());
      }

      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }

      const { data, error } = await dbQuery;

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      logger.error('Failed to query audit logs', 'AuditLogger', error);
      return [];
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const now = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case 'hour':
          startDate.setHours(now.getHours() - 1);
          break;
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('event_type, severity, action')
        .gte('timestamp', startDate.toISOString());

      if (error) {
        throw error;
      }

      // Aggregate metrics
      const metrics = {
        totalEvents: data?.length || 0,
        eventsByType: {} as Record<string, number>,
        eventsBySeverity: {} as Record<string, number>,
        criticalEvents: 0,
        suspiciousActivity: 0
      };

      data?.forEach(log => {
        // Count by type
        metrics.eventsByType[log.event_type] = (metrics.eventsByType[log.event_type] || 0) + 1;
        
        // Count by severity
        metrics.eventsBySeverity[log.severity] = (metrics.eventsBySeverity[log.severity] || 0) + 1;
        
        // Count critical events
        if (log.severity === 'critical') {
          metrics.criticalEvents++;
        }
        
        // Count suspicious activity
        if (log.event_type === 'suspicious_activity') {
          metrics.suspiciousActivity++;
        }
      });

      return metrics;

    } catch (error) {
      logger.error('Failed to get security metrics', 'AuditLogger', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        criticalEvents: 0,
        suspiciousActivity: 0
      };
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(action: string, success: boolean, metadata?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      type: 'authentication',
      action,
      severity: success ? 'low' : 'medium',
      metadata: {
        success,
        ...metadata
      }
    });
  }

  /**
   * Log API key management events
   */
  async logApiKeyEvent(action: string, keyName: string, metadata?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      type: 'api_key_management',
      action,
      context: keyName,
      severity: 'medium',
      metadata: {
        keyName: this.redactSensitiveData(keyName),
        ...metadata
      }
    });
  }

  /**
   * Log vault access events
   */
  async logVaultEvent(action: string, resource: string, metadata?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      type: 'vault_access',
      action,
      context: resource,
      severity: 'high',
      metadata
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(description: string, metadata?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      type: 'suspicious_activity',
      action: 'detected',
      context: description,
      severity: 'critical',
      metadata
    });
  }

  /**
   * Determine event severity based on type and action
   */
  private determineSeverity(event: SecurityEvent): 'low' | 'medium' | 'high' | 'critical' {
    // Critical events
    if (event.type === 'suspicious_activity' || 
        event.action.includes('breach') || 
        event.action.includes('attack')) {
      return 'critical';
    }

    // High severity events
    if (event.type === 'vault_access' || 
        event.type === 'api_key_management' ||
        event.action.includes('failed') && event.type === 'authentication') {
      return 'high';
    }

    // Medium severity events
    if (event.type === 'authorization' || 
        event.type === 'input_validation' ||
        event.action.includes('blocked')) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    } catch {
      return undefined;
    }
  }

  /**
   * Get session ID
   */
  private getSessionId(): string | undefined {
    // Try to get from session storage or generate
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('audit_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('audit_session_id', sessionId);
      }
      return sessionId;
    }
    return undefined;
  }

  /**
   * Get client IP address (best effort)
   */
  private async getClientIP(): Promise<string | undefined> {
    // In a real application, this would be provided by the server
    // For client-side, we can't reliably get the real IP
    return undefined;
  }

  /**
   * Get user agent
   */
  private getUserAgent(): string | undefined {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent;
    }
    return undefined;
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    
    // Remove or redact sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'apiKey', 'api_key'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = this.redactSensitiveData(sanitized[field]);
      }
    }

    return sanitized;
  }

  /**
   * Redact sensitive data for logging
   */
  private redactSensitiveData(data: string): string {
    if (typeof data !== 'string' || data.length < 8) {
      return '[REDACTED]';
    }
    
    // Show first 4 and last 4 characters
    return `${data.substring(0, 4)}****${data.substring(data.length - 4)}`;
  }

  /**
   * Export audit logs for compliance
   */
  async exportLogs(query: AuditQuery = {}): Promise<string> {
    try {
      const logs = await this.queryLogs({ ...query, limit: 10000 });
      
      // Convert to CSV format
      const headers = [
        'Timestamp', 'Event Type', 'Action', 'Context', 'User ID', 
        'Severity', 'IP Address', 'User Agent', 'Metadata'
      ];
      
      const csvRows = [
        headers.join(','),
        ...logs.map(log => [
          log.timestamp,
          log.event_type,
          log.action,
          log.context || '',
          log.user_id || '',
          log.severity,
          log.ip_address || '',
          log.user_agent || '',
          JSON.stringify(log.metadata || {})
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ];

      return csvRows.join('\n');

    } catch (error) {
      logger.error('Failed to export audit logs', 'AuditLogger', error);
      throw error;
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();