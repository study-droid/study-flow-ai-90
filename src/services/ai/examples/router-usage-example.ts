/**
 * Multi-Provider AI Service Router Usage Examples
 * Demonstrates how to use the new AI provider routing system
 */

import { 
  unifiedAIService, 
  aiProviderRouter,
  type AIRequest,
  type ProviderSelectionCriteria 
} from '../index';

/**
 * Example 1: Basic message sending with automatic provider selection
 */
export async function basicMessageExample() {
  const request: AIRequest = {
    messages: [
      { role: 'user', content: 'Explain quantum computing in simple terms' }
    ],
    modelConfig: {
      model: 'chat',
      temperature: 0.7,
      maxTokens: 500
    },
    requestId: `example_${Date.now()}`
  };

  try {
    const response = await unifiedAIService.sendMessage(request);
    console.log('Response:', response.content);
    console.log('Provider used:', response.providerId);
    console.log('Fallback used:', response.fallbackUsed);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 2: Streaming with provider selection criteria
 */
export async function streamingWithCriteriaExample() {
  const request: AIRequest = {
    messages: [
      { role: 'user', content: 'Write a Python function to calculate fibonacci numbers' }
    ],
    modelConfig: {
      model: 'code',
      temperature: 0.3,
      maxTokens: 300
    },
    requestId: `streaming_${Date.now()}`,
    requiredCapabilities: ['code-generation', 'streaming'],
    stream: true
  };

  try {
    console.log('Starting streaming response...');
    
    for await (const chunk of unifiedAIService.streamMessage(request)) {
      if (chunk.type === 'content') {
        process.stdout.write(chunk.content);
      } else if (chunk.type === 'done') {
        console.log('\n\nStreaming completed');
        if (chunk.usage) {
          console.log('Tokens used:', chunk.usage.totalTokens);
        }
      } else if (chunk.type === 'error') {
        console.error('Streaming error:', chunk.error);
      }
    }
  } catch (error) {
    console.error('Streaming failed:', error);
  }
}

/**
 * Example 3: Provider-specific requests
 */
export async function providerSpecificExample() {
  // Request specifically using DeepSeek for code generation
  const codeRequest: AIRequest = {
    messages: [
      { role: 'user', content: 'Create a React component for a todo list' }
    ],
    modelConfig: {
      model: 'code',
      temperature: 0.2,
      maxTokens: 800
    },
    requestId: `code_${Date.now()}`,
    preferredProvider: 'deepseek'
  };

  try {
    const response = await unifiedAIService.sendMessage(codeRequest);
    console.log('DeepSeek code response:', response.content.substring(0, 200) + '...');
  } catch (error) {
    console.error('DeepSeek request failed:', error);
  }

  // Request using Edge Function for professional responses
  const professionalRequest: AIRequest = {
    messages: [
      { role: 'user', content: 'Explain the business impact of AI in education' }
    ],
    modelConfig: {
      model: 'chat',
      temperature: 0.6,
      maxTokens: 600
    },
    requestId: `professional_${Date.now()}`,
    preferredProvider: 'edge-function-professional'
  };

  try {
    const response = await unifiedAIService.sendMessage(professionalRequest);
    console.log('Professional response:', response.content.substring(0, 200) + '...');
  } catch (error) {
    console.error('Professional request failed:', error);
  }
}

/**
 * Example 4: Provider capability analysis
 */
export function providerCapabilityExample() {
  console.log('=== Provider Capability Analysis ===');
  
  // Get all available providers
  const providers = unifiedAIService.getAvailableProviders();
  console.log(`Total providers: ${providers.length}`);
  
  providers.forEach(provider => {
    console.log(`\n${provider.name} (${provider.id}):`);
    console.log(`  Type: ${provider.type}`);
    console.log(`  Priority: ${provider.priority}`);
    console.log('  Capabilities:');
    
    provider.capabilities.forEach(cap => {
      console.log(`    - ${cap.type}: ${cap.quality} quality, ${cap.speed} speed, ${cap.costTier} cost`);
    });
  });

  // Find best providers for specific capabilities
  console.log('\n=== Best Providers by Capability ===');
  
  const capabilities = ['code-generation', 'reasoning', 'creative-writing', 'streaming'];
  
  capabilities.forEach(capability => {
    const bestProviders = unifiedAIService.getBestProvidersForCapability(capability);
    console.log(`\n${capability}:`);
    
    bestProviders.slice(0, 3).forEach((provider, index) => {
      const cap = provider.capabilities.find(c => c.type === capability);
      console.log(`  ${index + 1}. ${provider.name} (${cap?.quality} quality)`);
    });
  });
}

/**
 * Example 5: Service health monitoring
 */
export function serviceHealthExample() {
  console.log('=== Service Health Status ===');
  
  const health = unifiedAIService.getServiceHealth();
  console.log(`Overall status: ${health.overall}`);
  console.log(`Last check: ${health.lastCheck.toISOString()}`);
  
  console.log('\nProvider Health:');
  health.providers.forEach(provider => {
    console.log(`  ${provider.id}: ${provider.status}`);
    console.log(`    Response time: ${provider.responseTime}ms`);
    console.log(`    Error rate: ${(provider.errorRate * 100).toFixed(1)}%`);
    console.log(`    Last success: ${provider.lastSuccess.toISOString()}`);
  });

  console.log('\nService Metrics:');
  console.log(`  Total requests: ${health.metrics.totalRequests}`);
  console.log(`  Success rate: ${((health.metrics.successfulRequests / health.metrics.totalRequests) * 100).toFixed(1)}%`);
  console.log(`  Average response time: ${health.metrics.averageResponseTime.toFixed(0)}ms`);
}

/**
 * Example 6: Production readiness check
 */
export function productionReadinessExample() {
  console.log('=== Production Readiness Check ===');
  
  const readiness = unifiedAIService.getProductionReadiness();
  console.log(`Overall readiness: ${readiness.overall}`);
  
  console.log('\nChecks:');
  Object.entries(readiness.checks).forEach(([check, passed]) => {
    console.log(`  ${check}: ${passed ? '✓' : '✗'}`);
  });
  
  if (readiness.recommendations.length > 0) {
    console.log('\nRecommendations:');
    readiness.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }
}

/**
 * Example 7: Advanced provider selection
 */
export async function advancedProviderSelectionExample() {
  console.log('=== Advanced Provider Selection ===');
  
  // Select provider for fast, low-cost text generation
  const fastCriteria: ProviderSelectionCriteria = {
    requiredCapabilities: ['text-generation'],
    preferredSpeed: 'fast',
    maxCostTier: 'low'
  };
  
  const fastProvider = aiProviderRouter.selectProvider(fastCriteria);
  console.log('Fast, low-cost provider:', fastProvider?.name || 'None available');
  
  // Select provider for high-quality reasoning
  const reasoningCriteria: ProviderSelectionCriteria = {
    requiredCapabilities: ['reasoning'],
    maxCostTier: 'high' // Allow higher cost for better quality
  };
  
  const reasoningProvider = aiProviderRouter.selectProvider(reasoningCriteria);
  console.log('High-quality reasoning provider:', reasoningProvider?.name || 'None available');
  
  // Select provider excluding specific ones
  const excludeCriteria: ProviderSelectionCriteria = {
    requiredCapabilities: ['text-generation'],
    excludeProviders: ['deepseek'] // Exclude DeepSeek for this request
  };
  
  const alternativeProvider = aiProviderRouter.selectProvider(excludeCriteria);
  console.log('Alternative provider (excluding DeepSeek):', alternativeProvider?.name || 'None available');
}

/**
 * Example 8: Service management operations
 */
export function serviceManagementExample() {
  console.log('=== Service Management ===');
  
  // Get routing statistics
  const stats = unifiedAIService.getRoutingStats();
  console.log('Routing Statistics:');
  console.log(`  Total providers: ${stats.totalProviders}`);
  console.log(`  Online: ${stats.onlineProviders}`);
  console.log(`  Degraded: ${stats.degradedProviders}`);
  console.log(`  Offline: ${stats.offlineProviders}`);
  console.log(`  Average response time: ${stats.averageResponseTime.toFixed(0)}ms`);
  
  // Switch to a specific provider
  console.log('\nSwitching to DeepSeek as default...');
  const switched = unifiedAIService.switchProvider('deepseek');
  console.log(`Switch successful: ${switched}`);
  
  // Reset services (circuit breakers, caches, etc.)
  console.log('\nResetting all services...');
  unifiedAIService.resetServices();
  console.log('Services reset completed');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Multi-Provider AI Service Router Examples\n');
  
  try {
    // Static examples (no API calls)
    providerCapabilityExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    serviceHealthExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    productionReadinessExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await advancedProviderSelectionExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    serviceManagementExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // API examples (commented out to avoid actual API calls in demo)
    // await basicMessageExample();
    // await streamingWithCriteriaExample();
    // await providerSpecificExample();
    
    console.log('✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  (window as any).aiRouterExamples = {
    basicMessageExample,
    streamingWithCriteriaExample,
    providerSpecificExample,
    providerCapabilityExample,
    serviceHealthExample,
    productionReadinessExample,
    advancedProviderSelectionExample,
    serviceManagementExample,
    runAllExamples
  };
}