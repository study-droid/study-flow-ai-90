/**
 * Comprehensive Error Handling and Recovery Service
 * Implements error classification, user-friendly messages, and automatic recovery
 */

import { logger } from '@/services/logging/logger';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION', 
  API = 'API',
  APPLICATION = 'APPLICATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  actionableGuidance: string[];
  recoveryActions: RecoveryAction[];
  retryable: boolean;
  fallbackAvailable: boolean;
  originalError: Error;
  context?: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'reset' | 'redirect' | 'manual';
  description: string;
  action: () => Promise<void> | void;
  priority: number;
  automatic: boolean;
}

export interface ErrorRecoveryResult {
  success: boolean;
  action: string;
  message: string;
  fallbackUsed?: boolean;
}

export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private recoveryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;
  private retryDelayBase = 1000; // 1 second base delay

  public static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * Classify an error into category, severity, and recovery options
   */
  public classifyError(error: Error, context?: Record<string, any>): ClassifiedError {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // Check more specific errors first, then general ones
    
    // Circuit breaker errors (most specific)
    if (this.isCircuitBreakerError(errorMessage, errorStack)) {
      return this.createCircuitBreakerError(error, context);
    }

    // Rate limit errors (specific)
    if (this.isRateLimitError(errorMessage, errorStack)) {
      return this.createRateLimitError(error, context);
    }

    // Authentication errors (specific)
    if (this.isAuthenticationError(errorMessage, errorStack)) {
      return this.createAuthenticationError(error, context);
    }

    // Timeout errors (specific)
    if (this.isTimeoutError(errorMessage, errorStack)) {
      return this.createTimeoutError(error, context);
    }

    // Validation errors (specific)
    if (this.isValidationError(errorMessage, errorStack)) {
      return this.createValidationError(error, context);
    }

    // Application errors (specific)
    if (this.isApplicationError(errorMessage, errorStack)) {
      return this.createApplicationError(error, context);
    }

    // API errors (more general)
    if (this.isAPIError(errorMessage, errorStack)) {
      return this.createAPIError(error, context);
    }

    // Network errors (general - check last among specific types)
    if (this.isNetworkError(errorMessage, errorStack)) {
      return this.createNetworkError(error, context);
    }

    // Unknown errors (fallback)
    return this.createUnknownError(error, context);
  }

  /**
   * Attempt automatic error recovery
   */
  public async attemptRecovery(
    classifiedError: ClassifiedError,
    originalOperation: () => Promise<any>
  ): Promise<ErrorRecoveryResult> {
    const errorKey = this.getErrorKey(classifiedError);
    const attempts = this.recoveryAttempts.get(errorKey) || 0;

    logger.info('Attempting error recovery', 'ErrorHandler', {
      category: classifiedError.category,
      severity: classifiedError.severity,
      attempts,
      maxAttempts: this.maxRetryAttempts
    });

    // Sort recovery actions by priority and automatic flag
    const automaticActions = classifiedError.recoveryActions
      .filter(action => action.automatic)
      .sort((a, b) => a.priority - b.priority);

    for (const action of automaticActions) {
      try {
        logger.info(`Executing recovery action: ${action.type}`, 'ErrorHandler', {
          description: action.description,
          priority: action.priority
        });

        await action.action();

        // If it's a retry action, attempt the original operation
        if (action.type === 'retry' && attempts < this.maxRetryAttempts) {
          this.recoveryAttempts.set(errorKey, attempts + 1);
          
          // Exponential backoff delay
          const delay = this.retryDelayBase * Math.pow(2, attempts);
          await this.delay(delay);

          try {
            const result = await originalOperation();
            this.recoveryAttempts.delete(errorKey);
            
            return {
              success: true,
              action: action.type,
              message: `Recovery successful after ${attempts + 1} attempts`
            };
          } catch (retryError) {
            logger.warn('Retry attempt failed', 'ErrorHandler', {
              attempt: attempts + 1,
              error: retryError instanceof Error ? retryError.message : 'Unknown error'
            });
            continue;
          }
        }

        // For non-retry actions, consider them successful if they don't throw
        return {
          success: true,
          action: action.type,
          message: action.description,
          fallbackUsed: action.type === 'fallback'
        };

      } catch (recoveryError) {
        logger.error('Recovery action failed', 'ErrorHandler', {
          actionType: action.type,
          error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
        });
        continue;
      }
    }

    // All automatic recovery attempts failed
    this.recoveryAttempts.delete(errorKey);
    return {
      success: false,
      action: 'none',
      message: 'All automatic recovery attempts failed'
    };
  }

  /**
   * Get user-friendly error message with guidance
   */
  public getUserFriendlyMessage(classifiedError: ClassifiedError): {
    title: string;
    message: string;
    guidance: string[];
    actions: Array<{ label: string; action: () => void; primary?: boolean }>;
  } {
    const manualActions = classifiedError.recoveryActions
      .filter(action => !action.automatic)
      .sort((a, b) => a.priority - b.priority)
      .map(action => ({
        label: action.description,
        action: action.action as () => void,
        primary: action.priority === 1
      }));

    return {
      title: this.getErrorTitle(classifiedError.category),
      message: classifiedError.userMessage,
      guidance: classifiedError.actionableGuidance,
      actions: manualActions
    };
  }

  // Error detection methods - ordered by specificity
  private isCircuitBreakerError(message: string, stack: string): boolean {
    const circuitKeywords = [
      'circuit breaker is open', 'circuit breaker', 'circuit', 'breaker'
    ];
    return circuitKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  private isRateLimitError(message: string, stack: string): boolean {
    const rateLimitKeywords = [
      'rate limit', 'too many requests', '429', 'quota exceeded',
      'throttled', 'rate exceeded'
    ];
    return rateLimitKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  private isAuthenticationError(message: string, stack: string): boolean {
    const authKeywords = [
      'unauthorized', 'authentication', 'invalid token', 'expired',
      'forbidden', '401', '403', 'access denied', 'login required'
    ];
    return authKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  private isTimeoutError(message: string, stack: string): boolean {
    const timeoutKeywords = [
      'request timeout', 'response timeout', 'connection timeout', 'timed out'
    ];
    // Only match if it's specifically about timeout, not just contains "timeout"
    return timeoutKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    ) && !message.includes('failed to fetch') && !message.includes('http error');
  }

  private isValidationError(message: string, stack: string): boolean {
    const validationKeywords = [
      'validation failed', 'validation error', 'validation', 'invalid', 
      'required field', 'missing field', 'format error', 'schema error'
    ];
    return validationKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  private isApplicationError(message: string, stack: string): boolean {
    const appKeywords = [
      'referenceerror', 'typeerror', 'syntaxerror', 
      'cannot read property', 'cannot read properties',
      'is not defined', 'is not a function'
    ];
    return appKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  private isAPIError(message: string, stack: string): boolean {
    const apiKeywords = [
      'http error', 'api error', 'status code', '400', '404', '500', '502', '503',
      'bad request', 'internal server error', 'service unavailable'
    ];
    return apiKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  private isNetworkError(message: string, stack: string): boolean {
    const networkKeywords = [
      'networkerror', 'failed to fetch', 'net::', 'cors error',
      'connection refused', 'network request failed', 'offline'
    ];
    return networkKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  // Error creation methods
  private createNetworkError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      code: 'NETWORK_ERROR',
      message: error.message,
      userMessage: 'Connection problem detected. Please check your internet connection.',
      actionableGuidance: [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable VPN if active',
        'Check if the service is down'
      ],
      recoveryActions: [
        {
          type: 'retry',
          description: 'Retry automatically',
          action: () => Promise.resolve(),
          priority: 1,
          automatic: true
        },
        {
          type: 'manual',
          description: 'Refresh page',
          action: () => window.location.reload(),
          priority: 2,
          automatic: false
        }
      ],
      retryable: true,
      fallbackAvailable: true,
      originalError: error,
      context
    };
  }

  private createAuthenticationError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      code: 'AUTH_ERROR',
      message: error.message,
      userMessage: 'Authentication required. Please sign in to continue.',
      actionableGuidance: [
        'Sign in to your account',
        'Check if your session has expired',
        'Clear browser cache and cookies',
        'Contact support if problem persists'
      ],
      recoveryActions: [
        {
          type: 'redirect',
          description: 'Sign in',
          action: () => {
            // Redirect to login - this would be implemented based on your auth system
            window.location.href = '/auth/login';
          },
          priority: 1,
          automatic: false
        }
      ],
      retryable: false,
      fallbackAvailable: false,
      originalError: error,
      context
    };
  }

  private createAPIError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.API,
      severity: ErrorSeverity.MEDIUM,
      code: 'API_ERROR',
      message: error.message,
      userMessage: 'Service temporarily unavailable. We\'re working to restore it.',
      actionableGuidance: [
        'Try again in a few moments',
        'Check service status page',
        'Use alternative features if available',
        'Contact support if issue persists'
      ],
      recoveryActions: [
        {
          type: 'retry',
          description: 'Retry request',
          action: () => Promise.resolve(),
          priority: 1,
          automatic: true
        },
        {
          type: 'fallback',
          description: 'Use backup service',
          action: async () => {
            // This would trigger fallback to alternative AI service
            logger.info('Switching to fallback AI service', 'ErrorHandler');
          },
          priority: 2,
          automatic: true
        }
      ],
      retryable: true,
      fallbackAvailable: true,
      originalError: error,
      context
    };
  }

  private createRateLimitError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      code: 'RATE_LIMIT_ERROR',
      message: error.message,
      userMessage: 'Too many requests. Please wait a moment before trying again.',
      actionableGuidance: [
        'Wait 30-60 seconds before retrying',
        'Reduce request frequency',
        'Consider upgrading your plan for higher limits',
        'Use shorter messages to reduce token usage'
      ],
      recoveryActions: [
        {
          type: 'retry',
          description: 'Retry after delay',
          action: () => this.delay(30000), // 30 second delay
          priority: 1,
          automatic: true
        },
        {
          type: 'fallback',
          description: 'Switch to alternative service',
          action: async () => {
            logger.info('Rate limit hit, switching to fallback service', 'ErrorHandler');
          },
          priority: 2,
          automatic: true
        }
      ],
      retryable: true,
      fallbackAvailable: true,
      originalError: error,
      context
    };
  }

  private createCircuitBreakerError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.CIRCUIT_BREAKER,
      severity: ErrorSeverity.HIGH,
      code: 'CIRCUIT_BREAKER_ERROR',
      message: error.message,
      userMessage: 'Service protection activated. Attempting to restore connection.',
      actionableGuidance: [
        'Service is temporarily protected from failures',
        'Automatic recovery is in progress',
        'Try again in a few moments',
        'Use manual reset if available'
      ],
      recoveryActions: [
        {
          type: 'reset',
          description: 'Reset circuit breaker',
          action: () => {
            circuitBreakerManager.resetFailingCircuits();
          },
          priority: 1,
          automatic: true
        },
        {
          type: 'fallback',
          description: 'Use backup service',
          action: async () => {
            logger.info('Circuit breaker open, using fallback', 'ErrorHandler');
          },
          priority: 2,
          automatic: true
        },
        {
          type: 'manual',
          description: 'Manual reset',
          action: () => {
            circuitBreakerManager.resetAll();
          },
          priority: 3,
          automatic: false
        }
      ],
      retryable: true,
      fallbackAvailable: true,
      originalError: error,
      context
    };
  }

  private createTimeoutError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      code: 'TIMEOUT_ERROR',
      message: error.message,
      userMessage: 'Request timed out. The service may be slow or overloaded.',
      actionableGuidance: [
        'Try again with a shorter message',
        'Check your internet connection speed',
        'Wait a moment before retrying',
        'Consider breaking complex requests into smaller parts'
      ],
      recoveryActions: [
        {
          type: 'retry',
          description: 'Retry with timeout extension',
          action: () => Promise.resolve(),
          priority: 1,
          automatic: true
        },
        {
          type: 'fallback',
          description: 'Use faster service',
          action: async () => {
            logger.info('Timeout occurred, switching to faster service', 'ErrorHandler');
          },
          priority: 2,
          automatic: true
        }
      ],
      retryable: true,
      fallbackAvailable: true,
      originalError: error,
      context
    };
  }

  private createValidationError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      code: 'VALIDATION_ERROR',
      message: error.message,
      userMessage: 'Invalid input detected. Please check your message and try again.',
      actionableGuidance: [
        'Check your message for invalid characters',
        'Ensure message is not empty',
        'Try shorter messages if too long',
        'Remove any special formatting that might cause issues'
      ],
      recoveryActions: [
        {
          type: 'manual',
          description: 'Edit message',
          action: () => {
            // This would focus the input field for editing
          },
          priority: 1,
          automatic: false
        }
      ],
      retryable: false,
      fallbackAvailable: false,
      originalError: error,
      context
    };
  }

  private createApplicationError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.APPLICATION,
      severity: ErrorSeverity.HIGH,
      code: 'APPLICATION_ERROR',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try refreshing the page.',
      actionableGuidance: [
        'Refresh the page to reset the application',
        'Clear browser cache and cookies',
        'Try using a different browser',
        'Report this issue if it continues'
      ],
      recoveryActions: [
        {
          type: 'manual',
          description: 'Refresh page',
          action: () => window.location.reload(),
          priority: 1,
          automatic: false
        },
        {
          type: 'reset',
          description: 'Reset application state',
          action: () => {
            // Clear local storage and reset app state
            localStorage.clear();
            sessionStorage.clear();
          },
          priority: 2,
          automatic: false
        }
      ],
      retryable: false,
      fallbackAvailable: false,
      originalError: error,
      context
    };
  }

  private createUnknownError(error: Error, context?: Record<string, any>): ClassifiedError {
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: 'Something unexpected happened. We\'re looking into it.',
      actionableGuidance: [
        'Try the action again',
        'Refresh the page if problem persists',
        'Check your internet connection',
        'Contact support with error details'
      ],
      recoveryActions: [
        {
          type: 'retry',
          description: 'Try again',
          action: () => Promise.resolve(),
          priority: 1,
          automatic: true
        },
        {
          type: 'manual',
          description: 'Refresh page',
          action: () => window.location.reload(),
          priority: 2,
          automatic: false
        }
      ],
      retryable: true,
      fallbackAvailable: false,
      originalError: error,
      context
    };
  }

  // Utility methods
  private getErrorKey(classifiedError: ClassifiedError): string {
    return `${classifiedError.category}_${classifiedError.code}`;
  }

  private getErrorTitle(category: ErrorCategory): string {
    const titles = {
      [ErrorCategory.NETWORK]: 'Connection Problem',
      [ErrorCategory.AUTHENTICATION]: 'Authentication Required',
      [ErrorCategory.API]: 'Service Unavailable',
      [ErrorCategory.APPLICATION]: 'Application Error',
      [ErrorCategory.VALIDATION]: 'Invalid Input',
      [ErrorCategory.RATE_LIMIT]: 'Rate Limit Exceeded',
      [ErrorCategory.CIRCUIT_BREAKER]: 'Service Protection Active',
      [ErrorCategory.TIMEOUT]: 'Request Timeout',
      [ErrorCategory.UNKNOWN]: 'Unexpected Error'
    };
    return titles[category] || 'Error';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear recovery attempt counters (useful for testing or manual reset)
   */
  public clearRecoveryAttempts(): void {
    this.recoveryAttempts.clear();
  }

  /**
   * Get current recovery attempt counts (for debugging)
   */
  public getRecoveryAttempts(): Map<string, number> {
    return new Map(this.recoveryAttempts);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandlerService.getInstance();