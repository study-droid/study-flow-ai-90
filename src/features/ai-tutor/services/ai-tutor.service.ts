/**
 * Enhanced AI Tutor service with multi-provider support and intelligent routing
 */

import type { 
  ChatSession, 
  ChatMessage, 
  DeepSeekResponse,
  ChatEvent,
  AITutorSettings
} from '../types';
import { generateId } from '@/shared/utils';
import { unifiedAIService } from '@/services/ai/unified-ai-service';
import { aiProviderRouter } from '@/services/ai/ai-provider-router';
import type { 
  AIRequest as UnifiedAIRequest, 
  AIResponse as UnifiedAIResponse, 
  ProviderSelectionCriteria,
  ServiceHealthStatus as UnifiedServiceHealthStatus
} from '@/services/ai/ai-provider-router';
import type { AIMessage, AIStreamChunk } from '@/types/ai-tutor';
import { errorHandler } from './error-handler.service';
import { requestQueueService } from './request-queue.service';
import { logger } from '@/services/logging/logger';

// Service health status interface for AI Tutor
export interface ServiceHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  providers: Array<{
    id: string;
    name: string;
    status: 'online' | 'degraded' | 'offline';
    responseTime: number;
    errorRate: number;
    lastSuccess: Date;
    capabilities: string[];
  }>;
  lastCheck: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

