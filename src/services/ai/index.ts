/**
 * AI Services Index
 * Exports all AI service components and providers
 */

// Main service
export { 
  UnifiedAIService, 
  unifiedAIService,
  type UnifiedAIServiceConfig,
  type ServiceHealthStatus,
  type ProductionReadiness
} from './unified-ai-service';

// Router
export { 
  AIProviderRouter, 
  aiProviderRouter,
  type AIProviderConfig,
  type AIProviderCapability,
  type RateLimitConfig,
  type ProviderHealth,
  type AIRequest,
  type AIResponse,
  type ProviderSelectionCriteria
} from './ai-provider-router';

// Base provider
export { 
  BaseAIProvider,
  type BaseAIRequest,
  type BaseAIResponse,
  type ProviderMetrics
} from './providers/base-provider';

// Specific providers
export { DeepSeekProvider } from './providers/deepseek-provider';
export { EdgeFunctionProvider, type EdgeFunctionConfig } from './providers/edge-function-provider';

// Re-export existing services for compatibility
export { 
  UnifiedDeepSeekHandler,
  deepSeekHandler,
  unifiedDeepSeekHandler,
  callDeepSeek,
  streamDeepSeek,
  getDeepSeekMetrics,
  performDeepSeekHealthCheck,
  type DeepSeekConfig,
  type DeepSeekRequest,
  type DeepSeekResponse,
  type DeepSeekMetrics
} from '../../lib/unified-deepseek-handler';