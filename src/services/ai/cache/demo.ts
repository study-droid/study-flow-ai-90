/**
 * Demo script showing the Enhanced Response Caching System in action
 */

import { globalCacheManager, CacheUtils, createCacheMonitor } from './index';
import type { AIRequest, AIResponse } from '../ai-provider-router';

// Demo function to showcase cache capabilities
export async function demoCacheSystem() {
  console.log('🚀 Enhanced AI Response Cache System Demo\n');

  // Sample requests and responses
  const requests: AIRequest[] = [
    {
      messages: [{ role: 'user', content: 'What is machine learning?' }],
      modelConfig: { temperature: 0.7, model: 'demo-model' },
      requestId: 'demo-1'
    },
    {
      messages: [{ role: 'user', content: 'Explain machine learning concepts' }],
      modelConfig: { temperature: 0.7, model: 'demo-model' },
      requestId: 'demo-2'
    },
    {
      messages: [{ role: 'user', content: 'What is the weather today?' }],
      modelConfig: { temperature: 0.7, model: 'demo-model' },
      requestId: 'demo-3'
    }
  ];

  const responses: AIResponse[] = [
    {
      id: 'resp-1',
      content: 'Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed.',
      providerId: 'demo-provider',
      cached: false,
      processingTime: 1200,
      requestId: 'demo-1',
      model: 'demo-model',
      fallbackUsed: false,
      metadata: {}
    },
    {
      id: 'resp-2',
      content: 'Machine learning involves algorithms that can learn patterns from data and make predictions or decisions.',
      providerId: 'demo-provider',
      cached: false,
      processingTime: 1100,
      requestId: 'demo-2',
      model: 'demo-model',
      fallbackUsed: false,
      metadata: {}
    },
    {
      id: 'resp-3',
      content: 'I don\'t have access to real-time weather data. Please check a weather service for current conditions.',
      providerId: 'demo-provider',
      cached: false,
      processingTime: 800,
      requestId: 'demo-3',
      model: 'demo-model',
      fallbackUsed: false,
      metadata: {}
    }
  ];

  // 1. Demonstrate basic caching
  console.log('📝 1. Basic Caching Operations');
  console.log('Storing first response...');
  await globalCacheManager.set(requests[0], responses[0]);
  
  console.log('Retrieving cached response...');
  const cachedResult = await globalCacheManager.get(requests[0]);
  console.log(`Cache hit: ${cachedResult.hit}`);
  console.log(`Response: ${cachedResult.response?.content.substring(0, 50)}...`);
  console.log(`Cache source: ${cachedResult.source}\n`);

  // 2. Demonstrate similarity matching
  console.log('🔍 2. Similarity Matching');
  console.log('Checking similar request...');
  const similarResult = await globalCacheManager.get(requests[1]);
  console.log(`Cache hit: ${similarResult.hit}`);
  if (similarResult.hit && similarResult.similarity) {
    console.log(`Similarity score: ${(similarResult.similarity * 100).toFixed(1)}%`);
  }
  console.log(`Response: ${similarResult.response?.content.substring(0, 50)}...\n`);

  // 3. Demonstrate cache miss
  console.log('❌ 3. Cache Miss');
  console.log('Checking dissimilar request...');
  const missResult = await globalCacheManager.get(requests[2]);
  console.log(`Cache hit: ${missResult.hit}`);
  console.log('Storing new response...');
  await globalCacheManager.set(requests[2], responses[2]);
  console.log('');

  // 4. Show cache metrics
  console.log('📊 4. Cache Metrics');
  const metrics = globalCacheManager.getGlobalMetrics();
  const formattedMetrics = CacheUtils.formatMetrics(metrics);
  
  console.log(`Total requests: ${formattedMetrics.totalRequests}`);
  console.log(`Cache hits: ${formattedMetrics.cacheHits}`);
  console.log(`Cache misses: ${formattedMetrics.cacheMisses}`);
  console.log(`Hit rate: ${formattedMetrics.hitRate}`);
  console.log(`Memory usage: ${formattedMetrics.memoryUsage}`);
  console.log(`Total entries: ${formattedMetrics.totalEntries}\n`);

  // 5. Show cache policies
  console.log('⚙️ 5. Cache Policies');
  const policies = globalCacheManager.getPolicies();
  policies.forEach(policy => {
    console.log(`- ${policy.name}: TTL=${policy.ttlMs/1000}s, Size=${policy.maxSize}, Similarity=${policy.enableSimilarityMatching}`);
  });
  console.log('');

  // 6. Demonstrate cache utilities
  console.log('🛠️ 6. Cache Utilities');
  console.log('Policy selection examples:');
  
  const educationalReq = { messages: [{ role: 'user', content: 'Explain quantum physics' }] };
  console.log(`Educational content → ${CacheUtils.selectCachePolicy(educationalReq)} policy`);
  
  const shortReq = { messages: [{ role: 'user', content: 'Hi' }] };
  console.log(`Short conversation → ${CacheUtils.selectCachePolicy(shortReq)} policy`);
  
  const complexReq = { 
    messages: [
      { role: 'user', content: 'How do I optimize my code?' },
      { role: 'assistant', content: 'Here are some tips...' },
      { role: 'user', content: 'Can you give more examples?' }
    ] 
  };
  console.log(`Complex conversation → ${CacheUtils.selectCachePolicy(complexReq)} policy\n`);

  // 7. Show cache optimization
  console.log('🔧 7. Cache Optimization');
  const optimizationResults = globalCacheManager.optimizeAll();
  optimizationResults.forEach(result => {
    console.log(`${result.policy}: Removed ${result.removed} entries, saved ${result.sizeSaved} bytes`);
  });
  console.log('');

  // 8. Performance monitoring setup
  console.log('📈 8. Performance Monitoring');
  const monitor = createCacheMonitor(globalCacheManager);
  const healthScore = monitor.getHealthScore();
  console.log(`Cache health score: ${healthScore.toFixed(1)}/100`);
  
  const realTimeStats = monitor.getRealTimeStats();
  console.log(`Performance grade: ${realTimeStats.performance.hitRateGrade}`);
  console.log(`Memory efficiency: ${realTimeStats.performance.memoryEfficiency.toFixed(1)}%`);
  
  monitor.destroy();
  console.log('');

  // 9. Final statistics
  console.log('📋 9. Final Cache Statistics');
  const finalStats = globalCacheManager.getStats();
  console.log(`Active policies: ${Object.keys(finalStats.policies).length}`);
  console.log(`Total memory usage: ${finalStats.memoryUsage.toFixed(2)} MB`);
  console.log(`Recommendations: ${finalStats.recommendations.length}`);
  if (finalStats.recommendations.length > 0) {
    finalStats.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  console.log('\n✅ Cache system demo completed successfully!');
  
  // Cleanup
  globalCacheManager.clear();
}

// Export for use in other modules
export { demoCacheSystem as default };