export class AITutorService {
  private currentProvider: string | null = null;
  private fallbackChain: string[] = [];
  private healthMonitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeProviderRouting();
    this.setupHealthMonitoring();
  }

  /**
   * Initialize provider routing and fallback chains
   */
  private initializeProviderRouting(): void {
    // Set up intelligent fallback chain based on provider capabilities and reliability
    this.fallbackChain = [
      'deepseek',                    // Primary: Fast, reliable, cost-effective
      'edge-function-professional',  // Secondary: High quality, multiple models
      'openai',                     // Tertiary: Reliable fallback
      'anthropic',                  // Quaternary: Alternative high-quality option
      'gemini'                      // Final: Google's offering
    ];

    // Configure the router with our preferred fallback chain
    aiProviderRouter.setFallbackChain('ai-tutor', this.fallbackChain);
    
    logger.info('AI Tutor Service: Provider routing initialized', 'AITutorService', {
      fallbackChain: this.fallbackChain,
      availableProviders: aiProviderRouter.getAvailableProviders().length
    });
  }

  /**
   * Setup health monitoring for automatic provider switching
   */
  private setupHealthMonitoring(): void {
    // Monitor provider health every 30 seconds
    this.healthMonitoringInterval = setInterval(() => {
      this.checkAndSwitchProviders();
    }, 30000);
  }

  /**
   * Check provider health and switch if necessary
   */
  private checkAndSwitchProviders(): void {
    const currentHealth = this.getServiceHealth();
    
    // If current provider is unhealthy, switch to best available
    if (this.currentProvider) {
      const providerHealth = currentHealth.providers.find(p => p.id === this.currentProvider);
      if (providerHealth?.status === 'offline') {
        const bestProvider = aiProviderRouter.selectProvider({
          excludeProviders: [this.currentProvider]
        });
        
        if (bestProvider) {
          logger.info('AI Tutor Service: Switching provider due to health issues', 'AITutorService', {
            from: this.currentProvider,
            to: bestProvider.id,
            reason: 'provider_offline'
          });
          this.currentProvider = bestProvider.id;
        }
      }
    }
  }

  /**
   * Select the best provider for a request
   */
  private selectProvider(options: {
    model?: string;
    mode?: 'chat' | 'structured';
    priority?: 'low' | 'normal' | 'high';
    preferredProvider?: string;
  } = {}): string | null {
    const criteria: ProviderSelectionCriteria = {
      requiredCapabilities: ['text-generation'],
      requireStreaming: true // AI Tutor always uses streaming
    };

    // Add specific capabilities based on request type
    if (options.mode === 'structured') {
      criteria.requiredCapabilities?.push('reasoning');
    }

    // Prefer faster providers for high priority requests
    if (options.priority === 'high') {
      criteria.preferredSpeed = 'fast';
      criteria.maxCostTier = 'high';
    } else if (options.priority === 'low') {
      criteria.preferredSpeed = 'medium';
      criteria.maxCostTier = 'medium';
    }

    // Use preferred provider if specified and available
    if (options.preferredProvider) {
      const provider = aiProviderRouter.getProvider(options.preferredProvider);
      if (provider && aiProviderRouter.isProviderAvailable(options.preferredProvider)) {
        return options.preferredProvider;
      }
    }

    // Use current provider if still healthy
    if (this.currentProvider && aiProviderRouter.isProviderAvailable(this.currentProvider)) {
      return this.currentProvider;
    }

    // Select best available provider
    const selectedProvider = aiProviderRouter.selectProvider(criteria);
    if (selectedProvider) {
      this.currentProvider = selectedProvider.id;
      return selectedProvider.id;
    }

    return null;
  }

  /**
   * Create a new chat session
   */
  createSession(title?: string): ChatSession {
    const now = new Date();
    return {
      id: generateId(),
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create a new chat message
   */
  createMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    sessionId: string,
    type: 'text' | 'thinking' | 'error' = 'text'
  ): ChatMessage {
    const now = new Date();
    return {
      id: generateId(),
      role,
      content,
      type,
      sessionId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Send message to AI tutor with multi-provider support, intelligent routing, and fallback chains
   */
  async sendMessage(
    message: string,
    sessionId: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      history?: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: number;
      }>;
      mode?: 'chat' | 'structured';
      onEvent?: (event: ChatEvent) => void;
      priority?: number;
      useQueue?: boolean;
      preferredProvider?: string;
    } = {}
  ): Promise<DeepSeekResponse> {
    const { onEvent, priority = 0, useQueue = true, preferredProvider } = options;
    const context = {
      service: 'AITutorService',
      method: 'sendMessage',
      sessionId,
      messageLength: message.length,
      hasHistory: !!(options.history && options.history.length > 0),
      useQueue,
      preferredProvider
    };

    try {
      // Emit message start and thinking events for UI feedback
      onEvent?.({ type: 'message_start', data: { message }, sessionId });
      onEvent?.({ type: 'thinking_start', data: { reasoning: 'Selecting optimal AI provider...' }, sessionId });

      logger.info('AI Tutor Service: Starting enhanced message processing', 'AITutorService', context);

      // Select the best provider for this request
      const selectedProviderId = this.selectProvider({
        model: options.model,
        mode: options.mode,
        priority: priority > 5 ? 'high' : priority < 0 ? 'low' : 'normal',
        preferredProvider
      });

      if (!selectedProviderId) {
        throw new Error('No available AI providers found');
      }

      const selectedProvider = aiProviderRouter.getProvider(selectedProviderId);
      logger.info('AI Tutor Service: Selected provider', 'AITutorService', {
        ...context,
        selectedProvider: selectedProvider?.name,
        providerId: selectedProviderId,
        providerType: selectedProvider?.type
      });

      // Enhanced thinking progression with provider awareness
      const enhancedOnEvent = (event: any) => {
        // Add enhanced thinking stages for better UX
        if (event.type === 'thinking_start') {
          onEvent?.({ 
            ...event, 
            data: { 
              ...event.data,
              stage: 'analyzing',
              reasoning: event.data.reasoning || `Analyzing with ${selectedProvider?.name || 'AI provider'}...`
            }
          });
        } else if (event.type === 'queue_status') {
          // Handle queue status events
          const { position, estimatedWait } = event.data;
          if (position > 1) {
            onEvent?.({
              type: 'thinking_start',
              data: {
                reasoning: `Queued for processing (position ${position}, ~${Math.ceil(estimatedWait / 1000)}s wait)`,
                stage: 'analyzing'
              },
              sessionId
            });
          }
        } else if (event.type === 'processing_start') {
          onEvent?.({
            type: 'thinking_start',
            data: {
              reasoning: `Processing with ${selectedProvider?.name}...`,
              stage: 'reasoning'
            },
            sessionId
          });
        } else if (event.type === 'retry_attempt') {
          const { retryCount, maxRetries } = event.data;
          onEvent?.({
            type: 'thinking_start',
            data: {
              reasoning: `Retrying with fallback provider (${retryCount}/${maxRetries})...`,
              stage: 'analyzing'
            },
            sessionId
          });
        } else if (event.type === 'provider_switch') {
          const { fromProvider, toProvider, reason } = event.data;
          onEvent?.({
            type: 'thinking_start',
            data: {
              reasoning: `Switching to ${toProvider} (${reason})...`,
              stage: 'analyzing'
            },
            sessionId
          });
        } else {
          onEvent?.(event);
        }
      };

      let result: DeepSeekResponse;

      if (useQueue) {
        // Use request queue for rate limiting and retry logic with multi-provider support
        result = await requestQueueService.queueRequest<DeepSeekResponse>(
          message,
          sessionId,
          {
            ...options,
            onEvent: enhancedOnEvent,
            preferredProvider: selectedProviderId,
          },
          priority,
          3 // maxRetries
        );
      } else {
        // Direct processing using unified AI service
        result = await this.sendMessageDirect(message, sessionId, {
          ...options,
          onEvent: enhancedOnEvent,
          preferredProvider: selectedProviderId,
        });
      }

      logger.info('AI Tutor Service: Message processed successfully', 'AITutorService', {
        ...context,
        hasContent: !!result.content,
        contentLength: result.content?.length || 0,
        providerId: selectedProviderId,
        fallbackUsed: result.metadata?.fallback || false
      });

      return result;

    } catch (error) {
      const originalError = error instanceof Error ? error : new Error(String(error));
      
      logger.error('AI Tutor Service: Error occurred during message processing', 'AITutorService', {
        ...context,
        error: originalError.message,
        stack: originalError.stack
      });

      // Classify the error using our error handler
      const classifiedError = errorHandler.classifyError(originalError, context);
      
      logger.info('AI Tutor Service: Error classified', 'AITutorService', {
        category: classifiedError.category,
        severity: classifiedError.severity,
        retryable: classifiedError.retryable,
        fallbackAvailable: classifiedError.fallbackAvailable
      });

      // Attempt automatic recovery if the error is recoverable
      if (classifiedError.retryable && classifiedError.fallbackAvailable) {
        try {
          logger.info('AI Tutor Service: Attempting automatic recovery', 'AITutorService', {
            category: classifiedError.category,
            recoveryActions: classifiedError.recoveryActions.length
          });

          // Emit recovery notification to UI
          onEvent?.({
            type: 'message_start',
            data: { message: '🔄 Attempting recovery...' },
            sessionId,
          });

          // Execute automatic recovery actions
          const automaticActions = classifiedError.recoveryActions
            .filter(action => action.automatic)
            .sort((a, b) => a.priority - b.priority);

          for (const action of automaticActions) {
            try {
              await action.action();
              
              if (action.type === 'fallback') {
                // Emit fallback notification
                onEvent?.({
                  type: 'provider_switch',
                  data: { 
                    fromProvider: selectedProviderId,
                    toProvider: 'fallback',
                    reason: 'error_recovery'
                  },
                  sessionId,
                });

                // Try next provider in fallback chain
                const fallbackProviderId = this.getNextFallbackProvider(selectedProviderId);
                if (fallbackProviderId) {
                  const fallbackResponse = await this.sendMessageDirect(message, sessionId, {
                    ...options,
                    onEvent: enhancedOnEvent,
                    preferredProvider: fallbackProviderId,
                  });
                  
                  logger.info('AI Tutor Service: Fallback recovery successful', 'AITutorService', {
                    ...context,
                    fallbackProvider: fallbackProviderId
                  });
                  
                  // Mark response as using fallback
                  return {
                    ...fallbackResponse,
                    metadata: {
                      ...fallbackResponse.metadata,
                      fallback: true,
                      originalError: originalError.message,
                      recoveryUsed: true,
                      fallbackProvider: fallbackProviderId
                    }
                  };
                }
              }
            } catch (recoveryError) {
              logger.warn('AI Tutor Service: Recovery action failed', 'AITutorService', {
                actionType: action.type,
                error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
              });
              continue;
            }
          }

        } catch (recoveryError) {
          logger.error('AI Tutor Service: All recovery attempts failed', 'AITutorService', {
            ...context,
            recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
          });
        }
      }

      // If recovery failed or not applicable, emit error event with user-friendly message
      const userFriendlyMessage = errorHandler.getUserFriendlyMessage(classifiedError);
      
      onEvent?.({
        type: 'error',
        data: { 
          error: userFriendlyMessage.message,
          category: classifiedError.category,
          severity: classifiedError.severity,
          guidance: userFriendlyMessage.guidance,
          retryable: classifiedError.retryable
        },
        sessionId,
      });

      // Throw enhanced error with classification info
      const enhancedError = new Error(userFriendlyMessage.message);
      (enhancedError as any).classification = classifiedError;
      (enhancedError as any).userFriendly = userFriendlyMessage;
      
      throw enhancedError;
    }
  }

  /**
   * Send message directly using unified AI service (bypassing queue)
   */
  private async sendMessageDirect(
    message: string,
    sessionId: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      history?: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: number;
      }>;
      mode?: 'chat' | 'structured';
      onEvent?: (event: ChatEvent) => void;
      preferredProvider?: string;
    } = {}
  ): Promise<DeepSeekResponse> {
    const { onEvent, preferredProvider } = options;

    // Build AI request
    const aiRequest: UnifiedAIRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI tutor. Provide clear, educational responses that help students learn. Be encouraging and break down complex concepts into understandable parts.'
        },
        ...(options.history || []).map(h => ({
          role: h.role as 'user' | 'assistant',
          content: h.content
        })),
        {
          role: 'user',
          content: message
        }
      ],
      modelConfig: {
        model: (options.model || 'chat') as any,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 4000,
        topP: 1.0,
        jsonMode: false
      },
      requestId: `ai-tutor-${sessionId}-${Date.now()}`,
      priority: 'normal',
      preferredProvider,
      stream: true
    };

    // Use unified AI service for streaming
    let fullContent = '';
    let hasStoppedThinking = false;

    try {
      for await (const chunk of unifiedAIService.streamMessage(aiRequest)) {
        if (chunk.type === 'content') {
          fullContent += chunk.content || '';
          
          // Stop thinking indicator after first substantial chunk
          if (!hasStoppedThinking && fullContent.length > 20) {
            onEvent?.({ type: 'thinking_stop', data: {}, sessionId });
            hasStoppedThinking = true;
          }
          
          onEvent?.({
            type: 'message_delta',
            data: {
              fullContent,
              isComplete: false
            },
            sessionId
          });
        } else if (chunk.type === 'done') {
          // Ensure thinking is stopped
          if (!hasStoppedThinking) {
            onEvent?.({ type: 'thinking_stop', data: {}, sessionId });
          }
          
          onEvent?.({
            type: 'message_stop',
            data: {
              content: fullContent,
              metadata: {
                model: chunk.model || options.model || 'unknown',
                tokens: chunk.usage?.totalTokens || 0,
                temperature: options.temperature ?? 0.7,
                processingTime: chunk.processingTime || 0,
                providerId: chunk.providerId
              }
            },
            sessionId
          });
          
          return {
            content: fullContent,
            metadata: {
              model: chunk.model || options.model || 'unknown',
              tokens: chunk.usage?.totalTokens || 0,
              temperature: options.temperature ?? 0.7,
              processingTime: chunk.processingTime || 0,
              providerId: chunk.providerId
            }
          };
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Streaming error');
        }
      }

      // Fallback if streaming completes without done event
      if (!hasStoppedThinking) {
        onEvent?.({ type: 'thinking_stop', data: {}, sessionId });
      }
      
      onEvent?.({
        type: 'message_stop',
        data: {
          content: fullContent,
          metadata: {
            model: options.model || 'unknown',
            tokens: 0,
            temperature: options.temperature ?? 0.7
          }
        },
        sessionId
      });

      return {
        content: fullContent,
        metadata: {
          model: options.model || 'unknown',
          tokens: 0,
          temperature: options.temperature ?? 0.7
        }
      };

    } catch (error) {
      throw new Error(`Direct AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get next fallback provider in the chain
   */
  private getNextFallbackProvider(currentProviderId: string): string | null {
    const currentIndex = this.fallbackChain.indexOf(currentProviderId);
    if (currentIndex >= 0 && currentIndex < this.fallbackChain.length - 1) {
      const nextProviderId = this.fallbackChain[currentIndex + 1];
      if (aiProviderRouter.isProviderAvailable(nextProviderId)) {
        return nextProviderId;
      }
    }
    
    // Find any available provider not already tried
    for (const providerId of this.fallbackChain) {
      if (providerId !== currentProviderId && aiProviderRouter.isProviderAvailable(providerId)) {
        return providerId;
      }
    }
    
    return null;
  }

  /**
   * Get service health status with provider information
   */
  getServiceHealth(): ServiceHealthStatus {
    const unifiedHealth = unifiedAIService.getServiceHealth();
    const providerHealths = aiProviderRouter.getAllProviderHealth();
    const availableProviders = aiProviderRouter.getAvailableProviders();

    return {
      overall: unifiedHealth.overall,
      providers: providerHealths.map(health => {
        const config = availableProviders.find(p => p.id === health.id);
        return {
          id: health.id,
          name: config?.name || health.id,
          status: health.status,
          responseTime: health.responseTime,
          errorRate: health.errorRate,
          lastSuccess: health.lastSuccess,
          capabilities: config?.capabilities.map(c => c.type) || []
        };
      }),
      lastCheck: unifiedHealth.lastCheck,
      metrics: unifiedHealth.metrics
    };
  }

  /**
   * Switch to a specific AI provider
   */
  switchProvider(providerId: string): boolean {
    const provider = aiProviderRouter.getProvider(providerId);
    if (!provider || !aiProviderRouter.isProviderAvailable(providerId)) {
      return false;
    }

    this.currentProvider = providerId;
    logger.info('AI Tutor Service: Switched to provider', 'AITutorService', {
      providerId,
      providerName: provider.name,
      providerType: provider.type
    });
    
    return true;
  }

  /**
   * Get available providers with their capabilities
   */
  getAvailableProviders(): Array<{
    id: string;
    name: string;
    type: string;
    capabilities: string[];
    status: 'online' | 'degraded' | 'offline';
    priority: number;
  }> {
    const providers = aiProviderRouter.getAvailableProviders();
    const healthStatuses = aiProviderRouter.getAllProviderHealth();

    return providers.map(provider => {
      const health = healthStatuses.find(h => h.id === provider.id);
      return {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        capabilities: provider.capabilities.map(c => c.type),
        status: health?.status || 'offline',
        priority: provider.priority
      };
    });
  }

  /**
   * Reset all services and circuit breakers
   */
  resetServices(): void {
    unifiedAIService.resetServices();
    this.currentProvider = null;
    
    logger.info('AI Tutor Service: Services reset', 'AITutorService', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval);
      this.healthMonitoringInterval = null;
    }
  }

  /**
   * Generate session title from first message
   */
  generateSessionTitle(firstMessage: string): string {
    // Take first 50 characters and add ellipsis if longer
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;
    
    return title.replace(/\n/g, ' ');
  }

  /**
   * Export chat session to various formats
   */
  exportSession(session: ChatSession, format: 'json' | 'txt' | 'md' = 'json'): string {
    switch (format) {
      case 'txt':
        return this.exportAsText(session);
      case 'md':
        return this.exportAsMarkdown(session);
      case 'json':
      default:
        return JSON.stringify(session, null, 2);
    }
  }

  private exportAsText(session: ChatSession): string {
    const header = `Chat Session: ${session.title}\nCreated: ${session.createdAt}\n${'='.repeat(50)}\n\n`;
    const messages = session.messages
      .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}\n`)
      .join('\n');
    
    return header + messages;
  }

  private exportAsMarkdown(session: ChatSession): string {
    const header = `# ${session.title}\n\n*Created: ${session.createdAt}*\n\n---\n\n`;
    const messages = session.messages
      .map(msg => {
        const role = msg.role === 'user' ? '**You**' : '**AI Tutor**';
        return `## ${role}\n\n${msg.content}\n\n`;
      })
      .join('');
    
    return header + messages;
  }

  /**
   * Search through chat sessions
   */
  searchSessions(sessions: ChatSession[], query: string): ChatSession[] {
    const lowerQuery = query.toLowerCase();
    
    return sessions.filter(session => {
      // Search in title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in messages
      return session.messages.some(message => 
        message.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(session: ChatSession) {
    const messageCount = session.messages.length;
    const userMessages = session.messages.filter(m => m.role === 'user').length;
    const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;
    const totalTokens = session.messages.reduce((sum, msg) => {
      return sum + (msg.metadata?.tokens || 0);
    }, 0);
    
    const created = new Date((session.createdAt as unknown) as string | Date);
    const updated = new Date((session.updatedAt as unknown) as string | Date);
    return {
      messageCount,
      userMessages,
      assistantMessages,
      totalTokens,
      duration: updated.getTime() - created.getTime(),
    };
  }
}

// Create and export singleton instance
export const aiTutorService = new AITutorService();
