/**
 * Secure Logging Utility for Production
 * Replaces console.log statements with secure, structured logging
 */

interface LogContext {
  userId?: string;
  action?: string;
  component?: string;
  timestamp?: string;
  security?: boolean;
  [key: string]: any; // Allow additional properties
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context
    };
    
    return JSON.stringify(logData);
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'session',
      'credential', 'private', 'confidential'
    ];

    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Public method to sanitize external data
  public sanitize(data: any): any {
    return this.sanitizeData(data);
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : undefined
    };
    
    console.error(this.formatMessage('error', message, errorContext));
  }

  // Security-focused logging for audit trails
  security(event: string, context: LogContext): void {
    const securityLog = this.formatMessage('info', `SECURITY: ${event}`, {
      ...context,
      security: true
    });
    
    console.warn(securityLog);
  }
}

export const logger = new SecureLogger();