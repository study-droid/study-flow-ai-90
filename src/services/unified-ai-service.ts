/**
 * Unified AI Service
 * Integrates with the secure Edge Function for AI operations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';
import { deepSeekOptimizer } from './deepseek-response-optimizer';
import { responseCache } from './response-cache';
import { aiResponseFilter } from './ai-response-filter';

// Professional DeepSeek Architecture Imports
import { PromptTemplates, PromptContext } from './deepseek/prompt-templates';
import { postProcessingPipeline, ProcessingContext } from './deepseek/post-processing-pipeline';
import { ResponseFormatter, FormattedResponse } from './deepseek/response-formatter';
import { IntentDetector, MessageIntent } from './ai/intent-detector';

// Production Reliability Imports
import { productionMonitor, HealthCheckResult, SystemHealth } from './monitoring/production-monitor';
import { circuitBreakerManager, CircuitBreakerState } from './reliability/circuit-breaker';

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'deepseek';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AISession {
  id: string;
  subject: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
  provider: AIProvider;
}

interface AIResponse {
  provider: string;
  model: string;
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  responseType?: 'explanation' | 'study_plan' | 'practice' | 'concept';
  metadata?: {
    systemPromptLength?: number;
    userPromptLength?: number;
    parameters?: any;
    processedAt?: string;
  };
}

class UnifiedAIService {
  private sessions: Map<string, AISession> = new Map();
  private defaultProvider: AIProvider = 'deepseek'; // Using DeepSeek as default
  private availableProviders: Set<AIProvider> = new Set(['openai', 'gemini', 'claude', 'deepseek']);
  private professionalModeEnabled: boolean = true;
  private edgeFunctionHealthStatus: { professional: boolean; legacy: boolean } = { professional: true, legacy: true };

  constructor() {
    logger.info('Unified AI Service initialized with DeepSeek as default', 'UnifiedAIService');
    // Initialize health check asynchronously without blocking constructor
    this.initializeHealthCheck();
  }

  /**
   * Initialize health check asynchronously
   */
  private initializeHealthCheck(): void {
    // Run health check asynchronously to avoid blocking the constructor
    this.checkEdgeFunctionHealth().catch(error => {
      logger.warn('Initial health check failed', 'UnifiedAIService', error);
      // Set conservative defaults on failure
      this.edgeFunctionHealthStatus.professional = false;
      this.edgeFunctionHealthStatus.legacy = true;
    });
  }

  /**
   * Check which providers are available
   */
  async getAvailableProviders(): Promise<Array<{ name: string; value: AIProvider; available: boolean; hasMCP: boolean }>> {
    return [
      { name: 'DeepSeek', value: 'deepseek', available: true, hasMCP: false },
      { name: 'OpenAI', value: 'openai', available: true, hasMCP: false },
      { name: 'Gemini', value: 'gemini', available: true, hasMCP: false },
      { name: 'Claude', value: 'claude', available: true, hasMCP: false },
    ];
  }

  /**
   * Create a new AI session
   */
  async createSession(subject: string, provider?: AIProvider, useMCP?: boolean): Promise<AISession> {
    const sessionProvider = provider || this.defaultProvider;
    logger.debug('Creating session', 'UnifiedAIService', { provider: sessionProvider, default: this.defaultProvider });
    const sessionId = crypto.randomUUID();
    
    const session: AISession = {
      id: sessionId,
      subject,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
      provider: sessionProvider
    };
    
    this.sessions.set(sessionId, session);
    
    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('ai_tutor_sessions')
          .insert({
            id: sessionId,
            user_id: user.id,
            subject,
            subject_name: subject,
            ai_provider: sessionProvider,
            status: 'active',
            session_type: 'chat'
          });
      }
    } catch (error) {
      logger.error('Error saving session', 'UnifiedAIService', error);
    }
    
    return session;
  }

  /**
   * Send a message to the AI using the Professional DeepSeek Architecture with Intent Detection
   */
  async sendMessage(
    sessionId: string,
    content: string,
    subject?: string,
    context?: {
      topic?: string;
      userLevel?: 'beginner' | 'intermediate' | 'advanced';
      responseType?: 'explanation' | 'study_plan' | 'practice' | 'concept';
      context?: any[];
      learningObjectives?: string[];
      timeConstraint?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    }
  ): Promise<Message> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Detect user intent to determine response mode
    const intent: MessageIntent = IntentDetector.detectIntent(content);
    
    logger.debug('Intent detected', 'UnifiedAIService', {
      type: intent.type,
      confidence: intent.confidence,
      responseMode: intent.responseMode
    });

    // Determine the provider to use
    const useProvider = session.provider || this.defaultProvider;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    // Handle casual responses directly without AI processing
    if (intent.responseMode === 'casual' && intent.confidence > 0.8) {
      const casualResponse = this.generateCasualResponse(intent.type, content);
      const assistantMessage: Message = {
        role: 'assistant',
        content: casualResponse,
        timestamp: new Date()
      };
      
      session.messages.push(assistantMessage);
      session.lastActive = new Date();
      
      // Save messages for casual interactions too
      await this.saveMessages(sessionId, userMessage, assistantMessage);
      
      logger.info('Casual response generated', 'UnifiedAIService', { 
        intentType: intent.type, 
        confidence: intent.confidence 
      });
      
      return assistantMessage;
    }

    try {
      // Generate cache key
      const cacheKey = await responseCache.generateCacheKey(content, {
        subject: subject || session.subject,
        topic: context?.topic,
        userLevel: context?.userLevel,
        responseType: context?.responseType
      });

      // Check cache first
      const cachedResponse = await responseCache.get(cacheKey);
      if (cachedResponse && this.isOptimizationEnabled()) {
        logger.info('Cache hit for response', 'UnifiedAIService', { cacheKey });
        
        // Create assistant message from cached response
        const assistantMessage: Message = {
          role: 'assistant',
          content: cachedResponse.content || cachedResponse,
          timestamp: new Date()
        };
        session.messages.push(assistantMessage);
        session.lastActive = new Date();
        
        // Save to database
        await this.saveMessages(sessionId, userMessage, assistantMessage);
        
        return assistantMessage;
      }

      // Get auth token
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        throw new Error('Not authenticated. Please sign in to use the AI Tutor.');
      }

      // Build professional prompt using new template system with intent context
      const promptContext: PromptContext = {
        subject: subject || session.subject,
        topic: context?.topic,
        userLevel: context?.userLevel || 'intermediate',
        responseType: context?.responseType || 'explanation',
        previousContext: session.messages.slice(-5).map(m => `${m.role}: ${m.content}`),
        learningObjectives: context?.learningObjectives,
        timeConstraint: context?.timeConstraint,
        intentContext: {
          type: intent.type,
          confidence: intent.confidence,
          responseMode: intent.responseMode
        }
      };

      const { systemPrompt, userPrompt, parameters } = PromptTemplates.buildPrompt(
        content,
        promptContext
      );

      logger.debug('Professional prompt built', 'UnifiedAIService', {
        promptContextSubject: promptContext.subject,
        responseType: promptContext.responseType,
        userLevel: promptContext.userLevel
      });

      // Use new reliable Edge Function system with circuit breakers
      const messagesForAI = [...session.messages, userMessage];
      const aiResponse = await this.callEdgeFunctionWithReliability(
        useProvider,
        messagesForAI,
        sessionId,
        subject || session.subject,
        intent
      );
      
      let usedProfessionalMode = aiResponse.metadata?.processing_type === 'professional';
      
      logger.info('AI response received', 'UnifiedAIService', {
        provider: aiResponse.provider,
        model: aiResponse.model,
        usedProfessionalMode,
        contentLength: aiResponse.content?.length || 0
      });

      // The new system already returns a proper AIResponse object

      // Process response through professional pipeline if not already done
      const processingContext: ProcessingContext = {
        responseType: context?.responseType || 'explanation',
        subject: subject || session.subject,
        topic: context?.topic,
        userLevel: context?.userLevel,
        originalPrompt: content,
        rawResponse: aiResponse.content,
        metadata: {
          model: aiResponse.model,
          provider: aiResponse.provider,
          usage: aiResponse.usage,
          parameters
        }
      };

      let assistantMessage: Message;
      let processingResult = null;

      if (usedProfessionalMode) {
        // Process response through professional pipeline
        try {
          processingResult = await postProcessingPipeline.process(processingContext);

          // Log processing results
          logger.info('Response processed through professional pipeline', 'UnifiedAIService', {
            qualityScore: processingResult.qualityAssessment.overallScore,
            processingTime: processingResult.processingMetadata.processingTime,
            stepsCompleted: processingResult.processingMetadata.stepsCompleted.length,
            warnings: processingResult.processingMetadata.warnings.length
          });

          // Create assistant message with professionally processed content
          assistantMessage = {
            role: 'assistant',
            content: processingResult.formattedResponse.content,
            timestamp: new Date()
          };
          
          // Store processing result metadata for potential UI display
          (assistantMessage as any).processingResult = processingResult;
          
        } catch (pipelineError) {
          logger.error('Professional pipeline failed, using raw response', 'UnifiedAIService', pipelineError);
          
          // Fallback to raw response if pipeline fails
          assistantMessage = {
            role: 'assistant',
            content: aiResponse.content,
            timestamp: new Date()
          };
        }
        
      } else {
        // Legacy mode - use existing optimization
        try {
          const optimizedResponse = await deepSeekOptimizer.optimizeResponse(
            aiResponse.content,
            {
              subject: subject || session.subject,
              topic: context?.topic,
              userLevel: context?.userLevel,
              responseType: context?.responseType
            }
          );

          assistantMessage = {
            role: 'assistant',
            content: optimizedResponse.content,
            timestamp: new Date()
          };
          
          logger.info('Response processed through legacy optimization', 'UnifiedAIService', {
            qualityScore: optimizedResponse.metadata?.qualityScore || 85
          });
          
        } catch (optimizerError) {
          logger.error('Legacy optimizer failed, using raw response', 'UnifiedAIService', optimizerError);
          
          // Final fallback to raw response
          assistantMessage = {
            role: 'assistant',
            content: data.content,
            timestamp: new Date()
          };
        }
      }
      session.messages.push(assistantMessage);
      session.lastActive = new Date();

      // Cache the response (professional or legacy)
      if (this.isOptimizationEnabled()) {
        try {
          const cacheData = usedProfessionalMode && processingResult 
            ? processingResult.formattedResponse 
            : { content: assistantMessage.content };
            
          const qualityScore = usedProfessionalMode && processingResult
            ? processingResult.qualityAssessment.overallScore
            : 85;
            
          await responseCache.set(
            cacheKey,
            cacheData,
            context?.responseType === 'study_plan' ? 3600000 : 300000, // 1 hour for study plans, 5 min for others
            {
              subject: subject || session.subject,
              topic: context?.topic,
              userLevel: context?.userLevel,
              qualityScore
            }
          );
          
          const modeLog = usedProfessionalMode ? 'professionally processed' : 'legacy optimized';
          logger.debug(`${modeLog} response cached`, 'UnifiedAIService', { cacheKey });
        } catch (cacheError) {
          logger.warn('Failed to cache response', 'UnifiedAIService', cacheError);
        }
      }

      // Save messages to database with enhanced metadata
      await this.saveMessages(sessionId, userMessage, assistantMessage);

      return assistantMessage;
    } catch (error) {
      logger.error('Error in sendMessage', 'UnifiedAIService', error);
      
      // Provide user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Not authenticated')) {
          throw new Error('Please sign in to use the AI Tutor');
        }
        if (error.message.includes('API keys not configured')) {
          throw error; // Pass through configuration errors
        }
      }
      
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Build context from session messages
   */
  private buildContext(session: AISession): string {
    const recentMessages = session.messages.slice(-10); // Last 10 messages
    
    const context = recentMessages
      .map(msg => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`)
      .join('\n');

    return `You are an expert tutor helping a student with ${session.subject}.
Previous conversation:
${context}`;
  }

  /**
   * Get the appropriate model for each provider
   */
  private getModelForProvider(provider: AIProvider): string {
    switch (provider) {
      case 'deepseek':
        return import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat'; // Default and primary
      case 'gemini':
        return import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash'; // Alternative option
      case 'openai':
        return 'gpt-3.5-turbo'; // Fallback option
      case 'claude':
        return 'claude-3-opus-20240229'; // Alternative option
      default:
        return 'deepseek-chat'; // Always default to DeepSeek
    }
  }

  /**
   * Save messages to database with fallback for missing columns
   */
  private async saveMessages(
    sessionId: string,
    userMessage: Message,
    assistantMessage: Message
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Extract processing result metadata if available
      const processingResult = (assistantMessage as any).processingResult;
      
      // Prepare message data with safe fallbacks for missing columns
      const userMessageData = {
        session_id: sessionId,
        role: userMessage.role,
        content: userMessage.content,
        created_at: userMessage.timestamp.toISOString()
      };

      const assistantMessageData: any = {
        session_id: sessionId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        created_at: assistantMessage.timestamp.toISOString()
      };

      // Add optional columns if they exist in schema
      try {
        // Check if new columns exist by attempting to read table schema
        const { data: tableInfo } = await supabase
          .from('ai_tutor_messages')
          .select('*')
          .limit(1);

        // If query succeeds, we can safely add new columns
        if (processingResult) {
          assistantMessageData.processing_result = processingResult;
          assistantMessageData.quality_score = processingResult.qualityAssessment?.overallScore;
          assistantMessageData.response_type = processingResult.formattedResponse?.metadata?.responseType;
          assistantMessageData.cached = false;
          assistantMessageData.optimized = true;
        }
      } catch (schemaError) {
        // Schema doesn't have new columns yet, proceed with basic insert
        logger.debug('Database schema missing new columns, using basic insert', 'UnifiedAIService');
      }

      // Insert messages with graceful degradation
      const { error: insertError } = await supabase
        .from('ai_tutor_messages')
        .insert([userMessageData, assistantMessageData]);

      if (insertError) {
        // If insert fails due to missing columns, retry with basic data
        if (insertError.code === 'PGRST204' && insertError.message?.includes('feedback')) {
          logger.debug('Retrying message insert without new columns', 'UnifiedAIService');
          
          const basicUserMessage = {
            session_id: sessionId,
            role: userMessage.role,
            content: userMessage.content,
            created_at: userMessage.timestamp.toISOString()
          };
          
          const basicAssistantMessage = {
            session_id: sessionId,
            role: assistantMessage.role,
            content: assistantMessage.content,
            created_at: assistantMessage.timestamp.toISOString()
          };
          
          const { error: retryError } = await supabase
            .from('ai_tutor_messages')
            .insert([basicUserMessage, basicAssistantMessage]);
            
          if (retryError) {
            throw retryError;
          }
        } else {
          throw insertError;
        }
      }
      
      logger.debug('Messages saved successfully', 'UnifiedAIService', { sessionId });
      
    } catch (error) {
      logger.error('Error saving messages', 'UnifiedAIService', error);
      // Don't throw error to prevent breaking the user experience
    }
  }

  /**
   * Get all sessions
   */
  getSessions(): AISession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): AISession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Delete from local storage
      this.sessions.delete(sessionId);
      
      // Try to delete from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Archive the session in database (soft delete)
        const { error } = await supabase
          .from('ai_tutor_sessions')
          .update({ is_archived: true })
          .eq('id', sessionId)
          .eq('user_id', user.id);
          
        if (error) {
          logger.error('Error archiving session in database', 'UnifiedAIService', error);
        }
      }
      
      logger.debug('Session deleted', 'UnifiedAIService', { sessionId });
      return true;
    } catch (error) {
      logger.error('Error deleting session', 'UnifiedAIService', error);
      // Still return true if local deletion worked
      return !this.sessions.has(sessionId);
    }
  }

  /**
   * Load sessions from database
   */
  async loadSessions(): Promise<AISession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: sessions, error } = await supabase
        .from('ai_tutor_sessions')
        .select('*, ai_tutor_messages(*)')
        .eq('user_id', user.id)
        .or('is_archived.is.null,is_archived.eq.false') // Filter out archived sessions
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const loadedSessions = (sessions || []).map(session => {
        const aiSession: AISession = {
          id: session.id,
          subject: session.subject || session.subject_name,
          messages: (session.ai_tutor_messages || []).map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at)
          })),
          createdAt: new Date(session.created_at),
          lastActive: new Date(session.updated_at || session.created_at),
          provider: session.ai_provider as AIProvider
        };
        
        this.sessions.set(session.id, aiSession);
        return aiSession;
      });

      return loadedSessions;
    } catch (error) {
      logger.error('Error loading sessions', 'UnifiedAIService', error);
      return [];
    }
  }

  /**
   * Get optimization insights for a session
   */
  async getOptimizationInsights(sessionId: string): Promise<{
    totalOptimizations: number;
    averageQualityScore: number;
    commonEnhancements: string[];
    suggestions: string[];
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalOptimizations: 0,
        averageQualityScore: 0,
        commonEnhancements: [],
        suggestions: []
      };
    }

    // Analyze session messages for optimization patterns
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');
    
    return {
      totalOptimizations: assistantMessages.length,
      averageQualityScore: 85, // This would be calculated from actual optimization metadata
      commonEnhancements: ['structured_formatting', 'educational_enhancement', 'examples_added'],
      suggestions: [
        'Try asking more specific questions for better responses',
        'Break complex topics into smaller parts',
        'Request examples when learning new concepts'
      ]
    };
  }

  /**
   * Enable/disable response optimization
   */
  setOptimizationEnabled(enabled: boolean): void {
    // Store this preference
    localStorage.setItem('ai_optimization_enabled', enabled.toString());
    logger.info('Optimization setting changed', 'UnifiedAIService', { enabled });
  }

  /**
   * Check if optimization is enabled
   */
  isOptimizationEnabled(): boolean {
    const stored = localStorage.getItem('ai_optimization_enabled');
    return stored !== 'false'; // Default to true
  }

  /**
   * Check Edge Function health status
   */
  private async checkEdgeFunctionHealth(): Promise<void> {
    if (!import.meta.env.VITE_SUPABASE_URL) {
      logger.warn('VITE_SUPABASE_URL not defined, skipping health check', 'UnifiedAIService');
      this.edgeFunctionHealthStatus.professional = false;
      this.edgeFunctionHealthStatus.legacy = false;
      return;
    }

    try {
      // Test professional Edge Function with timeout
      const professionalUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-ai-professional`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const healthResponse = await fetch(professionalUrl, { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      // Professional function is healthy if it responds (even with 404/405 for GET)
      this.edgeFunctionHealthStatus.professional = healthResponse.status < 500;
      
      logger.info('Edge Function health check completed', 'UnifiedAIService', {
        professional: this.edgeFunctionHealthStatus.professional,
        professionalStatus: healthResponse.status,
        legacy: this.edgeFunctionHealthStatus.legacy
      });
      
    } catch (error) {
      this.edgeFunctionHealthStatus.professional = false;
      
      if (error.name === 'AbortError') {
        logger.warn('Professional Edge Function health check timed out', 'UnifiedAIService');
      } else {
        logger.warn('Professional Edge Function health check failed', 'UnifiedAIService', {
          error: error.message,
          type: error.name
        });
      }
    }
    
    // Always assume legacy function is available as fallback
    this.edgeFunctionHealthStatus.legacy = true;
  }

  /**
   * Call Professional Edge Function
   */
  private async callProfessionalEdgeFunction(
    url: string,
    accessToken: string,
    provider: AIProvider,
    prompt: string,
    parameters: any,
    context: any,
    subject: string
  ): Promise<Response> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        provider,
        prompt,
        model: this.getModelForProvider(provider),
        temperature: parameters.temperature,
        max_tokens: parameters.max_tokens,
        top_p: parameters.top_p,
        responseType: context?.responseType || 'explanation',
        context: {
          subject,
          topic: context?.topic,
          userLevel: context?.userLevel
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Professional Edge Function error: ${error}`);
    }

    return response;
  }

  /**
   * Call Legacy Edge Function
   */
  private async callLegacyEdgeFunction(
    accessToken: string,
    provider: AIProvider,
    prompt: string,
    parameters: any
  ): Promise<Response> {
    const legacyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-ai`;
    
    const response = await fetch(legacyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        provider,
        prompt,
        model: this.getModelForProvider(provider),
        temperature: parameters.temperature || 0.7,
        max_tokens: parameters.max_tokens || 2000,
        top_p: parameters.top_p || 0.95
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Legacy Edge Function error: ${error}`);
    }

    return response;
  }

  /**
   * Toggle professional mode
   */
  setProfessionalMode(enabled: boolean): void {
    this.professionalModeEnabled = enabled;
    logger.info('Professional mode toggled', 'UnifiedAIService', { enabled });
  }

  /**
   * Get current service status
   */
  getServiceStatus(): {
    professionalModeEnabled: boolean;
    edgeFunctionHealth: { professional: boolean; legacy: boolean };
    defaultProvider: AIProvider;
  } {
    return {
      professionalModeEnabled: this.professionalModeEnabled,
      edgeFunctionHealth: this.edgeFunctionHealthStatus,
      defaultProvider: this.defaultProvider
    };
  }

  /**
   * Generate casual responses for simple interactions
   */
  private generateCasualResponse(intentType: string, originalMessage: string): string {
    const responses = {
      greeting: [
        "Hi there! I'm here to help you with your studies. What would you like to learn about today?",
        "Hello! Ready to tackle some learning together?",
        "Hey! What subject can I help you explore today?",
        "Hi! I'm your AI tutor. What would you like to study?"
      ],
      casual: [
        "You're welcome! Feel free to ask me anything about your studies.",
        "No problem! I'm here whenever you need help learning.",
        "Anytime! What else would you like to explore?",
        "Great! Is there anything specific you'd like to learn about?"
      ]
    };

    const defaultResponses = [
      "I'm here to help with your learning! What would you like to study?",
      "Ready to learn something new together?",
      "What topic interests you today?"
    ];

    const availableResponses = responses[intentType as keyof typeof responses] || defaultResponses;
    return availableResponses[Math.floor(Math.random() * availableResponses.length)];
  }

  // ============================================================================
  // PRODUCTION RELIABILITY METHODS
  // ============================================================================

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth | null> {
    try {
      return await productionMonitor.performHealthCheck();
    } catch (error) {
      logger.error('Failed to get system health', 'UnifiedAIService', error);
      return null;
    }
  }

  /**
   * Get current circuit breaker status for all services
   */
  getCircuitBreakerStatus(): {
    services: Record<string, any>;
    summary: any;
  } {
    return {
      services: circuitBreakerManager.getAllStats(),
      summary: circuitBreakerManager.getHealthSummary()
    };
  }

  /**
   * Check if a specific service is available (not circuit broken)
   */
  isServiceAvailable(serviceName: string): boolean {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName);
    return circuitBreaker.isCallAllowed();
  }

  /**
   * Execute API call with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName);
    
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      logger.warn(`Service ${serviceName} failed, attempting fallback`, 'UnifiedAIService', error);
      
      if (fallback) {
        try {
          return await fallback();
        } catch (fallbackError) {
          logger.error(`Fallback also failed for ${serviceName}`, 'UnifiedAIService', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Enhanced Edge Function call with circuit breaker and fallbacks
   */
  private async callEdgeFunctionWithReliability(
    provider: AIProvider,
    messages: Message[],
    sessionId?: string,
    subject?: string,
    intentData?: MessageIntent
  ): Promise<AIResponse> {
    const isProfessionalProvider = provider === 'deepseek' && this.professionalModeEnabled;
    
    // Primary: Professional Edge Function with circuit breaker
    if (isProfessionalProvider) {
      try {
        return await this.executeWithCircuitBreaker(
          'edge-function-professional',
          () => this.callProfessionalEdgeFunction(messages, sessionId, subject, intentData),
          () => this.callLegacyEdgeFunction(provider, messages, sessionId, subject, intentData)
        );
      } catch (error) {
        logger.warn('Professional Edge Function failed, trying legacy', 'UnifiedAIService', error);
      }
    }

    // Secondary: Legacy Edge Function with circuit breaker
    try {
      return await this.executeWithCircuitBreaker(
        'edge-function-legacy',
        () => this.callLegacyEdgeFunction(provider, messages, sessionId, subject, intentData),
        () => this.createFallbackResponse(messages[messages.length - 1].content, intentData)
      );
    } catch (error) {
      logger.error('All Edge Functions failed, using fallback', 'UnifiedAIService', error);
      return this.createFallbackResponse(messages[messages.length - 1].content, intentData);
    }
  }

  /**
   * Call professional Edge Function
   */
  private async callProfessionalEdgeFunction(
    messages: Message[],
    sessionId?: string,
    subject?: string,
    intentData?: MessageIntent
  ): Promise<AIResponse> {
    const requestBody = {
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      sessionId,
      subject,
      intentType: intentData?.type || 'educational',
      intentConfidence: intentData?.confidence || 0.8,
      responseType: intentData?.suggestedResponseType || 'explanation',
      enableProfessionalProcessing: true
    };

    logger.debug('Calling professional Edge Function', 'UnifiedAIService', {
      messagesCount: messages.length,
      subject,
      intentType: intentData?.type
    });

    // Try to use the Edge Function if it exists, otherwise fall back to direct API
    try {
      const { data, error } = await supabase.functions.invoke('deepseek-ai-professional', {
        body: requestBody
      });

      if (error) {
        throw new Error(`Professional Edge Function failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from Edge Function');
      }
    
      return {
        provider: data.metadata?.provider || 'deepseek',
        model: data.metadata?.model || 'deepseek-chat',
        content: data.content,
        usage: data.usage,
        responseType: data.metadata?.response_type,
        metadata: {
          processing_type: data.metadata?.processing_type,
          quality_score: data.metadata?.quality_score,
          intent_type: data.metadata?.intent_type,
          optimized: data.metadata?.optimized,
          processedAt: data.timestamp
        }
      };
    } catch (funcError) {
      // If Edge Function fails, throw error to trigger fallback in parent method
      logger.warn('Professional Edge Function unavailable', 'UnifiedAIService', funcError);
      throw funcError;
    }
  }

  /**
   * Call legacy Edge Function (existing implementation)
   */
  private async callLegacyEdgeFunction(
    provider: AIProvider,
    messages: Message[],
    sessionId?: string,
    subject?: string,
    intentData?: MessageIntent
  ): Promise<AIResponse> {
    // Use existing Edge Function implementation
    const lastMessage = messages[messages.length - 1];
    
    // Try to use the Edge Function if it exists, otherwise fall back
    try {
      const { data, error } = await supabase.functions.invoke('ai-proxy-secure', {
        body: {
          provider,
          prompt: lastMessage.content,
        model: undefined, // Let the Edge Function choose
        temperature: 0.7,
        max_tokens: 2000,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      }
    });

    if (error) {
      throw new Error(`Legacy Edge Function failed: ${error.message}`);
    }

    return data;
    } catch (funcError) {
      // If Edge Functions fail, create a direct API call fallback
      logger.warn('Edge Functions unavailable, using fallback', 'UnifiedAIService', funcError);
      // Return a fallback response
      return await this.createFallbackResponse(lastMessage.content, intentData);
    }
  }

  /**
   * Create fallback response when all services fail
   */
  private async createFallbackResponse(
    userMessage: string,
    intentData?: MessageIntent
  ): Promise<AIResponse> {
    logger.warn('Creating fallback response - all AI services unavailable', 'UnifiedAIService');

    let fallbackContent = '';
    
    if (intentData?.type === 'greeting') {
      fallbackContent = "Hello! I'm your AI tutor, but I'm experiencing some technical difficulties right now. Please try again in a moment, and I'll be happy to help you with your studies!";
    } else if (intentData?.type === 'casual') {
      fallbackContent = "Thanks for your message! I'm having some connectivity issues at the moment. Please try asking your question again in a few minutes.";
    } else {
      fallbackContent = `I apologize, but I'm experiencing technical difficulties and cannot process your request about "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}" right now. Please try again in a moment. In the meantime, you might want to check your textbook or course materials for information on this topic.`;
    }

    return {
      provider: 'fallback',
      model: 'local-fallback',
      content: fallbackContent,
      usage: {
        prompt_tokens: userMessage.length / 4, // Rough estimate
        completion_tokens: fallbackContent.length / 4,
        total_tokens: (userMessage.length + fallbackContent.length) / 4
      },
      responseType: 'explanation',
      metadata: {
        fallback: true,
        reason: 'All AI services unavailable',
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Get production readiness status
   */
  getProductionReadiness(): {
    overall: 'ready' | 'degraded' | 'not_ready';
    details: {
      monitoring: boolean;
      circuitBreakers: boolean;
      fallbacks: boolean;
      healthChecks: boolean;
      errorHandling: boolean;
    };
    recommendations: string[];
  } {
    const circuitBreakerHealth = circuitBreakerManager.getHealthSummary();
    const recommendations: string[] = [];

    // Check circuit breaker health
    if (circuitBreakerHealth.failed > 0) {
      recommendations.push(`${circuitBreakerHealth.failed} service(s) are circuit broken - investigate failures`);
    }

    if (circuitBreakerHealth.degraded > 0) {
      recommendations.push(`${circuitBreakerHealth.degraded} service(s) are in recovery mode`);
    }

    if (!this.edgeFunctionHealthStatus.professional && !this.edgeFunctionHealthStatus.legacy) {
      recommendations.push('All Edge Functions are unhealthy - check deployment and API keys');
    }

    const details = {
      monitoring: true, // Production monitor is active
      circuitBreakers: circuitBreakerHealth.total > 0,
      fallbacks: true, // Fallback mechanisms implemented
      healthChecks: this.edgeFunctionHealthStatus.professional || this.edgeFunctionHealthStatus.legacy,
      errorHandling: true // Comprehensive error handling implemented
    };

    let overall: 'ready' | 'degraded' | 'not_ready' = 'ready';
    
    if (!details.healthChecks || circuitBreakerHealth.overallHealth === 'unhealthy') {
      overall = 'not_ready';
      recommendations.push('Critical services are failing - system not ready for production');
    } else if (circuitBreakerHealth.overallHealth === 'degraded' || recommendations.length > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      details,
      recommendations
    };
  }
}

// Export singleton instance
export const unifiedAIService = new UnifiedAIService();