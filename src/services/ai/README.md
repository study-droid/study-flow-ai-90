# Multi-Provider AI Service Router

A comprehensive AI service routing system that provides intelligent provider selection, automatic fallbacks, and robust error handling for StudyFlow AI.

## Overview

The Multi-Provider AI Service Router enables StudyFlow AI to work with multiple AI providers (DeepSeek, OpenAI, Claude, Gemini, Edge Functions) through a unified interface. It automatically selects the best provider based on availability, performance, and specific requirements.

## Key Features

- **Intelligent Provider Selection**: Automatically chooses the best provider based on capabilities, performance, and availability
- **Automatic Fallbacks**: Seamlessly switches to backup providers when primary services fail
- **Health Monitoring**: Real-time monitoring of provider health and performance
- **Capability Matching**: Routes requests to providers that excel at specific tasks
- **Circuit Breaker Protection**: Prevents cascading failures with automatic recovery
- **Performance Optimization**: Caching, rate limiting, and response time optimization
- **Production Ready**: Comprehensive error handling and monitoring for production use

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Tutor UI   │───▶│ Unified AI       │───▶│ Provider Router │
│   Components    │    │ Service          │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 │                                 │
                       ▼                                 ▼                                 ▼
              ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
              │ DeepSeek        │              │ Edge Function   │              │ OpenAI/Claude   │
              │ Provider        │              │ Provider        │              │ Providers       │
              └─────────────────┘              └─────────────────┘              └─────────────────┘
```

## Quick Start

### Basic Usage

```typescript
import { unifiedAIService } from '@/services/ai';

// Send a message with automatic provider selection
const response = await unifiedAIService.sendMessage({
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  modelConfig: {
    model: 'chat',
    temperature: 0.7,
    maxTokens: 500
  },
  requestId: 'unique-request-id'
});

console.log(response.content);
console.log('Provider used:', response.providerId);
```

### Streaming Responses

```typescript
// Stream responses for real-time display
for await (const chunk of unifiedAIService.streamMessage(request)) {
  if (chunk.type === 'content') {
    console.log(chunk.content);
  } else if (chunk.type === 'done') {
    console.log('Streaming completed');
  }
}
```

### Provider-Specific Requests

```typescript
// Request from a specific provider
const response = await unifiedAIService.sendMessage({
  messages: [{ role: 'user', content: 'Write Python code' }],
  modelConfig: { model: 'code', temperature: 0.2, maxTokens: 800 },
  requestId: 'code-request',
  preferredProvider: 'deepseek' // Use DeepSeek for code generation
});
```

### Capability-Based Selection

```typescript
// Request providers with specific capabilities
const response = await unifiedAIService.sendMessage({
  messages: [{ role: 'user', content: 'Solve this math problem' }],
  modelConfig: { model: 'reasoning', temperature: 0.1, maxTokens: 400 },
  requestId: 'math-request',
  requiredCapabilities: ['reasoning', 'math']
});
```

## Provider Configuration

### Available Providers

1. **DeepSeek** - Fast, cost-effective AI with excellent code generation
2. **Edge Function Professional** - High-quality responses through Supabase Edge Functions
3. **OpenAI** - Industry-leading AI models (GPT-4, GPT-3.5)
4. **Anthropic Claude** - Advanced reasoning and safety-focused AI
5. **Google Gemini** - Fast, versatile AI with competitive performance

### Provider Capabilities

Each provider is configured with specific capabilities:

- **Text Generation**: General conversational AI
- **Code Generation**: Programming and technical content
- **Reasoning**: Complex problem-solving and analysis
- **Creative Writing**: Creative and artistic content
- **Math**: Mathematical problem-solving
- **Streaming**: Real-time response streaming

### Priority and Fallback Chain

Providers are prioritized based on:
1. **Performance**: Response time and reliability
2. **Cost**: API costs and rate limits
3. **Quality**: Output quality for specific tasks
4. **Availability**: Current health status

Default fallback chain: `DeepSeek → Edge Function → OpenAI → Claude → Gemini`

## Health Monitoring

### Service Health Status

```typescript
const health = unifiedAIService.getServiceHealth();
console.log('Overall status:', health.overall); // 'healthy' | 'degraded' | 'unhealthy'

health.providers.forEach(provider => {
  console.log(`${provider.id}: ${provider.status}`);
  console.log(`Response time: ${provider.responseTime}ms`);
  console.log(`Error rate: ${provider.errorRate * 100}%`);
});
```

### Production Readiness

```typescript
const readiness = unifiedAIService.getProductionReadiness();
console.log('Production ready:', readiness.overall); // 'ready' | 'degraded' | 'not-ready'

