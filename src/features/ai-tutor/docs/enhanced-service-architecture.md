# Enhanced AI Tutor Service Architecture

## Overview

The Enhanced AI Tutor Service is a comprehensive refactor that introduces multi-provider support, intelligent routing, and automatic fallback mechanisms to ensure reliable AI tutoring functionality.

## Key Features

### 1. Multi-Provider Support
- **DeepSeek**: Primary provider (fast, cost-effective)
- **Edge Function Professional**: High-quality multi-model support
- **OpenAI**: Reliable fallback option
- **Anthropic Claude**: Alternative high-quality provider
- **Google Gemini**: Additional provider option

### 2. Intelligent Provider Routing
- Automatic provider selection based on:
  - Provider health status
  - Response time metrics
  - Error rates
  - Capability requirements
  - Cost considerations
  - Request priority

### 3. Automatic Fallback Chains
- Cascading fallback system
- Intelligent provider switching on failures
- Health-based provider exclusion
- Configurable fallback priorities

### 4. Service Health Monitoring
- Real-time provider health tracking
- Automatic circuit breaker management
- Performance metrics collection
- Proactive provider switching

## Architecture Components

### Core Service Layer

```typescript
class AITutorService {
  // Provider management
  private currentProvider: string | null
  private fallbackChain: string[]
  
  // Health monitoring
  private healthMonitoringInterval: NodeJS.Timeout | null
  
  // Core methods
  sendMessage(message, sessionId, options): Promise<DeepSeekResponse>
  sendMessageDirect(message, sessionId, options): Promise<DeepSeekResponse>
  selectProvider(options): string | null
  getServiceHealth(): ServiceHealthStatus
  switchProvider(providerId): boolean
}
```

### Provider Router Integration

The service integrates with the unified AI provider router:

```typescript
import { 
  unifiedAIService,
  aiProviderRouter 
} from '@/services/ai/'

// Provider selection
const selectedProvider = aiProviderRouter.selectProvider(criteria)

// Health monitoring
const health = aiProviderRouter.getAllProviderHealth()

// Streaming with fallback
for await (const chunk of unifiedAIService.streamMessage(request)) {
  // Handle streaming response
}
```

### Fallback Chain Configuration

Default fallback priority:
1. **DeepSeek** - Primary (fast, reliable, cost-effective)
2. **Edge Function Professional** - Secondary (high quality)
3. **OpenAI** - Tertiary (reliable fallback)
4. **Anthropic Claude** - Quaternary (alternative quality option)
5. **Google Gemini** - Final (additional option)

## Provider Selection Criteria

### Capability-Based Selection
```typescript
const criteria: ProviderSelectionCriteria = {
  requiredCapabilities: ['text-generation', 'streaming'],
  preferredSpeed: 'fast',
  maxCostTier: 'medium',
  excludeProviders: ['offline-provider']
}
```

### Priority-Based Selection
- **High Priority**: Fast providers, higher cost tolerance
- **Normal Priority**: Balanced speed/cost
- **Low Priority**: Cost-optimized selection

### Health-Based Filtering
- Only online/degraded providers considered
- Offline providers automatically excluded
- Circuit breaker states respected

## Error Handling & Recovery

### Enhanced Error Classification
```typescript
interface ClassifiedError {
  category: 'network' | 'authentication' | 'api' | 'application'
  severity: 'low' | 'medium' | 'high' | 'critical'
  retryable: boolean
  fallbackAvailable: boolean
  recoveryActions: RecoveryAction[]
}
```

### Automatic Recovery Actions
1. **Provider Switching**: Automatic fallback to next provider
2. **Circuit Breaker Reset**: Intelligent circuit breaker management
3. **Request Retry**: Exponential backoff retry logic
4. **Service Reset**: Full service reset as last resort

### User-Friendly Error Messages
- Contextual error explanations
- Actionable recovery suggestions
- Progress indicators during recovery
- Manual override options

## Service Health Monitoring

