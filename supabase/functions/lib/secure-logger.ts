/**
 * Secure Logger for Edge Functions
 * Prevents sensitive data from being logged in production
 */

interface LogContext {
  [key: string]: any;
}

export class SecureLogger {
  private static readonly SENSITIVE_PATTERNS = [
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,  // Authorization tokens
    /sk-[A-Za-z0-9]{48}/gi,                // OpenAI API keys
    /AIza[A-Za-z0-9\-_]{35}/gi,            // Google API keys
    /supabase_[A-Za-z0-9\-_]+/gi,          // Supabase keys
    /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, // JWT tokens
    /password["\s]*[:=]["\s]*["'][^"']+["']/gi,  // Passwords in JSON
    /api[_-]?key["\s]*[:=]["\s]*["'][^"']+["']/gi, // API keys in JSON
    /secret["\s]*[:=]["\s]*["'][^"']+["']/gi,     // Secrets in JSON
  ];

  private static readonly SENSITIVE_KEYS = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'auth',
    'private_key',
    'privateKey',
    'access_token',
    'accessToken',
    'refresh_token',
    'refreshToken',
    'client_secret',
    'clientSecret',
    'service_role_key',
    'serviceRoleKey',
    'anon_key',
    'anonKey'
  ];

  private static isProduction(): boolean {
    return Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined || 
           Deno.env.get('ENVIRONMENT') === 'production';
  }

  private static redactSensitiveData(data: any): any {
    if (typeof data === 'string') {
      let redacted = data;
      // Redact sensitive patterns
      for (const pattern of this.SENSITIVE_PATTERNS) {
        redacted = redacted.replace(pattern, '[REDACTED]');
      }
      return redacted;
    }

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map(item => this.redactSensitiveData(item));
      }

      const redacted: LogContext = {};
      for (const [key, value] of Object.entries(data)) {
        // Check if key is sensitive
        const isSensitiveKey = this.SENSITIVE_KEYS.some(
          sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase())
        );

        if (isSensitiveKey) {
          redacted[key] = '[REDACTED]';
        } else if (key === 'stack' && this.isProduction()) {
          // Never log stack traces in production
          redacted[key] = '[STACK_TRACE_HIDDEN]';
        } else {
          redacted[key] = this.redactSensitiveData(value);
        }
      }
      return redacted;
    }

    return data;
  }

  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const env = this.isProduction() ? 'PROD' : 'DEV';
    
    let formattedMessage = `[${timestamp}] [${env}] [${level}] ${message}`;
    
    if (context) {
      const redactedContext = this.redactSensitiveData(context);
      formattedMessage += ` ${JSON.stringify(redactedContext)}`;
    }
    
    return formattedMessage;
  }

  static debug(message: string, context?: LogContext): void {
    // Only log debug messages in development
    if (!this.isProduction()) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  static info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('INFO', message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  static error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext: LogContext = { ...context };
    
    if (error) {
      if (error instanceof Error) {
        errorContext.error = {
          name: error.name,
          message: error.message
        };
        
        // Only include stack trace in development
        if (!this.isProduction()) {
          errorContext.error.stack = error.stack;
        }
      } else {
        errorContext.error = error;
      }
    }
    
    console.error(this.formatMessage('ERROR', message, errorContext));
  }

  static fatal(message: string, error?: Error | any, context?: LogContext): void {
    this.error(`FATAL: ${message}`, error, context);
  }

  /**
   * Log API requests with sensitive data redacted
   */
  static logRequest(method: string, path: string, headers?: Headers, body?: any): void {
    const context: LogContext = {
      method,
      path,
      timestamp: new Date().toISOString()
    };

    if (headers && !this.isProduction()) {
      const headerObj: LogContext = {};
      headers.forEach((value, key) => {
        // Redact authorization headers
        if (key.toLowerCase() === 'authorization') {
          headerObj[key] = '[REDACTED]';
        } else {
          headerObj[key] = value;
        }
      });
      context.headers = headerObj;
    }

    if (body) {
      context.body = this.redactSensitiveData(body);
    }

    this.info('API Request', context);
  }

  /**
   * Log API responses with sensitive data redacted
   */
  static logResponse(status: number, body?: any, duration?: number): void {
    const context: LogContext = {
      status,
      duration: duration ? `${duration}ms` : undefined
    };

    if (body && !this.isProduction()) {
      context.body = this.redactSensitiveData(body);
    }

    const level = status >= 400 ? 'warn' : 'info';
    const method = status >= 400 ? this.warn : this.info;
    
    method.call(this, 'API Response', context);
  }

  /**
   * Create a child logger with context
   */
  static child(context: LogContext): typeof SecureLogger {
    const childContext = this.redactSensitiveData(context);
    
    return {
      ...this,
      debug: (message: string, ctx?: LogContext) => 
        this.debug(message, { ...childContext, ...ctx }),
      info: (message: string, ctx?: LogContext) => 
        this.info(message, { ...childContext, ...ctx }),
      warn: (message: string, ctx?: LogContext) => 
        this.warn(message, { ...childContext, ...ctx }),
      error: (message: string, error?: Error | any, ctx?: LogContext) => 
        this.error(message, error, { ...childContext, ...ctx }),
      fatal: (message: string, error?: Error | any, ctx?: LogContext) => 
        this.fatal(message, error, { ...childContext, ...ctx }),
      logRequest: this.logRequest.bind(this),
      logResponse: this.logResponse.bind(this),
      child: (ctx: LogContext) => this.child({ ...childContext, ...ctx })
    };
  }
}

// Export default instance
export default SecureLogger;