if (readiness.recommendations.length > 0) {
  console.log('Recommendations:', readiness.recommendations);
}
```

## Advanced Features

### Custom Provider Selection

```typescript
import { aiProviderRouter } from '@/services/ai';

// Select provider with specific criteria
const provider = aiProviderRouter.selectProvider({
  requiredCapabilities: ['code-generation'],
  preferredSpeed: 'fast',
  maxCostTier: 'low',
  excludeProviders: ['expensive-provider']
});
```

### Provider Health Management

```typescript
// Check specific provider availability
const isAvailable = unifiedAIService.isServiceAvailable('deepseek');

// Switch to a different provider
const switched = unifiedAIService.switchProvider('openai');

// Reset all services (circuit breakers, caches)
unifiedAIService.resetServices();
```

### Routing Statistics

```typescript
const stats = unifiedAIService.getRoutingStats();
console.log(`${stats.onlineProviders}/${stats.totalProviders} providers online`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);
```

## Error Handling

The router provides comprehensive error handling:

### Automatic Fallbacks

When a provider fails, the system automatically:
1. Marks the provider as degraded
2. Tries the next provider in the fallback chain
3. Updates health metrics
4. Returns a successful response from the fallback provider

### Circuit Breaker Protection

Circuit breakers prevent cascading failures:
- **Closed**: Normal operation
- **Open**: Provider temporarily disabled after failures
- **Half-Open**: Testing if provider has recovered

### Graceful Degradation

When all providers fail:
- Returns a user-friendly error message
- Logs detailed error information for debugging
- Maintains service availability with cached responses when possible

## Configuration

### Environment Variables

```bash
# API Keys for direct providers
VITE_DEEPSEEK_API_KEY=your_deepseek_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key
VITE_GEMINI_API_KEY=your_gemini_key

# Supabase configuration for edge functions
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Service Configuration

```typescript
const service = new UnifiedAIService({
  defaultProvider: 'deepseek',
  enableFallback: true,
  maxRetryAttempts: 3,
  retryDelay: 1000,
  enableMetrics: true
});
```

## Testing

Run the test suite:

```bash
npm test -- src/services/ai/__tests__/
```

Test specific components:

```bash
npm test -- src/services/ai/__tests__/ai-provider-router.test.ts
npm test -- src/services/ai/__tests__/unified-ai-service.test.ts
```

## Examples

See `src/services/ai/examples/router-usage-example.ts` for comprehensive usage examples including:

- Basic message sending
- Streaming responses
- Provider-specific requests
- Capability analysis
- Health monitoring
- Production readiness checks
- Advanced provider selection
- Service management

## Integration with Existing Code

The router is designed to be backward compatible with existing AI service code:

```typescript
// Old way (still works)
import { deepSeekHandler } from '@/lib/unified-deepseek-handler';

// New way (recommended)
import { unifiedAIService } from '@/services/ai';
```

## Performance Considerations

### Caching

- Response caching reduces API calls
- Intelligent cache invalidation
- Memory-efficient storage

### Rate Limiting

- Per-provider rate limiting
- Burst handling
- Queue management for high-volume requests

### Connection Management

- Connection pooling
- Request deduplication
- Timeout handling

## Security

### API Key Management

- Secure environment variable storage
- No API keys in client-side code
- Automatic key rotation support

### Request Validation

- Input sanitization
- Output filtering
- Rate limit enforcement

### Audit Logging

- Request/response logging
- Error tracking
- Performance monitoring

## Troubleshooting

### Common Issues

1. **No providers available**
   - Check API key configuration
   - Verify network connectivity
   - Check provider health status

2. **High error rates**
   - Review rate limits
   - Check API quotas
   - Monitor provider health

3. **Slow responses**
   - Check network latency
   - Review provider selection criteria
   - Monitor circuit breaker status

### Debug Mode

Enable debug logging:

```typescript
// Check service health
const health = unifiedAIService.getServiceHealth();
console.log('Service health:', health);

// Check routing stats
const stats = unifiedAIService.getRoutingStats();
console.log('Routing stats:', stats);
```

## Contributing

When adding new providers:

1. Extend `BaseAIProvider` class
2. Implement required methods
3. Add provider configuration to router
4. Update tests and documentation
5. Add usage examples

## License

This AI service router is part of StudyFlow AI and follows the project's licensing terms.