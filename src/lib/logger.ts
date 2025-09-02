/**
 * Production-safe logging utility
 * Only logs in development mode unless explicitly configured
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  isDevelopment: boolean;
}

class Logger {
  private config: LoggerConfig;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.config = {
      enabled: import.meta.env.DEV || import.meta.env.VITE_LOG_LEVEL !== 'none',
      level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'error',
      isDevelopment: import.meta.env.DEV,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.levels[level] >= this.levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), data || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data || '');
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error || '');
      
      // In production, you might want to send errors to a monitoring service
      if (!this.config.isDevelopment && error) {
        this.reportToMonitoring(message, error);
      }
    }
  }

  private reportToMonitoring(message: string, error: any): void {
    // Placeholder for error reporting service integration
    // e.g., Sentry, LogRocket, etc.
    // This prevents errors from being lost in production
  }

  // Group related logs
  group(label: string): void {
    if (this.config.enabled && this.config.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.config.enabled && this.config.isDevelopment) {
      console.groupEnd();
    }
  }

  // Performance timing
  time(label: string): void {
    if (this.config.enabled && this.config.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enabled && this.config.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Table display for structured data
  table(data: any): void {
    if (this.config.enabled && this.config.isDevelopment) {
      console.table(data);
    }
  }
}

export const logger = new Logger();
export default logger;