### Health Metrics
```typescript
interface ServiceHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  providers: ProviderHealth[]
  lastCheck: Date
  metrics: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
  }
}
```

### Automatic Health Checks
- Provider availability monitoring
- Response time tracking
- Error rate calculation
- Circuit breaker state management

### Proactive Provider Management
- Automatic provider switching on degradation
- Health-based provider exclusion
- Performance-based provider prioritization

## Integration with Existing Systems

### Request Queue Integration
```typescript
// Queue-aware processing
if (useQueue) {
  result = await requestQueueService.queueRequest(
    message,
    sessionId,
    { ...options, preferredProvider: selectedProviderId },
    priority,
    maxRetries
  )
}
```

### Error Recovery Integration
```typescript
// Enhanced error handling with provider awareness
const classifiedError = errorHandler.classifyError(error, context)
if (classifiedError.retryable && classifiedError.fallbackAvailable) {
  const fallbackProvider = this.getNextFallbackProvider(currentProvider)
  // Retry with fallback provider
}
```

### Cache Integration
- Provider-aware caching
- Response caching across providers
- Cache invalidation on provider switches

## Usage Examples

### Basic Message Sending
```typescript
const response = await aiTutorService.sendMessage(
  'Explain quantum physics',
  sessionId,
  {
    model: 'deepseek-chat',
    temperature: 0.7,
    mode: 'chat',
    priority: 0,
    useQueue: true
  }
)
```

### Provider Management
```typescript
// Get available providers
const providers = aiTutorService.getAvailableProviders()

// Switch to specific provider
const success = aiTutorService.switchProvider('openai')

// Get service health
const health = aiTutorService.getServiceHealth()

// Reset all services
aiTutorService.resetServices()
```

### Event Handling
```typescript
const handleEvent = (event: ChatEvent) => {
  switch (event.type) {
    case 'provider_switch':
      console.log('Provider switched:', event.data)
      break
    case 'thinking_start':
      setThinking(event.data.reasoning)
      break
    case 'message_delta':
      updateContent(event.data.fullContent)
      break
  }
}
```

## Performance Optimizations

### Intelligent Caching
- Provider-specific cache keys
- Response similarity matching
- Cache hit rate optimization

### Streaming Optimizations
- Efficient chunk processing
- Minimal UI re-renders
- Progressive content updates

### Resource Management
- Connection pooling
- Request deduplication
- Memory-efficient processing

## Security Considerations

### API Key Management
- Secure provider credential storage
- Environment-specific key management
- Automatic key rotation support

### Request Validation
- Input sanitization
- Output filtering
- Rate limit compliance

### Error Information Security
- Sensitive data redaction
- Secure error logging
- User-safe error messages

## Monitoring & Analytics

### Service Metrics
- Provider performance tracking
- Request success rates
- Response time analysis
- Error pattern detection

### User Experience Metrics
- Thinking state duration
- Response quality scores
- User satisfaction indicators
- Feature usage patterns

## Future Enhancements

### Planned Features
1. **Dynamic Provider Discovery**: Automatic provider registration
2. **ML-Based Provider Selection**: Learning from usage patterns
3. **Advanced Caching**: Semantic similarity caching
4. **Real-time Health Dashboards**: Live monitoring interfaces
5. **A/B Testing Framework**: Provider performance comparison

### Scalability Improvements
1. **Horizontal Scaling**: Multi-instance provider management
2. **Load Balancing**: Intelligent request distribution
3. **Geographic Routing**: Location-based provider selection
4. **Edge Computing**: Distributed processing capabilities

## Migration Guide

### From Legacy Service
1. Update imports to use singleton instance
2. Replace direct fallback service calls
3. Update error handling patterns
4. Integrate with new event system

### Configuration Updates
1. Set provider preferences
2. Configure fallback chains
3. Update health check intervals
4. Set performance thresholds

### Testing Considerations
1. Mock provider router in tests
2. Test fallback scenarios
3. Verify health monitoring
4. Validate error recovery