/**
 * Production-ready logging service
 * Provides structured logging with different log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private isDevelopment = import.meta.env.MODE === 'development';
  private logLevel: LogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level];
    return `[${entry.timestamp}] [${levelStr}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}`;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
    };

    // Capture stack trace for errors
    if (level >= LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    // Store log entry
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console in development
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(entry);
      
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(formattedMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(formattedMessage, data || '');
          if (entry.stack) {
            console.error('Stack trace:', entry.stack);
          }
          break;
      }
    }

    // In production, send critical errors to monitoring service
    if (!this.isDevelopment && level >= LogLevel.ERROR) {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      // Send to your monitoring service (e.g., Sentry, LogRocket, etc.)
      // This is a placeholder for actual implementation
      if (window.navigator.sendBeacon) {
        const data = JSON.stringify({
          ...entry,
          userAgent: navigator.userAgent,
          url: window.location.href,
        });
        
        // Replace with your actual monitoring endpoint
        // window.navigator.sendBeacon('/api/logs', data);
      }
    } catch (error) {
      // Fail silently to prevent logging loops
    }
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  critical(message: string, context?: string, data?: any): void {
    this.log(LogLevel.CRITICAL, message, context, data);
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level === undefined) {
      return [...this.logs];
    }
    return this.logs.filter(log => log.level >= level);
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (message: string, context?: string, data?: any) => 
  logger.debug(message, context, data);

export const logInfo = (message: string, context?: string, data?: any) => 
  logger.info(message, context, data);

export const logWarn = (message: string, context?: string, data?: any) => 
  logger.warn(message, context, data);

export const logError = (message: string, context?: string, data?: any) => 
  logger.error(message, context, data);

export const logCritical = (message: string, context?: string, data?: any) => 
  logger.critical(message, context, data);